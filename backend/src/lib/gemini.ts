import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY } from '../config/env.ts';

/**
 * Klien Gemini untuk seluruh aplikasi.
 *
 * Dicoba berurutan: model teratas sering penuh di jam sibuk dan mengembalikan
 * 500. Di lomba 24 jam kita tidak boleh berhenti karena satu model ramai.
 */
const MODEL_URUT = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'];

let klien: GoogleGenAI | null = null;

function ambilKlien(): GoogleGenAI {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY belum diisi di .env');
  }
  klien ??= new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  return klien;
}

export const geminiSiap = (): boolean => Boolean(GEMINI_API_KEY);

/**
 * Minta Gemini mengeluarkan JSON sesuai skema.
 *
 * Hanya untuk MEMBACA dan MENGUBAH BENTUK. Jangan pernah memakai fungsi ini
 * untuk meminta model menjumlahkan, mengalikan, atau memutuskan untung-rugi —
 * itu tugas SQL. Lihat aturan #1 di CLAUDE.md.
 */
export async function mintaJson<T>(
  prompt: string,
  skema: Record<string, unknown>,
): Promise<T> {
  const c = ambilKlien();
  let galatTerakhir: unknown;

  for (const model of MODEL_URUT) {
    try {
      const interaction = await c.interactions.create({
        model,
        input: prompt,
        response_format: { type: 'text', mime_type: 'application/json', schema: skema },
      });
      const keluaran = interaction.output_text;
      if (!keluaran) {
        // Jawaban kosong biasanya berarti model menolak atau terpotong.
        // Diperlakukan seperti galat sementara supaya model berikutnya dicoba.
        throw new Error('503 jawaban model kosong');
      }
      return JSON.parse(keluaran) as T;
    } catch (err) {
      galatTerakhir = err;
      const pesan = err instanceof Error ? err.message : String(err);
      // 429/500/503 = sibuk sementara -> coba model berikutnya.
      // Selain itu (skema salah, kunci salah) percuma diulang.
      if (!/\b(429|500|503)\b|high demand|overload|unavailable/i.test(pesan)) throw err;
    }
  }
  throw galatTerakhir;
}
