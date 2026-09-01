/**
 * Tipe INTERNAL modul beranda — bentuk baris hasil query, sebelum dirangkai
 * jadi `Beranda` (yang hidup di shared/types.ts sebagai kontrak API).
 */

export interface RingkasanPenjualan {
  omzet: number;
  untung_bersih: number;
  jumlah_baris: number;
  baris_tanpa_modal: number;
}

export interface TemuanProduk {
  jumlah_produk_merugi: number;
  nama: string | null;
  margin_per_unit: number | null;
}
