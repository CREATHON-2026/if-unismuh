import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { GalatTampil } from './http.ts';
import { KODE_GALAT } from '../../shared/types.ts';

/**
 * Sesi 90 hari, tidak pernah logout otomatis.
 *
 * Sesi pendek membunuh retensi: kalau pedagang harus login ulang tiap minggu,
 * mereka berhenti pakai — bukan karena produknya buruk, tapi karena gerbangnya
 * merepotkan. Lihat docs/08-keamanan-data.md.
 */
const MASA_SESI = '90d';

/**
 * Mode demo untuk lomba: OTP tidak benar-benar dikirim, kodenya selalu 123456.
 *
 * Ini DISEBUTKAN TERUS TERANG di presentasi. Menyembunyikannya jauh lebih
 * berisiko daripada mengakuinya — juri menilai alur, bukan infrastruktur SMS.
 */
export const MODE_DEMO = process.env.DEMO_MODE !== 'false';
export const KODE_DEMO = '123456';

function rahasia(): string {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) {
    throw new Error('JWT_SECRET belum diisi di .env (minimal 16 karakter)');
  }
  return s;
}

export function buatToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, rahasia(), { expiresIn: MASA_SESI });
}

export interface ReqBerpengguna extends Request {
  userId: number;
}

/**
 * Middleware autentikasi. Menaruh userId di request.
 *
 * userId ini WAJIB masuk ke klausa WHERE setiap query yang menyentuh tabel
 * milik pengguna — isolasi terjadi di database, bukan di aplikasi.
 * Lihat backend/CLAUDE.md aturan #2.
 */
export function wajibLogin(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new GalatTampil(KODE_GALAT.TIDAK_TERAUTENTIKASI, 'Silakan masuk dulu.', 401));
  }
  try {
    const isi = jwt.verify(header.slice(7), rahasia()) as { sub: string };
    (req as ReqBerpengguna).userId = Number(isi.sub);
    next();
  } catch {
    return next(new GalatTampil(KODE_GALAT.TIDAK_TERAUTENTIKASI, 'Sesi sudah berakhir, silakan masuk lagi.', 401));
  }
}

/** Buang spasi, tanda hubung, dan seragamkan awalan 62 -> 0. */
export function rapikanNomor(nomor: string): string {
  const bersih = nomor.replace(/[\s\-().]/g, '');
  if (bersih.startsWith('+62')) return '0' + bersih.slice(3);
  if (bersih.startsWith('62')) return '0' + bersih.slice(2);
  return bersih;
}

export function nomorValid(nomor: string): boolean {
  return /^0\d{8,13}$/.test(nomor);
}
