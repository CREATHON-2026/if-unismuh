import type { Request, Response } from 'express';
import type { ReqBerpengguna } from '../../middleware/auth.ts';
import { kirim, GalatTampil } from '../../lib/http.ts';
import { KODE_GALAT, type TanyaReq } from '../../../../shared/types.ts';
import { ambilRiwayat, jawabPertanyaan } from './tanya.service.ts';

/**
 * Controller chatbot — lapisan HTTP.
 *
 * POST /tanya. Hanya-baca: tidak ada satu pun jalur di modul ini yang menulis
 * ke database.
 */
export async function tanya(req: Request, res: Response): Promise<void> {
  const { userId } = req as ReqBerpengguna;
  const { pertanyaan } = (req.body ?? {}) as Partial<TanyaReq>;

  if (typeof pertanyaan !== 'string') {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Pertanyaannya belum terisi.');
  }

  kirim(res, await jawabPertanyaan(userId, pertanyaan));
}

/**
 * GET /tanya — kembalikan percakapan yang masih diingat server.
 *
 * Layar memuatnya saat dibuka supaya isinya sama dengan yang dipakai model
 * sebagai konteks. Kalau keduanya berbeda, pengguna melihat layar kosong tapi
 * dijawab seolah percakapannya berlanjut.
 */
export async function riwayatTanya(req: Request, res: Response): Promise<void> {
  const { userId } = req as ReqBerpengguna;
  kirim(res, await ambilRiwayat(userId));
}
