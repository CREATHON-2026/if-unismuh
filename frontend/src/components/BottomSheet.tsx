import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'motion/react';

/**
 * Bottom sheet — panel yang naik dari bawah layar.
 *
 * Dipilih daripada halaman baru karena keputusan yang dilayaninya kecil dan
 * bergantung pada konteks di belakangnya: pedagang sedang melihat daftar pesan
 * masuk, dan ia perlu membetulkan satu hal lalu kembali. Halaman penuh memutus
 * benang itu; sheet menyisakan daftarnya tetap terlihat di balik latar gelap.
 *
 * Bisa ditutup dengan tiga cara, dan itu disengaja: seret ke bawah, ketuk latar,
 * atau tombol Esc. Pengguna kita berusia 35-60 tahun dan tidak semuanya tahu
 * gestur seret — selalu ada jalan keluar yang terlihat.
 *
 * Ambang penutupan memakai JARAK ATAU KECEPATAN. Kalau hanya jarak, seretan
 * cepat dan pendek — cara orang membuang panel di ponsel — tidak menutupnya dan
 * terasa macet. Kalau hanya kecepatan, seretan pelan sejauh setengah layar
 * memantul balik dan terasa melawan.
 */
export function BottomSheet({
  buka,
  onTutup,
  judul,
  keterangan,
  children,
  aksi,
}: {
  buka: boolean;
  onTutup: () => void;
  judul: string;
  keterangan?: string;
  children: ReactNode;
  /** Tombol yang menempel di dasar sheet, di luar area gulir */
  aksi?: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!buka) return;

    function tekan(e: KeyboardEvent) {
      if (e.key === 'Escape') onTutup();
    }
    window.addEventListener('keydown', tekan);

    // Kunci gulir halaman di belakang. Tanpa ini, menggulir isi sheet sampai
    // mentok akan meneruskan gulirannya ke daftar di belakang — dan pedagang
    // kembali ke posisi yang berbeda setelah sheet-nya ditutup.
    const semula = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Fokus dipindahkan ke panel supaya pembaca layar mengumumkan isinya, dan
    // supaya Esc tertangkap tanpa pengguna harus mengetuk dulu.
    panel.current?.focus();

    return () => {
      window.removeEventListener('keydown', tekan);
      document.body.style.overflow = semula;
    };
  }, [buka, onTutup]);

  function selesaiSeret(_: unknown, info: PanInfo) {
    if (info.offset.y > 120 || info.velocity.y > 500) onTutup();
  }

  return (
    <AnimatePresence>
      {buka && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.div
            className="absolute inset-0 bg-tinta/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onTutup}
            aria-hidden="true"
          />

          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={judul}
            tabIndex={-1}
            className="relative flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-lembar bg-kartu shadow-mengambang outline-none"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            // Pegas, bukan durasi tetap: panel yang berhenti mendadak terasa
            // seperti gambar yang ditempel, bukan benda yang didorong.
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={selesaiSeret}
          >
            {/* Pegangan seret. Lebar penuh supaya seluruh kepala sheet bisa
                diseret, bukan cuma garis kecilnya. */}
            <div className="shrink-0 cursor-grab px-5 pb-1 pt-3 active:cursor-grabbing">
              <div className="mx-auto h-1.5 w-11 rounded-full bg-garis-tua" />
            </div>

            <div className="shrink-0 px-5 pb-3 pt-2">
              <h2 className="text-sub font-bold tracking-[-0.01em] text-tinta">{judul}</h2>
              {keterangan && (
                <p className="mt-1 text-isi leading-relaxed text-sedang">{keterangan}</p>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2">{children}</div>

            {aksi && (
              <div className="aman-bawah shrink-0 border-t border-garis px-5 pt-3">{aksi}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
