import { query, satu, transaksiDb, type Pelaksana } from '../../db/index.ts';
import type { BarisKonfirmasi, SumberTransaksi } from '../../../../shared/types.ts';
import { tulisBaris } from '../transaksi/transaksi.queries.ts';
import type { HitungBaris } from './ekstraksi.types.ts';

/**
 * Semua SQL domain ekstraksi ada di berkas ini.
 *
 * Yang paling penting di sini: SUBTOTAL DAN TOTAL DIHITUNG SQL. Layar
 * konfirmasi di frontend menampilkan keduanya dan meminta hitung ulang setiap
 * kali pengguna menyunting satu baris. Kalau angka itu boleh dihitung di
 * browser, aturan #7 bocor lewat pintu belakang — dan dua tempat yang
 * menghitung akan berbeda begitu aturan harganya berubah.
 */

/**
 * Subtotal per baris dan total keseluruhan.
 *
 * `harga_satuan` yang kosong DIISI DARI harga jual produk yang tersimpan, di
 * dalam SQL — bukan di TypeScript, dan bukan dianggap nol. Pedagang yang
 * mengucapkan "laku 10 kripik" tanpa menyebut harga tetap mendapat angka yang
 * benar, dan aturannya sama persis dengan yang dipakai POST /transaksi.
 */
export function hitungBaris(
  userId: number, baris: BarisKonfirmasi[],
): Promise<HitungBaris[]> {
  return query<HitungBaris>(
    `WITH masukan AS (
       SELECT * FROM unnest($2::int[], $3::int[], $4::numeric[], $5::int[])
         AS t(urutan, produk_id, jumlah, harga_satuan)
     ), dihitung AS (
       SELECT
         m.urutan,
         m.jumlah,
         COALESCE(m.harga_satuan, p.harga_jual) AS harga_dipakai,
         ROUND(m.jumlah * COALESCE(m.harga_satuan, p.harga_jual))::int AS subtotal
       FROM masukan m
       LEFT JOIN produk p ON p.id = m.produk_id AND p.user_id = $1
     )
     SELECT
       urutan,
       harga_dipakai::int AS harga_satuan,
       COALESCE(subtotal, 0) AS subtotal,
       (SELECT COALESCE(SUM(jumlah), 0)::int   FROM dihitung) AS total_item,
       (SELECT COALESCE(SUM(subtotal), 0)::int FROM dihitung) AS total_belanja
     FROM dihitung
     ORDER BY urutan`,
    [
      userId,
      baris.map((b) => b.urutan),
      baris.map((b) => b.produk_id),
      baris.map((b) => b.jumlah),
      baris.map((b) => b.harga_satuan),
    ],
  );
}

/**
 * Simpan hasil ekstraksi dengan status `menunggu`.
 *
 * ★ Inilah yang membuat aturan #2 bukan sekadar tertulis. Hasil AI mendarat di
 * tabel `ekstraksi`, BUKAN di `transaksi`. Ia baru pindah setelah manusia
 * menekan konfirmasi — dan tidak ada jalur lain yang bisa memindahkannya.
 */
export async function simpanEkstraksi(
  userId: number, jenis: 'foto' | 'suara', hasilMentah: unknown,
): Promise<number> {
  const baris = await satu<{ id: number }>(
    `INSERT INTO ekstraksi (user_id, jenis, status, hasil_mentah)
     VALUES ($1, $2, 'menunggu', $3) RETURNING id`,
    [userId, jenis, JSON.stringify(hasilMentah)],
  );
  return baris!.id;
}

export class EkstraksiTidakSah extends Error {}

/**
 * Pindahkan baris ke `transaksi` dan tandai ekstraksinya selesai — dalam SATU
 * transaksi database.
 *
 * Statusnya diubah dengan `WHERE status = 'menunggu'`, jadi konfirmasi kedua
 * tidak menemukan baris dan seluruh transaksi dibatalkan. Tanpa itu, pengguna
 * yang menekan tombol dua kali karena ragu akan mencatat penjualannya dua kali
 * — dan tidak ada yang menyadarinya sampai angka Beranda terlihat aneh.
 */
export function konfirmasi(
  userId: number, ekstraksiId: number, baris: BarisKonfirmasi[], sumber: SumberTransaksi,
): Promise<number> {
  return transaksiDb(async (c: Pelaksana) => {
    const { rows } = await c.query(
      `UPDATE ekstraksi
       SET status = 'dikonfirmasi', dikonfirmasi_pada = now(), path_berkas = NULL
       WHERE id = $1 AND user_id = $2 AND status = 'menunggu'
       RETURNING id`,
      [ekstraksiId, userId],
    );
    if (rows.length === 0) throw new EkstraksiTidakSah();

    // Baris tanpa produk tidak bisa disimpan — pengguna melewatinya di layar
    // konfirmasi, dan melewatkan bukan kesalahan.
    const siap = baris
      .filter((b) => b.produk_id != null)
      .map((b) => ({
        produk_id: b.produk_id as number,
        jumlah: b.jumlah,
        ...(b.harga_satuan != null ? { harga_satuan: b.harga_satuan } : {}),
      }));

    // Tanggal diambil dari baris pertama yang punya; kalau tidak ada, hari ini.
    const tanggal = baris.find((b) => b.tanggal)?.tanggal ?? null;
    return tulisBaris(c, userId, tanggal, siap, sumber);
  });
}
