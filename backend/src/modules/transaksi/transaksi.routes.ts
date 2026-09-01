import { Router } from 'express';
import { wajibLogin } from '../../middleware/auth.ts';
import { jalur } from '../../lib/http.ts';
import {
  simpanTransaksiManual, daftarTransaksiPeriode, usulanDariTeks,
} from './transaksi.controller.ts';

/**
 * Rute transaksi — HANYA pemetaan jalur ke controller.
 * Validasi di transaksi.controller.ts, logika di transaksi.service.ts,
 * SQL di transaksi.queries.ts, bacaan LLM di transaksi.llm.ts.
 */
export const rutTransaksi = Router();
rutTransaksi.use(wajibLogin);

rutTransaksi.post('/', jalur(simpanTransaksiManual));
rutTransaksi.get('/', jalur(daftarTransaksiPeriode));
rutTransaksi.post('/dari-teks', jalur(usulanDariTeks));
