import { rupiah } from '../../lib/rupiah.ts';
import { llmSiap } from '../../lib/llm.ts';
import { GalatTampil } from '../../lib/http.ts';
import { WA_BALAS_AKTIF, WA_BALAS_PER_MENIT } from '../../config/env.ts';
import {
  KODE_GALAT, type AnalisisPesanan, type BalasanPesan, type BalasanReq,
  type BalasanRes, type BalasanStatus, type JenisPesan, type KandidatProduk,
} from '../../../../shared/types.ts';
import { klasifikasiPesan, susunBalasan, adaPenandaTawar, HARGA_TOTAL } from './pesanan.llm.ts';
import {
  cariKandidatProduk, hitungPesanan, simpanPesan, daftarPesan,
  simpanDraf, suntingDraf, bacaDraf, kunciUntukKirim, tandaiGagalKirim,
  hitungKirimTerakhir,
} from './pesanan.queries.ts';
import type { CocokNamaProduk, HasilCocok, HitungPesanan } from './pesanan.types.ts';

/**
 * Pipeline Pesanan Masuk, dipakai DUA jalur masuk:
 *   1. teks yang ditempel pedagang  (sumber 'tempel')
 *   2. pesan yang dibaca dari WhatsApp (sumber 'whatsapp')
 *
 * Ditaruh di satu tempat supaya kedua jalur tidak pernah berbeda perilakunya.
 * Kalau logika ini diduplikasi, cepat atau lambat satu jalur akan menyimpan
 * sesuatu yang jalur lain menolaknya — dan tidak ada yang menyadarinya.
 */

// ---------------------------------------------------------------------------
// Keputusan pencocokan nama produk
//
// SQL-nya ada di pesanan.queries.ts; KEPUTUSANNYA di sini. Query hanya
// mengukur kemiripan, berkas ini yang memilih antara "cocokkan sendiri",
// "tanya penggunanya", dan "anggap produk baru".
// ---------------------------------------------------------------------------

/**
 * Ambang cocok-otomatis. Angka ini hasil PENGUKURAN pg_trgm terhadap salah
 * ketik yang benar-benar muncul, bukan tebakan:
 *   "kripik sgkong" -> Kripik Singkong 0,667
 *   "krpk pisang"   -> Kripik Pisang   0,529
 *   "kripik psg"    -> Kripik Pisang   0,471   <- kandidat benar TERBURUK
 *   "kripik psg"    -> Kripik Singkong 0,350   <- kandidat salah TERBAIK
 * Lihat docs/04-pipeline-ai.md.
 */
const AMBANG_OTOMATIS = 0.85;

/**
 * Band 0,350–0,471 terlalu sempit untuk satu ambang mutlak. Kalau dua kandidat
 * teratas berselisih di bawah ini, model tidak bisa membedakan — tanya
 * penggunanya. Aturan #8.
 */
const SELISIH_MINIMAL = 0.15;

/** Putuskan: cocokkan otomatis, tanya penggunanya, atau anggap produk baru. */
export function putuskanCocok(kandidat: KandidatProduk[]): HasilCocok {
  if (kandidat.length === 0) {
    return { produkId: null, skor: null, perluDicek: true, kandidat: [] };
  }
  const [atas, kedua] = kandidat;
  const selisihTipis = kedua !== undefined && atas.skor - kedua.skor < SELISIH_MINIMAL;

  if (atas.skor >= AMBANG_OTOMATIS && !selisihTipis) {
    return { produkId: atas.id, skor: atas.skor, perluDicek: false, kandidat };
  }
  // Cukup mirip untuk diduga, tapi tidak cukup untuk diputuskan sendiri.
  return { produkId: atas.id, skor: atas.skor, perluDicek: true, kandidat };
}

/**
 * SATU pintu pencocokan nama untuk semua jalur — chat, suara, ketik, foto.
 *
 * Dulu tiap pemanggil mengulang sendiri urutan cari-kandidat -> putuskan ->
 * cari-nama. Tiga salinan berarti tiga kesempatan untuk berbeda diam-diam;
 * lewat satu pintu, "kacang telor" diperlakukan sama persis di semua jalan
 * masuk. `nama_produk` diisi apa adanya; pemanggil yang memutuskan
 * menyembunyikannya saat `perluDicek`.
 */
