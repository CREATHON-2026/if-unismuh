import type { Request, Response, NextFunction } from 'express';
import { GalatTampil, kirimGalat } from '../lib/http.ts';
import { KODE_GALAT } from '../../../shared/types.ts';

/** Penangan galat terakhir. Dipasang paling belakang di server.ts. */
export function tangkapGalat(
  err: unknown, _req: Request, res: Response, _next: NextFunction,
): void {
  if (err instanceof GalatTampil) {
    kirimGalat(res, err.kode, err.message, err.status);
    return;
  }
  // Galat tak terduga: jangan bocorkan detail teknis ke layar pengguna, tapi
  // catat lengkap di log supaya bisa ditelusuri.
  console.error('[galat tak terduga]', err);
  kirimGalat(
    res, KODE_GALAT.GALAT_SERVER,
    'Ada gangguan di sistem. Coba lagi sebentar lagi.', 500,
  );
}
