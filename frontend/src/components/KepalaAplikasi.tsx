import { Bell } from 'lucide-react';
import { bacaOnboarding } from '../state/onboarding';

// Header aplikasi: avatar inisial usaha + wordmark + lonceng.
// `nama` boleh dikirim layar yang sudah memuat nama usahanya sendiri, supaya
// inisialnya ikut benar walau sessionStorage masih kosong.
export function KepalaAplikasi({ nama }: { nama?: string | null }) {
  const inisial = ((nama ?? bacaOnboarding().nama_usaha ?? 'W').trim().charAt(0) || 'W').toUpperCase();
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-hero text-lg font-bold text-white">
          {inisial}
        </span>
        <span className="text-[19px] font-extrabold tracking-[-0.02em] text-tinta">lapakAi</span>
      </div>
      <span
        className="flex h-11 w-11 items-center justify-center rounded-full bg-kartu text-sedang"
        aria-hidden="true"
      >
        <Bell size={22} strokeWidth={1.8} />
      </span>
    </div>
  );
}
