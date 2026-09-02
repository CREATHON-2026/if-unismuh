import type { ReactNode } from 'react';

/**
 * Lembar putih yang naik menimpa tepi bawah hero.
 *
 * Bukan kartu. Sudut atasnya tumpul dan sudut bawahnya tidak ada sama sekali —
 * yang dibentuk adalah tepi atas halaman, bukan sebuah kotak. Membulatkan
 * bawahnya akan membuatnya terlihat mengambang di tengah layar.
 *
 * `mengambang` untuk benda yang sengaja menyeberangi jahitan antara hero dan
 * lembar, mis. kartu aksi cepat. Margin negatifnya ditentukan di sini, bukan di
 * layar pemanggil, karena jarak yang tidak seragam antar layar adalah jenis
 * ketidakrapian yang tidak pernah terlihat di satu layar dan langsung terlihat
 * saat berpindah.
 */
export function Lembar({
  mengambang,
  children,
  className = '',
}: {
  mengambang?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`lembar relative -mt-7 flex flex-1 flex-col px-5 ${className}`}>
      {mengambang && <div className="relative -mt-20">{mengambang}</div>}
      <div className={`flex flex-1 flex-col ${mengambang ? 'pt-6' : 'pt-7'}`}>{children}</div>
    </div>
  );
}
