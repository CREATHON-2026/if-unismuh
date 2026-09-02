// Sesi 90 hari: token disimpan di localStorage, tidak pernah logout otomatis.
// Perpanjangan masa berlaku diurus backend saat token dipakai.

const KUNCI_TOKEN = 'lapakai_token';

export function simpanToken(token: string): void {
  localStorage.setItem(KUNCI_TOKEN, token);
}

export function ambilToken(): string | null {
  return localStorage.getItem(KUNCI_TOKEN);
}

// Untuk tombol "Keluar" di Profil — satu-satunya jalur keluar yang disengaja.
export function hapusToken(): void {
  localStorage.removeItem(KUNCI_TOKEN);
}
