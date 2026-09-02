import { query, satu } from '../../db/index.ts';
import type {
  BarisKapasitas, BarisMerugi, BarisModal, BarisSaranHarga, BarisTerlaris,
} from './tanya.types.ts';

/**
 * Semua SQL chatbot ada di berkas ini. Tidak ada aritmetika di TypeScript.
 *
 * Tidak ada satu pun view baru di sini: setiap pertanyaan dijawab oleh view
 * yang sudah dipakai layar lain. Itu disengaja. Kalau chatbot punya query
 * sendiri, cepat atau lambat ia akan menjawab angka yang berbeda dari Beranda
 * untuk pertanyaan yang sama — dan pedagang tidak punya cara tahu mana yang
 * benar.
 *
 * Untung dan omzet TIDAK diquery di sini sama sekali. Keduanya dibaca lewat
 * `ringkasanPenjualan()` milik Beranda, supaya jawabannya dijamin sama persis
 * dengan angka besar di layar depan.
 */

/**
 * Produk yang harga jualnya di bawah modal, termurah dulu.
 *
 * Membaca v_margin_produk, yang tidak menyentuh transaksi sama sekali —
 * pertanyaan ini bisa dijawab bahkan oleh pedagang yang belum mencatat satu
 * penjualan pun.
 */
export function produkMerugi(userId: number, batas = 3): Promise<BarisMerugi[]> {
  return query<BarisMerugi>(
    `SELECT nama, harga_jual, modal_per_unit, margin_per_unit,
            ABS(margin_per_unit)::int AS rugi_per_unit
     FROM v_margin_produk
     WHERE user_id = $1 AND merugi
     ORDER BY margin_per_unit ASC
     LIMIT $2`,
    [userId, batas],
  );
}

export function modalProduk(userId: number, produkId: number): Promise<BarisModal | null> {
  return satu<BarisModal>(
    `SELECT nama, harga_jual, modal_per_unit, margin_per_unit,
            ABS(margin_per_unit)::int AS rugi_per_unit
     FROM v_margin_produk
     WHERE user_id = $1 AND produk_id = $2`,
    [userId, produkId],
  );
}

/**
 * Harga yang disarankan untuk satu produk.
 *
 * Mengembalikan null kalau harganya SUDAH mencukupi — v_saran_harga memang
 * menyaring produk yang sudah mencapai target. Jadi "null" di sini berarti
 * "tidak ada yang perlu dinaikkan", bukan "tidak tahu", dan jawabannya
 * dibedakan di tanya.service.ts.
 */
export function saranHarga(userId: number, produkId: number): Promise<BarisSaranHarga | null> {
  return satu<BarisSaranHarga>(
    `SELECT m.nama, m.harga_jual,
            s.harga_impas, s.harga_disarankan, s.kenaikan, s.untung_per_unit
     FROM v_saran_harga s
     JOIN v_margin_produk m ON m.produk_id = s.produk_id
     WHERE s.user_id = $1 AND s.produk_id = $2`,
    [userId, produkId],
  );
}

/**
 * Bahan yang ada cukup untuk berapa unit.
 *
 * `maks_unit` null berarti ada bahan yang stoknya belum pernah dicatat. Itu
 * BUKAN nol, dan jawabannya tidak boleh menyebut angka apa pun — lihat catatan
 * di v_kapasitas_produk.
 */
export function kapasitasProduk(userId: number, produkId: number): Promise<BarisKapasitas | null> {
  return satu<BarisKapasitas>(
    `SELECT p.nama, k.maks_unit
     FROM v_kapasitas_produk k
     JOIN produk p ON p.id = k.produk_id
     WHERE k.user_id = $1 AND k.produk_id = $2`,
    [userId, produkId],
  );
}

/**
 * Produk paling laku dalam satu rentang tanggal.
 *
 * Diurutkan berdasarkan BANYAKNYA yang terjual, bukan omzet — "paling laku"
 * dalam bahasa pedagang berarti paling sering keluar, dan produk mahal yang
 * terjual dua kali bukan produk yang laku.
 *
 * Bawaan periodenya sama dengan Beranda: bulan berjalan.
 */
export function produkTerlaris(
  userId: number, dari: string | null, sampai: string | null, batas = 3,
): Promise<BarisTerlaris[]> {
  return query<BarisTerlaris>(
    `SELECT p.nama,
            SUM(t.jumlah)::float                  AS jumlah_terjual,
            SUM(t.jumlah * t.harga_satuan)::int   AS omzet
     FROM transaksi t
     JOIN produk p ON p.id = t.produk_id
     WHERE t.user_id = $1
       AND t.tanggal BETWEEN COALESCE($2::date, date_trunc('month', CURRENT_DATE)::date)
                         AND COALESCE($3::date, CURRENT_DATE)
     GROUP BY p.id, p.nama
     ORDER BY jumlah_terjual DESC
     LIMIT $4`,
    [userId, dari, sampai, batas],
  );
}
