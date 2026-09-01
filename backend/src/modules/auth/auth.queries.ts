import { satu } from '../../db/index.ts';
import type { Pengguna } from '../../../../shared/types.ts';

/**
 * Semua SQL untuk domain auth ada di berkas ini.
 *
 * Aturannya: tidak ada query auth di berkas lain. Kalau butuh query baru,
 * tambahkan di sini — jangan tulis SQL di dalam route handler.
 */

export function cariPenggunaLewatNomor(nomorHp: string): Promise<Pengguna | null> {
  return satu<Pengguna>(
    `SELECT id, nomor_hp, nama_usaha, jenis_usaha
     FROM pengguna WHERE nomor_hp = $1`,
    [nomorHp],
  );
}

export function ambilPengguna(userId: number): Promise<Pengguna | null> {
  return satu<Pengguna>(
    `SELECT id, nomor_hp, nama_usaha, jenis_usaha
     FROM pengguna WHERE id = $1`,
    [userId],
  );
}

export function buatPengguna(nomorHp: string): Promise<Pengguna | null> {
  return satu<Pengguna>(
    `INSERT INTO pengguna (nomor_hp) VALUES ($1)
     RETURNING id, nomor_hp, nama_usaha, jenis_usaha`,
    [nomorHp],
  );
}
