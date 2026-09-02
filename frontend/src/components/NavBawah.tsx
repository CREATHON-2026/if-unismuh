import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Package, Mic, MessageCircle, ChartColumnBig, type LucideIcon } from 'lucide-react';

/**
 * Navigasi bawah — lima tujuan, yang tengah menonjol.
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
type Tujuan = { ke: string; label: string; ikon: LucideIcon };

const KIRI: readonly Tujuan[] = [
  { ke: '/beranda', label: 'Beranda', ikon: Home },
  { ke: '/produk', label: 'Produk', ikon: Package },
];

const PUSAT: Tujuan = { ke: '/catat', label: 'Catat', ikon: Mic };

const KANAN: readonly Tujuan[] = [
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
  const aktif = tujuanAktif(pathname);
  const IkonPusat = PUSAT.ikon;
  const pusatAktif = aktif === PUSAT.ke;

  return (
    <nav className="sticky bottom-0 -mx-5 mt-auto border-t border-garis bg-kartu/95 aman-bawah px-2 pt-2 backdrop-blur">
      <div className="relative flex items-stretch justify-between">
        {/* Jarak ke isi di atasnya datang dari `mt-auto`, bukan dari margin
            tetap: di layar yang isinya pendek nav terdorong ke dasar layar, dan
            di layar yang isinya panjang ia menempel tepat di bawah isi. Margin
            tetap hanya benar untuk salah satu dari keduanya. */}
        {KIRI.map((t) => (
          <Slot key={t.ke} tujuan={t} aktif={aktif === t.ke} onPilih={() => nav(t.ke)} />
        ))}

        {/* Slot tengah hanya menyediakan ruang; tombolnya mengambang di atasnya
            supaya bagian atasnya keluar dari bar — itu yang membuatnya terbaca
            sebagai satu-satunya tujuan yang membuat data. Labelnya tetap ada:
            tombol bulat tanpa tulisan menuntut pengguna menebak, dan pengguna
            kita adalah orang yang paling tidak punya alasan untuk menebak.

            Keadaan aktifnya ditandai cincin, bukan warna yang lebih gelap.
            Empat slot lain menjadi LEBIH terang saat aktif; kalau yang tengah
            justru meredup, arah isyaratnya berlawanan di satu bar yang sama.
            Cincinnya ungu tembus 30%, bukan `merek-muda`: di atas bar putih
            `merek-muda` hanya 1,16:1 — ada di CSS tapi tidak ada di mata. */}
        <div className="flex min-h-16 flex-1 flex-col items-center justify-end pb-1.5">
          <button
            type="button"
            onClick={() => nav(PUSAT.ke)}
            aria-current={pusatAktif ? 'page' : undefined}
            className={`absolute -top-7 flex h-14 w-14 items-center justify-center rounded-full tombol-gradien text-white shadow-fab transition active:scale-95 ${
              pusatAktif ? 'ring-4 ring-merek/30' : ''
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