export async function cocokkanNamaProduk(
  userId: number, namaMentah: string,
): Promise<CocokNamaProduk> {
  const kandidat = await cariKandidatProduk(userId, namaMentah);
  const cocok = putuskanCocok(kandidat);
  return {
    ...cocok,
    nama_produk: kandidat.find((k) => k.id === cocok.produkId)?.nama ?? null,
  };
}

/** Hasil "tidak ada nama yang bisa dicocokkan" — dipakai saat pembeli tidak
 *  menyebut barang sama sekali. */
const TANPA_NAMA: CocokNamaProduk = {
  produkId: null, skor: null, perluDicek: true, kandidat: [], nama_produk: null,
};

/**
 * Susun kalimat peringatan dari ANGKA YANG SUDAH DIHITUNG SQL.
 * Fungsi ini tidak menghitung apa pun — hanya merangkai.
 */
function susunPeringatan(
  h: HitungPesanan, jumlah: number | null, perluDicek: boolean, namaMentah: string | null,
): string[] {
  const pesan: string[] = [];

  if (h.modal_per_unit === null) {
    pesan.push(`Resep "${h.nama}" belum diisi, jadi untung-ruginya belum bisa dihitung.`);
  } else if (h.merugi) {
    const rugi = h.untung_pesanan !== null
      ? ` — rugi ${rupiah(Math.abs(h.untung_pesanan))} untuk pesanan ini`
      : '';
    pesan.push(
      `Harga ${rupiah(h.harga_dipakai)} di bawah modal ${rupiah(h.modal_per_unit)}${rugi}.`,
    );
  }

  if (h.stok_cukup_untuk === null) {
    pesan.push('Stok bahan belum dicatat, jadi kecukupannya belum bisa dicek.');
  } else if (jumlah !== null && h.stok_cukup_untuk < jumlah) {
    pesan.push(`Bahan hanya cukup untuk ${h.stok_cukup_untuk} dari ${jumlah} yang dipesan.`);
  }

  if (perluDicek) {
    pesan.push(`Nama "${namaMentah}" belum pasti cocok dengan "${h.nama}" — mohon dipastikan dulu.`);
  }
  return pesan;
}

const BUKAN_PESANAN: AnalisisPesanan = {
  pesan_id: null, jenis: 'bukan_pesanan',
  // Tidak disimpan, jadi tidak ada yang bisa dibalas — dan memang tidak perlu:
  // yang bukan pesanan tidak menunggu jawaban dari aplikasi pembukuan.
  balasan: {
    status: 'tidak_ada', teks: null, maksud: null, acuan: null,
    bisa_dikirim: false, alasan_tidak_bisa: 'Ini bukan pesanan.',
    dikirim_pada: null,
  },
  produk: null, nama_produk_mentah: null, jumlah: null,
  harga_diminta: null, tanggal_dibutuhkan: null,
  perlu_dicek: false, kandidat: [],
  nilai_pesanan: null, untung_pesanan: null, merugi: null,
  stok_cukup_untuk: null, stok_kurang: null,
  peringatan: [],
};

