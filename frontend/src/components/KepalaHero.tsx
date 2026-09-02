import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { TombolIkon } from './TombolIkon';

/**
 * Kepala layar bergradien — bidang ungu penuh-lebar di puncak halaman.
 *
 * Bedanya dengan `KartuHero` bukan sekadar rupa. `KartuHero` adalah kartu:
 * sebuah benda DI DALAM layar, sejajar dengan kartu lain, dan angkanya
 * bersaing dengan apa pun yang ada di sebelahnya. Yang ini adalah layarnya
 * sendiri — angkanya tidak duduk di dalam kotak, jadi tidak ada kotak lain yang
 * bisa menandinginya.
 *
 * Dipakai untuk satu angka yang menjadi seluruh alasan layar itu ada: untung
 * bersih di Beranda, nilai pesanan di layar proses. Kalau layarnya punya dua
 * angka setara, ini komponen yang salah — pakai `KartuHero`.
 *
 * `nilai` boleh dikosongkan. Tanpa angka, ini tinggal kepala bergradien berisi
 * kembali–judul–aksi; itu bentuk yang benar untuk layar yang isinya sendiri
 * sudah memuat angkanya, mis. Struk.
 *
 * `nilai` diterima sebagai teks yang SUDAH diformat. Tidak menghitung, tidak
 * membulatkan, tidak menyimpulkan apa pun — aturan #7.
 *
 * Semua teks di sini minimal `text-white/70`. Di bawah itu kontrasnya jatuh di
 * ujung terang gradien; alasannya lengkap di index.css.
 */
export function KepalaHero({
  judul,
  kembali,
  kiri,
  kanan,
  label,
  nilai,
  nada = 'netral',
  catatan,
  bawah,
  bawahIsi,
}: {
  /** Judul di tengah baris atas. Kosongkan kalau barisnya hanya berisi ikon. */
  judul?: string;
  kembali?: () => void;
  /** Mengganti tombol kembali, mis. avatar usaha. */
  kiri?: ReactNode;
  kanan?: ReactNode;
  label?: string;
  /** Sudah diformat oleh pemanggil. */
  nilai?: string;
  /** Menentukan warna angka. Hijau = untung, merah = rugi, putih = netral. */
  nada?: 'untung' | 'rugi' | 'netral';
  catatan?: string;
  /** Ruang tambahan di bawah angka, di dalam gradien. */
  bawah?: ReactNode;
  /**
   * Jarak bawah tambahan. Diisi kalau ada kartu yang menimpa tepi bawah hero,
   * supaya isinya tidak tertutup.
   */
  bawahIsi?: boolean;
}) {
  const warnaAngka =
    nada === 'rugi' ? 'text-rugi-terang' : nada === 'untung' ? 'text-untung-terang' : 'text-white';

  return (
    <div className={`hero-gradien aman-atas px-5 ${bawahIsi ? 'pb-28' : 'pb-10'}`}>
      <div className="relative flex min-h-12 items-center justify-center">
        <div className="absolute left-0">
          {kiri ?? (kembali && <TombolIkon ikon={ArrowLeft} label="Kembali" onClick={kembali} />)}
        </div>
        {judul && (
          <h1 className="text-sub font-bold tracking-[-0.02em] text-white">{judul}</h1>
        )}
        <div className="absolute right-0">{kanan}</div>
      </div>

      {nilai && (
        <div className="mt-7 text-center">
          {label && <p className="text-isi font-medium text-white/70">{label}</p>}
          <p className={`angka mt-1 text-nomor-hero font-extrabold leading-none ${warnaAngka}`}>
            {nilai}
          </p>
          {catatan && (
            <p className="mx-auto mt-3 max-w-[19rem] text-isi leading-relaxed text-white/70">
              {catatan}
            </p>
          )}
        </div>
      )}

      {bawah && <div className="mt-6">{bawah}</div>}
    </div>
  );
}
