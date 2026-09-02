import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Package, MessageCircle, ChartColumnBig, Sparkles, type LucideIcon } from 'lucide-react';

/**
 * Navigasi bawah — empat slot datar + satu tombol Tanya terangkat di tengah.
 *
 * Tanya AI dapat tempat di tengah karena ia lintas-layar: pertanyaannya bisa
 * soal produk, pesanan, maupun rekap. Bentuknya lingkaran yang naik — bukan
 * slot kelima yang sederajat — supaya empat slot datar tetap berbagi lebar
 * yang sama dan target sentuhnya tidak menyusut.
 */
const KIRI: readonly { ke: string; label: string; ikon: LucideIcon }[] = [
  { ke: '/beranda', label: 'Beranda', ikon: Home },
  { ke: '/produk', label: 'Produk', ikon: Package },
];

const KANAN: readonly { ke: string; label: string; ikon: LucideIcon }[] = [
  { ke: '/pesanan', label: 'Pesanan', ikon: MessageCircle },
  { ke: '/rekap', label: 'Rekap', ikon: ChartColumnBig },
];

export function NavBawah() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const aktifTanya = pathname === '/tanya' || pathname.startsWith('/tanya/');

  const slot = (t: { ke: string; label: string; ikon: LucideIcon }) => {
    const aktif = pathname === t.ke || pathname.startsWith(`${t.ke}/`);
    const Ikon = t.ikon;
    return (
      <button
        key={t.ke}
        type="button"
        onClick={() => nav(t.ke)}
        aria-current={aktif ? 'page' : undefined}
        className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 transition active:scale-95 ${
          aktif ? 'bg-aksen-muda' : 'hover:bg-kanvas'
        }`}
      >
        <Ikon
          size={24}
          strokeWidth={aktif ? 2.2 : 1.8}
          className={aktif ? 'text-tinta' : 'text-redup'}
          aria-hidden="true"
        />
        <span className={`text-kecil ${aktif ? 'font-bold text-tinta' : 'text-redup'}`}>
          {t.label}
        </span>
      </button>
    );
  };

  return (
    <nav className="sticky bottom-0 -mx-5 mt-4 border-t border-garis bg-kartu/95 aman-bawah px-2 pt-2 backdrop-blur md:-mx-8">
      <div className="flex items-stretch justify-between">
        {KIRI.map(slot)}

        <button
          type="button"
          onClick={() => nav('/tanya')}
          aria-label="Tanya lapakAi"
          aria-current={aktifTanya ? 'page' : undefined}
          className="flex flex-col items-center justify-start gap-1 px-2"
        >
          <span
            className={`-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-hero text-white shadow-lg transition active:scale-95 ${
              aktifTanya ? 'ring-2 ring-aksen ring-offset-2 ring-offset-kartu' : ''
            }`}
            aria-hidden="true"
          >
            <Sparkles size={24} strokeWidth={1.9} />
          </span>
          <span className={`text-kecil ${aktifTanya ? 'font-bold text-tinta' : 'text-redup'}`}>
            Tanya
          </span>
        </button>

        {KANAN.map(slot)}
      </div>
    </nav>
  );
}
