import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Package, Mic, MessageCircle, ChartColumnBig, type LucideIcon } from 'lucide-react';

/**
 * Navigasi bawah — empat slot datar + satu tombol Tanya terangkat di tengah.
 *
 * Dulu empat, dengan alasan tertulis bahwa pilihan yang banyak membuat pengguna
 * kehilangan orientasi. Alasan itu masih benar dan tidak dicabut; yang kelima
 * bukan tambahan melainkan pemindahan.
 *
 * Slot kelima itu sempat diisi Riwayat pesanan, karena ia terkubur sebagai
 * tautan di dalam layar Pesanan. Sekarang diisi Rekap, dan pertukaran itu perlu
 * dijelaskan supaya tidak terbaca sebagai kelalaian:
 *
 *   - Riwayat masih punya rumah yang masuk akal. Tautannya di layar Pesanan
 *     (PesananMasuk.tsx) bukan tempat sembarangan — riwayat pesanan memang
 *     kelanjutan dari pesanan masuk, dan orang yang mencarinya mencarinya di
 *     sana. Rekap tidak punya layar induk semacam itu.
 *   - Rekap adalah Beranda yang direntang sepanjang minggu. Ia menjawab
 *     pertanyaan yang paling sering diulang pedagang — "minggu ini bagaimana?"
 *     — dan pertanyaan sesering itu tidak boleh butuh dua ketukan untuk sampai.
 *   - Nav di `main` juga memuat Rekap dan tidak memuat Riwayat. Menukarnya di
 *     sini membuat kedua sisi BERTEMU saat merge, bukan makin jauh.
 *
 * Catat diangkat ke tengah sebagai tombol bulat karena ia satu-satunya tujuan
 * di sini yang MEMBUAT data; empat lainnya hanya melihat. Perbedaan itu layak
 * terlihat dari bentuknya, bukan cuma dari urutannya.
 *
 * Ikonnya mikrofon, bukan pemindai seperti di rujukan rupa, karena layar yang
 * dibuka memang mencatat lewat suara. Ikon yang menjanjikan hal lain adalah
 * afordansi yang berbohong.
 */
const KIRI: readonly { ke: string; label: string; ikon: LucideIcon }[] = [
  { ke: '/beranda', label: 'Beranda', ikon: Home },
  { ke: '/produk', label: 'Produk', ikon: Package },
];

const KANAN: readonly { ke: string; label: string; ikon: LucideIcon }[] = [
  { ke: '/pesanan', label: 'Pesanan', ikon: MessageCircle },
  { ke: '/rekap', label: 'Rekap', ikon: ChartColumnBig },
];

const SEMUA: readonly Tujuan[] = [...KIRI, PUSAT, ...KANAN];

/**
 * Awalan terpanjang yang menang.
 *
 * `startsWith` saja tidak cukup: /pesanan/riwayat mencocoki slot /pesanan juga,
 * sehingga keduanya menyala sekaligus. Yang benar selalu yang paling spesifik.
 * Dipertahankan meski Riwayat sudah keluar dari nav — layarnya masih hidup, dan
 * saat dibuka slot Pesanan yang menyala memang jawaban yang tepat.
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
