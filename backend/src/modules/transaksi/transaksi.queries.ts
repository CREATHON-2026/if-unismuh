import { query, transaksiDb, type Pelaksana } from '../../db/index.ts';
import type { BarisTransaksi, SumberTransaksi } from '../../../../shared/types.ts';

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
/**
 * Tulis baris penjualan memakai pelaksana yang SUDAH ada.
 *
 * Dipisahkan supaya modul ekstraksi bisa menulis baris DAN mengubah status
 * ekstraksinya dalam satu transaksi database yang sama. Kalau keduanya terpisah,
 * kegagalan di antaranya meninggalkan ekstraksi berstatus `menunggu` padahal
 * barisnya sudah masuk — dan konfirmasi berikutnya akan mencatatnya dua kali.
 *
 * `sumber` menentukan asal-usul baris. Itu bukan hiasan: inilah yang membuat
 * setiap angka di layar bisa ditelusuri sampai ke sumbernya saat juri bertanya.
 */
export async function tulisBaris(
  c: Pelaksana,
  userId: number,
  tanggal: string | null,
  baris: BarisTransaksi[],
  sumber: SumberTransaksi = 'manual',
): Promise<number> {
  for (const b of baris) {
    // INSERT ... SELECT: kepemilikan produk DAN harga bawaan diperiksa di
    // dalam SQL sekaligus. Kalau produknya bukan milik pengguna ini,
    // tidak ada baris yang terpilih — jadi tidak ada yang tersimpan.
    const hasil = await c.query(
      `INSERT INTO transaksi (user_id, produk_id, jumlah, harga_satuan, tanggal, sumber)
       SELECT $1, p.id, $3, COALESCE($4::int, p.harga_jual),
              COALESCE($5::date, CURRENT_DATE), $6
       FROM produk p
       WHERE p.id = $2 AND p.user_id = $1
       RETURNING id`,
      [userId, b.produk_id, b.jumlah, b.harga_satuan ?? null, tanggal, sumber],
    );
    if (hasil.rows.length === 0) throw new ProdukTidakSah(b.produk_id);
  }
  return baris.length;
}

export function simpanTransaksi(
  userId: number, tanggal: string | null, baris: BarisTransaksi[],
): Promise<number> {
  return transaksiDb((c: Pelaksana) => tulisBaris(c, userId, tanggal, baris, 'manual'));
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
