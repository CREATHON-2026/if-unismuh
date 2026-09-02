// env.ts harus jadi impor PERTAMA: ia memuat .env, dan modul lain membaca
// konstanta darinya saat dievaluasi.
import { PORT, MODE_DB, MODE_DEMO, periksaEnv } from './config/env.ts';

import express from 'express';
import cors from 'cors';
import { siapkanDb, satu, tutupDb } from './db/index.ts';
import { kirim, jalur } from './lib/http.ts';
import { tangkapGalat } from './middleware/galat.ts';
import { rutAuth } from './modules/auth/auth.routes.ts';
import { rutOnboarding } from './modules/onboarding/onboarding.routes.ts';
import { rutPesanan } from './modules/pesanan/pesanan.routes.ts';
import { rutProses } from './modules/proses/proses.routes.ts';
import { rutWhatsapp } from './modules/whatsapp/wa.routes.ts';
import { pulihkanWhatsapp } from './modules/whatsapp/wa.client.ts';
import { rutTransaksi } from './modules/transaksi/transaksi.routes.ts';
import { rutBeranda } from './modules/beranda/beranda.routes.ts';
import { rutRekap } from './modules/rekap/rekap.routes.ts';
import { rutProduk } from './modules/produk/produk.routes.ts';
import { rutEkstraksi } from './modules/ekstraksi/ekstraksi.routes.ts';
import { rutStok } from './modules/stok/stok.routes.ts';
import { rutTanya } from './modules/tanya/tanya.routes.ts';

export function buatApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', jalur(async (_req, res) => {
    const baris = await satu<{ ok: number }>('SELECT 1 AS ok');
    kirim(res, { db: baris?.ok === 1, mode_db: MODE_DB, mode_demo: MODE_DEMO });
  }));

  app.use('/auth', rutAuth);
  app.use('/onboarding', rutOnboarding);
  app.use('/pesanan', rutPesanan);
  app.use('/proses', rutProses);
  app.use('/whatsapp', rutWhatsapp);
  app.use('/transaksi', rutTransaksi);
  app.use('/beranda', rutBeranda);
  app.use('/rekap', rutRekap);
  app.use('/produk', rutProduk);
  app.use('/stok', rutStok);
  app.use('/ekstraksi', rutEkstraksi);
  app.use('/tanya', rutTanya);

  // Harus paling belakang, setelah semua rute terpasang.
  app.use(tangkapGalat);

  return app;
}

// Diperiksa sebelum apa pun dijalankan. Konfigurasi yang kurang ketahuan
// saat start, bukan saat pengguna pertama mencoba masuk.
periksaEnv();
await siapkanDb();

const server = buatApp().listen(PORT, () => {
  console.log(`lapakAi backend jalan di http://localhost:${PORT}`);
  console.log(`Database: ${MODE_DB}${MODE_DB === 'pglite' ? ' (tertanam, tanpa server)' : ''}`);
  if (MODE_DEMO) {
    console.log('MODE DEMO aktif — kode OTP selalu 123456, tidak ada SMS yang dikirim.');
  }
});

// Sesi WhatsApp yang sudah ditautkan dipulihkan sendiri. Tanpa ini, setiap
// restart server (tsx watch me-restart tiap berkas disimpan!) membuat sesi
// yang sah tampil "Belum tersambung" dan pesan masuk berhenti terbaca.
// Fire-and-forget: kegagalannya tidak boleh menahan server melayani HTTP.
void pulihkanWhatsapp();

/**
 * Penutupan rapi — bukan kemewahan, ini mencegah kerusakan data.
 *
 * PGlite menulis berkasnya sendiri. Proses yang berakhir tanpa menutupnya
 * meninggalkan direktori data yang rusak: start berikutnya gagal dengan
 * `RuntimeError: Aborted()`, dan satu-satunya pemulihan adalah menghapus
 * SELURUH data pengguna. Selama pengembangan ini sudah terjadi dua kali
 * sebelum penanganan ini dipasang.
 *
 * Tetap jangan matikan paksa lewat Task Manager — SIGKILL tidak bisa
 * ditangkap siapa pun. Pakai Ctrl+C.
 */
let sedangTutup = false;
async function berhentiRapi(sinyal: string): Promise<void> {
  if (sedangTutup) return;      // Ctrl+C dua kali tidak boleh menutup dua kali
  sedangTutup = true;
  console.log(`\n${sinyal} diterima — menutup dengan rapi...`);
  server.close();
  try {
    await tutupDb();
    console.log('Database ditutup. Aman.');
  } catch (err) {
    console.error('Gagal menutup database:', err);
    process.exitCode = 1;
  }
  process.exit(process.exitCode ?? 0);
}

for (const sinyal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sinyal, () => void berhentiRapi(sinyal));
}

/**
 * Jaring pengaman proses — MENCATAT, LALU TETAP HIDUP.
 *
 * Ini ada karena backend pernah mati sendiri tanpa meninggalkan apa pun: tidak
 * ada pesan, tidak ada stack, tidak ada cara tahu apa yang terjadi. Di Node 22
 * satu promise yang ditolak tanpa penangkap langsung mematikan proses, dan
 * sebelumnya tidak ada satu pun handler di seluruh backend ini.
 *
 * Jadi gunanya BUKAN "supaya tidak crash". Gunanya supaya kejadian berikutnya
 * punya nama — dicetak lengkap dengan stack, bisa dikejar sampai barisnya.
 *
 * Paparan terbesarnya adalah listener `async` yang promise-nya tidak dimiliki
 * siapa pun, seperti `messages.upsert` milik Baileys: apa pun yang melempar di
 * dalamnya tidak punya pemanggil yang bisa menangkapnya.
 *
 * ⚠ PERTUKARAN YANG DIAMBIL SADAR. Menahan `uncaughtException` bertentangan
 * dengan nasihat umum — proses bisa tertinggal dalam keadaan setengah rusak,
 * dan idealnya ia keluar rapi lalu dinyalakan ulang oleh pengawas. Di lomba ini
 * tidak ada pengawas, dan backend yang mati di tengah demo jauh lebih mahal
 * daripada proses yang mungkin cacat sebagian. Datanya sendiri aman: PGlite dan
 * kredensial Baileys sama-sama tersimpan di disk, bukan di memori proses.
 *
 * Kalau ini dipakai sungguhan setelah lomba, kembalikan `uncaughtException`
 * menjadi "catat lalu keluar rapi", dan pasang pengawas yang menyalakan ulang.
 */
process.on('unhandledRejection', (alasan) => {
  console.error('\n[FATAL] Promise ditolak tanpa penangkap — server SENGAJA tetap hidup.');
  console.error(alasan instanceof Error ? alasan.stack ?? alasan.message : alasan);
  console.error('');
});

process.on('uncaughtException', (err) => {
  console.error('\n[FATAL] Galat tak tertangkap — server SENGAJA tetap hidup.');
  console.error(err.stack ?? err.message);
  console.error('');
});
