import { query, satu, transaksiDb, type Pelaksana } from '../../db/index.ts';
import type { CaraBayar, StatusPesanan } from '../../../../shared/types.ts';
import { tulisBaris } from '../transaksi/transaksi.queries.ts';

/**
 * Semua SQL domain proses pesanan ada di berkas ini.
 *
 * Dua hal yang membuat berkas ini boleh dipercaya:
 *
 *   1. TIDAK ADA ARITMETIKA DI TYPESCRIPT. Nilai pesanan, modal, dan untung
 *      semuanya dibaca dari view `v_pesanan`. Kalau layar butuh angka baru,
 *      kolomnya ditambahkan di schema.sql — bukan dihitung di sini.
 *
 *   2. SETIAP PERUBAHAN STATUS DIKLAIM LEWAT `UPDATE ... WHERE status = ...`.
 *      Nol baris berarti seseorang sudah mendahului. Itu bukan kegagalan yang
 *      perlu ditebak-tebak — itu jawaban pasti dari database, dan satu-satunya
 *      cara memastikan pedagang yang menekan tombol dua kali karena ragu tidak
 *      mencatat penjualannya dua kali.
 */

/** Milik orang lain dan tidak ada sama sekali dijawab sama: 404. */
export class PesananTidakDitemukan extends Error {}

/** Sudah dibayar/diselesaikan/dibatalkan lebih dulu. */
export class PesananSudahDiproses extends Error {}

const KOLOM = `
  id, user_id, pesan_id, produk_id, nama_produk, jumlah, harga_satuan, tanggal,
  nomor, status, cara_bayar, dibayar_pada, midtrans_order_id, midtrans_status,
  midtrans_url, alasan_batal, transaksi_id, dibuat_pada, selesai_pada,
  teks_pesan, pengirim_samar, tanggal_dibutuhkan,
  nilai_pesanan, modal_per_unit, untung_pesanan, merugi, stok_cukup_untuk`;

export function ambilPesanan(userId: number, id: number) {
  return satu(`SELECT ${KOLOM} FROM v_pesanan WHERE id = $1 AND user_id = $2`, [id, userId]);
}

/**
 * Buat pesanan baru dan beri nomor hariannya.
 *
 * INSERT ... SELECT, pola yang sama dengan `tulisBaris`: kepemilikan produk DAN
 * kepemilikan pesan diperiksa DI DALAM SQL. Kalau salah satunya bukan milik
 * pengguna ini, tidak ada baris terpilih — jadi tidak ada yang tersimpan, dan
 * pemanggil melihat nol baris lalu menjawab 404.
 *
 * `urutan_harian` dihitung dari MAX yang ada, dan dijaga UNIQUE di tabel. Dua
 * permintaan bersamaan bisa menghitung angka yang sama; yang kalah ditolak
 * database, lalu service mencoba ulang. Nomor kembar mustahil lolos.
 */
export async function buatPesanan(
  userId: number,
  pesanId: number | null,
  produkId: number,
  jumlah: number,
  hargaSatuan: number,
): Promise<number | null> {
  const baris = await query<{ id: number }>(
    `INSERT INTO pesanan (user_id, pesan_id, produk_id, jumlah, harga_satuan, tanggal, urutan_harian)
     SELECT $1, $2, p.id, $4, $5, CURRENT_DATE,
            COALESCE((SELECT MAX(urutan_harian) FROM pesanan
                      WHERE user_id = $1 AND tanggal = CURRENT_DATE), 0) + 1
     FROM produk p
     WHERE p.id = $3 AND p.user_id = $1
       AND ($2::bigint IS NULL
            OR EXISTS (SELECT 1 FROM pesan_masuk pm WHERE pm.id = $2 AND pm.user_id = $1))
     RETURNING id`,
    [userId, pesanId, produkId, jumlah, hargaSatuan],
  );
  return baris[0]?.id ?? null;
}

/**
 * Lewati langkah pembayaran.
 *
 * Statusnya jadi 'diproses' — TAHAP PENYERAHAN, bukan keadaan uang.
 * `dibayar_pada` hanya terisi kalau uangnya benar-benar sudah masuk, jadi
 * pesanan kasbon tidak pernah tampil "Lunas" di layar mana pun.
 */
