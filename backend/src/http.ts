import type { Response } from 'express';
import { KODE_GALAT, type KodeGalat } from '../../shared/types.ts';

/**
 * Galat yang aman ditampilkan ke pengguna.
 *
 * `pesan` ditulis dalam bahasa Indonesia sehari-hari dan langsung tampil di
 * layar. Jangan kirim istilah teknis ke layar orang berusia 55 tahun.
 */
export class GalatTampil extends Error {
  constructor(
    public kode: KodeGalat,
    pesan: string,
    public status = 400,
  ) {
    super(pesan);
  }
}

export function kirim<T>(res: Response, data: T, status = 200) {
  res.status(status).json({ ok: true, data });
}

export function kirimGalat(res: Response, kode: KodeGalat, pesan: string, status = 400) {
  res.status(status).json({ ok: false, error: { kode, pesan } });
}

/**
 * Bungkus handler async supaya galat yang dilempar tidak menggantung
 * permintaan. Tanpa ini, satu `await` yang gagal membuat request diam
 * selamanya sampai timeout.
 */
export function jalur(
  fn: (req: any, res: Response) => Promise<void>,
) {
  return (req: any, res: Response, next: (e?: unknown) => void) => {
    fn(req, res).catch(next);
  };
}

/** Penangan galat terakhir. Dipasang paling belakang di index.ts. */
export function tangkapGalat(err: unknown, _req: any, res: Response, _next: unknown) {
  if (err instanceof GalatTampil) {
    return kirimGalat(res, err.kode, err.message, err.status);
  }
  // Galat tak terduga: jangan bocorkan detail teknis ke layar pengguna,
  // tapi tetap catat lengkap di log supaya bisa ditelusuri.
  console.error('[galat tak terduga]', err);
  kirimGalat(res, KODE_GALAT.GALAT_SERVER, 'Ada gangguan di sistem. Coba lagi sebentar lagi.', 500);
}
