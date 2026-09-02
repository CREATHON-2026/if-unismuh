import { query, satu } from '../../db/index.ts';
import type {
  BarisBahan, BarisBulan, BarisPenjualan, BarisPesanan, BarisProduk, BarisResep,
  GiliranPercakapan, ProfilUsaha, RingkasanPeriode,
} from './tanya.types.ts';

/**
 * Semua SQL chatbot ada di berkas ini.
 *
 * Tugasnya cuma satu: mengambil SELURUH data pedagang supaya model punya
 * bahan selengkap mungkin. Tidak ada query per-pertanyaan, karena tidak ada
 * daftar pertanyaan — apa pun yang ditanyakan, jawabannya dicari model
 * sendiri dari data yang sudah tersaji.
 *
 * Setiap query ber-`WHERE user_id = $1`. Itu satu-satunya batasan yang tersisa,
 * dan bukan soal chatbot: pedagang lain tidak boleh terlihat.
 */

/** Batas baris supaya konteksnya tidak meledak di usaha yang sudah ramai. */
const BATAS = {
  produk: 40,
  bahan: 40,
  resep: 120,
  penjualan: 40,
  bulan: 6,
  pesanan: 10,
} as const;

export function profilUsaha(userId: number): Promise<ProfilUsaha | null> {
  return satu<ProfilUsaha>(
    'SELECT nama_usaha, jenis_usaha FROM pengguna WHERE id = $1', [userId],
  );
}

/** Omzet dan untung bulan berjalan — sama persis dengan angka di Beranda. */
export function ringkasanBulanIni(userId: number): Promise<RingkasanPeriode | null> {
  return satu<RingkasanPeriode>(
    `SELECT
       COALESCE(SUM(t.jumlah * t.harga_satuan), 0)::int AS omzet,
       COALESCE(SUM(t.jumlah * (t.harga_satuan - m.modal_per_unit))
                FILTER (WHERE m.modal_per_unit IS NOT NULL), 0)::int AS untung_bersih,
       COUNT(*)::int AS jumlah_baris,
       COUNT(*) FILTER (WHERE m.modal_per_unit IS NULL)::int AS baris_tanpa_modal
     FROM transaksi t
     LEFT JOIN v_margin_produk m ON m.produk_id = t.produk_id
     WHERE t.user_id = $1
       AND t.tanggal BETWEEN date_trunc('month', CURRENT_DATE)::date AND CURRENT_DATE`,
    [userId],
  );
}

/**
 * Omzet dan untung per bulan.
 *
 * Ada supaya pertanyaan pembanding — "bulan ini lebih baik dari bulan lalu?" —
 * bisa dijawab tanpa model menebak.
 */
export function ringkasanBulanan(userId: number): Promise<BarisBulan[]> {
  return query<BarisBulan>(
    `SELECT to_char(date_trunc('month', t.tanggal), 'YYYY-MM') AS bulan,
            COALESCE(SUM(t.jumlah * t.harga_satuan), 0)::int   AS omzet,
            COALESCE(SUM(t.jumlah * (t.harga_satuan - m.modal_per_unit))
                     FILTER (WHERE m.modal_per_unit IS NOT NULL), 0)::int AS untung_bersih,
            COUNT(*)::int AS jumlah_baris
     FROM transaksi t
     LEFT JOIN v_margin_produk m ON m.produk_id = t.produk_id
     WHERE t.user_id = $1
     GROUP BY 1
     ORDER BY 1 DESC
     LIMIT ${BATAS.bulan}`,
    [userId],
  );
}

/**
 * Satu baris per produk, berisi semua yang bisa diketahui tentangnya.
 *
 * Margin, kapasitas bahan, saran harga, penjualan bulan berjalan, dan
 * penjualan sepanjang masa digabung sekali di sini. Diurutkan dari yang paling
 * laku: kalau daftarnya panjang dan terpotong, yang paling penting bagi
 * pedagang tetap masuk.
 */
export function daftarProduk(userId: number): Promise<BarisProduk[]> {
  return query<BarisProduk>(
    `SELECT m.produk_id, m.nama, m.harga_jual,
            m.modal_per_unit, m.margin_per_unit, m.merugi,
            k.maks_unit,
            s.harga_disarankan,
            s.untung_per_unit                 AS untung_per_unit_disarankan,
            COALESCE(bulan.terjual, 0)::float AS terjual_periode,
            COALESCE(bulan.omzet, 0)::int     AS omzet_periode,
            COALESCE(semua.terjual, 0)::float AS terjual_total
     FROM v_margin_produk m
     LEFT JOIN v_kapasitas_produk k ON k.produk_id = m.produk_id
     LEFT JOIN v_saran_harga      s ON s.produk_id = m.produk_id
     LEFT JOIN (
       SELECT t.produk_id,
              SUM(t.jumlah)                  AS terjual,
              SUM(t.jumlah * t.harga_satuan) AS omzet
       FROM transaksi t
       WHERE t.user_id = $1
         AND t.tanggal BETWEEN date_trunc('month', CURRENT_DATE)::date AND CURRENT_DATE
       GROUP BY t.produk_id
     ) bulan ON bulan.produk_id = m.produk_id
     LEFT JOIN (
       SELECT t.produk_id, SUM(t.jumlah) AS terjual
       FROM transaksi t WHERE t.user_id = $1 GROUP BY t.produk_id
     ) semua ON semua.produk_id = m.produk_id
     WHERE m.user_id = $1
     ORDER BY COALESCE(bulan.terjual, 0) DESC, m.nama
     LIMIT ${BATAS.produk}`,
    [userId],
  );
}

