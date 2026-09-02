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

/**
 * Direktori kredensial WhatsApp (Baileys). Kosong -> backend/db/baileys-auth.
 *
 * Alasannya sama dengan PGLITE_DIR: sesi WhatsApp hanya boleh dipegang SATU
 * proses. Dua server yang menunjuk direktori auth yang sama saling menendang
 * sesinya — status bolak-balik tersambung/terputus tanpa galat yang jelas.
 * Instans uji harus diberi direktorinya sendiri lewat variabel ini.
 */
export const WA_AUTH_DIR = process.env.WA_AUTH_DIR ?? '';

/**
 * Izin mengirim balasan ke nomor pembeli. Bawaannya MATI.
 *
 * Ini rem, dan sengaja harus ditarik dengan sadar — sama seperti
 * MIDTRANS_PRODUKSI. Baileys adalah klien tidak resmi: nomor yang dipakai bisa
 * kena ban, dan nomor itu biasanya WhatsApp pribadi pedagang, bukan akun uji.
 *
 * Saat mati, draf balasan TETAP disusun dan tetap bisa disalin pedagang. Jadi
 * alur demo tidak pernah bergantung pada pengiriman — kalau ada yang aneh di
 * panggung, yang mati satu tombol, bukan satu nomor.
 */
export const WA_BALAS_AKTIF = process.env.WA_BALAS_AKTIF === 'true';

/**
 * Batas kirim per menit per pengguna.
 *
 * Perilaku burst adalah yang paling cepat memicu ban di WhatsApp. Angkanya
 * longgar untuk pemakaian manusia — pedagang tidak menekan tombol sepuluh kali
 * semenit — dan ketat untuk kesalahan kode yang mengirim dalam loop.
 */
export const WA_BALAS_PER_MENIT = Number(process.env.WA_BALAS_PER_MENIT ?? 10);

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
 * Midtrans — QRIS untuk pesanan yang pembelinya tidak datang membawa uang tunai.
 *
 * OPSIONAL. Tanpa kunci, seluruh jalur QRIS mati total dan tombolnya
 * disembunyikan; tunai, transfer, dan kasbon tetap jalan. Itu disengaja: fitur
 * pembayaran yang bergantung pada layanan luar tidak boleh bisa menjatuhkan
 * alur inti saat demo, apalagi saat jaringan panggung sedang buruk.
 *
 * ⚠️ Kunci yang berawalan `Mid-` adalah kunci PRODUCTION — tagihan yang dibuat
 * dengannya menagih uang sungguhan. Kunci sandbox berawalan `SB-Mid-`.
 * `MIDTRANS_PRODUKSI` sengaja harus diisi 'true' SECARA EKSPLISIT: server yang
 * diam-diam menagih uang sungguhan karena salah tebak adalah kegagalan yang
 * tidak bisa dibatalkan.
 */
export const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY ?? '';
export const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY ?? '';
export const MIDTRANS_PRODUKSI = process.env.MIDTRANS_PRODUKSI === 'true';
export const MIDTRANS_AKTIF = MIDTRANS_SERVER_KEY.length > 0;

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

  // Peringatan, bukan galat: server tetap boleh hidup. Tapi orang yang
  // menjalankannya harus TAHU bahwa tombol QRIS di layar akan menagih uang
  // sungguhan, dan harus tahu itu sekarang — bukan setelah tagihan pertama.
  if (MIDTRANS_AKTIF && MIDTRANS_PRODUKSI) {
    console.warn(
      '\n  ⚠ MIDTRANS MODE PRODUCTION — QRIS yang dibuat menagih UANG SUNGGUHAN.\n' +
      '    Untuk uji coba, pakai kunci sandbox (SB-Mid-...) dan hapus MIDTRANS_PRODUKSI.\n',
    );
  }
}
