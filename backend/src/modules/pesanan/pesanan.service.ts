import { rupiah } from '../../lib/rupiah.ts';
import { llmSiap } from '../../lib/llm.ts';
import { GalatTampil } from '../../lib/http.ts';
import { KODE_GALAT, type AnalisisPesanan, type BalasanReq, type BalasanRes, type KandidatProduk } from '../../../../shared/types.ts';
import { klasifikasiPesan, susunBalasan } from './pesanan.llm.ts';
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
  const hitung = cocok.produkId
    ? await hitungPesanan(cocok.produkId, userId, baca.jumlah, baca.harga_diminta)
    : null;

  // Dua keadaan yang berbeda, dan pedagang perlu tahu bedanya:
  // barangnya tidak disebut sama sekali, vs disebut tapi belum terdaftar.
  const peringatan = hitung
    ? susunPeringatan(hitung, baca.jumlah, cocok.perluDicek, baca.nama_produk_mentah)
    : baca.nama_produk_mentah
      ? [`Produk "${baca.nama_produk_mentah}" belum ada di daftar. Tambahkan dulu supaya untung-ruginya bisa dicek.`]
      : ['Pembeli belum menyebutkan barang apa yang dipesan. Tanyakan dulu ke pembelinya.'];

  const pesanId = await simpanPesan({
    userId, teks, sumber, pengirimSamar,
    jenis: baca.jenis,
    namaProdukMentah: baca.nama_produk_mentah,
    produkId: cocok.perluDicek ? null : cocok.produkId,
    jumlah: baca.jumlah,
    hargaDiminta: baca.harga_diminta,
    tanggalDibutuhkan: baca.tanggal_dibutuhkan,
    keyakinanCocok: cocok.skor,
    perluDicek: cocok.perluDicek,
    hasilMentah: baca,
  });

  return {
    pesan_id: pesanId,
    jenis: baca.jenis,
    produk: hitung ? { id: hitung.produk_id, nama: hitung.nama } : null,
    nama_produk_mentah: baca.nama_produk_mentah,
    jumlah: baca.jumlah,
    harga_diminta: baca.harga_diminta,
    tanggal_dibutuhkan: baca.tanggal_dibutuhkan,
    perlu_dicek: cocok.perluDicek,
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
