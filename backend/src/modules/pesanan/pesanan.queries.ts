import { query, satu } from '../../db/index.ts';
import type { KandidatProduk } from '../../../../shared/types.ts';
import type { HitungPesanan, SimpanPesanArg } from './pesanan.types.ts';

/**
 * Semua SQL domain Pesanan Masuk ada di berkas ini — dan HANYA SQL.
 * Keputusan pencocokan (putuskanCocok) hidup di pesanan.service.ts.
 *
 * PERHATIKAN: tidak ada satu pun aritmetika finansial yang ditulis di
 * TypeScript. Nilai pesanan, untung, dan penanda merugi semuanya dihitung
 * di dalam query — lihat `hitungPesanan`. Aturan #1.
 */

// ---------------------------------------------------------------------------
// Pencocokan nama produk
// ---------------------------------------------------------------------------

/**
 * Batas bawah kandidat yang MASIH layak ditawarkan ke pengguna. Hasil
 * PENGUKURAN pg_trgm, bukan tebakan — tabel lengkapnya di pesanan.service.ts
 * (yang memegang ambang keputusan otomatis). Lihat docs/04-pipeline-ai.md.
 */
const AMBANG_TANYA = 0.40;

/**
 * Lepas klitik "-nya" yang sangat lazim di bahasa Indonesia lisan.
 *
 * Tanpa ini, "kripiknya" hanya berskor 0,333 terhadap "Kripik Pisang" — di
 * bawah ambang, jadi akan dianggap produk BARU dan membuat duplikat. Setelah
 * dilepas jadi 0,500, dan "kripik pisangnya" naik dari 0,722 ke 1,000.
 *
 * Hanya "-nya", tidak "-ku"/"-mu": keduanya jarang muncul di pesan pembeli dan
 * berisiko merusak kata biasa ("buku" -> "bu", "jamu" -> "ja"). Sisa kata juga
 * harus tetap >= 4 huruf supaya "punya" tidak jadi "pu".
 */
function lepasKlitik(nama: string): string {
  return nama
    .split(/\s+/)
    .map((k) => {
      const pangkas = k.replace(/nya$/i, '');
      return pangkas.length >= 4 ? pangkas : k;
    })
    .join(' ')
    .trim();
}

/**
 * Hapus huruf "e" — menjembatani e pepet dalam bahasa Indonesia.
 *
 * "keripik" adalah ejaan baku KBBI dan itulah yang dituliskan Web Speech,
 * sementara pedagang menyimpan produknya sebagai "kripik". Selisih satu huruf
 * itu menjatuhkan skor ke 0,706 — di bawah ambang — sehingga pedagang harus
 * mengonfirmasi manual setiap kali menyebut produknya sendiri dengan benar.
 * Pola yang sama: kerupuk/krupuk, terasi/trasi, mie/mi.
 *
 * Diterapkan ke KEDUA sisi, jadi "keripik pisang" vs "Kripik Pisang" menjadi
 * identik dan berskor 1,000.
 *
 * Terlihat kasar, dan memang. Yang membuatnya aman adalah GREATEST di bawah:
 * skor tidak pernah turun karenanya. Diuji lawan dengan pasangan yang HARUS
 * ditolak — "keripik singkong" vs "Kripik Pisang" hanya naik 0,240 -> 0,364,
 * masih jauh di bawah ambang. Nol salah cocok dari 10 produk realistis.
 */
function hapusE(nama: string): string {
  return nama.toLowerCase().replace(/e/g, '');
}

/**
 * Ambil skor TERTINGGI dari tiga bentuk: apa adanya, tanpa klitik, tanpa "e".
 *
 * Bukan mengganti yang asli. Kalau sebuah normalisasi justru merusak katanya,
 * skor asli tetap menang — jadi menambah bentuk baru tidak pernah bisa
 * memperburuk hasil, hanya bisa membantu.
 */
