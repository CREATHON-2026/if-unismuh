import type { LucideIcon } from 'lucide-react';

/**
 * Grid metrik. Dua kolom tetap — bukan tiga: di layar 360px, tiga kolom membuat
 * angka jutaan terpotong atau mengecil sampai tidak terbaca.
 */
export function GridMetrik({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

/**
 * Satu kotak metrik: chip ikon, label, angka, penjelas opsional.
 *
 * `nilai` selalu teks yang SUDAH jadi dari API dan sudah diformat. Kartu ini
 * tidak pernah menghitung, membandingkan, atau menyimpulkan — aturan #7.
 *
 * Tidak ada prop "delta" (+12% dibanding bulan lalu) di sini, dan itu disengaja:
 * `GET /beranda` tidak mengirim pembanding periode sebelumnya. Mengarang angka
 * pembanding supaya mirip dashboard di internet adalah persis jenis kebohongan
 * yang produk ini ada untuk menghapusnya. Kalau API-nya nanti mengirim, barulah
 * propnya ditambahkan.
 */
export function KartuMetrik({
  ikon: Ikon,
  label,
  nilai,
  sub,
  nada = 'netral',
  penuh = false,
  onClick,
}: {
  ikon: LucideIcon;
  label: string;
  /** Sudah diformat. Pakai "—" kalau nilainya belum diketahui, jangan "0". */
  nilai: string;
  sub?: string;
  nada?: 'netral' | 'untung' | 'rugi' | 'tanda';
  /** Melebar dua kolom. Dipakai kalau `sub`-nya kalimat, bukan satu kata. */
  penuh?: boolean;
  onClick?: () => void;
}) {
  const warnaAngka =
    nada === 'rugi' ? 'text-rugi' : nada === 'untung' ? 'text-untung' : 'text-tinta';
  const warnaChip =
    nada === 'rugi'
      ? 'bg-rugi-muda text-rugi'
      : nada === 'untung'
        ? 'bg-untung-muda text-untung'
        : nada === 'tanda'
          ? 'bg-tanda text-tanda-tinta'
          : 'bg-kanvas text-sedang';

  const isi = (
    <>
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${warnaChip}`}
        aria-hidden="true"
      >
        <Ikon size={20} strokeWidth={1.8} />
      </span>
      <p className="mt-3 text-[13.5px] font-medium text-redup">{label}</p>
      <p className={`angka mt-0.5 text-[22px] font-bold leading-tight ${warnaAngka}`}>{nilai}</p>
      {sub && <p className="mt-1.5 text-[13px] leading-relaxed text-sedang">{sub}</p>}
    </>
  );

  const kelas = `kartu p-4 text-left ${penuh ? 'col-span-2' : ''}`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${kelas} transition active:scale-[0.98]`}>
        {isi}
      </button>
    );
  }
  return <div className={kelas}>{isi}</div>;
}
