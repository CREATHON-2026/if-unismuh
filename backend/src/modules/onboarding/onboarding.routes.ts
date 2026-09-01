import { Router } from 'express';
import { wajibLogin } from '../../middleware/auth.ts';
import { jalur } from '../../lib/http.ts';
import { simpanUsaha, simpanResepOnboarding } from './onboarding.controller.ts';

/**
 * Rute onboarding — HANYA pemetaan jalur ke controller.
 * Validasi di onboarding.controller.ts, logika di onboarding.service.ts,
 * SQL di onboarding.queries.ts.
 */
export const rutOnboarding = Router();
rutOnboarding.use(wajibLogin);

rutOnboarding.post('/usaha', jalur(simpanUsaha));
rutOnboarding.post('/resep', jalur(simpanResepOnboarding));