export function cariKandidatProduk(
  userId: number, namaMentah: string,
): Promise<KandidatProduk[]> {
  const tanpaKlitik = lepasKlitik(namaMentah);
  const tanpaE = hapusE(tanpaKlitik);
  // Ditulis sekali, dipakai dua kali (SELECT dan WHERE) supaya keduanya tidak
  // pernah berbeda — kalau berbeda, ambang menyaring skor yang berbeda dari
  // yang ditampilkan, dan itu bug yang sangat sulit dilihat.
  const skor = `GREATEST(
      similarity(nama, $2),
      similarity(nama, $3),
      similarity(replace(lower(nama), 'e', ''), $4)
    )`;
  return query<KandidatProduk>(
    `SELECT id, nama, ${skor} AS skor
     FROM produk
     WHERE user_id = $1 AND ${skor} >= $5
     ORDER BY skor DESC
     LIMIT 3`,
    [userId, namaMentah, tanpaKlitik, tanpaE, AMBANG_TANYA],
  );
}

// ---------------------------------------------------------------------------
// Perhitungan — semuanya di SQL
// ---------------------------------------------------------------------------

/**
 * Nilai pesanan, untung, merugi, dan kecukupan bahan — semuanya dihitung
 * database. Kalau harga yang diminta pembeli tidak disebut, dipakai harga
 * jual yang tersimpan.
 */
export function hitungPesanan(
  produkId: number, userId: number, jumlah: number | null, hargaDiminta: number | null,
): Promise<HitungPesanan | null> {
  return satu<HitungPesanan>(
    `SELECT
       m.produk_id,
       m.nama,
       m.modal_per_unit,
       m.harga_jual,
       COALESCE($4::int, m.harga_jual) AS harga_dipakai,
       CASE WHEN $3::numeric IS NULL THEN NULL
            ELSE ROUND($3::numeric * COALESCE($4::int, m.harga_jual))::int
       END AS nilai_pesanan,
       CASE WHEN $3::numeric IS NULL OR m.modal_per_unit IS NULL THEN NULL
            ELSE ROUND($3::numeric * (COALESCE($4::int, m.harga_jual) - m.modal_per_unit))::int
       END AS untung_pesanan,
       CASE WHEN m.modal_per_unit IS NULL THEN NULL
            ELSE (COALESCE($4::int, m.harga_jual) - m.modal_per_unit) < 0
       END AS merugi,
       k.maks_unit AS stok_cukup_untuk
     FROM v_margin_produk m
     LEFT JOIN v_kapasitas_produk k ON k.produk_id = m.produk_id
     WHERE m.produk_id = $1 AND m.user_id = $2`,
    [produkId, userId, jumlah, hargaDiminta],
  );
}

// ---------------------------------------------------------------------------
// Simpan & baca
// ---------------------------------------------------------------------------

export async function simpanPesan(a: SimpanPesanArg): Promise<number> {
  const baris = await satu<{ id: number }>(
    `INSERT INTO pesan_masuk
       (user_id, teks, sumber, pengirim_samar, pengirim_jid, jenis,
        nama_produk_mentah, produk_id, jumlah, harga_diminta,
        tanggal_dibutuhkan, keyakinan_cocok, perlu_dicek, hasil_mentah)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING id`,
    [a.userId, a.teks, a.sumber, a.pengirimSamar, a.pengirimJid, a.jenis,
     a.namaProdukMentah, a.produkId, a.jumlah, a.hargaDiminta,
     a.tanggalDibutuhkan, a.keyakinanCocok, a.perluDicek,
     JSON.stringify(a.hasilMentah)],
  );
  return baris!.id;
}

