import { Router } from 'express';
import { MODE_DEMO, KODE_DEMO } from '../../config/env.ts';
import { buatToken } from '../../lib/token.ts';
import { rapikanNomor, nomorValid } from '../../lib/nomor.ts';
import { jalur, kirim, GalatTampil } from '../../lib/http.ts';
import { KODE_GALAT } from '../../../../shared/types.ts';
import { wajibLogin, type ReqBerpengguna } from '../../middleware/auth.ts';
import { cariPenggunaLewatNomor, buatPengguna, ambilPengguna } from './auth.queries.ts';

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

/**
 * GET /auth/saya
 *
 * Dipanggil frontend setiap aplikasi dibuka, dengan token dari localStorage.
 * Menjawab tiga hal sekaligus:
 *   1. Tokennya masih sah atau tidak (401 kalau tidak)
 *   2. Penggunanya siapa
 *   3. Sudah selesai onboarding atau belum -> Beranda vs alur onboarding
 *
 * Sekalian MEMPERPANJANG sesi: token baru dikembalikan tiap kali endpoint ini
 * dipanggil, jadi pedagang yang membuka aplikasi seminggu sekali tidak pernah
 * kehabisan sesi. Ini yang dijanjikan docs/08-keamanan-data.md — sesi pendek
 * membunuh retensi.
 */
rutAuth.get('/saya', wajibLogin, jalur(async (req, res) => {
  const { userId } = req as ReqBerpengguna;
  const pengguna = await ambilPengguna(userId);

  if (!pengguna) {
    // Tokennya sah secara kriptografis tapi penggunanya sudah tidak ada.
    throw new GalatTampil(
      KODE_GALAT.TIDAK_TERAUTENTIKASI, 'Sesi sudah tidak berlaku, silakan masuk lagi.', 401,
    );
  }

  kirim(res, {
    pengguna,
    pengguna_baru: pengguna.nama_usaha === null,
    token: buatToken(pengguna.id),
  });
}));
