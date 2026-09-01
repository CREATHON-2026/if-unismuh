import { Router } from 'express';
import { wajibLogin } from '../../middleware/auth.ts';
import { jalur } from '../../lib/http.ts';
import { daftarStok, simpanStok } from './stok.controller.ts';

/**
 * Rute stok — HANYA pemetaan jalur ke controller.
 * Validasi di stok.controller.ts, logika di stok.service.ts,
 * SQL di stok.queries.ts.
 */
export const rutStok = Router();
rutStok.use(wajibLogin);

rutStok.get('/', jalur(daftarStok));
rutStok.post('/', jalur(simpanStok));
