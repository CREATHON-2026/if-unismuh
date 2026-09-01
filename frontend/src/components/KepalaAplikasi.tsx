import { bacaOnboarding } from '../state/onboarding';

// Header aplikasi: avatar inisial usaha + wordmark + lonceng.
export function KepalaAplikasi() {
  const inisial = (bacaOnboarding().nama_usaha ?? 'W').trim().charAt(0).toUpperCase();
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FBF3E2] text-lg font-bold text-[#4A443D]">
          {inisial}
        </span>
        <span className="text-[19px] font-extrabold tracking-[-0.02em] text-[#1A1714]">lapakAi</span>
      </div>
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#1A1714"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M18 16v-5a6 6 0 1 0-12 0v5l-1.5 2.5h15L18 16Z" />
        <path d="M10.5 20a1.8 1.8 0 0 0 3 0" />
      </svg>
    </div>
  );
}
