import { Router } from 'express';
import { wajibLogin } from '../../middleware/auth.ts';
import { jalur } from '../../lib/http.ts';
import { otpKirim, otpVerifikasi, saya } from './auth.controller.ts';

/**
 * Rute auth — HANYA pemetaan jalur ke controller.
 * Validasi di auth.controller.ts, aturan sesi/OTP di auth.service.ts,
 * SQL di auth.queries.ts.
 */
export const rutAuth = Router();

rutAuth.post('/otp/kirim', jalur(otpKirim));
rutAuth.post('/otp/verifikasi', jalur(otpVerifikasi));
rutAuth.get('/saya', wajibLogin, jalur(saya));
