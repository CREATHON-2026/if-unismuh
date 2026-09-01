// Model data bersama — bentuk mengikuti docs/06-kontrak-api.md (sumber kebenaran).

export interface Bahan {
  nama: string;
  jumlah: number;
  satuan: string;
  harga_beli: number; // integer rupiah
  jumlah_beli: number;
}

export interface Produk {
  id: number;
  nama: string;
  harga_jual: number;
  modal_per_unit: number;
  margin_per_unit: number;
  merugi: boolean;
  terlaris: boolean;
}

export interface BarisEkstraksi {
  urutan: number;
  nama_mentah: string;
  produk_id: number | null;
  nama_produk: string | null;
  jumlah: number;
  harga_satuan: number | null;
  subtotal: number; // dihitung backend (SQL), bukan frontend
  tanggal: string | null; // YYYY-MM-DD
  keyakinan: number; // 0..1, per baris
  perlu_dicek: boolean;
  alasan_ragu?: string;
}
