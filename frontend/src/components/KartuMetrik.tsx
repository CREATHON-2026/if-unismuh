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
          : 'bg-permukaan text-sedang';

  const isi = (
    <>
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-full ${warnaChip}`}
        aria-hidden="true"
      >
        <Ikon size={20} strokeWidth={1.8} />
      </span>
      <p className="mt-3 text-kecil font-medium text-redup">{label}</p>
      <p className={`angka mt-0.5 text-judul-kecil font-bold leading-tight ${warnaAngka}`}>{nilai}</p>
      {sub && <p className="mt-1.5 text-kecil leading-relaxed text-sedang">{sub}</p>}
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

/**
 * Kartu statistik berisi penuh — sepasang angka besar yang saling melawan.
 *
 * Dipakai berdua, tidak pernah sendirian: gunanya justru PERBANDINGAN, dan satu
 * kartu berwarna penuh yang berdiri sendiri hanya jadi hiasan besar.
 *
 * Warnanya tunduk pada aturan yang sama. Rujukan rupanya memakai gelap lawan
 * ungu semata-mata karena enak dilihat; di sini pasangannya harus punya arti —
 * hijau lawan merah kalau memang untung lawan rugi, ungu kalau angkanya bukan
 * soal menang-kalah uang.
 *
 * Glif besar di latar sengaja sangat samar dan `aria-hidden`. Ia penanda arah,
 * bukan informasi; kalau ia perlu dibaca untuk paham, kartunya salah.
 */
export function KartuStatistik({
  ikon: Ikon,
  label,
  nilai,
  nada,
  sub,
  onClick,
}: {
  ikon: LucideIcon;
  label: string;
  /** Sudah diformat oleh pemanggil. Aturan #7. */
  nilai: string;
  nada: 'untung' | 'rugi' | 'merek';
  sub?: string;
  onClick?: () => void;
}) {
  const latar =
    nada === 'untung' ? 'bg-untung' : nada === 'rugi' ? 'bg-rugi' : 'hero-gradien';

  const isi = (
    <>
      <span
        className="pointer-events-none absolute -bottom-6 -right-4 text-white/10"
        aria-hidden="true"
      >
        <Ikon size={120} strokeWidth={2.4} />
      </span>
      <span
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white"
        aria-hidden="true"
      >
        <Ikon size={18} strokeWidth={2.2} />
      </span>
      <p className="relative mt-8 text-isi font-medium text-white/75">{label}</p>
      <p className="angka relative mt-0.5 text-judul-kecil font-extrabold leading-tight text-white">
        {nilai}
      </p>
      {sub && <p className="relative mt-1.5 text-kecil leading-relaxed text-white/75">{sub}</p>}
    </>
  );

  const kelas = `relative overflow-hidden rounded-kartu p-4 text-left ${latar}`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${kelas} transition active:scale-[0.98]`}>
        {isi}
      </button>
    );
  }
  return <div className={kelas}>{isi}</div>;
}