export async function prosesPesan(
  userId: number,
  teks: string,
  sumber: 'tempel' | 'whatsapp',
  pengirimSamar: string | null = null,
  pengirimJid: string | null = null,
): Promise<AnalisisPesanan> {
  if (!llmSiap()) {
    throw new GalatTampil(
      KODE_GALAT.EKSTRAKSI_GAGAL,
      'Layanan pembaca pesan belum siap. Coba lagi sebentar lagi.', 503,
    );
  }

  let baca;
  try {
    baca = await klasifikasiPesan(teks);
  } catch (err) {
    console.error('[klasifikasi pesanan gagal]', err);
    throw new GalatTampil(
      KODE_GALAT.EKSTRAKSI_GAGAL,
      'Pesannya belum bisa dibaca. Coba tempel ulang, atau catat manual.', 502,
    );
  }

  // Bukan pesanan: tidak disimpan sama sekali. Pembeli tidak pernah setuju
  // datanya diproses aplikasi ini, jadi yang tidak kita butuhkan tidak kita
  // simpan. Lihat docs/08-keamanan-data.md.
  if (baca.jenis === 'bukan_pesanan') return BUKAN_PESANAN;

  // Pencocokan nama produk — deterministik lewat pg_trgm, bukan tebakan LLM.
  const cocok = baca.nama_produk_mentah
    ? await cocokkanNamaProduk(userId, baca.nama_produk_mentah)
    : TANPA_NAMA;

  // Semua angka di bawah ini datang dari SQL.
  //
  // `hargaDisebut` disimpan terpisah karena dipakai dua kali: sekali untuk
  // memutuskan apakah angkanya harga satuan atau harga total, sekali lagi
  // untuk memutuskan pembeli ini sedang menawar atau tidak.
  const hargaDisebut = baca.harga_diminta;
  let hargaDiminta = hargaDisebut;
  let angkaItuTotal = false;
  let ragu = baca.ragu;
  let hitung = cocok.produkId
    ? await hitungPesanan(cocok.produkId, userId, baca.jumlah, hargaDiminta)
    : null;

  // Bukti terkuat bahwa angka yang disebut pembeli sebenarnya harga TOTAL:
  // tidak ada pembeli yang menawar LEBIH MAHAL dari harga jual pedagang.
  //
  // Penyaring teks di pesanan.llm.ts hanya melihat kalimatnya, jadi ia lolos
  // pada "kripik pisang 10 bungkus 150rb" — 150rb memang tertulis, dan tidak
  // ada kata "total". Di sini kita punya harga jual tersimpan, dan itu cukup
  // untuk memastikan tanpa perlu membagi apa pun.
  //
  // Akibat kalau dibiarkan (terukur di uji 120 pesan): nilai pesanan
  // membengkak sampai 10x DAN penanda merugi terbalik — aplikasi memberi tahu
  // pedagang bahwa ia untung justru pada pesanan yang membuatnya rugi.
  //
  // Yang dilakukan di sini bukan membagi harga total jadi harga satuan — itu
  // menebak (aturan #8). Angkanya DIBUANG, perhitungan kembali memakai harga
  // jual tersimpan, dan pedagang diberi tahu untuk memastikan sendiri.
  if (hitung && hargaDiminta !== null && baca.jumlah !== null && baca.jumlah > 1
      && hargaDiminta > hitung.harga_jual) {
    hargaDiminta = null;
    angkaItuTotal = true;
    ragu ??= HARGA_TOTAL;
    hitung = await hitungPesanan(hitung.produk_id, userId, baca.jumlah, null);
  }

  // Menawar atau tidak — diputuskan dengan MEMBANDINGKAN angka SQL, bukan
  // menebak dari pilihan kata.
  //
  // Model salah di kedua arah: "bu kacang telurnya 4000 aja ya" dibacanya
  // pesanan biasa (padahal harga jualnya 5000 — itu tawaran), sementara "yang
  // 5000an" dibacanya tawaran (padahal 5000 memang harga jualnya — pembeli cuma
  // memastikan). Kata-katanya nyaris sama; yang membedakan hanya angkanya.
  //
  // Salah arah pertama yang berbahaya: tawaran yang menyamar jadi pesanan biasa
  // membuat pedagang menyiapkan barang tanpa pernah melihat layar tawar-menawar,
  // dan potongan harganya baru ketahuan setelah barang jadi.
  //
  // Tapi angka saja tidak cukup. "bisa ji kurang harganya? mau ka ambil 20
  // donat" adalah tawaran yang tegas, dan model mengisi harga_diminta dengan
  // harga jual — kalau angka yang menang, tawaran itu turun jadi pesanan biasa.
  // Jadi kalimatnya punya hak veto: angka boleh MENAIKKAN pesanan jadi tawaran,
  // tapi hanya boleh menurunkannya kalau tidak ada kata tawar-menawar sama
  // sekali.
  //
  // Perbandingan di bawah tidak menghitung apa pun: `harga_jual` dan
  // `nilai_pesanan` dua-duanya keluar dari SQL, di sini hanya dibandingkan.
  let jenis = baca.jenis;
  if (hitung && hargaDisebut !== null && (jenis === 'pesanan' || jenis === 'menawar')) {
    const dibandingkan = angkaItuTotal ? hitung.nilai_pesanan : hitung.harga_jual;
    if (dibandingkan !== null) {
      jenis = hargaDisebut < dibandingkan || adaPenandaTawar(teks) ? 'menawar' : 'pesanan';
    }
  }

  // Dua keadaan yang berbeda, dan pedagang perlu tahu bedanya:
  // barangnya tidak disebut sama sekali, vs disebut tapi belum terdaftar.
  const peringatan = hitung
    ? susunPeringatan(hitung, baca.jumlah, cocok.perluDicek, baca.nama_produk_mentah)
    : baca.nama_produk_mentah
      ? [`Produk "${baca.nama_produk_mentah}" belum ada di daftar. Tambahkan dulu supaya untung-ruginya bisa dicek.`]
      : ['Pembeli belum menyebutkan barang apa yang dipesan. Tanyakan dulu ke pembelinya.'];
  if (ragu !== null) peringatan.unshift(ragu);

  // Satu penanda "mohon dilihat dulu" untuk dua sebab yang berbeda: nama
  // produknya belum pasti, atau ada angka yang tidak bisa dipertanggungjawabkan.
  // Alasannya dijelaskan `peringatan`; penanda ini yang membuat kartunya
  // bertanda di layar.
  const perluDicek = cocok.perluDicek || ragu !== null;

  const pesanId = await simpanPesan({
    userId, teks, sumber, pengirimSamar, pengirimJid,
    jenis,
    namaProdukMentah: baca.nama_produk_mentah,
    // Dugaan pencocokan DISIMPAN apa adanya, ditemani penanda `perlu_dicek`.
    //
    // Dulu kolom ini dikosongkan setiap kali `perluDicek`, dan akibatnya
    // parah: jawaban langsung menampilkan "RUGI Rp 12.000", tapi begitu
    // daftarnya dimuat ulang, produk, nilai pesanan, untung, dan penanda rugi
    // semuanya jadi null — karena daftarPesan() LEFT JOIN ke produk_id yang
    // kosong. Yang tersisa cuma teks mentahnya.
    //
    // Di jalur WhatsApp pedagang tidak sedang menatap layar saat pesan masuk;
    // yang ia lihat besok pagi HANYA daftar itu. Jadi justru peringatan
    // terpentinglah yang tidak pernah sampai. Menyimpan dugaan + penanda
    // "belum pasti" lebih jujur daripada menyimpan ketidaktahuan: pedagang
    // melihat angkanya sekaligus melihat bahwa itu belum dipastikan.
    //
    // Ini tidak melanggar aturan #2 — `pesan_masuk` adalah kotak masuk, bukan
    // pembukuan. Tidak ada satu pun baris `transaksi` yang lahir dari sini
    // tanpa pedagang menekan tombol.
    produkId: cocok.produkId,
    jumlah: baca.jumlah,
    hargaDiminta,
    tanggalDibutuhkan: baca.tanggal_dibutuhkan,
    keyakinanCocok: cocok.skor,
    perluDicek,
    hasilMentah: baca,
  });

  // Draf balasan disusun DI SINI, bukan di wa.client.ts, supaya jalur tempel
  // dan jalur WhatsApp melewati kode yang sama persis. Jalur tempel juga yang
  // membuat fitur ini bisa diuji tanpa sesi WhatsApp hidup.
  const balasan = await siapkanDraf(
    userId, pesanId, jenis, hitung, baca.jumlah, hargaDiminta, perluDicek, pengirimJid,
  );

  return {
    pesan_id: pesanId,
    jenis,
    balasan,
    produk: hitung ? { id: hitung.produk_id, nama: hitung.nama } : null,
    nama_produk_mentah: baca.nama_produk_mentah,
    jumlah: baca.jumlah,
    harga_diminta: hargaDiminta,
    tanggal_dibutuhkan: baca.tanggal_dibutuhkan,
    perlu_dicek: perluDicek,
    kandidat: cocok.kandidat,
    nilai_pesanan: hitung?.nilai_pesanan ?? null,
    untung_pesanan: hitung?.untung_pesanan ?? null,
    merugi: hitung?.merugi ?? null,
    stok_cukup_untuk: hitung?.stok_cukup_untuk ?? null,
    stok_kurang: hitung && hitung.stok_cukup_untuk !== null && baca.jumlah !== null
      ? hitung.stok_cukup_untuk < baca.jumlah
      : null,
    peringatan,
  };
}

