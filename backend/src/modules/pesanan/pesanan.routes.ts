import { Router } from 'express';
import { wajibLogin } from '../../middleware/auth.ts';
import { jalur } from '../../lib/http.ts';
import { analisisPesanan, daftarPesanan, balasanPesanan } from './pesanan.controller.ts';

/**
 * Rute Pesanan Masuk — HANYA pemetaan jalur ke controller.
 * Validasi di pesanan.controller.ts, logika di pesanan.service.ts,
 * SQL di pesanan.queries.ts, prompt LLM di pesanan.llm.ts.
 */
export const rutPesanan = Router();
rutPesanan.use(wajibLogin);

rutPesanan.post('/analisis', jalur(analisisPesanan));
rutPesanan.get('/', jalur(daftarPesanan));
rutPesanan.post('/balasan', jalur(balasanPesanan));
