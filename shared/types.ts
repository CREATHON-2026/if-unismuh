/**
 * Tipe kontrak API — dipakai frontend DAN backend.
 *
 * Sumber kebenarannya docs/06-kontrak-api.md. Kalau tipe di sini berubah,
 * perbarui dokumen itu di PR yang sama dan kabari tim.
 *
 * Aturan folder ini: hanya tipe dan konstanta, TIDAK ADA logika perhitungan.
 * Kalau ada fungsi yang menghitung margin di sini, itu berarti frontend punya
 * jalan untuk menghitung sendiri — melanggar aturan #7.
 */

// ---------------------------------------------------------------------------
// Bentuk jawaban baku
// ---------------------------------------------------------------------------

export type Jawaban<T> = { ok: true; data: T } | { ok: false; error: GalatApi };

export interface GalatApi {
  kode: KodeGalat;
  pesan: string;
}

export const KODE_GALAT = {
  TIDAK_TERAUTENTIKASI: 'TIDAK_TERAUTENTIKASI',
  OTP_SALAH: 'OTP_SALAH',
  PRODUK_TIDAK_DITEMUKAN: 'PRODUK_TIDAK_DITEMUKAN',
  EKSTRAKSI_GAGAL: 'EKSTRAKSI_GAGAL',
  BERKAS_TERLALU_BESAR: 'BERKAS_TERLALU_BESAR',
  RESEP_BELUM_LENGKAP: 'RESEP_BELUM_LENGKAP',
  PERMINTAAN_TIDAK_VALID: 'PERMINTAAN_TIDAK_VALID',
  GALAT_SERVER: 'GALAT_SERVER',
} as const;

export type KodeGalat = (typeof KODE_GALAT)[keyof typeof KODE_GALAT];

// ---------------------------------------------------------------------------
// Autentikasi
// ---------------------------------------------------------------------------

export interface KirimOtpReq { nomor_hp: string; }
export interface KirimOtpRes { terkirim: boolean; mode_demo: boolean; }

export interface VerifikasiOtpReq { nomor_hp: string; kode: string; }
export interface VerifikasiOtpRes {
  token: string;
  /** true -> frontend masuk ke alur onboarding, bukan langsung Beranda */
  pengguna_baru: boolean;
  pengguna: Pengguna;
}

export interface Pengguna {
  id: number;
  nomor_hp: string;
  nama_usaha: string | null;
  jenis_usaha: JenisUsaha | null;
}

/**
 * GET /auth/saya — dipanggil tiap aplikasi dibuka, dengan token dari
 * localStorage. `token` yang dikembalikan adalah token BARU: sesinya
 * diperpanjang tiap kali aplikasi dibuka, supaya pedagang tidak pernah
 * kehabisan sesi.
 */
export interface SayaRes {
  pengguna: Pengguna;
  pengguna_baru: boolean;
  token: string;
}

export type JenisUsaha = 'makanan' | 'minuman' | 'sembako' | 'jasa' | 'lainnya';

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

export interface SimpanUsahaReq { nama_usaha: string; jenis_usaha: JenisUsaha; }

export interface BahanMasukan {
  nama: string;
  satuan: string;
  /** Berapa banyak dipakai untuk satu batch */
  jumlah: number;
  /** Harga beli untuk jumlah_beli satuan, dalam rupiah */
  harga_beli: number;
  jumlah_beli: number;
}

export interface SimpanResepReq {
  nama_produk: string;
  bahan: BahanMasukan[];
  hasil_per_batch: number;
  harga_jual: number;
}

/**
 * ★ Inilah temuan pertama — momen yang membuat pengguna tidak menutup aplikasi.
 * Semua angka di sini dihitung SQL. Frontend hanya menampilkan.
 */
export interface TemuanPertama {
  produk_id: number;
  nama: string;
  modal_per_unit: number;
  harga_jual: number;
  margin_per_unit: number;
  merugi: boolean;
}

// ---------------------------------------------------------------------------
// Produk
// ---------------------------------------------------------------------------

export interface RingkasanProduk {
  id: number;
  nama: string;
  harga_jual: number;
  /** null kalau resepnya belum diisi — modal belum bisa dihitung */
  modal_per_unit: number | null;
  margin_per_unit: number | null;
  merugi: boolean | null;
  terlaris: boolean;
}

export interface RincianBahan {
  nama: string;
  satuan: string;
  jumlah_pakai: number;
  /** Kontribusi bahan ini ke modal satu unit produk */
  biaya_per_unit: number;
}

export interface SaranHarga {
  harga_disarankan: number;
  alasan: string;
}

export interface DetailProduk extends RingkasanProduk {
  hasil_per_batch: number | null;
  bahan: RincianBahan[];
  total_terjual: number;
  saran_harga: SaranHarga | null;
}

// ---------------------------------------------------------------------------
// Beranda
// ---------------------------------------------------------------------------

export interface Beranda {
  omzet: number;
  untung_bersih: number;
  jumlah_produk_merugi: number;
  produk_paling_merugi: { nama: string; margin_per_unit: number } | null;
}

// ---------------------------------------------------------------------------
// Pesanan Masuk (fitur 9)
// ---------------------------------------------------------------------------

export type JenisPesan = 'pesanan' | 'tanya_harga' | 'menawar' | 'bukan_pesanan';

export interface AnalisisPesananReq {
  teks: string;
}

/** Kandidat produk saat nama dari chat tidak cocok meyakinkan. */
export interface KandidatProduk {
  id: number;
  nama: string;
  skor: number;
}

/**
 * ★ Semua angka finansial di sini dihitung SQL, bukan LLM.
 *
 * LLM hanya mengeluarkan `jenis`, `nama_produk_mentah`, `jumlah`,
 * `harga_diminta`, dan `tanggal_dibutuhkan` — yaitu apa yang TERTULIS di chat.
 * `nilai_pesanan`, `untung_pesanan`, `merugi`, dan `stok_cukup_untuk` datang
 * dari query. Lihat aturan #1 di CLAUDE.md.
 */
export interface AnalisisPesanan {
  /** null kalau pesannya bukan pesanan — teksnya sengaja tidak disimpan */
  pesan_id: number | null;
  jenis: JenisPesan;

  produk: { id: number; nama: string } | null;
  nama_produk_mentah: string | null;
  jumlah: number | null;
  harga_diminta: number | null;
  tanggal_dibutuhkan: string | null;

  /** Diisi kalau pencocokan nama produk tidak meyakinkan — tanya penggunanya */
  perlu_dicek: boolean;
  kandidat: KandidatProduk[];

  // --- dihitung SQL ---
  nilai_pesanan: number | null;
  untung_pesanan: number | null;
  merugi: boolean | null;
  /** null = stok bahannya belum dicatat, bukan berarti nol */
  stok_cukup_untuk: number | null;
  stok_kurang: boolean | null;

  /** Kalimat siap tampil, sudah berisi angka hasil hitungan SQL */
  peringatan: string[];
}

// ---------------------------------------------------------------------------
// Transaksi
// ---------------------------------------------------------------------------

export type SumberTransaksi = 'foto' | 'suara' | 'manual';

export interface CatatTransaksiReq {
  produk_id: number;
  jumlah: number;
  /** Kalau tidak diisi, dipakai harga_jual produk yang tersimpan */
  harga_satuan?: number;
  /** YYYY-MM-DD. Kalau tidak diisi, dipakai hari ini */
  tanggal?: string;
}

export interface Transaksi {
  id: number;
  produk_id: number | null;
  nama_produk: string | null;
  jumlah: number;
  harga_satuan: number;
  tanggal: string;
  sumber: SumberTransaksi;
}
