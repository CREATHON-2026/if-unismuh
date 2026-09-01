import { satu, transaksiDb, type Pelaksana } from '../../db/index.ts';
import type { BahanMasukan, JenisUsaha, Pengguna, TemuanPertama } from '../../../../shared/types.ts';

/**
 * Semua SQL untuk domain onboarding ada di berkas ini.
 *
 * PERHATIKAN: tidak ada satu pun perhitungan di sini. Modal, margin, dan
 * penanda merugi semuanya DIBACA dari view v_margin_produk — lihat
 * backend/db/schema.sql. Rumusnya ditulis sekali di view itu supaya tidak ada
 * dua tempat yang menghitungnya dengan cara berbeda.
 */

export function simpanUsaha(
  userId: number, namaUsaha: string, jenisUsaha: JenisUsaha,
): Promise<Pengguna | null> {
  return satu<Pengguna>(
    `UPDATE pengguna SET nama_usaha = $2, jenis_usaha = $3
     WHERE id = $1
     RETURNING id, nomor_hp, nama_usaha, jenis_usaha`,
    [userId, namaUsaha, jenisUsaha],
  );
}

/**
 * Tulis produk beserta bahan dan resepnya dalam satu transaksi.
 * Ketiganya harus masuk bersama-sama atau tidak sama sekali — produk yang
 * resepnya setengah jadi akan menghasilkan modal yang salah tanpa terlihat.
 */
export function simpanResep(
  userId: number,
  namaProduk: string,
  hargaJual: number,
  hasilPerBatch: number,
  bahan: BahanMasukan[],
): Promise<number> {
  return transaksiDb(async (c: Pelaksana) => {
    const { rows: [produk] } = await c.query(
      `INSERT INTO produk (user_id, nama, harga_jual, hasil_per_batch)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [userId, namaProduk, Math.round(hargaJual), hasilPerBatch],
    );

    for (const b of bahan) {
      // Pakai bahan yang sudah ada kalau namanya sama, supaya harga bahan
      // tidak terpecah jadi beberapa baris yang nilainya bisa berbeda.
      const { rows: [ada] } = await c.query(
        'SELECT id FROM bahan WHERE user_id = $1 AND lower(nama) = lower($2) LIMIT 1',
        [userId, b.nama.trim()],
      );
      const bahanId = ada
        ? ada.id
        : (await c.query(
            `INSERT INTO bahan (user_id, nama, satuan, harga_beli, jumlah_beli)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [userId, b.nama.trim(), b.satuan ?? 'buah',
             Math.round(Number(b.harga_beli)), Number(b.jumlah_beli)],
          )).rows[0].id;

      await c.query(
        `INSERT INTO resep (produk_id, bahan_id, jumlah_pakai) VALUES ($1, $2, $3)
         ON CONFLICT (produk_id, bahan_id) DO UPDATE SET jumlah_pakai = EXCLUDED.jumlah_pakai`,
        [produk.id, bahanId, Number(b.jumlah)],
      );
    }
    return produk.id as number;
  });
}

/**
 * ★ Temuan pertama — angka yang membuat pengguna tidak menutup aplikasi.
 * Dibaca dari view, tidak dihitung di sini.
 */
export function ambilTemuanPertama(
  produkId: number, userId: number,
): Promise<TemuanPertama | null> {
  return satu<TemuanPertama>(
    `SELECT produk_id, nama, modal_per_unit, harga_jual, margin_per_unit, merugi
     FROM v_margin_produk
     WHERE produk_id = $1 AND user_id = $2`,
    [produkId, userId],
  );
}