// ---------------------------------------------------------------------------
// Balasan siap salin
// ---------------------------------------------------------------------------

/**
 * Siapkan kalimat balasan untuk DISALIN pedagang sendiri — penutup alur
 * Pesanan Masuk, dan momen yang memperlihatkan bahwa pedagang yang memegang
 * kendali, bukan sistem.
 *
 * Angka dihitung SQL LEBIH DULU, lalu disodorkan ke LLM sebagai fakta.
 * Sistem TIDAK PERNAH mengirim apa pun ke nomor pembeli — aturan #4. Tidak
 * ada jalur kirim di seluruh backend, dan itu diverifikasi di setiap uji.
 */
export async function buatBalasan(userId: number, req: BalasanReq): Promise<BalasanRes> {
  // Query menyertakan user_id, jadi produk pedagang lain tidak akan ketemu.
  const h = await hitungPesanan(
    req.produk_id, userId, req.jumlah ?? null, req.harga_diminta ?? null,
  );
  if (!h) {
    throw new GalatTampil(KODE_GALAT.PRODUK_TIDAK_DITEMUKAN, 'Produk tidak ditemukan.', 404);
  }

  let teks: string;
  try {
    teks = await susunBalasan(h, req);
  } catch (err) {
    console.error('[susun balasan gagal]', err);
    throw new GalatTampil(
      KODE_GALAT.EKSTRAKSI_GAGAL,
      'Balasannya belum bisa disusun. Coba lagi, atau tulis sendiri.', 502,
    );
  }

  // `acuan` disertakan supaya angka di kalimat bisa dicocokkan dengan angka
  // dari SQL. Kalau berbeda, berarti model mengarang — dan itu kegagalan.
  return {
    teks,
    acuan: {
      nama: h.nama,
      modal_per_unit: h.modal_per_unit,
      harga_jual: h.harga_jual,
      harga_diminta: req.harga_diminta ?? null,
      jumlah: req.jumlah ?? null,
      untung_pesanan: h.untung_pesanan,
      merugi: h.merugi,
    },
  };
}

