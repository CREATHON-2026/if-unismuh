import type { ReactNode } from 'react';

/**
 * Kartu gelap untuk SATU angka terpenting di layar.
 *
 * Gelap dipakai sebagai pengeras suara, bukan hiasan: kalau ada dua kartu gelap
 * di satu layar, tidak ada lagi yang paling penting. Satu per layar, itu saja.
 *
 * `nilai` diterima sebagai teks yang SUDAH diformat. Komponen ini tidak
 * menghitung, tidak membulatkan, dan tidak menyimpulkan apa pun dari angka —
 * aturan #7.
 */
export function KartuHero({
  label,
  nilai,
  nada = 'untung',
  catatan,
  bawah,
}: {
  label: string;
  nilai: string;
  /** Menentukan warna angka. Hijau = untung, merah = rugi, terang = netral. */
  nada?: 'untung' | 'rugi' | 'netral';
  /** Satu kalimat penjelas di bawah angka */
  catatan?: string;
  /** Baris tambahan di bawah garis pemisah, mis. pembanding */
  bawah?: ReactNode;
}) {
  const warnaAngka =
    nada === 'rugi' ? 'text-rugi-terang' : nada === 'untung' ? 'text-untung-terang' : 'text-white';

  return (
    <div className="hero-gradien rounded-kartu p-6">
      <p className="text-isi font-medium text-white/70">{label}</p>
      <p className={`angka mt-1.5 text-nomor-besar font-extrabold leading-none ${warnaAngka}`}>
        {nilai}
      </p>
      {catatan && (
        <p className="mt-3 text-isi leading-relaxed text-white/70">{catatan}</p>
      )}
      {bawah && <div className="mt-5 border-t border-white/20 pt-4">{bawah}</div>}
    </div>
  );
}
