import { Router } from 'express';
import { MODE_DEMO, KODE_DEMO } from '../../config/env.ts';
import { buatToken } from '../../lib/token.ts';
import { rapikanNomor, nomorValid } from '../../lib/nomor.ts';
import { jalur, kirim, GalatTampil } from '../../lib/http.ts';
import { KODE_GALAT } from '../../../../shared/types.ts';
import { cariPenggunaLewatNomor, buatPengguna } from './auth.queries.ts';

export const rutAuth = Router();

/**
 * POST /auth/otp/kirim
 *
 * Di mode demo tidak ada SMS yang benar-benar dikirim. Layarnya tetap ada dan
 * berfungsi — melompatinya membuat produk terlihat seperti prototipe setengah
 * jadi. Lihat docs/07-alur-pengguna.md.
 */
rutAuth.post('/otp/kirim', jalur(async (req, res) => {
  const nomor = rapikanNomor(String(req.body?.nomor_hp ?? ''));
  if (!nomorValid(nomor)) {
    throw new GalatTampil(
      KODE_GALAT.PERMINTAAN_TIDAK_VALID,
      'Nomor HP-nya belum benar. Contoh: 081234567890',
    );
  }
  if (!MODE_DEMO) {
    throw new GalatTampil(
      KODE_GALAT.GALAT_SERVER,
      'Pengiriman OTP belum tersambung ke gateway SMS.', 501,
    );
  }
  kirim(res, { terkirim: true, mode_demo: true });
}));

/**
 * POST /auth/otp/verifikasi
 *
 * Nomor HP jadi identitas. Kalau nomornya belum pernah dipakai, penggunanya
 * dibuat di sini juga — tidak ada layar "daftar" yang terpisah, karena satu
 * layar tambahan di gerbang adalah satu alasan lagi untuk menyerah.
 */
rutAuth.post('/otp/verifikasi', jalur(async (req, res) => {
  const nomor = rapikanNomor(String(req.body?.nomor_hp ?? ''));
  const kode = String(req.body?.kode ?? '');

  if (!nomorValid(nomor)) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Nomor HP-nya belum benar.');
  }
  if (!(MODE_DEMO && kode === KODE_DEMO)) {
    throw new GalatTampil(KODE_GALAT.OTP_SALAH, 'Kodenya belum cocok. Coba periksa lagi.');
  }

  const pengguna = (await cariPenggunaLewatNomor(nomor)) ?? (await buatPengguna(nomor));

  kirim(res, {
    token: buatToken(pengguna!.id),
    // Belum punya nama usaha = belum lewat onboarding
    pengguna_baru: pengguna!.nama_usaha === null,
    pengguna,
  });
}));
