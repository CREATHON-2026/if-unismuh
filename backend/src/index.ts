import { config as muatEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import express from 'express';
import cors from 'cors';

// .env ada di AKAR repo, satu tingkat di atas backend/. Tanpa path eksplisit,
// dotenv hanya mencari di direktori kerja dan diam-diam tidak menemukan apa pun —
// server tetap hidup dengan nilai bawaan, dan kesalahannya baru terasa jauh
// kemudian saat JWT_SECRET ternyata kosong.
const AKAR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
muatEnv({ path: path.join(AKAR, '.env') });
import { siapkanDb, satu, MODE_DB } from './db.ts';
import { tangkapGalat, kirim, jalur } from './http.ts';
import { rutAuth } from './routes/auth.ts';
import { rutOnboarding } from './routes/onboarding.ts';
import { MODE_DEMO } from './auth.ts';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', jalur(async (_req, res) => {
  const baris = await satu<{ ok: number }>('SELECT 1 AS ok');
  kirim(res, { db: baris?.ok === 1, mode_db: MODE_DB, mode_demo: MODE_DEMO });
}));

app.use('/auth', rutAuth);
app.use('/onboarding', rutOnboarding);

app.use(tangkapGalat);

const port = Number(process.env.PORT ?? 3000);

await siapkanDb();
app.listen(port, () => {
  console.log(`lapakAi backend jalan di http://localhost:${port}`);
  console.log(`Database: ${MODE_DB}${MODE_DB === 'pglite' ? ' (tertanam, tanpa server)' : ''}`);
  if (MODE_DEMO) {
    console.log('MODE DEMO aktif — kode OTP selalu 123456, tidak ada SMS yang dikirim.');
  }
});
