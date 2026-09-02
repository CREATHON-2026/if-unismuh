// Jawaban antar layar onboarding, disimpan di sessionStorage supaya
// tiap layar tetap satu pertanyaan dan tahan muat-ulang.

import type { BahanMasukan, TemuanPertama } from '@shared/types';

/**
 * Wizard resep dipakai DUA konteks: onboarding, dan menambah produk lain dari
 * layar Produk. Yang membedakan hanya ujungnya — lihat ResepHarga.tsx.
 *
 * Kosong berarti 'onboarding', supaya alur lama tidak berubah perilakunya
 * hanya karena medan ini ditambahkan.
 */
export type ModeResep = 'onboarding' | 'tambah';

export interface JawabanOnboarding {
  mode?: ModeResep;
  nomor_hp?: string;
  nama_usaha?: string;
  jenis_usaha?: string;
  nama_produk?: string;
  bahan?: BahanMasukan[];
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
