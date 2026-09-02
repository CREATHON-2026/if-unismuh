import { query, satu } from '../../db/index.ts';
import type { BarisTren, TerlarisPeriode } from './rekap.types.ts';

/**
 * Semua SQL Rekap ada di berkas ini. Tidak ada aritmetika di TypeScript.
 *
 * Yang TIDAK ada di sini: penjumlahan total periode. Itu memakai
 * `ringkasanPenjualan()` milik Beranda apa adanya — lihat rekap.service.ts.
 * Menulis rumus untung kedua di berkas ini tidak akan menghasilkan galat, hanya
 * dua layar yang diam-diam menyebut angka berbeda untuk minggu yang sama.
 */

/**
 * Titik grafik per hari, untuk `hari` hari terakhir termasuk hari ini.
 *
 * `generate_series` adalah inti kebenaran query ini, bukan kerapian.
 *
 * Tanpa deret tanggal, hari yang tidak ada penjualannya tidak punya baris di
 * `transaksi` dan hilang begitu saja dari hasil. Grafiknya lalu menarik garis
 * lurus dari Senin ke Rabu, dan Selasa yang sepi tampak seolah tidak pernah
 * ada — hari terburuk pedagang justru yang paling mudah tidak terlihat.
 * Menyembunyikan hari kosong adalah persis jenis kebohongan visual yang
 * aplikasi ini ada untuk menghapusnya.
 *
 * Aturan untungnya menyalin Beranda tepat sama: omzet menghitung semua karena
 * uang masuk selalu diketahui, untung hanya menghitung baris yang modal
 * produknya diketahui. LEFT JOIN, bukan JOIN — kalau dipakai JOIN, transaksi
 * atas produk tanpa resep hilang dari OMZET juga.
 *
 * Label hari dirakit SQL, bukan frontend. Kontraknya menyebut `label` sudah
 * siap tampil, dan `to_char(..., 'Dy')` mengeluarkan "Mon", bukan "Sen" —
 * jadi pemetaannya ditulis eksplisit.
 *
 * `tgl` ikut dikembalikan meski tidak ada di kontrak API. Service memakainya
 * sebagai batas rentang saat menghitung total, supaya total dan grafik dijamin
 * mencakup hari yang sama persis. Kalau batas itu dihitung di TypeScript,
 * zona waktu proses Node yang berbeda sehari dari `CURRENT_DATE` database akan
 * membuat totalnya tidak sama dengan jumlah titik grafiknya — selisih yang
 * muncul hanya di sekitar tengah malam dan mustahil ditebak dari layar.
 * Dicor ke `text` supaya bentuknya selalu 'YYYY-MM-DD', apa pun drivernya.
 */
export function trenHarian(userId: number, hari: number): Promise<BarisTren[]> {
  return query<BarisTren>(
    `WITH deret AS (
       SELECT generate_series(
         CURRENT_DATE - ($2::int - 1), CURRENT_DATE, interval '1 day'
       )::date AS tgl
     )
     SELECT
       d.tgl::text AS tgl,
       CASE EXTRACT(DOW FROM d.tgl)::int
         WHEN 0 THEN 'Min' WHEN 1 THEN 'Sen' WHEN 2 THEN 'Sel' WHEN 3 THEN 'Rab'
         WHEN 4 THEN 'Kam' WHEN 5 THEN 'Jum' ELSE 'Sab'
       END AS label,
       COALESCE(SUM(t.jumlah * t.harga_satuan), 0)::int AS omzet,
       COALESCE(SUM(t.jumlah * (t.harga_satuan - m.modal_per_unit))
                FILTER (WHERE m.modal_per_unit IS NOT NULL), 0)::int AS untung_bersih
     FROM deret d
     LEFT JOIN transaksi t        ON t.tanggal = d.tgl AND t.user_id = $1
     LEFT JOIN v_margin_produk m  ON m.produk_id = t.produk_id
     GROUP BY d.tgl
     ORDER BY d.tgl`,
    [userId, hari],
  );
}

/**
 * Produk yang paling banyak TERJUAL sepanjang periode.
 *
 * Diurutkan menurut jumlah unit, bukan nilai rupiah — "paling laku" di kepala
 * pedagang berarti paling sering keluar dari etalase, dan itu justru yang
 * membuat temuan produk ini menohok: barang yang paling laku bisa saja barang
 * yang paling merugikan.
 *
 * Ditulis di modul ini, bukan diambil dari modul lain: query serupa di
 * `tanya.queries.ts` sudah dihapus saat chatbot dirancang ulang, dan
 * menyandarkan layar Rekap pada modul yang sedang dibongkar berarti Rekap ikut
 * jatuh setiap kali chatbot berubah.
 */
export function produkTerlarisPeriode(
  userId: number, hari: number,
): Promise<TerlarisPeriode | null> {
  return satu<TerlarisPeriode>(
    `SELECT p.id, p.nama, SUM(t.jumlah)::float8 AS jumlah_terjual
     FROM transaksi t
     JOIN produk p ON p.id = t.produk_id AND p.user_id = $1
     WHERE t.user_id = $1
       AND t.tanggal > CURRENT_DATE - $2::int
     GROUP BY p.id, p.nama
     ORDER BY SUM(t.jumlah) DESC, p.nama ASC
     LIMIT 1`,
    [userId, hari],
  );
}
