import { Router } from 'express';
import { wajibLogin } from '../../middleware/auth.ts';
import { jalur } from '../../lib/http.ts';
import { riwayatTanya, tanya } from './tanya.controller.ts';

/**
 * Rute chatbot — HANYA pemetaan jalur ke controller.
 * Perangkaian di tanya.service.ts, SQL di tanya.queries.ts.
 *
 * Satu rute, dan sengaja POST meski tidak menulis apa pun: pertanyaan pedagang
 * ikut tercatat di log akses kalau dikirim lewat query string.
 */
export const rutTanya = Router();
rutTanya.use(wajibLogin);

rutTanya.get('/', jalur(riwayatTanya));
rutTanya.post('/', jalur(tanya));
