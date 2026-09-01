import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Package, Mic, MessageCircle, type LucideIcon } from 'lucide-react';

/**
 * Navigasi bawah — empat tujuan, target sentuh besar.
 *
 * Empat, bukan lima atau enam: pengguna 35–60 tahun dengan literasi digital
 * rendah kehilangan orientasi kalau pilihannya banyak. Yang tidak masuk ke sini
 * dicapai dari dalam layar, bukan ditambahkan sebagai ikon kelima.
 */
const TUJUAN: readonly { ke: string; label: string; ikon: LucideIcon }[] = [
  { ke: '/beranda', label: 'Beranda', ikon: Home },
  { ke: '/produk', label: 'Produk', ikon: Package },
  { ke: '/catat', label: 'Catat', ikon: Mic },
  { ke: '/pesanan', label: 'Pesanan', ikon: MessageCircle },
];

export function NavBawah() {
  const nav = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="sticky bottom-0 -mx-5 mt-4 border-t border-garis bg-kartu/95 aman-bawah px-2 pt-2 backdrop-blur">
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
              className="flex min-h-16 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 transition active:scale-95"
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
