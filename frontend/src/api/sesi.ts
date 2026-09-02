// Sesi 90 hari: token disimpan di localStorage, tidak pernah logout otomatis.
// Perpanjangan masa berlaku diurus backend saat token dipakai.

const KUNCI_TOKEN = 'lapakai_token';

export function simpanToken(token: string): void {
  localStorage.setItem(KUNCI_TOKEN, token);
}

export function ambilToken(): string | null {
  return localStorage.getItem(KUNCI_TOKEN);
}

export function hapusToken(): void {
  localStorage.removeItem(KUNCI_TOKEN);
}

/**
 * Keluar dari akun — SATU urutan, dipakai semua pintu keluar.
 *
 * Ada dua tempat yang menawarkan keluar: avatar di kepala aplikasi dan layar
 * Profil. Kalau masing-masing menulis urutannya sendiri, cepat atau lambat
 * salah satunya lupa mengosongkan sessionStorage — dan pengguna berikutnya
 * yang masuk di HP yang sama akan melihat nama usaha orang sebelumnya di
 * layar onboarding, tanpa ada galat apa pun.
 *
 * sessionStorage memuat jawaban wawancara resep dan usulan yang belum
 * dikonfirmasi. Keduanya milik sesi yang baru saja ditutup.
 */
export function keluarAkun(): void {
  hapusToken();
  sessionStorage.clear();
}