/**
 * Bahan beserta harga beli dan sisa stoknya.
 *
 * `stok` null berarti belum pernah dicatat. Itu BUKAN nol, dan pembedaannya
 * dijaga sampai ke prompt.
 */
export function daftarBahan(userId: number): Promise<BarisBahan[]> {
  return query<BarisBahan>(
    `SELECT b.nama, b.satuan, b.harga_beli,
            b.jumlah_beli::float AS jumlah_beli,
            s.jumlah::float      AS stok
     FROM bahan b
     LEFT JOIN stok s ON s.bahan_id = b.id AND s.user_id = b.user_id
     WHERE b.user_id = $1
     ORDER BY b.nama
     LIMIT ${BATAS.bahan}`,
    [userId],
  );
}

/** Resep: bahan apa saja yang masuk ke tiap produk, dan sebanyak apa. */
export function daftarResep(userId: number): Promise<BarisResep[]> {
  return query<BarisResep>(
    `SELECT p.nama AS produk, b.nama AS bahan,
            r.jumlah_pakai::float AS jumlah, b.satuan
     FROM resep r
     JOIN produk p ON p.id = r.produk_id
     JOIN bahan  b ON b.id = r.bahan_id
     WHERE p.user_id = $1
     ORDER BY p.nama, b.nama
     LIMIT ${BATAS.resep}`,
    [userId],
  );
}

/** Penjualan terakhir, apa adanya — supaya "kapan terakhir laku" bisa dijawab. */
export function penjualanTerakhir(userId: number): Promise<BarisPenjualan[]> {
  return query<BarisPenjualan>(
    `SELECT to_char(t.tanggal, 'YYYY-MM-DD') AS tanggal,
            p.nama AS nama_produk,
            t.jumlah::float AS jumlah,
            t.harga_satuan, t.sumber
     FROM transaksi t
     LEFT JOIN produk p ON p.id = t.produk_id
     WHERE t.user_id = $1
     ORDER BY t.tanggal DESC, t.id DESC
     LIMIT ${BATAS.penjualan}`,
    [userId],
  );
}

/** Pesanan masuk terakhir, supaya pertanyaan soal pembeli juga bisa dijawab. */
export function pesananTerakhir(userId: number): Promise<BarisPesanan[]> {
  return query<BarisPesanan>(
    `SELECT to_char(diterima_pada, 'YYYY-MM-DD HH24:MI') AS diterima_pada,
            pengirim_samar, teks
     FROM pesan_masuk
     WHERE user_id = $1
     ORDER BY diterima_pada DESC
     LIMIT ${BATAS.pesanan}`,
    [userId],
  );
}

// ---------------------------------------------------------------------------
// Ingatan percakapan
// ---------------------------------------------------------------------------

/**
 * Giliran terakhir, urut dari yang paling lama.
 *
 * `ORDER BY id DESC LIMIT n` lalu dibalik: mengambil n TERAKHIR butuh urutan
 * menurun di SQL, sedangkan model membacanya dari yang paling lama.
 */
export async function riwayat(userId: number, batas: number): Promise<GiliranPercakapan[]> {
  const baris = await query<GiliranPercakapan>(
    `SELECT peran, teks FROM percakapan
     WHERE user_id = $1 ORDER BY id DESC LIMIT $2`,
    [userId, batas],
  );
  return baris.reverse();
}

export async function simpanGiliran(
  userId: number, pertanyaan: string, jawaban: string, batasSimpan: number,
): Promise<void> {
  await query(
    `INSERT INTO percakapan (user_id, peran, teks)
     VALUES ($1, 'pedagang', $2), ($1, 'asisten', $3)`,
    [userId, pertanyaan, jawaban],
  );
  // Dipangkas tiap giliran, bukan lewat pekerjaan terjadwal: riwayat chatbot
  // tidak punya nilai arsip, dan tabel yang tumbuh selamanya adalah tabel yang
  // suatu saat memperlambat pertanyaan berikutnya.
  await query(
    `DELETE FROM percakapan
     WHERE user_id = $1
       AND id NOT IN (
         SELECT id FROM percakapan WHERE user_id = $1 ORDER BY id DESC LIMIT $2
       )`,
    [userId, batasSimpan],
  );
}
