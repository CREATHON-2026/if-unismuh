import type { DataEkstraksi } from '@shared/types/api';

// Hasil ekstraksi hanya usulan — hidup di sessionStorage sampai dikonfirmasi (aturan #2).
const KUNCI = 'lapakai_ekstraksi';

export function tulisEkstraksi(data: DataEkstraksi): void {
  sessionStorage.setItem(KUNCI, JSON.stringify(data));
}

export function bacaEkstraksi(): DataEkstraksi | null {
  const mentah = sessionStorage.getItem(KUNCI);
  return mentah ? (JSON.parse(mentah) as DataEkstraksi) : null;
}

export function hapusEkstraksi(): void {
  sessionStorage.removeItem(KUNCI);
}
