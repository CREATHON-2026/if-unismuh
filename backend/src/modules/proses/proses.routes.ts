import { Router } from 'express';
import { wajibLogin } from '../../middleware/auth.ts';
import { jalur } from '../../lib/http.ts';
import {
  buat, catatBayar, cetakStruk, daftar, detail, statusBayar, tandaiBatal,
  tandaiSelesai,
} from './proses.controller.ts';

/**
 * Rute proses pesanan — HANYA pemetaan jalur ke controller.
 * Validasi di proses.controller.ts, logika di proses.service.ts,
 * SQL di proses.queries.ts.
 */
export const rutProses = Router();
rutProses.use(wajibLogin);

rutProses.post('/', jalur(buat));
rutProses.get('/', jalur(daftar));

// Jalur bersegmen lebih dulu: '/:id' menangkap apa pun kalau didahulukan.
rutProses.get('/:id/bayar/status', jalur(statusBayar));
rutProses.post('/:id/bayar', jalur(catatBayar));
rutProses.post('/:id/selesai', jalur(tandaiSelesai));
rutProses.post('/:id/batal', jalur(tandaiBatal));
rutProses.get('/:id/struk', jalur(cetakStruk));
rutProses.get('/:id', jalur(detail));
