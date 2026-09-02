/**
 * Tipe modul tanya.
 *
 * Perhatikan apa yang TIDAK ada di keluaran LLM: tidak ada satu pun angka
 * hasil hitungan. Model boleh memilih fakta mana yang relevan dan apa artinya;
 * model tidak boleh menghasilkan angka. Semua rupiah lahir di
 * tanya.queries.ts. Aturan #1.
 */

/**
 * Seluruh keadaan usaha sebagai peta datar.
 *
 * Datar, bukan bersarang. Model 7-27B jauh lebih andal membaca `kunci: nilai`
 * baris demi baris daripada JSON bertingkat — dan kunci datar bisa disebut
 * ulang oleh model sebagai `kunci_dipakai`, yang membuat `acuan` bisa dirakit
 * hanya dengan mencari kunci. Nilai yang tidak diketahui TIDAK DIISI: kunci
 * yang hilang membuat model berkata "belum bisa dihitung", sedangkan nilai 0
 * membuatnya berkata "modalnya nol rupiah".
 */
export type LembarFakta = Record<string, number | string>;

export interface GiliranPercakapan {
  peran: 'pedagang' | 'asisten';
  teks: string;
}

/**
 * Perhitungan yang boleh DIMINTA model, bukan dilakukan model.
 *
 * Daftarnya sengaja pendek dan tertutup. Tiap jenis adalah query yang kita
 * tulis sendiri; model hanya mengisi argumennya, dan argumennya divalidasi
 * sebelum menyentuh SQL. Menambah jenis baru berarti menulis query baru —
 * penghalang yang memang diinginkan.
 */
export const HITUNG = {
  /** "kalau saya jual 25 ribu, untungnya berapa?" */
  SIMULASI_HARGA: 'simulasi_harga',
  /** "untung minggu lalu berapa?" — rentang tanggal di luar bulan berjalan */
  UNTUNG_PERIODE: 'untung_periode',
} as const;

export type JenisHitung = (typeof HITUNG)[keyof typeof HITUNG];

export interface PermintaanHitung {
  jenis: JenisHitung;
  /** Nama produk PERSIS seperti ditulis pedagang. Dicocokkan belakangan. */
  produk: string | null;
  harga_baru: number | null;
  dari: string | null;
  sampai: string | null;
}

/** Keluaran LLM tahap pertama. */
export interface HasilTanya {
  /** Pertanyaannya bukan soal usaha ini maupun aplikasi ini. */
  di_luar_cakupan: boolean;
  /** Pedagang sedang MELAPORKAN penjualan, bukan bertanya. */
  lapor_penjualan: boolean;
  /** Kalimat siap tampil. Boleh kosong kalau model minta dihitung dulu. */
  jawaban: string;
  /** Kunci lembar fakta yang benar-benar dipakai. Jadi isi `acuan`. */
  kunci_dipakai: string[];
  perlu_hitung: PermintaanHitung | null;
}

// ---------------------------------------------------------------------------
// Baris SQL penyusun lembar fakta
// ---------------------------------------------------------------------------

export interface BarisProdukFakta {
  produk_id: number;
  nama: string;
  harga_jual: number;
  modal_per_unit: number | null;
  margin_per_unit: number | null;
  merugi: boolean | null;
  /** null berarti stok bahannya belum lengkap dicatat — BUKAN nol. */
  maks_unit: number | null;
  /** null berarti harganya sudah cukup, tidak ada yang perlu dinaikkan. */
  harga_disarankan: number | null;
  untung_per_unit_disarankan: number | null;
  terjual_periode: number;
  omzet_periode: number;
}

export interface BarisBahanFakta {
  nama: string;
  satuan: string;
  harga_beli: number;
  jumlah_beli: number;
  /** null berarti belum pernah dicatat, bukan habis. */
  stok: number | null;
}

export interface ProfilUsaha {
  nama_usaha: string | null;
  jenis_usaha: string | null;
}

/**
 * Hasil simulasi harga. Setiap angka di sini keluar dari SQL.
 *
 * Perkiraannya memakai laju penjualan periode berjalan apa adanya. Kita TIDAK
 * tahu apakah penjualan tetap sama setelah harga naik — dan kalimat jawabannya
 * wajib menyebutkan asumsi itu, bukan menyembunyikannya.
 */
export interface HasilSimulasi {
  nama: string;
  harga_lama: number;
  harga_baru: number;
  modal_per_unit: number;
  margin_baru: number;
  terjual_periode: number;
  untung_periode_harga_baru: number;
  selisih_untung: number;
}