/** Daftar pesanan masuk terbaru, lengkap dengan angka yang dihitung SQL. */
export function daftarPesan(userId: number, batas = 30) {
  return query(
    `SELECT
       pm.id AS pesan_id, pm.jenis, pm.teks, pm.sumber, pm.pengirim_samar,
       pm.nama_produk_mentah, pm.jumlah::float8 AS jumlah, pm.harga_diminta,
       pm.tanggal_dibutuhkan, pm.perlu_dicek, pm.diterima_pada,
       pm.balasan_teks, pm.balasan_maksud, pm.balasan_acuan,
       pm.balasan_status, pm.balasan_dikirim_pada,
       -- Yang keluar hanya "ada alamatnya atau tidak", BUKAN alamatnya.
       -- Nomor pembeli tidak pernah menyeberang ke peramban.
       (pm.pengirim_jid IS NOT NULL) AS ada_alamat,
       pm.produk_id, m.nama AS nama_produk, m.modal_per_unit,
       CASE WHEN pm.jumlah IS NULL THEN NULL
            ELSE ROUND(pm.jumlah * COALESCE(pm.harga_diminta, m.harga_jual))::int
       END AS nilai_pesanan,
       CASE WHEN pm.jumlah IS NULL OR m.modal_per_unit IS NULL THEN NULL
            ELSE ROUND(pm.jumlah * (COALESCE(pm.harga_diminta, m.harga_jual) - m.modal_per_unit))::int
       END AS untung_pesanan,
       CASE WHEN m.modal_per_unit IS NULL THEN NULL
            ELSE (COALESCE(pm.harga_diminta, m.harga_jual) - m.modal_per_unit) < 0
       END AS merugi,
       k.maks_unit AS stok_cukup_untuk,
       ps.id AS pesanan_id, ps.nomor AS pesanan_nomor, ps.status AS pesanan_status
     FROM pesan_masuk pm
     LEFT JOIN v_margin_produk m   ON m.produk_id = pm.produk_id
     LEFT JOIN v_kapasitas_produk k ON k.produk_id = pm.produk_id
     -- Lewat v_pesanan, bukan tabel mentahnya, supaya nomor "0902-07" tetap
     -- dirakit di satu tempat saja. Pesanan yang HIDUP dari chat ini; yang
     -- batal sengaja dilewati: pembeli yang berubah pikiran lalu memesan lagi
     -- harus bisa diproses ulang, dan pesan yang tertutup selamanya karena satu
     -- salah tekan adalah jalan buntu yang tidak punya tombol keluar.
     LEFT JOIN LATERAL (
       SELECT p.id, p.nomor, p.status
       FROM v_pesanan p
       WHERE p.pesan_id = pm.id AND p.status <> 'batal'
       ORDER BY p.id DESC
       LIMIT 1
     ) ps ON TRUE
     WHERE pm.user_id = $1 AND pm.jenis <> 'bukan_pesanan'
     ORDER BY pm.diterima_pada DESC
     LIMIT $2`,
    [userId, batas],
  );
}

// ---------------------------------------------------------------------------
// Balasan otomatis
// ---------------------------------------------------------------------------

/**
 * Simpan draf balasan pada pesannya.
 *
 * `acuan` ikut disimpan, dan itu bukan kelengkapan administratif: ia yang
 * membuat tiap rupiah di kalimat bisa dicocokkan ke angka SQL asalnya. Tanpa
 * itu, kalimat yang mengarang dan kalimat yang benar terlihat persis sama.
 */
