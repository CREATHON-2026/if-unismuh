import { query, satu } from '../../db/index.ts';
import type { JenisPesan, KandidatProduk } from '../../../../shared/types.ts';

/**
 * Semua SQL domain Pesanan Masuk ada di berkas ini.
 *
 * PERHATIKAN: tidak ada satu pun aritmetika finansial yang ditulis di
 * TypeScript. Nilai pesanan, untung, dan penanda merugi semuanya dihitung
 * di dalam query — lihat `hitungPesanan`. Aturan #1.
 */

// ---------------------------------------------------------------------------
// Pencocokan nama produk
// ---------------------------------------------------------------------------

/**
 * Ambang hasil PENGUKURAN, bukan tebakan. Diukur dengan pg_trgm:
 *   "kripik pisang" -> Kripik Pisang   1,000
 *   "kripik sgkong" -> Kripik Singkong 0,667
 *   "krpk pisang"   -> Kripik Pisang   0,529
 *   "kripik psg"    -> Kripik Pisang   0,471   <- kandidat benar TERBURUK
 *   "kripik psg"    -> Kripik Singkong 0,350   <- kandidat salah TERBAIK
 * Lihat docs/04-pipeline-ai.md.
 */
const AMBANG_OTOMATIS = 0.85;
const AMBANG_TANYA = 0.40;
/** Band 0,350–0,471 terlalu sempit untuk satu ambang mutlak. Kalau dua
 *  kandidat teratas berselisih di bawah ini, model tidak bisa membedakan —
 *  tanya penggunanya. Aturan #8. */
const SELISIH_MINIMAL = 0.15;

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

export interface HasilCocok {
  produkId: number | null;
  skor: number | null;
  perluDicek: boolean;
  kandidat: KandidatProduk[];
}

/** Putuskan: cocokkan otomatis, tanya penggunanya, atau anggap produk baru. */
export function putuskanCocok(kandidat: KandidatProduk[]): HasilCocok {
  if (kandidat.length === 0) {
    return { produkId: null, skor: null, perluDicek: true, kandidat: [] };
  }
  const [atas, kedua] = kandidat;
  const selisihTipis = kedua !== undefined && atas.skor - kedua.skor < SELISIH_MINIMAL;

  if (atas.skor >= AMBANG_OTOMATIS && !selisihTipis) {
    return { produkId: atas.id, skor: atas.skor, perluDicek: false, kandidat };
  }
  // Cukup mirip untuk diduga, tapi tidak cukup untuk diputuskan sendiri.
  return { produkId: atas.id, skor: atas.skor, perluDicek: true, kandidat };
}

// ---------------------------------------------------------------------------
// Perhitungan — semuanya di SQL
// ---------------------------------------------------------------------------

export interface HitungPesanan {
  produk_id: number;
  nama: string;
  modal_per_unit: number | null;
  harga_jual: number;
  /** Harga yang benar-benar dipakai: yang diminta pembeli, atau harga jual
   *  tersimpan kalau pembeli tidak menyebut angka. Ditentukan SQL supaya
   *  tidak ada dua tempat yang memutuskannya berbeda. */
  harga_dipakai: number;
  nilai_pesanan: number | null;
  untung_pesanan: number | null;
  merugi: boolean | null;
  stok_cukup_untuk: number | null;
}

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

export interface SimpanPesanArg {
  userId: number;
  teks: string;
  sumber: 'tempel' | 'whatsapp';
  pengirimSamar: string | null;
  jenis: JenisPesan;
  namaProdukMentah: string | null;
  produkId: number | null;
  jumlah: number | null;
  hargaDiminta: number | null;
  tanggalDibutuhkan: string | null;
  keyakinanCocok: number | null;
  perluDicek: boolean;
  hasilMentah: unknown;
}

export async function simpanPesan(a: SimpanPesanArg): Promise<number> {
  const baris = await satu<{ id: number }>(
    `INSERT INTO pesan_masuk
       (user_id, teks, sumber, pengirim_samar, jenis, nama_produk_mentah,
        produk_id, jumlah, harga_diminta, tanggal_dibutuhkan,
        keyakinan_cocok, perlu_dicek, hasil_mentah)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING id`,
    [a.userId, a.teks, a.sumber, a.pengirimSamar, a.jenis, a.namaProdukMentah,
     a.produkId, a.jumlah, a.hargaDiminta, a.tanggalDibutuhkan,
     a.keyakinanCocok, a.perluDicek, JSON.stringify(a.hasilMentah)],
  );
  return baris!.id;
}

/** Daftar pesanan masuk terbaru, lengkap dengan angka yang dihitung SQL. */
export function daftarPesan(userId: number, batas = 30) {
  return query(
    `SELECT
       pm.id AS pesan_id, pm.jenis, pm.teks, pm.sumber, pm.pengirim_samar,
       pm.nama_produk_mentah, pm.jumlah, pm.harga_diminta,
       pm.tanggal_dibutuhkan, pm.perlu_dicek, pm.diterima_pada,
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
       k.maks_unit AS stok_cukup_untuk
     FROM pesan_masuk pm
     LEFT JOIN v_margin_produk m   ON m.produk_id = pm.produk_id
     LEFT JOIN v_kapasitas_produk k ON k.produk_id = pm.produk_id
     WHERE pm.user_id = $1 AND pm.jenis <> 'bukan_pesanan'
     ORDER BY pm.diterima_pada DESC
     LIMIT $2`,
    [userId, batas],
  );
}
