import { bacaOnboarding } from '../state/onboarding';

/**
 * Header aplikasi: avatar inisial usaha + wordmark.
 *
 * Ikon lonceng dihapus. Ia digambar sebagai lingkaran seukuran tombol di pojok
 * kanan — terlihat persis seperti sesuatu yang bisa ditekan — padahal berupa
 * <span> tanpa perilaku apa pun. Tidak ada sistem notifikasi di aplikasi ini,
 * jadi menekannya tidak akan pernah melakukan apa-apa.
 *
 * Afordansi yang berbohong lebih buruk daripada ruang kosong, terutama untuk
 * pengguna yang baru pertama memakai aplikasi seperti ini: satu ketukan tanpa
 * hasil membuat mereka ragu apakah aplikasinya rusak atau mereka yang salah.
 * Dikembalikan kalau notifikasinya benar-benar ada.
 *
 * `nama` boleh dikirim layar yang sudah memuat nama usahanya sendiri, supaya
 * inisialnya ikut benar walau sessionStorage masih kosong.
 */
export function KepalaAplikasi({ nama }: { nama?: string | null }) {
  const inisial = ((nama ?? bacaOnboarding().nama_usaha ?? 'W').trim().charAt(0) || 'W').toUpperCase();
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-merek text-lg font-bold text-white">
        {inisial}
      </span>
      <span className="text-sub font-extrabold tracking-[-0.02em] text-tinta">lapakAi</span>
    </div>
  );
}
