import { config as muatEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * SATU-SATUNYA tempat yang membaca process.env.
 *
 * Modul lain mengimpor konstanta dari sini, tidak pernah menyentuh
 * process.env sendiri. Alasannya bukan kerapian: dulu .env dicari di
 * direktori kerja dan diam-diam tidak ketemu, jadi server tetap hidup
 * dengan nilai bawaan dan kesalahannya baru terasa saat permintaan
 * pertama masuk. Sekarang berkasnya dimuat sekali dari akar repo, dan
 * yang salah ketahuan saat start, bukan saat pengguna mencoba masuk.
 */

export const AKAR_REPO = path.join(
  path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..',
);

muatEnv({ path: path.join(AKAR_REPO, '.env'), quiet: true });

export const PORT = Number(process.env.PORT ?? 3000);

/**
 * Direktori data PGlite. Kosong -> backend/db/data.
 *
 * Bisa ditimpa karena PGlite hanya boleh dipegang SATU proses: menjalankan
 * server kedua yang menunjuk direktori yang sama merusak datanya, dengan galat
 * `RuntimeError: Aborted()` yang sama sekali tidak menjelaskan sebabnya. Kalau
 * perlu instans sekali pakai — menguji endpoint baru tanpa mengganggu server
 * yang sedang jalan, misalnya — beri dia direktori sendiri lewat variabel ini.
 */
export const PGLITE_DIR = process.env.PGLITE_DIR ?? '';

/** Kosong -> pakai PGlite (tertanam). Diisi -> PostgreSQL sungguhan. */
export const DATABASE_URL = process.env.DATABASE_URL ?? '';
export const MODE_DB: 'postgres' | 'pglite' = DATABASE_URL ? 'postgres' : 'pglite';

/**
 * Mode demo untuk lomba: OTP tidak benar-benar dikirim, kodenya selalu 123456.
 * Ini DISEBUTKAN TERUS TERANG di presentasi — lihat docs/08-keamanan-data.md.
 */
export const MODE_DEMO = process.env.DEMO_MODE !== 'false';
export const KODE_DEMO = '123456';

/**
 * LLM: Ollama milik kampus. TIDAK butuh kunci API.
 *
 * Nilai bawaannya sengaja diisi supaya rekan tim cukup `npm install` lalu
 * jalan — tidak ada yang perlu disiapkan, tidak ada kunci yang perlu diminta.
 */
export const OLLAMA_URL = process.env.OLLAMA_URL ?? 'https://ollama.if.unismuh.ac.id';
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'gemma4:latest';

/** Sesi 90 hari, tidak pernah logout otomatis. */
export const MASA_SESI = '90d';

export const JWT_SECRET = process.env.JWT_SECRET ?? '';

/**
 * Diperiksa saat start, bukan saat permintaan pertama. Gagal cepat jauh lebih
 * murah daripada server yang kelihatan sehat tapi menolak setiap login.
 */
export function periksaEnv(): void {
  const kurang: string[] = [];
  if (JWT_SECRET.length < 16) kurang.push('JWT_SECRET (minimal 16 karakter)');
  if (kurang.length) {
    throw new Error(
      `Konfigurasi belum lengkap di ${path.join(AKAR_REPO, '.env')}:\n` +
      kurang.map((k) => `  - ${k}`).join('\n') +
      `\nSalin .env.example jadi .env lalu isi nilainya.`,
    );
  }
}