/**
 * Daftar pesanan masuk terbaru — angka-angkanya sudah dihitung SQL.
 *
 * Kolom balasan yang datar dari SQL dilipat jadi satu objek `balasan`, supaya
 * layar menerima bentuk yang sama persis dengan yang dikembalikan
 * `POST /pesanan/analisis`. Dua bentuk berbeda untuk data yang sama berarti dua
 * cabang tampilan, dan cepat atau lambat salah satunya lupa diperbarui.
 */
export async function ambilDaftarPesan(userId: number) {
  const baris = await daftarPesan(userId);
  return baris.map((b: any) => {
    const { balasan_teks, balasan_maksud, balasan_acuan, balasan_status,
      balasan_dikirim_pada, ada_alamat, ...sisa } = b;
    return {
      ...sisa,
      balasan: bentukBalasan(
        balasan_status ?? 'tidak_ada',
        balasan_teks ?? null,
        balasan_maksud ?? null,
        balasan_acuan ?? null,
        ada_alamat === true,
        balasan_dikirim_pada ?? null,
      ),
    };
  });
}

// ---------------------------------------------------------------------------
// Balasan otomatis — draf disusun sistem, pedagang yang menekan kirim
// ---------------------------------------------------------------------------

/**
 * Kenapa sebuah draf tidak bisa dikirim. Dikembalikan sebagai KALIMAT, bukan
 * kode, karena satu-satunya pembacanya adalah pedagang — dan tombol mati tanpa
 * alasan adalah jalan buntu yang tidak punya pintu keluar.
 */
