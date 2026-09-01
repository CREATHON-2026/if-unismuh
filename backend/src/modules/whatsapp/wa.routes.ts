import { Router } from 'express';
import { wajibLogin, type ReqBerpengguna } from '../../middleware/auth.ts';
import { jalur, kirim } from '../../lib/http.ts';
import { hubungkanWhatsapp, statusWhatsapp } from './wa.client.ts';

export const rutWhatsapp = Router();
rutWhatsapp.use(wajibLogin);

/**
 * GET /whatsapp/status
 *
 * Dipakai frontend untuk menampilkan keadaan sambungan dan QR kalau perlu
 * dipindai. `hanya_baca` selalu true — sistem tidak punya jalur mengirim.
 */
rutWhatsapp.get('/status', jalur(async (_req, res) => {
  kirim(res, statusWhatsapp());
}));

/**
 * POST /whatsapp/hubungkan
 *
 * Memulai sesi baca. QR muncul di terminal server, dan juga tersedia lewat
 * GET /whatsapp/status untuk ditampilkan di layar nanti.
 *
 * Menyambungkan WhatsApp sifatnya OPSIONAL. Kalau tidak pernah dipanggil,
 * atau kalau sesinya putus, Pesanan Masuk tetap berfungsi penuh lewat tempel
 * manual di POST /pesanan/analisis.
 */
rutWhatsapp.post('/hubungkan', jalur(async (req, res) => {
  const { userId } = req as ReqBerpengguna;
  await hubungkanWhatsapp(userId);
  kirim(res, statusWhatsapp(), 202);
}));
