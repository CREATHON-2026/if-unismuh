/**
 * Tipe INTERNAL modul transaksi — bentuk antara llm -> service.
 * Bentuk yang keluar lewat API (UsulanTransaksi, BarisUsulan, dst) hidup di
 * shared/types.ts karena itu kontrak dua sisi.
 */

/** Satu baris penjualan hasil bacaan LLM, SEBELUM dicocokkan ke produk. */
export interface BarisMentah {
  nama_mentah: string | null;
  jumlah: number | null;
  harga_satuan: number | null;
  /** Alasan keraguan dari penyaring deterministik di transaksi.llm.ts;
   *  null = bersih. */
  ragu: string | null;
}