function alasanTidakBisaKirim(
  status: BalasanStatus, adaAlamat: boolean,
): string | null {
  if (!WA_BALAS_AKTIF) return 'Pengiriman lewat WhatsApp sedang dimatikan. Salin saja balasannya.';
  if (!adaAlamat) return 'Pesan ini ditempel manual, jadi tidak ada chat yang bisa dibalas. Salin balasannya.';
  if (status === 'terkirim') return 'Balasan ini sudah terkirim.';
  if (status !== 'siap') return 'Belum ada balasan yang siap dikirim.';
  return null;
}

/** Bentuk medan `balasan` yang dikirim ke layar — satu tempat, satu bentuk. */
function bentukBalasan(
  status: BalasanStatus,
  teks: string | null,
  maksud: BalasanReq['maksud'] | null,
  acuan: BalasanRes['acuan'] | null,
  adaAlamat: boolean,
  dikirimPada: string | null = null,
): BalasanPesan {
  const alasan = alasanTidakBisaKirim(status, adaAlamat);
  return {
    status, teks, maksud, acuan,
    bisa_dikirim: alasan === null,
    alasan_tidak_bisa: alasan,
    dikirim_pada: dikirimPada,
  };
}

const TANPA_BALASAN = (adaAlamat: boolean): BalasanPesan =>
  bentukBalasan('tidak_ada', null, null, null, adaAlamat);

/**
 * Susun draf balasan begitu pesan masuk.
 *
 * MAKSUDNYA DIPILIH SQL, BUKAN LLM. Ini inti pertahanan aturan #1 di fitur ini:
 * kalau model yang memutuskan "terima atau tawar", maka model sedang memutuskan
 * soal uang — dan model memilih nada, bukan angka. Kalimat pembeli yang ramah
 * membuatnya cenderung menyetujui, termasuk saat menyetujui berarti rugi.
 *
 * `merugi` datang dari v_margin_produk. Yang diserahkan ke LLM hanyalah menulis
 * kalimatnya, dengan fakta yang sudah jadi.
 *
 * Tidak ada draf sama sekali kalau produknya belum pasti (aturan #8). Balasan
 * untuk produk yang salah adalah kalimat salah yang duduk satu tap dari
 * terkirim — jauh lebih berbahaya daripada tidak ada balasan.
 */
async function siapkanDraf(
  userId: number,
  pesanId: number,
  jenis: JenisPesan,
  hitung: HitungPesanan | null,
  jumlah: number | null,
  hargaDiminta: number | null,
  perluDicek: boolean,
  pengirimJid: string | null,
): Promise<BalasanPesan> {
  const adaAlamat = pengirimJid !== null;

  if (!hitung || perluDicek) return TANPA_BALASAN(adaAlamat);

  const maksud: BalasanReq['maksud'] =
    jenis === 'tanya_harga' ? 'jawab_harga'
      : hitung.merugi ? 'tawar_harga'
        : 'terima';

  const req: BalasanReq = {
    maksud,
    produk_id: hitung.produk_id,
    jumlah: jumlah ?? undefined,
    harga_diminta: hargaDiminta ?? undefined,
  };

  try {
    const hasil = await buatBalasan(userId, req);
    await simpanDraf(pesanId, userId, maksud, hasil.teks, hasil.acuan);
    return bentukBalasan('siap', hasil.teks, maksud, hasil.acuan, adaAlamat);
  } catch (err) {
    // Gagal menyusun draf TIDAK BOLEH menjatuhkan pesannya. Pesan yang sudah
    // tersimpan lebih berharga daripada balasan yang gagal disusun — pedagang
    // masih bisa menulis sendiri, tapi pesan yang hilang hilang selamanya.
    console.error('[draf balasan gagal]', err instanceof Error ? err.message : err);
    return TANPA_BALASAN(adaAlamat);
  }
}

