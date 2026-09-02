import type { Request, Response } from 'express';
import type { ReqBerpengguna } from '../../middleware/auth.ts';
import { kirim, GalatTampil } from '../../lib/http.ts';
import { KODE_GALAT } from '../../../../shared/types.ts';
import { ringkasRekap } from './rekap.service.ts';

/**
 * Controller Rekap — lapisan HTTP.
 *
 * GET /rekap?hari=7 — fitur 14, grafik tren omzet vs untung.
 */

/** Bawaan seminggu; layarnya memang berjudul "Minggu ini". */
const HARI_BAWAAN = 7;
/**
 * Batas atas sebulan. Bukan soal beban query — 31 titik pada lebar 320px sudah
 * berdempetan sampai tidak terbaca, dan grafik yang tidak terbaca lebih buruk
 * daripada grafik yang tidak ada. Kalau nanti perlu rentang lebih panjang,
 * bentuk titiknya yang harus berubah (mingguan, bukan harian), bukan batas ini.
 */
const HARI_MAKS = 31;

export async function rekap(req: Request, res: Response): Promise<void> {
  const { userId } = req as ReqBerpengguna;

  const mentah = req.query.hari;
  let hari = HARI_BAWAAN;
  if (mentah !== undefined) {
    hari = Number(mentah);
    if (!Number.isInteger(hari) || hari < 1 || hari > HARI_MAKS) {
      throw new GalatTampil(
        KODE_GALAT.PERMINTAAN_TIDAK_VALID,
        `Jumlah harinya harus antara 1 dan ${HARI_MAKS}.`,
      );
    }
  }

  kirim(res, await ringkasRekap(userId, hari));
}
