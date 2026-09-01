import type { EkstraksiRes } from '@shared/types';

// Hasil ekstraksi hanya usulan — hidup di sessionStorage sampai dikonfirmasi (aturan #2).
const KUNCI = 'lapakai_ekstraksi';

export function tulisEkstraksi(data: EkstraksiRes): void {
  sessionStorage.setItem(KUNCI, JSON.stringify(data));
}

export function bacaEkstraksi(): EkstraksiRes | null {
  const mentah = sessionStorage.getItem(KUNCI);
  return mentah ? (JSON.parse(mentah) as EkstraksiRes) : null;
}

export function hapusEkstraksi(): void {
  sessionStorage.removeItem(KUNCI);
}
