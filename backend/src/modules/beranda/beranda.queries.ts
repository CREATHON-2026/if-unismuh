import { satu } from '../../db/index.ts';

/**
 * Semua SQL Beranda ada di berkas ini. Tidak ada aritmetika di TypeScript.
 */

export interface RingkasanPenjualan {
  omzet: number;
  untung_bersih: number;
  jumlah_baris: number;
  baris_tanpa_modal: number;
}

/**
 * Omzet dan untung bersih untuk satu rentang tanggal.
 *
 * LEFT JOIN, bukan JOIN, dan untung memakai FILTER — ini disengaja.
 *
 * Transaksi atas produk yang modalnya tidak diketahui (resep belum diisi,
 * atau produknya sudah dihapus) tidak bisa dihitung untungnya. Kalau dipakai
 * JOIN biasa, baris itu hilang diam-diam dari OMZET juga — dan omzet jadi
 * lebih kecil dari kenyataan tanpa ada yang menyadarinya.
 *
 * Yang benar: omzet menghitung semuanya, karena uang masuk selalu diketahui.
 * Untung hanya menghitung yang modalnya diketahui. Dan `baris_tanpa_modal`
 * memberi tahu berapa banyak yang tidak terhitung, supaya angkanya jujur.
 */
export function ringkasanPenjualan(
  userId: number, dari: string | null, sampai: string | null,
): Promise<RingkasanPenjualan | null> {
  return satu<RingkasanPenjualan>(
    `SELECT
       COALESCE(SUM(t.jumlah * t.harga_satuan), 0)::int AS omzet,
       COALESCE(SUM(t.jumlah * (t.harga_satuan - m.modal_per_unit))
                FILTER (WHERE m.modal_per_unit IS NOT NULL), 0)::int AS untung_bersih,
       COUNT(*)::int AS jumlah_baris,
       COUNT(*) FILTER (WHERE m.modal_per_unit IS NULL)::int AS baris_tanpa_modal
     FROM transaksi t
     LEFT JOIN v_margin_produk m ON m.produk_id = t.produk_id
     WHERE t.user_id = $1
       AND t.tanggal BETWEEN COALESCE($2::date, date_trunc('month', CURRENT_DATE)::date)
                         AND COALESCE($3::date, CURRENT_DATE)`,
    [userId, dari, sampai],
  );
}

export interface TemuanProduk {
  jumlah_produk_merugi: number;
  nama: string | null;
  margin_per_unit: number | null;
}

/**
 * Produk merugi — dibaca dari v_margin_produk, yang hanya menyentuh produk,
 * resep, dan bahan. TIDAK butuh transaksi.
 *
 * Itulah yang membuat Beranda tetap punya isi tepat setelah onboarding:
 * temuan "1 produk Anda merugi" sudah ada sebelum penjualan pertama dicatat,
 * jadi momentum dari momen "RUGI Rp 1.200" tidak putus.
 */
export function temuanProduk(userId: number): Promise<TemuanProduk | null> {
  return satu<TemuanProduk>(
    `SELECT
       (SELECT COUNT(*)::int FROM v_margin_produk
        WHERE user_id = $1 AND merugi) AS jumlah_produk_merugi,
       t.nama,
       t.margin_per_unit
     FROM (SELECT 1) AS _
     LEFT JOIN LATERAL (
       SELECT nama, margin_per_unit
       FROM v_margin_produk
       WHERE user_id = $1 AND merugi
       ORDER BY margin_per_unit ASC
       LIMIT 1
     ) t ON true`,
    [userId],
  );
}
