import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Navigasi bawah — empat tujuan, target sentuh besar.
 *
 * Empat, bukan lima atau enam: pengguna 35–60 tahun dengan literasi digital
 * rendah kehilangan orientasi kalau pilihannya banyak. Yang tidak masuk ke sini
 * dicapai dari dalam layar, bukan ditambahkan sebagai ikon kelima.
 */
const TUJUAN = [
  { ke: '/beranda', label: 'Beranda' },
  { ke: '/produk', label: 'Produk' },
  { ke: '/catat', label: 'Catat' },
  { ke: '/pesanan', label: 'Pesanan' },
] as const;

function Ikon({ nama, aktif }: { nama: string; aktif: boolean }) {
  const warna = aktif ? '#1A1714' : '#6B635A';
  const p = {
    width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none',
    stroke: warna, strokeWidth: 1.8,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  if (nama === 'Beranda') {
    return <svg {...p}><path d="M3.5 11 12 4l8.5 7" /><path d="M6 10v9h12v-9" /></svg>;
  }
  if (nama === 'Produk') {
    return <svg {...p}><rect x="3.5" y="6" width="17" height="5" rx="1.2" /><path d="M5 11v7.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V11" /><path d="M10 14.5h4" /></svg>;
  }
  if (nama === 'Catat') {
    return <svg {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0" /><path d="M12 17.5V21" /></svg>;
  }
  return <svg {...p}><path d="M20 11.5a7.5 7.5 0 0 1-11 6.6L4 19.5l1.4-4.4A7.5 7.5 0 1 1 20 11.5Z" /></svg>;
}

export function NavBawah() {
  const nav = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="sticky bottom-0 -mx-6 mt-4 border-t border-[#E8E3DA] bg-white/95 px-3 pb-2 pt-2 backdrop-blur">
      <div className="flex items-stretch justify-between">
        {TUJUAN.map((t) => {
          const aktif = pathname === t.ke || pathname.startsWith(`${t.ke}/`);
          return (
            <button
              key={t.ke}
              type="button"
              onClick={() => nav(t.ke)}
              aria-current={aktif ? 'page' : undefined}
              className="flex min-h-16 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 transition active:scale-95"
            >
              <Ikon nama={t.label} aktif={aktif} />
              <span
                className={`text-[13px] ${aktif ? 'font-bold text-[#1A1714]' : 'text-[#6B635A]'}`}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
