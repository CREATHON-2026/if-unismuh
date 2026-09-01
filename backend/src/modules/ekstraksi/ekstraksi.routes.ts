import { Router } from 'express';
import { wajibLogin } from '../../middleware/auth.ts';
import { jalur } from '../../lib/http.ts';
import { dariTeks, pratinjau, konfirmasi } from './ekstraksi.controller.ts';

/**
 * Rute ekstraksi — HANYA pemetaan jalur ke controller.
 * Validasi di ekstraksi.controller.ts, logika di ekstraksi.service.ts,
 * SQL di ekstraksi.queries.ts.
 */
export const rutEkstraksi = Router();
rutEkstraksi.use(wajibLogin);

rutEkstraksi.post('/dari-teks', jalur(dariTeks));
rutEkstraksi.post('/pratinjau', jalur(pratinjau));
rutEkstraksi.post('/konfirmasi', jalur(konfirmasi));
