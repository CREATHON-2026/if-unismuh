import { rupiah } from '../../lib/rupiah.ts';
import { llmSiap } from '../../lib/llm.ts';
import { GalatTampil } from '../../lib/http.ts';
import { KODE_GALAT, type AnalisisPesanan, type BalasanReq, type BalasanRes, type KandidatProduk } from '../../../../shared/types.ts';
import { klasifikasiPesan, susunBalasan, adaPenandaTawar, HARGA_TOTAL } from './pesanan.llm.ts';
import { cariKandidatProduk, hitungPesanan, simpanPesan, daftarPesan } from './pesanan.queries.ts';
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
    userId, teks, sumber, pengirimSamar,
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

  return {
    pesan_id: pesanId,
    jenis,
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

/** Daftar pesanan masuk terbaru — angka-angkanya sudah dihitung SQL. */
export function ambilDaftarPesan(userId: number) {
  return daftarPesan(userId);
}
