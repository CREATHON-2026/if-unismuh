import { OLLAMA_URL, OLLAMA_MODEL } from '../config/env.ts';

/**
 * Klien LLM — Ollama milik kampus, tanpa kunci API.
 *
 * Dicoba berurutan. Model teratas paling akurat dan paling cepat (diuji
 * berdampingan: gemma4 mengenali "menawar" dengan benar dan mengekstrak nama,
 * jumlah, serta harga; qwen2.5 salah mengklasifikasi dan kehilangan nama
 * produk). Sisanya cadangan kalau yang utama sedang sibuk.
 */
const MODEL_URUT = [OLLAMA_MODEL, 'gemma3:27b', 'qwen2.5:7b-instruct'];

/**
 * Model dijaga tetap dimuat selama 30 menit.
 *
 * Panggilan pertama ke model yang dingin butuh ~13 detik; setelah dimuat
 * hanya ~3 detik. Tanpa ini, jeda 13 detik bisa muncul tepat saat demo.
 */
const KEEP_ALIVE = '30m';

const BATAS_WAKTU_MS = 90_000;

export const llmSiap = (): boolean => Boolean(OLLAMA_URL);

interface JawabanOllama {
  response?: string;
  error?: string;
}

async function panggilOllama(
  model: string, prompt: string, format?: Record<string, unknown>,
  opsiTambahan?: Record<string, unknown>,
): Promise<string> {
  const kendali = new AbortController();
  const jam = setTimeout(() => kendali.abort(), BATAS_WAKTU_MS);
  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: kendali.signal,
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        keep_alive: KEEP_ALIVE,
        // temperature 0: untuk membaca dan mengubah bentuk, kita mau jawaban
        // yang sama untuk masukan yang sama — bukan variasi.
        options: { temperature: 0, ...opsiTambahan },
        ...(format ? { format } : {}),
      }),
    });
    if (!res.ok) throw new Error(`${res.status} dari Ollama`);
    const body = (await res.json()) as JawabanOllama;
    if (body.error) throw new Error(body.error);
    if (!body.response) throw new Error('503 jawaban model kosong');
    return body.response;
  } finally {
    clearTimeout(jam);
  }
}

function galatSementara(err: unknown): boolean {
  const p = err instanceof Error ? err.message : String(err);
  return /\b(429|500|502|503|504)\b|abort|timeout|fetch failed|ECONNRESET|unavailable/i.test(p);
}

async function coba<T>(jalankan: (model: string) => Promise<T>): Promise<T> {
  let galatTerakhir: unknown;
  for (const model of MODEL_URUT) {
    try {
      return await jalankan(model);
    } catch (err) {
      galatTerakhir = err;
      if (!galatSementara(err)) throw err;
      console.warn(`[llm] ${model} gagal (${err instanceof Error ? err.message : err}), coba model berikutnya`);
    }
  }
  throw galatTerakhir;
}

/**
 * Minta LLM mengeluarkan JSON sesuai skema.
 *
 * Hanya untuk MEMBACA dan MENGUBAH BENTUK. Jangan pernah memakai fungsi ini
 * untuk meminta model menjumlahkan, mengalikan, atau memutuskan untung-rugi —
 * itu tugas SQL. Lihat aturan #1 di CLAUDE.md.
 */
export function mintaJson<T>(
  prompt: string, skema: Record<string, unknown>,
): Promise<T> {
  return coba(async (model) => {
    const mentah = await panggilOllama(model, prompt, skema);
    return JSON.parse(mentah) as T;
  });
}

/**
 * Ubah nilai "kosong palsu" jadi null.
 *
 * Model lokal kecil TIDAK menghormati `nullable` seperti Gemini. Alih-alih
 * menghilangkan field yang tidak ada isinya, gemma4 mengisinya dengan `0`
 * atau `""`. Itu bukan sekadar berantakan — itu berbahaya:
 *
 *   "pesan kripik pisang 5 bungkus"  (tanpa menyebut harga)
 *   -> harga_diminta: 0
 *   -> COALESCE(0, harga_jual) = 0, bukan harga_jual
 *   -> 5 x (0 - 21.200) = "rugi Rp 106.000"      SALAH TOTAL
 *
 * Angka nol yang sah tidak pernah muncul di field-field ini: pembeli tidak
 * memesan 0 bungkus dan tidak menawar Rp 0. Jadi memperlakukan 0 sebagai
 * "tidak disebut" aman di sini.
 */
/**
 * Frasa penampung yang dipakai model saat sebenarnya tidak ada isinya.
 *
 * Ditemukan dari pesan WhatsApp sungguhan: "saya mau pesan 5" (tanpa menyebut
 * barang) menghasilkan nama_produk_mentah = "tidak disebutkan". Kalau tidak
 * disaring, frasa itu ikut dicocokkan ke daftar produk dan pedagang melihat
 * peringatan tak masuk akal: 'Produk "tidak disebutkan" belum ada di daftar'.
 */
const FRASA_KOSONG = new Set([
  'tidak disebutkan', 'tidak disebut', 'tidak ada', 'tidak diketahui',
  'belum disebutkan', 'tidak jelas', 'kosong', 'tidak tersedia',
  'null', 'none', 'n/a', 'na', 'unknown', 'unspecified', '-', '?',
]);

function isiPalsu(v: unknown): boolean {
  if (v === 0 || v === '' || v === undefined || v === null) return true;
  return typeof v === 'string' && FRASA_KOSONG.has(v.trim().toLowerCase());
}

export function kosongJadiNull<T extends Record<string, any>>(
  obj: T, field: (keyof T)[],
): T {
  const hasil = { ...obj };
  for (const f of field) {
    if (isiPalsu(hasil[f])) hasil[f] = null as T[keyof T];
  }
  return hasil;
}

/**
 * Terima tanggal HANYA kalau benar-benar YYYY-MM-DD dan sah sebagai tanggal.
 *
 * Gemma4 mengembalikan teks apa adanya seperti "hari sabtu", yang langsung
 * menjatuhkan INSERT ke kolom DATE. Lebih baik kehilangan tanggal daripada
 * menjatuhkan seluruh permintaan — pengguna masih bisa mengisinya sendiri.
 */
export function tanggalSah(nilai: unknown): string | null {
  if (typeof nilai !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(nilai)) return null;
  const d = new Date(nilai + 'T00:00:00Z');
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== nilai ? null : nilai;
}

/**
 * Minta LLM menyusun kalimat biasa, bukan JSON.
 *
 * `opsi` diteruskan apa adanya ke Ollama dan menimpa bawaan. Yang paling
 * berguna dua: `num_predict` untuk membatasi panjang jawaban, dan
 * `temperature` untuk melonggarkan gaya bahasa.
 *
 * Membatasi `num_predict` bukan kemewahan. Pada suhu 0 model kecil kadang
 * masuk ke pengulangan yang tidak berhenti sendiri; tanpa batas, satu
 * permintaan bisa menggantung sampai socketnya diputus server — gejalanya
 * ECONNRESET di sisi pemanggil, tanpa satu pun galat tercatat.
 */
export function mintaTeks(
  prompt: string, opsi?: Record<string, unknown>,
): Promise<string> {
  return coba(async (model) => (await panggilOllama(model, prompt, undefined, opsi)).trim());
}
