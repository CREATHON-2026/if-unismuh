import jwt from 'jsonwebtoken';
import { JWT_SECRET, MASA_SESI } from '../config/env.ts';

/**
 * Sesi 90 hari, tidak pernah logout otomatis.
 *
 * Sesi pendek membunuh retensi: kalau pedagang harus login ulang tiap minggu,
 * mereka berhenti pakai — bukan karena produknya buruk, tapi karena gerbangnya
 * merepotkan. Lihat docs/08-keamanan-data.md.
 */
export function buatToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, JWT_SECRET, { expiresIn: MASA_SESI });
}

/** Kembalikan userId, atau null kalau tokennya tidak sah / kedaluwarsa. */
export function bacaToken(token: string): number | null {
  try {
    const isi = jwt.verify(token, JWT_SECRET) as { sub?: string };
    const id = Number(isi.sub);
    return Number.isInteger(id) ? id : null;
  } catch {
    return null;
  }
}
