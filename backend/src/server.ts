// env.ts harus jadi impor PERTAMA: ia memuat .env, dan modul lain membaca
// konstanta darinya saat dievaluasi.
import { PORT, MODE_DB, MODE_DEMO, periksaEnv } from './config/env.ts';

import express from 'express';
import cors from 'cors';
import { siapkanDb, satu } from './db/index.ts';
import { kirim, jalur } from './lib/http.ts';
import { tangkapGalat } from './middleware/galat.ts';
import { rutAuth } from './modules/auth/auth.routes.ts';
import { rutOnboarding } from './modules/onboarding/onboarding.routes.ts';

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

  // Harus paling belakang, setelah semua rute terpasang.
  app.use(tangkapGalat);

  return app;
}

// Diperiksa sebelum apa pun dijalankan. Konfigurasi yang kurang ketahuan
// saat start, bukan saat pengguna pertama mencoba masuk.
periksaEnv();
await siapkanDb();

buatApp().listen(PORT, () => {
  console.log(`lapakAi backend jalan di http://localhost:${PORT}`);
  console.log(`Database: ${MODE_DB}${MODE_DB === 'pglite' ? ' (tertanam, tanpa server)' : ''}`);
  if (MODE_DEMO) {
    console.log('MODE DEMO aktif — kode OTP selalu 123456, tidak ada SMS yang dikirim.');
  }
});
