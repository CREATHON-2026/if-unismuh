import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Package, Mic, MessageCircle, ReceiptText, type LucideIcon } from 'lucide-react';

/**
 * Navigasi bawah — lima tujuan, yang tengah menonjol.
 *
 * Dulu empat, dengan alasan tertulis bahwa pilihan yang banyak membuat pengguna
 * kehilangan orientasi. Alasan itu masih benar dan tidak dicabut; yang berubah,
 * yang kelima bukan tambahan melainkan pemindahan. Riwayat pesanan sebelumnya
 * terkubur sebagai tautan di dalam layar Pesanan, dan satu-satunya cara
 * menemukannya adalah sudah tahu bahwa ia ada di sana.
 *
 * Catat diangkat ke tengah sebagai tombol bulat karena ia satu-satunya tujuan
 * di sini yang MEMBUAT data; empat lainnya hanya melihat. Perbedaan itu layak
 * terlihat dari bentuknya, bukan cuma dari urutannya.
 *
 * Ikonnya mikrofon, bukan pemindai seperti di rujukan rupa, karena layar yang
 * dibuka memang mencatat lewat suara. Ikon yang menjanjikan hal lain adalah
 * afordansi yang berbohong.
 */
type Tujuan = { ke: string; label: string; ikon: LucideIcon };

const KIRI: readonly Tujuan[] = [
  { ke: '/beranda', label: 'Beranda', ikon: Home },
  { ke: '/produk', label: 'Produk', ikon: Package },
];

const PUSAT: Tujuan = { ke: '/catat', label: 'Catat', ikon: Mic };

const KANAN: readonly Tujuan[] = [
  { ke: '/pesanan', label: 'Pesanan', ikon: MessageCircle },
  { ke: '/pesanan/riwayat', label: 'Riwayat', ikon: ReceiptText },
];

const SEMUA: readonly Tujuan[] = [...KIRI, PUSAT, ...KANAN];

/**
 * Awalan terpanjang yang menang.
 *
 * `startsWith` saja tidak cukup sejak Riwayat duduk di /pesanan/riwayat: kedua
 * slot cocok sekaligus dan keduanya menyala. Yang benar selalu yang paling
 * spesifik.
 */
function tujuanAktif(pathname: string): string | undefined {
  return SEMUA.filter((t) => pathname === t.ke || pathname.startsWith(`${t.ke}/`)).sort(
    (a, b) => b.ke.length - a.ke.length,
  )[0]?.ke;
}

function Slot({ tujuan, aktif, onPilih }: { tujuan: Tujuan; aktif: boolean; onPilih: () => void }) {
  const Ikon = tujuan.ikon;
  return (
    <button
      type="button"
      onClick={onPilih}
      aria-current={aktif ? 'page' : undefined}
      className="flex min-h-16 flex-1 flex-col items-center justify-center gap-1.5 rounded-kontrol px-1 transition active:scale-95"
    >
      <Ikon
        size={23}
        strokeWidth={aktif ? 2.3 : 1.8}
        className={aktif ? 'text-merek' : 'text-redup'}
        aria-hidden="true"
      />
      <span className={`text-kecil leading-none ${aktif ? 'font-bold text-merek' : 'text-redup'}`}>
        {tujuan.label}
      </span>
    </button>
  );
}

export function NavBawah() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const aktif = tujuanAktif(pathname);
  const IkonPusat = PUSAT.ikon;
  const pusatAktif = aktif === PUSAT.ke;

  return (
    <nav className="sticky bottom-0 -mx-5 mt-4 border-t border-garis bg-kartu/95 aman-bawah px-2 pt-2 backdrop-blur">
      <div className="relative flex items-stretch justify-between">
        {KIRI.map((t) => (
          <Slot key={t.ke} tujuan={t} aktif={aktif === t.ke} onPilih={() => nav(t.ke)} />
        ))}

        {/* Slot tengah hanya menyediakan ruang; tombolnya mengambang di atasnya
            supaya bagian atasnya keluar dari bar — itu yang membuatnya terbaca
            sebagai satu-satunya tujuan yang membuat data. Labelnya tetap ada:
            tombol bulat tanpa tulisan menuntut pengguna menebak, dan pengguna
            kita adalah orang yang paling tidak punya alasan untuk menebak. */}
        <div className="flex min-h-16 flex-1 flex-col items-center justify-end pb-1.5">
          <button
            type="button"
            onClick={() => nav(PUSAT.ke)}
            aria-current={pusatAktif ? 'page' : undefined}
            className={`absolute -top-7 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-fab transition active:scale-95 ${
              pusatAktif ? 'bg-hero' : 'tombol-gradien'
            }`}
          >
            <IkonPusat size={24} strokeWidth={2.1} aria-hidden="true" />
          </button>
          <span
            className={`text-kecil leading-none ${pusatAktif ? 'font-bold text-merek' : 'text-redup'}`}
          >
            {PUSAT.label}
          </span>
        </div>

        {KANAN.map((t) => (
          <Slot key={t.ke} tujuan={t} aktif={aktif === t.ke} onPilih={() => nav(t.ke)} />
        ))}
      </div>
    </nav>
  );
}
