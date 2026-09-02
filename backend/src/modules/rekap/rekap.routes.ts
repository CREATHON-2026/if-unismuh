import { Router } from 'express';
import { wajibLogin } from '../../middleware/auth.ts';
import { jalur } from '../../lib/http.ts';
import { rekap } from './rekap.controller.ts';

/**
 * Rute Rekap — HANYA pemetaan jalur ke controller.
 * Perangkaian di rekap.service.ts, SQL di rekap.queries.ts.
 */
export const rutRekap = Router();
rutRekap.use(wajibLogin);

rutRekap.get('/', jalur(rekap));
