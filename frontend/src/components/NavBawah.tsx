import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Package, MessageCircle, ChartColumnBig, type LucideIcon } from 'lucide-react';

/**
 * Navigasi bawah — empat tujuan, target sentuh besar.
 *
 * Empat, bukan lima atau enam: pilihan yang banyak menghilangkan orientasi.
 * Catat tidak lagi di sini — tiga jalan masuknya (foto/suara/ketik) hidup di
 * kartu "Catat penjualan" di Beranda, sesuai rancangan tim — dan slotnya
 * diisi Rekap (fitur 14). Yang tidak masuk ke sini dicapai dari dalam layar.
 */
const TUJUAN: readonly { ke: string; label: string; ikon: LucideIcon }[] = [
  { ke: '/beranda', label: 'Beranda', ikon: Home },
  { ke: '/produk', label: 'Produk', ikon: Package },
  { ke: '/pesanan', label: 'Pesanan', ikon: MessageCircle },
  { ke: '/rekap', label: 'Rekap', ikon: ChartColumnBig },
];

export function NavBawah() {
  const nav = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="sticky bottom-0 -mx-5 mt-4 border-t border-garis bg-kartu/95 aman-bawah px-2 pt-2 backdrop-blur md:-mx-8">
      <div className="flex items-stretch justify-between">
        {TUJUAN.map((t) => {
          const aktif = pathname === t.ke || pathname.startsWith(`${t.ke}/`);
          const Ikon = t.ikon;
          return (
            <button
              key={t.ke}
              type="button"
              onClick={() => nav(t.ke)}
              aria-current={aktif ? 'page' : undefined}
              className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 transition active:scale-95 ${
                aktif ? 'bg-aksen-muda' : ''
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
        })}
      </div>
    </nav>
  );
}
