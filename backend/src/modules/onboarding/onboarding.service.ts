import type { BahanMasukan, JenisUsaha, Pengguna, TemuanPertama } from '../../../../shared/types.ts';
import { simpanUsaha, simpanResep, ambilTemuanPertama } from './onboarding.queries.ts';

/**
 * Service onboarding — logika domain, tanpa Express.
 *
 * `buatProdukDenganResep` juga dipakai modul produk (POST /produk). Dipakai
 * ulang, BUKAN disalin: dua jalur INSERT untuk produk yang sama akan berbeda
 * diam-diam saat salah satunya diubah.
 */

export function perbaruiUsaha(
  userId: number, namaUsaha: string, jenisUsaha: JenisUsaha,
): Promise<Pengguna | null> {
  return simpanUsaha(userId, namaUsaha, jenisUsaha);
}

/**
 * Simpan produk + bahan + resep dalam satu transaksi database, lalu baca
 * temuannya dari view — modal dan margin TIDAK dihitung di sini. Aturan #1.
 *
 * ★ Nilai kembaliannya adalah temuan pertama: angka yang membuat pengguna
 * tidak menutup aplikasi.
 */
export async function buatProdukDenganResep(
  userId: number,
  namaProduk: string,
  hargaJual: number,
  hasilPerBatch: number | null,
  bahan: BahanMasukan[],
): Promise<TemuanPertama | null> {
  const produkId = await simpanResep(userId, namaProduk, hargaJual, hasilPerBatch, bahan);
  return ambilTemuanPertama(produkId, userId);
}
