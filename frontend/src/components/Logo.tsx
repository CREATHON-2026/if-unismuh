// Logo lapakAi — aset brand; warna persis spesifikasi (#29447D / #FF7100)
// sengaja hard-code di sini, bukan token UI.

const NAVY = '#29447D';
const ORANYE = '#FF7100';

export function LogoIkon({ ukuran = 36 }: { ukuran?: number }) {
  return (
    <svg
      width={ukuran}
      height={Math.round(ukuran * (118 / 120))}
      viewBox="0 0 120 118"
      aria-hidden="true"
    >
      {/* Badan warung sekaligus balon chat: ekor diagonal kanan-bawah */}
      <path
        fill="#0F172A"
        d="M30 14 H82 A20 20 0 0 1 102 34 V64 A20 20 0 0 1 82 84 H44 L24 100 Q16 106 20 96 L26 84 H30 A20 20 0 0 1 10 64 V34 A20 20 0 0 1 30 14 Z"
      />
      <path
        fill="#FFFFFF"
        d="M20 8 H84 V30 A10.67 10.67 0 0 1 62.66 30 A10.67 10.67 0 0 1 41.33 30 A10.66 10.66 0 0 1 20 30 Z"
      />
      <path
        fill="#0F172A"
        stroke="#FFFFFF"
        strokeWidth="6"
        paintOrder="stroke"
        d="M69 52 h30 a13 13 0 0 1 13 13 v16 a13 13 0 0 1 -13 13 h-25 l-16 13 q-7 5 -4 -3 l4 -10 a13 13 0 0 1 -2 -13 v-16 a13 13 0 0 1 13 -13 z"
      />
      {/* Indikator mengetik: 4 kotak membulat */}
      <rect x="18" y="103" width="8.5" height="8.5" rx="2.5" fill={NAVY} />
      <rect x="30.5" y="103" width="8.5" height="8.5" rx="2.5" fill={NAVY} />
      <rect x="43" y="103" width="8.5" height="8.5" rx="2.5" fill={NAVY} />
      <rect x="55.5" y="103" width="8.5" height="8.5" rx="2.5" fill={NAVY} />
      {/* Awning 5 seksi: oranye–putih berselang, panel tengah terlebar */}
      <path fill={ORANYE} d="M26 18 H36.4 L30 46 A9 6 0 0 1 12 46 L21.5 21 Q22.6 18 26 18 Z" />
      <path fill="#FFFFFF" d="M36.4 18 H51.6 L49 46 A9.5 6 0 0 1 30 46 Z" />
      <path fill={ORANYE} d="M51.6 18 H68.4 L71 46 A11 7 0 0 1 49 46 Z" />
      <path fill="#FFFFFF" d="M68.4 18 H83.6 L90 46 A9.5 6 0 0 1 71 46 Z" />
      <path fill={ORANYE} d="M83.6 18 H94 Q97.4 18 98.5 21 L108 46 A9 6 0 0 1 90 46 Z" />
    </svg>
  );
}

export function LogoTeks({ className = '' }: { className?: string }) {
  return (
    <span
      className={`font-wordmark font-bold tracking-tight ${className}`}
      style={{ color: NAVY }}
    >
      lapak<span style={{ color: ORANYE }}>Ai</span>
    </span>
  );
}

export function Logo({
  ukuranIkon = 32,
  kelasTeks = 'text-2xl',
}: {
  ukuranIkon?: number;
  kelasTeks?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <LogoIkon ukuran={ukuranIkon} />
      <span className={`font-logo font-bold tracking-tight text-tinta ${kelasTeks}`}>
        LapakAI
      </span>
    </div>
  );
}