export async function tandaiBayar(
  userId: number,
  id: number,
  cara: CaraBayar,
  midtrans?: { orderId: string; url: string; status: string },
): Promise<boolean> {
  const baris = await query(
    `UPDATE pesanan
     SET status = 'diproses',
         cara_bayar = $3,
         dibayar_pada = CASE WHEN $3 = 'nanti' THEN NULL ELSE now() END,
         midtrans_order_id = COALESCE($4, midtrans_order_id),
         midtrans_url      = COALESCE($5, midtrans_url),
         midtrans_status   = COALESCE($6, midtrans_status)
     WHERE id = $1 AND user_id = $2 AND status = 'menunggu_bayar'
     RETURNING id`,
    [id, userId, cara, midtrans?.orderId ?? null, midtrans?.url ?? null, midtrans?.status ?? null],
  );
  return baris.length > 0;
}

/** Simpan tautan QRIS tanpa memindahkan status — pembelinya belum membayar. */
export async function simpanTagihanQris(
  userId: number, id: number, orderId: string, url: string, status: string,
): Promise<boolean> {
  const baris = await query(
    `UPDATE pesanan
     SET midtrans_order_id = $3, midtrans_url = $4, midtrans_status = $5
     WHERE id = $1 AND user_id = $2 AND status = 'menunggu_bayar'
     RETURNING id`,
    [id, userId, orderId, url, status],
  );
  return baris.length > 0;
}

/**
 * Catat hasil pengecekan status ke Midtrans.
 *
 * Kalau statusnya lunas, pesanannya ikut maju ke 'diproses' — tapi HANYA dari
 * 'menunggu_bayar'. Polling yang datang terlambat tidak boleh menarik mundur
 * pesanan yang sudah selesai.
 */
