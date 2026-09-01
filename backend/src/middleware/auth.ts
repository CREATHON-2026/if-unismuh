import type { Request, Response, NextFunction } from 'express';
import { bacaToken } from '../lib/token.ts';
import { GalatTampil } from '../lib/http.ts';
import { KODE_GALAT } from '../../../shared/types.ts';

export interface ReqBerpengguna extends Request {
  userId: number;
}

/**
 * Menaruh userId di request.
 *
 * userId ini WAJIB masuk ke klausa WHERE setiap query yang menyentuh tabel
 * milik pengguna. Isolasi terjadi di database, bukan di aplikasi — lihat
 * backend/CLAUDE.md aturan #2.
 */
export function wajibLogin(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new GalatTampil(KODE_GALAT.TIDAK_TERAUTENTIKASI, 'Silakan masuk dulu.', 401));
  }
  const userId = bacaToken(header.slice(7));
  if (userId === null) {
    return next(new GalatTampil(
      KODE_GALAT.TIDAK_TERAUTENTIKASI, 'Sesi sudah berakhir, silakan masuk lagi.', 401,
    ));
  }
  (req as ReqBerpengguna).userId = userId;
  next();
}
