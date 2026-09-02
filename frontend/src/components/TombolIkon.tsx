import type { LucideIcon } from 'lucide-react';

/**
 * Tombol ikon kotak-membulat bergaris — kembali, bagikan, cetak.
 *
 * Hanya untuk aksi yang ikonnya sudah universal. Kalau sebuah aksi butuh
 * dijelaskan, ia butuh teks, bukan ikon: pengguna kita berusia 35–60 tahun
 * dengan literasi digital rendah, dan ikon yang harus ditebak adalah ikon yang
 * tidak akan ditekan.
 *
 * `aria-label` wajib, bukan opsional — tanpa itu pembaca layar hanya membaca
 * "tombol".
 */
export function TombolIkon({
  ikon: Ikon,
  label,
  onClick,
  nada = 'hero',
  disabled,
}: {
  ikon: LucideIcon;
  /** Dibacakan pembaca layar. Wajib. */
  label: string;
  onClick: () => void;
  /** `hero` = di atas bidang ungu. `terang` = di atas kanvas atau kartu. */
  nada?: 'hero' | 'terang';
  disabled?: boolean;
}) {
  const gaya =
    nada === 'hero'
      ? 'border-white/30 text-white'
      : 'border-garis-tua text-tinta';

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-11 w-11 items-center justify-center rounded-kontrol border transition active:scale-95 disabled:opacity-35 ${gaya}`}
    >
      <Ikon size={22} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}
