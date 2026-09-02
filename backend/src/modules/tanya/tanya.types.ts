/**
 * Tipe modul tanya.
 *
 * Chatbotnya murni LLM. Yang dikerjakan modul ini cuma satu: mengumpulkan
 * SELURUH data pedagang dari database, menyusunnya jadi teks yang enak dibaca
 * model, lalu menyerahkan pertanyaannya apa adanya. Tidak ada klasifikasi
 * maksud, tidak ada daftar pertanyaan yang boleh, tidak ada penyaringan
 * jawaban.
 */

export interface GiliranPercakapan {
  peran: 'pedagang' | 'asisten';
  teks: string;
}

export interface ProfilUsaha {
  nama_usaha: string | null;
  jenis_usaha: string | null;
}

export interface RingkasanPeriode {
  omzet: number;
  untung_bersih: number;
  jumlah_baris: number;
  baris_tanpa_modal: number;
}

export interface BarisProduk {
  produk_id: number;
  nama: string;
  harga_jual: number;
  modal_per_unit: number | null;
  margin_per_unit: number | null;
  merugi: boolean | null;
  /** null berarti stok bahannya belum lengkap dicatat — bukan nol. */
  maks_unit: number | null;
  harga_disarankan: number | null;
  untung_per_unit_disarankan: number | null;
  terjual_periode: number;
  omzet_periode: number;
  terjual_total: number;
}

export interface BarisBahan {
  nama: string;
  satuan: string;
  harga_beli: number;
  jumlah_beli: number;
  /** null berarti belum pernah dicatat, bukan habis. */
  stok: number | null;
}

export interface BarisResep {
  produk: string;
  bahan: string;
  jumlah: number;
  satuan: string;
}

export interface BarisPenjualan {
  tanggal: string;
  nama_produk: string | null;
  jumlah: number;
  harga_satuan: number;
  sumber: string | null;
}

export interface BarisBulan {
  bulan: string;
  omzet: number;
  untung_bersih: number;
  jumlah_baris: number;
}

export interface BarisPesanan {
  diterima_pada: string;
  pengirim_samar: string | null;
  teks: string | null;
}