export function simpanDraf(
  pesanId: number, userId: number,
  maksud: string, teks: string, acuan: unknown,
): Promise<{ id: number } | null> {
  return satu<{ id: number }>(
    `UPDATE pesan_masuk
     SET balasan_maksud = $3, balasan_teks = $4, balasan_acuan = $5,
         balasan_status = 'siap'
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [pesanId, userId, maksud, teks, JSON.stringify(acuan)],
  );
}

/**
 * Pedagang menyunting draf sebelum mengirimnya.
 *
 * Hanya boleh saat masih 'siap'. Menyunting yang sudah terkirim tidak mengubah
 * apa pun di HP pembeli — ia hanya membuat catatan kita berbohong tentang apa
 * yang benar-benar dikirim.
 */
export function suntingDraf(
  pesanId: number, userId: number, teks: string,
): Promise<{ id: number } | null> {
  return satu<{ id: number }>(
    `UPDATE pesan_masuk SET balasan_teks = $3
     WHERE id = $1 AND user_id = $2 AND balasan_status IN ('siap','gagal')
     RETURNING id`,
    [pesanId, userId, teks],
  );
}

/**
 * Keadaan draf SEBELUM apa pun diubah.
 *
 * Dibaca lebih dulu supaya penolakan yang sudah pasti — pesan tempel yang tidak
 * punya chat — tidak sempat menyentuh status drafnya. Sebelum ini, pesan tempel
 * dikunci jadi 'terkirim' lalu dikembalikan ke 'gagal', dan pedagang melihat
 * "Gagal" pada balasan yang sebenarnya baik-baik saja dan masih layak disalin.
 * Tidak ada yang gagal di situ; ia memang tidak pernah bisa dikirim.
 */
export function bacaDraf(
  pesanId: number, userId: number,
): Promise<{ ada_alamat: boolean; balasan_status: string } | null> {
  return satu<{ ada_alamat: boolean; balasan_status: string }>(
    `SELECT (pengirim_jid IS NOT NULL) AS ada_alamat, balasan_status
     FROM pesan_masuk WHERE id = $1 AND user_id = $2`,
    [pesanId, userId],
  );
}

/**
 * Ambil alamat dan teks SEKALIGUS menandainya terkirim, dalam satu pernyataan.
 *
 * Pola yang sama dengan konfirmasi ekstraksi, dan alasannya sama: dua tombol
 * yang tertekan hampir bersamaan akan lolos kalau pemeriksaan dan penandaan
 * terpisah. Di sini yang kedua mendapat nol baris, karena `balasan_status`
 * sudah bukan 'siap' lagi saat ia tiba.
 *
 * Ditandai terkirim SEBELUM benar-benar dikirim. Itu disengaja: kalau
 * pengirimannya gagal, statusnya dikembalikan ke 'gagal' oleh pemanggil.
 * Urutan sebaliknya — kirim dulu, tandai kemudian — bisa mengirim dua kali
 * kalau proses mati di antaranya, dan pesan ganda ke pembeli jauh lebih buruk
 * daripada tombol yang perlu ditekan ulang.
 */
export function kunciUntukKirim(
  pesanId: number, userId: number,
  // `pengirim_jid` dijanjikan non-null oleh WHERE di bawah, jadi tipenya pun
  // non-null. Kalau syarat itu dicabut suatu saat, tsc yang menagih di sini.
): Promise<{ pengirim_jid: string; balasan_teks: string | null } | null> {
  return satu<{ pengirim_jid: string; balasan_teks: string | null }>(
    `UPDATE pesan_masuk
     SET balasan_status = 'terkirim', balasan_dikirim_pada = now()
     WHERE id = $1 AND user_id = $2 AND balasan_status = 'siap'
       AND pengirim_jid IS NOT NULL
     RETURNING pengirim_jid, balasan_teks`,
    [pesanId, userId],
  );
}

/** Kembalikan ke 'gagal' supaya pedagang bisa mencoba lagi. */
export function tandaiGagalKirim(pesanId: number, userId: number): Promise<unknown> {
  return satu(
    `UPDATE pesan_masuk
     SET balasan_status = 'gagal', balasan_dikirim_pada = NULL
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [pesanId, userId],
  );
}

/** Berapa balasan yang terkirim dalam satu menit terakhir — untuk batas laju. */
export async function hitungKirimTerakhir(userId: number): Promise<number> {
  const baris = await satu<{ n: number }>(
    `SELECT count(*)::int AS n FROM pesan_masuk
     WHERE user_id = $1 AND balasan_dikirim_pada > now() - interval '1 minute'`,
    [userId],
  );
  return baris?.n ?? 0;
}