/** Pedagang memperbaiki kalimatnya sebelum mengirim. */
export async function suntingBalasan(
  userId: number, pesanId: number, teks: string,
): Promise<void> {
  const baris = await suntingDraf(pesanId, userId, teks);
  if (!baris) {
    throw new GalatTampil(
      KODE_GALAT.PESANAN_SUDAH_DIPROSES,
      'Balasan ini sudah terkirim, jadi tidak bisa diubah lagi.', 409,
    );
  }
}

/**
 * Kirim balasan ke pembeli. SATU-SATUNYA jalur pengiriman di seluruh backend,
 * dan ia hanya bisa dicapai lewat tombol yang ditekan pedagang.
 */
export async function kirimBalasan(userId: number, pesanId: number): Promise<void> {
  if (!WA_BALAS_AKTIF) {
    throw new GalatTampil(
      KODE_GALAT.PERMINTAAN_TIDAK_VALID,
      'Pengiriman lewat WhatsApp sedang dimatikan. Salin saja balasannya.', 409,
    );
  }

  // Batas laju diperiksa SEBELUM mengunci, supaya permintaan yang ditolak tidak
  // ikut menghabiskan draf yang sah.
  if (await hitungKirimTerakhir(userId) >= WA_BALAS_PER_MENIT) {
    throw new GalatTampil(
      KODE_GALAT.PERMINTAAN_TIDAK_VALID,
      'Terlalu banyak balasan terkirim dalam semenit. Tunggu sebentar.', 429,
    );
  }

  // Penolakan yang sudah pasti diperiksa DULU, tanpa menyentuh apa pun. Kalau
  // pemeriksaan ini terjadi setelah penguncian, pesan tempel akan berakhir
  // berstatus 'gagal' — padahal tidak ada yang gagal, dan drafnya masih layak
  // disalin. Status yang berbohong lebih buruk daripada tombol yang menolak.
  const draf = await bacaDraf(pesanId, userId);
  if (!draf) {
    throw new GalatTampil(
      KODE_GALAT.PESANAN_TIDAK_DITEMUKAN, 'Pesan tidak ditemukan.', 404,
    );
  }
  if (!draf.ada_alamat) {
    throw new GalatTampil(
      KODE_GALAT.PERMINTAAN_TIDAK_VALID,
      'Pesan ini ditempel manual, jadi tidak ada chat yang bisa dibalas.', 409,
    );
  }

  // Mengunci dan menandai terkirim dalam satu pernyataan — dua tombol yang
  // tertekan bersamaan tidak bisa dua-duanya lolos. Pemeriksaan di atas tidak
  // menggantikan ini: ia menyaring yang sudah pasti salah, sedangkan yang
  // menjaga perlombaan tetap satu pernyataan UPDATE.
  const siap = await kunciUntukKirim(pesanId, userId);
  if (!siap) {
    throw new GalatTampil(
      KODE_GALAT.PESANAN_SUDAH_DIPROSES,
      'Balasan ini sudah terkirim, atau belum ada yang siap dikirim.', 409,
    );
  }

  try {
    // Impor dinamis, dan itu disengaja: wa.client.ts sudah mengimpor
    // `prosesPesan` dari berkas ini, jadi impor statis ke arah sebaliknya
    // membuat lingkaran. ESM biasanya selamat karena keduanya deklarasi fungsi
    // yang ter-hoist — tapi "biasanya selamat" bukan dasar yang layak untuk
    // satu-satunya jalur pengiriman di aplikasi ini. Modulnya di-cache setelah
    // panggilan pertama.
    const { kirimPesan } = await import('../whatsapp/wa.client.ts');
    await kirimPesan(siap.pengirim_jid, siap.balasan_teks ?? '');
  } catch (err) {
    // Dikembalikan ke 'gagal', bukan dibiarkan 'terkirim'. Catatan yang
    // mengaku sudah mengirim padahal tidak adalah kebohongan yang membuat
    // pedagang menunggu jawaban yang tidak akan pernah datang.
    await tandaiGagalKirim(pesanId, userId);
    console.error('[kirim balasan gagal]', err instanceof Error ? err.message : err);
    throw new GalatTampil(
      KODE_GALAT.GALAT_SERVER,
      'Balasannya gagal terkirim. Coba lagi, atau salin dan kirim sendiri.', 502,
    );
  }
}
