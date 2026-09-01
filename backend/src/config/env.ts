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

/** Kosong -> pakai PGlite (tertanam). Diisi -> PostgreSQL sungguhan. */
export const DATABASE_URL = process.env.DATABASE_URL ?? '';
export const MODE_DB: 'postgres' | 'pglite' = DATABASE_URL ? 'postgres' : 'pglite';

/**
 * Mode demo untuk lomba: OTP tidak benar-benar dikirim, kodenya selalu 123456.
 * Ini DISEBUTKAN TERUS TERANG di presentasi — lihat docs/08-keamanan-data.md.
 */
export const MODE_DEMO = process.env.DEMO_MODE !== 'false';
export const KODE_DEMO = '123456';

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';

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
