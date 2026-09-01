import type { Response } from 'express';
import type { KodeGalat } from '../../../shared/types.ts';

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

export function kirim<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ ok: true, data });
}

export function kirimGalat(res: Response, kode: KodeGalat, pesan: string, status = 400): void {
  res.status(status).json({ ok: false, error: { kode, pesan } });
}

/**
 * Bungkus handler async supaya galat yang dilempar sampai ke penangan galat.
 * Tanpa ini, satu `await` yang gagal membuat permintaan menggantung sampai
 * timeout — tanpa pesan, tanpa jejak.
 */
export function jalur(fn: (req: any, res: Response) => Promise<void>) {
  return (req: any, res: Response, next: (e?: unknown) => void) => {
    fn(req, res).catch(next);
  };
}
