import { Router } from 'express';
import { wajibLogin, type ReqBerpengguna } from '../../middleware/auth.ts';
import { jalur, kirim, GalatTampil } from '../../lib/http.ts';
import { rapikanNomor, nomorValid, keInternasional } from '../../lib/nomor.ts';
import { KODE_GALAT } from '../../../../shared/types.ts';
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
 * Dua cara menautkan:
 *
 *   { "nomor_hp": "081244085616" }  -> KODE PAIRING. Pengguna memasukkan 8
 *                                      digit di HP-nya. Tidak perlu memindai
 *                                      apa pun, dan tidak perlu melihat
 *                                      terminal — jauh lebih ramah untuk
 *                                      pengguna 35-60 tahun
 *   {}                              -> QR, muncul di terminal server
 *
 * Menyambungkan WhatsApp sifatnya OPSIONAL. Kalau tidak pernah dipanggil,
 * atau kalau sesinya putus, Pesanan Masuk tetap berfungsi penuh lewat tempel
 * manual di POST /pesanan/analisis.
 *
 * Kodenya tidak langsung ada — socket butuh beberapa detik untuk siap. Panggil
 * GET /whatsapp/status sesaat kemudian untuk mengambilnya.
 */
rutWhatsapp.post('/hubungkan', jalur(async (req, res) => {
  const { userId } = req as ReqBerpengguna;
  const nomorMentah = req.body?.nomor_hp ? String(req.body.nomor_hp) : null;

  if (nomorMentah !== null && !nomorValid(rapikanNomor(nomorMentah))) {
    throw new GalatTampil(
      KODE_GALAT.PERMINTAAN_TIDAK_VALID,
      'Nomor HP-nya belum benar. Contoh: 081234567890',
    );
  }

  await hubungkanWhatsapp(
    userId,
    nomorMentah ? keInternasional(nomorMentah) : undefined,
  );
  kirim(res, statusWhatsapp(), 202);
}));
