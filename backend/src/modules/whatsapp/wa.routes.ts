import { Router } from 'express';
import { wajibLogin } from '../../middleware/auth.ts';
import { jalur } from '../../lib/http.ts';
import { status, hubungkan } from './wa.controller.ts';

/**
 * Rute WhatsApp — HANYA pemetaan jalur ke controller.
 * Validasi di wa.controller.ts, adapter Baileys (hanya-baca) di wa.client.ts.
 * Tidak ada dan tidak boleh ada rute kirim — aturan #4.
 */
export const rutWhatsapp = Router();
rutWhatsapp.use(wajibLogin);

rutWhatsapp.get('/status', jalur(status));
rutWhatsapp.post('/hubungkan', jalur(hubungkan));
