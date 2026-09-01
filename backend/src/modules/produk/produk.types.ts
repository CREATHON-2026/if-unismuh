import type { RingkasanProduk } from '../../../../shared/types.ts';

/**
 * Tipe INTERNAL modul produk — bentuk antara llm/queries -> service.
 * Bentuk yang keluar lewat API (UsulanProduk, DetailProduk, SaranHarga, dst)
 * hidup di shared/types.ts karena itu kontrak dua sisi.
 */

/** Satu bahan hasil bacaan LLM, SEBELUM dilengkapi dan divalidasi. */
export interface BahanMentah {
  nama: string | null;
  satuan: string | null;
  jumlah: number | null;
  harga_beli: number | null;
  jumlah_beli: number | null;
}

/** Usulan produk hasil bacaan LLM — angka yang tidak disebut tetap null. */
export interface ProdukMentah {
  nama_produk: string | null;
  hasil_per_batch: number | null;
  harga_jual: number | null;
  bahan: BahanMentah[];
}

/** Baris detail produk dari SQL, sebelum dirangkai jadi DetailProduk. */
export interface DetailDasar extends RingkasanProduk {
  hasil_per_batch: number | null;
  total_terjual: number;
  biaya_tenaga_per_unit: number | null;
  persen_tenaga: number | null;
}

/** Saran harga dari view v_saran_harga, sebelum diberi kalimat alasan. */
export interface SaranMentah {
  harga_impas: number;
  harga_disarankan: number;
  kenaikan: number;
  untung_per_unit: number;
}
