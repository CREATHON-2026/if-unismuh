/**
 * Tipe INTERNAL modul ekstraksi.
 * Bentuk yang keluar lewat API (EkstraksiRes, BarisEkstraksi, dst) hidup di
 * shared/types.ts karena itu kontrak dua sisi.
 */

/** Hasil hitung SQL untuk baris layar konfirmasi — subtotal dan total. */
export interface HitungBaris {
  urutan: number;
  harga_satuan: number | null;
  subtotal: number;
  total_item: number;
  total_belanja: number;
}
