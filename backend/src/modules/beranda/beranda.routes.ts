import { Router } from 'express';
import { wajibLogin } from '../../middleware/auth.ts';
import { jalur } from '../../lib/http.ts';
import { beranda } from './beranda.controller.ts';

/**
 * Rute Beranda — HANYA pemetaan jalur ke controller.
 * Logika perangkaian di beranda.service.ts, SQL di beranda.queries.ts.
 */
export const rutBeranda = Router();
rutBeranda.use(wajibLogin);

rutBeranda.get('/', jalur(beranda));
