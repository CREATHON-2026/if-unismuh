import { query, satu } from '../../db/index.ts';
import type { RingkasanProduk, RincianBahan } from '../../../../shared/types.ts';

/**
 * Semua SQL domain produk ada di berkas ini.
 *
 * Tidak ada aritmetika di TypeScript. Modal, margin, dan penanda merugi dibaca
 * dari view v_margin_produk; kontribusi biaya tiap bahan dihitung di dalam
 * query di bawah. Aturan #1.
 */

/**
 * Daftar produk, diurutkan dari margin TERENDAH.
 *
 * Urutan itu bagian dari fiturnya, bukan selera: fitur 6 adalah "deteksi produk
 * merugi", jadi yang paling merugi harus terlihat lebih dulu tanpa pedagang
 * perlu mencari.
 *
 * `terlaris` dihitung sepanjang waktu, bukan per periode — sifatnya melekat
 * pada produknya, dan angka yang berubah-ubah mengikuti rentang tanggal justru
 * membingungkan. NULLS LAST supaya produk yang resepnya belum diisi (margin
 * NULL) tidak menumpuk di atas dan menutupi yang benar-benar merugi.
 */
export function daftarProduk(userId: number): Promise<RingkasanProduk[]> {
  return query<RingkasanProduk>(
    `WITH terjual AS (
       SELECT produk_id, SUM(jumlah) AS total
       FROM transaksi WHERE user_id = $1 AND produk_id IS NOT NULL
       GROUP BY produk_id
     ), teratas AS (
       SELECT produk_id FROM terjual ORDER BY total DESC LIMIT 1
     )
     SELECT
       m.produk_id AS id,
       m.nama,
       m.harga_jual,
       m.modal_per_unit,
       m.margin_per_unit,
       COALESCE(m.merugi, false) AS merugi,
       (t.produk_id IS NOT NULL) AS terlaris
     FROM v_margin_produk m
     LEFT JOIN teratas t ON t.produk_id = m.produk_id
     WHERE m.user_id = $1
     ORDER BY m.margin_per_unit ASC NULLS LAST, m.nama ASC`,
    [userId],
  );
}

export interface DetailDasar extends RingkasanProduk {
  hasil_per_batch: number | null;
  total_terjual: number;
}

export function detailProduk(id: number, userId: number): Promise<DetailDasar | null> {
  return satu<DetailDasar>(
    `SELECT
       m.produk_id AS id,
       m.nama,
       m.harga_jual,
       m.modal_per_unit,
       m.margin_per_unit,
       COALESCE(m.merugi, false) AS merugi,
       m.hasil_per_batch,
       COALESCE((SELECT SUM(jumlah) FROM transaksi
                 WHERE user_id = $2 AND produk_id = $1), 0)::int AS total_terjual,
       COALESCE((SELECT SUM(jumlah) FROM transaksi
                 WHERE user_id = $2 AND produk_id = $1), 0)
         >= COALESCE((SELECT MAX(t2.total) FROM (
              SELECT SUM(jumlah) AS total FROM transaksi
              WHERE user_id = $2 AND produk_id IS NOT NULL GROUP BY produk_id
            ) t2), 0)
         AND EXISTS (SELECT 1 FROM transaksi WHERE user_id = $2 AND produk_id = $1)
         AS terlaris
     FROM v_margin_produk m
     WHERE m.produk_id = $1 AND m.user_id = $2`,
    [id, userId],
  );
}

/**
 * Kontribusi tiap bahan terhadap modal SATU unit produk.
 *
 * Rumusnya sengaja identik dengan yang dipakai v_modal_produk:
 *   (harga_beli / jumlah_beli * jumlah_pakai) / hasil_per_batch
 *
 * Kalau keduanya berbeda, rincian di layar detail tidak akan berjumlah sama
 * dengan modal yang ditampilkan di atasnya — dan pedagang yang melihat itu
 * berhenti percaya pada semua angka lainnya.
 */
export function bahanProduk(produkId: number, userId: number): Promise<RincianBahan[]> {
  return query<RincianBahan>(
    `SELECT
       b.nama,
       b.satuan,
       r.jumlah_pakai,
       ROUND((b.harga_beli::numeric / b.jumlah_beli * r.jumlah_pakai)
             / NULLIF(p.hasil_per_batch, 0))::int AS biaya_per_unit
     FROM resep r
     JOIN bahan b  ON b.id = r.bahan_id
     JOIN produk p ON p.id = r.produk_id
     WHERE r.produk_id = $1 AND p.user_id = $2
     ORDER BY biaya_per_unit DESC`,
    [produkId, userId],
  );
}
