import { query, transaksiDb, type Pelaksana } from '../../db/index.ts';
import type { BarisTransaksi } from '../../../../shared/types.ts';

/**
 * Semua SQL domain transaksi ada di berkas ini.
 *
 * Harga yang berlaku ditentukan SQL lewat COALESCE, bukan di TypeScript —
 * sama seperti `harga_dipakai` di pesanan.queries.ts. Kalau dua tempat
 * memutuskan harga mana yang dipakai, cepat atau lambat keduanya berbeda.
 */

export class ProdukTidakSah extends Error {
  constructor(public produkId: number) {
    super(`produk ${produkId} tidak ditemukan atau bukan milik pengguna ini`);
  }
}

/**
 * Simpan banyak baris sekaligus, dalam SATU transaksi database.
 *
 * Masuk semua atau tidak sama sekali. Setengah tercatat lebih buruk daripada
 * gagal: pedagang akan mengira semuanya masuk, dan angka di Beranda diam-diam
 * salah tanpa ada yang tahu.
 */
export function simpanTransaksi(
  userId: number, tanggal: string | null, baris: BarisTransaksi[],
): Promise<number> {
  return transaksiDb(async (c: Pelaksana) => {
    for (const b of baris) {
      // INSERT ... SELECT: kepemilikan produk DAN harga bawaan diperiksa di
      // dalam SQL sekaligus. Kalau produknya bukan milik pengguna ini,
      // tidak ada baris yang terpilih — jadi tidak ada yang tersimpan.
      const hasil = await c.query(
        `INSERT INTO transaksi (user_id, produk_id, jumlah, harga_satuan, tanggal, sumber)
         SELECT $1, p.id, $3, COALESCE($4::int, p.harga_jual),
                COALESCE($5::date, CURRENT_DATE), 'manual'
         FROM produk p
         WHERE p.id = $2 AND p.user_id = $1
         RETURNING id`,
        [userId, b.produk_id, b.jumlah, b.harga_satuan ?? null, tanggal],
      );
      if (hasil.rows.length === 0) throw new ProdukTidakSah(b.produk_id);
    }
    return baris.length;
  });
}

export function daftarTransaksi(userId: number, dari: string | null, sampai: string | null) {
  return query(
    `SELECT t.id, t.produk_id, p.nama AS nama_produk,
            t.jumlah, t.harga_satuan, t.tanggal, t.sumber
     FROM transaksi t
     LEFT JOIN produk p ON p.id = t.produk_id
     WHERE t.user_id = $1
       AND t.tanggal BETWEEN COALESCE($2::date, date_trunc('month', CURRENT_DATE)::date)
                         AND COALESCE($3::date, CURRENT_DATE)
     ORDER BY t.tanggal DESC, t.id DESC
     LIMIT 200`,
    [userId, dari, sampai],
  );
}
