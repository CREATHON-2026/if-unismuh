import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { bacaOnboarding } from '../state/onboarding';
import { LogoTeks } from './Logo';

/**
 * Header aplikasi: avatar inisial usaha + wordmark + lonceng.
 *
 * Lonceng pernah dihapus karena dulu berupa <span> tanpa perilaku — afordansi
 * yang berbohong. Sekarang halaman /notifikasi benar-benar ada (rangkuman hal
 * yang perlu diperhatikan), jadi ia kembali — persis syarat yang ditulis di
 * catatan lama: "dikembalikan kalau notifikasinya benar-benar ada".
 *
 * `nama` boleh dikirim layar yang sudah memuat nama usahanya sendiri, supaya
 * inisialnya ikut benar walau sessionStorage masih kosong.
 */
export function KepalaAplikasi({ nama }: { nama?: string | null }) {
  const nav = useNavigate();
  const inisial = ((nama ?? bacaOnboarding().nama_usaha ?? 'W').trim().charAt(0) || 'W').toUpperCase();
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label="Buka profil"
        onClick={() => nav('/profil')}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-hero text-lg font-bold text-white transition active:scale-95"
      >
        {inisial}
      </button>
      <LogoTeks className="text-sub" />
      <button
        type="button"
        aria-label="Buka notifikasi"
        onClick={() => nav('/notifikasi')}
        className="ml-auto flex h-11 w-11 items-center justify-center rounded-full text-tinta transition hover:bg-kanvas active:scale-95"
      >
        <Bell size={22} strokeWidth={1.9} aria-hidden="true" />
      </button>
    </div>
  );
}
