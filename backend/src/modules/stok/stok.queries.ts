import { query, transaksiDb, type Pelaksana } from '../../db/index.ts';
import type { BarisStok, StokBahan } from '../../../../shared/types.ts';

/** Semua SQL domain stok ada di berkas ini. */

export class BahanTidakSah extends Error {
  constructor(public bahanId: number) {
    super(`bahan ${bahanId} tidak ditemukan atau bukan milik pengguna ini`);
  }
}

/**
 * Daftar bahan beserta stoknya.
 *
 * LEFT JOIN, dan `jumlah` tetap NULL kalau bahannya belum pernah dicatat —
 * bukan 0. Mengatakan "stok 0" kepada pedagang yang belum sempat mengisi
 * berarti mengaku tahu sesuatu yang tidak kita tahu. Konsisten dengan
 * v_kapasitas_produk di db/schema.sql.
 */
export function daftarStok(userId: number): Promise<StokBahan[]> {
  return query<StokBahan>(
    // ::float8 bukan sekadar kerapian: NUMERIC mentah keluar sebagai STRING,
    // sehingga API mengirim "7" padahal kontraknya number — dan frontend yang
    // membandingkan atau menjumlahkannya akan salah tanpa pesan galat.
    // Float aman di sini karena ini kuantitas bahan, bukan uang; uang tetap
    // INTEGER rupiah.
    `SELECT b.id AS bahan_id, b.nama, b.satuan, s.jumlah::float8 AS jumlah, s.diperbarui
     FROM bahan b
     LEFT JOIN stok s ON s.bahan_id = b.id AND s.user_id = $1
     WHERE b.user_id = $1
     ORDER BY b.nama ASC`,
    [userId],
  );
}

/**
 * Catat stok beberapa bahan sekaligus, dalam satu transaksi database.
 *
 * Kepemilikan bahan diperiksa DI DALAM query lewat `SELECT ... WHERE user_id`,
 * bukan disaring setelahnya. Kalau bahannya bukan milik pengguna ini, tidak
 * ada baris yang terpilih dan seluruh batch dibatalkan.
 */
export function simpanStok(userId: number, baris: BarisStok[]): Promise<number> {
  return transaksiDb(async (c: Pelaksana) => {
    for (const b of baris) {
      const hasil = await c.query(
        `INSERT INTO stok (user_id, bahan_id, jumlah, diperbarui)
         SELECT $1, bh.id, $3, now()
         FROM bahan bh
         WHERE bh.id = $2 AND bh.user_id = $1
         ON CONFLICT (user_id, bahan_id)
           DO UPDATE SET jumlah = EXCLUDED.jumlah, diperbarui = now()
         RETURNING id`,
        [userId, b.bahan_id, b.jumlah],
      );
      if (hasil.rows.length === 0) throw new BahanTidakSah(b.bahan_id);
    }
    return baris.length;
  });
}
