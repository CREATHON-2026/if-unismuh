import type { Request, Response } from 'express';
import type { ReqBerpengguna } from '../../middleware/auth.ts';
import { kirim } from '../../lib/http.ts';
import { ringkasBeranda } from './beranda.service.ts';

/**
 * Controller Beranda — lapisan HTTP.
 *
 * GET /beranda?dari=&sampai= — fitur 7. Bawaan periodenya bulan berjalan.
 * Pemilih tanggal adalah friksi untuk pengguna 35–60 tahun, jadi parameternya
 * ada tapi tidak wajib dipakai.
 */
export async function beranda(req: Request, res: Response): Promise<void> {
  const { userId } = req as ReqBerpengguna;
  const dari = req.query.dari ? String(req.query.dari) : null;
  const sampai = req.query.sampai ? String(req.query.sampai) : null;

  kirim(res, await ringkasBeranda(userId, dari, sampai));
}
