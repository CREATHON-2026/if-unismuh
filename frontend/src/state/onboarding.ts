// Jawaban antar layar onboarding, disimpan di sessionStorage supaya
// tiap layar tetap satu pertanyaan dan tahan muat-ulang.

import type { TemuanPertama } from '@shared/types';

export interface JawabanOnboarding {
  nomor_hp?: string;
  nama_usaha?: string;
  jenis_usaha?: string;
  nama_produk?: string;
  bahan_teks?: string;
  hasil_per_batch?: number;
  harga_jual?: number;
  temuan?: TemuanPertama;
}

const KUNCI = 'lapakai_onboarding';

export function bacaOnboarding(): JawabanOnboarding {
  const mentah = sessionStorage.getItem(KUNCI);
  return mentah ? (JSON.parse(mentah) as JawabanOnboarding) : {};
}

export function tulisOnboarding(tambahan: Partial<JawabanOnboarding>): void {
  sessionStorage.setItem(KUNCI, JSON.stringify({ ...bacaOnboarding(), ...tambahan }));
}
