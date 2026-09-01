// Bentuk respons tiap endpoint — terjemahan TypeScript dari docs/06-kontrak-api.md.
// Hanya tipe. Tidak boleh ada fungsi yang menghitung (aturan #7).

import type { Bahan, BarisEkstraksi } from './model';
import type { KodeGalat } from '../constants/errors';

export type JawabanApi<T> =
  | { ok: true; data: T }
  | { ok: false; error: { kode: KodeGalat; pesan: string } };

// POST /auth/otp/kirim
export interface DataKirimOtp {
  terkirim: boolean;
}

// POST /auth/otp/verifikasi
export interface DataVerifikasiOtp {
  token: string;
  pengguna_baru: boolean;
  pengguna: { id: number; nama_usaha: string | null };
}

// POST /onboarding/usaha
export interface PermintaanUsaha {
  nama_usaha: string;
  jenis_usaha: string;
}

// POST /onboarding/resep
export interface PermintaanResep {
  nama_produk: string;
  bahan: Bahan[];
  hasil_per_batch: number;
  harga_jual: number;
}

// Jawaban /onboarding/resep — angka SUDAH dihitung SQL di backend.
export interface DataResep {
  produk_id: number;
  modal_per_unit: number;
  harga_jual: number;
  margin_per_unit: number;
  merugi: boolean;
}

// POST /ekstraksi/foto dan /ekstraksi/suara
export interface DataEkstraksi {
  ekstraksi_id: number;
  baris: BarisEkstraksi[];
  total_item: number;
  total_belanja: number;
}

// POST /ekstraksi/pratinjau (usulan frontend) — SQL menghitung ulang subtotal
// dan total saat pengguna mengubah/menghapus baris di layar konfirmasi.
export interface DataPratinjauEkstraksi {
  baris: { urutan: number; subtotal: number }[];
  total_item: number;
  total_belanja: number;
}

// POST /ekstraksi/:id/konfirmasi — hanya baris yang disetujui pengguna.
export interface BarisKonfirmasi {
  urutan: number;
  produk_id: number | null;
  jumlah: number;
  harga_satuan: number | null;
  tanggal: string | null;
}

export interface DataKonfirmasi {
  tersimpan: number;
  berkas_dihapus: boolean;
}