export async function perbaruiStatusQris(
  userId: number, id: number, status: string, lunas: boolean,
) {
  return satu(
    `UPDATE pesanan
     SET midtrans_status = $3,
         status       = CASE WHEN $4 AND status = 'menunggu_bayar' THEN 'diproses' ELSE status END,
         cara_bayar   = CASE WHEN $4 AND status = 'menunggu_bayar' THEN 'qris'     ELSE cara_bayar END,
         dibayar_pada = CASE WHEN $4 AND dibayar_pada IS NULL      THEN now()      ELSE dibayar_pada END
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [id, userId, status, lunas],
  );
}

export async function batalkanPesanan(
  userId: number, id: number, alasan: string,
): Promise<boolean> {
  // Pesanan yang sudah selesai TIDAK bisa dibatalkan. Barisnya sudah ada di
  // buku besar, dan buku besar tidak diedit — pembatalan setelah barang
  // diserahkan adalah retur, urusan yang berbeda dan bukan lingkup fitur ini.
  const baris = await query(
    `UPDATE pesanan
     SET status = 'batal', alasan_batal = $3
     WHERE id = $1 AND user_id = $2 AND status IN ('menunggu_bayar','diproses')
     RETURNING id`,
    [id, userId, alasan],
  );
  return baris.length > 0;
}

/**
 * Selesaikan pesanan: tulis buku besar, kurangi stok, simpan nomor transaksi.
 *
 * SATU transaksi database untuk ketiganya. Kalau pengurangan stok gagal setelah
 * barisnya tercatat, pedagang akan melihat untungnya naik sementara stoknya
 * tidak berkurang — dan selisih itu baru ketahuan berhari-hari kemudian saat
 * bahannya ternyata kurang.
 *
 * Mengembalikan null kalau pesanannya tidak dalam status 'diproses': entah
 * sudah selesai, sudah batal, atau belum melewati langkah bayar.
 */
export function selesaikanPesanan(userId: number, id: number): Promise<number | null> {
  return transaksiDb(async (c: Pelaksana) => {
    // 1. Klaim barisnya. Yang datang kedua menemukan nol baris dan berhenti
    //    di sini — sebelum satu pun angka tersentuh.
    const klaim = await c.query(
      `UPDATE pesanan
       SET status = 'selesai', selesai_pada = now()
       WHERE id = $1 AND user_id = $2 AND status = 'diproses'
       RETURNING produk_id, jumlah, harga_satuan, tanggal`,
      [id, userId],
    );
    if (klaim.rows.length === 0) return null;
    const p = klaim.rows[0];

    // 2. Buku besar. Lewat pintu yang sama dengan foto, suara, dan catatan
    //    manual — supaya tidak ada dua cara menulis penjualan yang bisa
    //    berbeda diam-diam. `sumber = 'pesanan'` membuat barisnya bisa
    //    ditelusuri balik ke chat pembelinya.
    const [transaksiId] = await tulisBaris(
      c, userId, p.tanggal,
      [{
        produk_id: Number(p.produk_id),
        jumlah: Number(p.jumlah),
        harga_satuan: Number(p.harga_satuan),
      }],
      'pesanan',
    );

    // 3. Stok bahan berkurang sesuai resep.
    //
    //    GREATEST(0, ...) bukan kemalasan: kolomnya punya CHECK (jumlah >= 0),
    //    dan angka minus akan MEMBATALKAN SELURUH TRANSAKSI ini — termasuk
    //    penjualan yang sah. Pedagang yang catatan stoknya tertinggal tidak
    //    boleh kehilangan catatan penjualannya karena itu.
    //
    //    Bahan yang belum pernah dicatat stoknya sengaja tidak disentuh: tidak
    //    ada baris untuk di-UPDATE, dan yang tidak diketahui harus tetap tidak
    //    diketahui. Membuatkan barisnya di sini sama dengan mengarang angka.
    await c.query(
      `UPDATE stok s
       SET jumlah = GREATEST(0, s.jumlah - (r.jumlah_pakai / pr.hasil_per_batch) * $3),
           diperbarui = now()
       FROM resep r
       JOIN produk pr ON pr.id = r.produk_id
       WHERE r.produk_id = $2
         AND s.bahan_id = r.bahan_id
         AND s.user_id = $1
         AND pr.hasil_per_batch IS NOT NULL`,
      [userId, p.produk_id, p.jumlah],
    );

    // 4. Jembatan ke buku besar, supaya struk bisa menyebut nomor transaksinya.
    await c.query(
      'UPDATE pesanan SET transaksi_id = $3 WHERE id = $1 AND user_id = $2',
      [id, userId, transaksiId],
    );

    return transaksiId;
  });
}

export function daftarPesanan(userId: number, status: StatusPesanan | null) {
  return query(
    `SELECT ${KOLOM} FROM v_pesanan
     WHERE user_id = $1 AND ($2::text IS NULL OR status = $2)
     ORDER BY dibuat_pada DESC
     LIMIT 100`,
    [userId, status],
  );
}

/**
 * Ringkasan riwayat — dihitung SQL, bukan dengan menjumlahkan daftar di atas.
 *
 * Daftarnya dibatasi 100 baris; menjumlahkan dari sana akan diam-diam salah
 * begitu pedagang punya pesanan ke-101. Ini persis jenis kesalahan yang tidak
 * pernah terlihat saat menguji dengan data sedikit.
 */
export function ringkasanPesanan(userId: number) {
  return satu(
    `SELECT
       COUNT(*)::int                                              AS total,
       COUNT(*) FILTER (WHERE status = 'menunggu_bayar')::int     AS menunggu_bayar,
       COUNT(*) FILTER (WHERE status = 'diproses')::int           AS diproses,
       COUNT(*) FILTER (WHERE status = 'selesai')::int            AS selesai,
       COUNT(*) FILTER (WHERE status = 'batal')::int              AS gagal,
       COUNT(*) FILTER (WHERE status <> 'batal'
                          AND dibayar_pada IS NULL
                          AND cara_bayar IS NOT NULL)::int        AS belum_dibayar,
       COALESCE(SUM(untung_pesanan) FILTER (WHERE status = 'selesai'), 0)::int AS untung
     FROM v_pesanan
     WHERE user_id = $1`,
    [userId],
  );
}

/**
 * Data struk 58 mm.
 *
 * Perhatikan kolom yang TIDAK diambil: modal_per_unit, untung_pesanan, merugi.
 * Struk ini dilihat pembeli, dan margin adalah rahasia dagang. Disaring di
 * SQL, bukan disembunyikan dengan CSS — yang disembunyikan CSS tetap terkirim
 * lewat kabel dan bisa dibaca siapa pun yang membuka tab jaringan.
 */
export function ambilStruk(userId: number, id: number) {
  return satu(
    `SELECT v.nomor, v.transaksi_id, u.nama_usaha, v.nama_produk,
            v.jumlah, v.harga_satuan, v.nilai_pesanan AS total,
            v.cara_bayar,
            (v.dibayar_pada IS NOT NULL) AS lunas,
            to_char(v.tanggal, 'DD-MM-YYYY')                            AS tanggal,
            to_char(COALESCE(v.selesai_pada, v.dibuat_pada), 'HH24:MI') AS waktu
     FROM v_pesanan v
     JOIN pengguna u ON u.id = v.user_id
     WHERE v.id = $1 AND v.user_id = $2`,
    [id, userId],
  );
}
