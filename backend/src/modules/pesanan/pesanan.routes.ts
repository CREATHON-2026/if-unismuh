import { Router } from 'express';
import { wajibLogin, type ReqBerpengguna } from '../../middleware/auth.ts';
import { jalur, kirim, GalatTampil } from '../../lib/http.ts';
import { KODE_GALAT } from '../../../../shared/types.ts';
import { prosesPesan } from './pesanan.proses.ts';
import { daftarPesan } from './pesanan.queries.ts';

export const rutPesanan = Router();
rutPesanan.use(wajibLogin);

/**
 * POST /pesanan/analisis
 *
 * Menerima teks yang DITEMPEL pedagang dari chat pembeli. Sistem membaca,
 * mengklasifikasi, mengecek margin dan stok, lalu memberi peringatan.
 *
 * Sistem TIDAK PERNAH mengirim apa pun ke nomor pembeli — aturan #4.
 */
rutPesanan.post('/analisis', jalur(async (req, res) => {
  const { userId } = req as ReqBerpengguna;
  const teks = String(req.body?.teks ?? '').trim();

  if (!teks) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Teks pesanannya belum ditempel.');
  }

  kirim(res, await prosesPesan(userId, teks, 'tempel'), 201);
}));

/** GET /pesanan — daftar pesanan masuk terbaru. */
rutPesanan.get('/', jalur(async (req, res) => {
  const { userId } = req as ReqBerpengguna;
  kirim(res, await daftarPesan(userId));
}));
