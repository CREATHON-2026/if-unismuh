import { query, satu } from '../../db/index.ts';
import type {
  BarisBahanFakta, BarisProdukFakta, GiliranPercakapan, HasilSimulasi, ProfilUsaha,
} from './tanya.types.ts';

/**
 * Semua SQL chatbot ada di berkas ini. Tidak ada aritmetika di TypeScript.
 *
 * Tidak ada satu pun view baru di sini: setiap angka dibaca dari view yang
 * sudah dipakai layar lain. Itu disengaja. Kalau chatbot punya rumus sendiri,
 * cepat atau lambat ia akan menjawab angka yang berbeda dari Beranda untuk
 * pertanyaan yang sama — dan pedagang tidak punya cara tahu mana yang benar.
 *
 * Untung dan omzet tingkat usaha TIDAK diquery di sini sama sekali. Keduanya
 * dibaca lewat `ringkasanPenjualan()` milik Beranda, supaya jawabannya dijamin
 * sama persis dengan angka besar di layar depan.
 */

/** Rentang bawaan = bulan berjalan, sama dengan Beranda. */
const RENTANG = `t.tanggal BETWEEN COALESCE($2::date, date_trunc('month', CURRENT_DATE)::date)
                               AND COALESCE($3::date, CURRENT_DATE)`;

/**
 * Satu baris per produk, berisi semua yang bisa diketahui tentangnya.
 *
 * Empat sumber digabung sekali di sini alih-alih empat query terpisah: margin,
 * kapasitas bahan, saran harga, dan penjualan periode. Chatbot bebas berarti
 * pertanyaan berikutnya tidak bisa ditebak, jadi semuanya harus sudah ada di
 * meja sebelum model membaca pertanyaannya.
 *
 * Diurutkan dari yang paling laku: kalau daftarnya panjang dan harus dipotong,
 * yang paling penting bagi pedagang tetap masuk.
 */
export function produkFakta(
  userId: number, dari: string | null = null, sampai: string | null = null,
): Promise<BarisProdukFakta[]> {
  return query<BarisProdukFakta>(
    `SELECT m.produk_id, m.nama, m.harga_jual,
            m.modal_per_unit, m.margin_per_unit, m.merugi,
            k.maks_unit,
            s.harga_disarankan,
            s.untung_per_unit             AS untung_per_unit_disarankan,
            COALESCE(j.terjual, 0)::float AS terjual_periode,
            COALESCE(j.omzet, 0)::int     AS omzet_periode
     FROM v_margin_produk m
     LEFT JOIN v_kapasitas_produk k ON k.produk_id = m.produk_id
     LEFT JOIN v_saran_harga      s ON s.produk_id = m.produk_id
     LEFT JOIN (
       SELECT t.produk_id,
              SUM(t.jumlah)                  AS terjual,
              SUM(t.jumlah * t.harga_satuan) AS omzet
       FROM transaksi t
       WHERE t.user_id = $1 AND ${RENTANG}
       GROUP BY t.produk_id
     ) j ON j.produk_id = m.produk_id
     WHERE m.user_id = $1
     ORDER BY COALESCE(j.terjual, 0) DESC, m.nama`,
    [userId, dari, sampai],
  );
}

/**
 * Bahan beserta harga beli dan sisa stoknya.
 *
 * `stok` null berarti belum pernah dicatat. Itu BUKAN nol, dan pembedaannya
 * dijaga sampai ke prompt — lihat catatan di v_kapasitas_produk.
 */
export function bahanFakta(userId: number): Promise<BarisBahanFakta[]> {
  return query<BarisBahanFakta>(
    `SELECT b.nama, b.satuan, b.harga_beli,
            b.jumlah_beli::float AS jumlah_beli,
            s.jumlah::float      AS stok
     FROM bahan b
     LEFT JOIN stok s ON s.bahan_id = b.id AND s.user_id = b.user_id
     WHERE b.user_id = $1
     ORDER BY b.nama`,
    [userId],
  );
}

export function profilUsaha(userId: number): Promise<ProfilUsaha | null> {
  return satu<ProfilUsaha>(
    'SELECT nama_usaha, jenis_usaha FROM pengguna WHERE id = $1', [userId],
  );
}

/**
 * "Kalau saya jual segini, jadinya bagaimana?" — dihitung SQL, bukan model.
 *
 * Ini satu-satunya alasan chatbot boleh menjawab pertanyaan pengandaian tanpa
 * melanggar aturan #1. Model memilih produknya dan menyebut harga barunya;
 * setiap rupiah yang keluar dari pengandaian itu lahir di query ini.
 *
 * `terjual_periode` dipakai apa adanya sebagai laju penjualan. Kita tidak tahu
 * apakah orang tetap membeli sebanyak itu setelah harganya naik — dan karena
 * tidak tahu, kalimat jawabannya wajib menyebut asumsinya.
 *
 * Mengembalikan null kalau modalnya belum diketahui: pengandaian di atas modal
 * yang tidak diketahui adalah angka karangan yang kebetulan keluar dari SQL.
 */
export function simulasiHarga(
  userId: number, produkId: number, hargaBaru: number,
): Promise<HasilSimulasi | null> {
  return satu<HasilSimulasi>(
    `SELECT m.nama,
            m.harga_jual                       AS harga_lama,
            $3::int                            AS harga_baru,
            m.modal_per_unit,
            ($3::int - m.modal_per_unit)::int  AS margin_baru,
            COALESCE(j.terjual, 0)::float      AS terjual_periode,
            ROUND(COALESCE(j.terjual, 0) * ($3::int - m.modal_per_unit))::int
              AS untung_periode_harga_baru,
            ROUND(COALESCE(j.terjual, 0) * ($3::int - m.harga_jual))::int
              AS selisih_untung
     FROM v_margin_produk m
     LEFT JOIN (
       SELECT t.produk_id, SUM(t.jumlah) AS terjual
       FROM transaksi t
       WHERE t.user_id = $1
         AND t.tanggal BETWEEN date_trunc('month', CURRENT_DATE)::date AND CURRENT_DATE
       GROUP BY t.produk_id
     ) j ON j.produk_id = m.produk_id
     WHERE m.user_id = $1 AND m.produk_id = $2 AND m.modal_per_unit IS NOT NULL`,
    [userId, produkId, hargaBaru],
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
 * `.reverse()` di sini membalik urutan larik, bukan menghitung apa pun.
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
