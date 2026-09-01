import type { Request, Response } from 'express';
import type { ReqBerpengguna } from '../../middleware/auth.ts';
import { kirim, GalatTampil } from '../../lib/http.ts';
import { rapikanNomor, nomorValid } from '../../lib/nomor.ts';
import { KODE_GALAT } from '../../../../shared/types.ts';
import { kirimOtp, verifikasiOtp, pulihkanSesi } from './auth.service.ts';

/**
 * Controller auth — lapisan HTTP: baca, validasi format, panggil service,
 * kirim. Aturan sesi dan OTP hidup di auth.service.ts.
 */

/** POST /auth/otp/kirim */
export async function otpKirim(req: Request, res: Response): Promise<void> {
  const nomor = rapikanNomor(String(req.body?.nomor_hp ?? ''));
  if (!nomorValid(nomor)) {
    throw new GalatTampil(
      KODE_GALAT.PERMINTAAN_TIDAK_VALID,
      'Nomor HP-nya belum benar. Contoh: 081234567890',
    );
  }
  kirim(res, kirimOtp());
}

/** POST /auth/otp/verifikasi */
export async function otpVerifikasi(req: Request, res: Response): Promise<void> {
  const nomor = rapikanNomor(String(req.body?.nomor_hp ?? ''));
  const kode = String(req.body?.kode ?? '');

  if (!nomorValid(nomor)) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Nomor HP-nya belum benar.');
  }

  kirim(res, await verifikasiOtp(nomor, kode));
}

/**
 * GET /auth/saya — dipanggil frontend setiap aplikasi dibuka.
 * Menjawab: tokennya sah? penggunanya siapa? sudah onboarding atau belum?
 */
export async function saya(req: Request, res: Response): Promise<void> {
  const { userId } = req as ReqBerpengguna;
  kirim(res, await pulihkanSesi(userId));
}
