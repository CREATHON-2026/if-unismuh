import { bacaOnboarding } from '../state/onboarding';

// Header aplikasi: avatar inisial usaha + wordmark + lonceng.
export function KepalaAplikasi() {
  const inisial = (bacaOnboarding().nama_usaha ?? 'W').trim().charAt(0).toUpperCase();
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FAD9C0] font-logo text-lg font-bold text-[#7C2D12]">
          {inisial}
        </span>
        <span className="font-logo text-2xl font-semibold text-[#D9A468]">lapakAi</span>
      </div>
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#2A2118"
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
