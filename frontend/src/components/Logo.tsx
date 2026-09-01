// Logo LapakAI — rekonstruksi SVG dari berkas desain; ganti public/logo.svg
// dengan berkas asli kalau tersedia, ikon inline ini ikut disamakan.

export function LogoIkon({ ukuran = 36 }: { ukuran?: number }) {
  return (
    <svg
      width={ukuran}
      height={Math.round(ukuran * (118 / 122))}
      viewBox="0 0 122 118"
      aria-hidden="true"
    >
      <path
        fill="#F5831F"
        d="M30 14 H82 A20 20 0 0 1 102 34 V64 A20 20 0 0 1 82 84 H44 L24 100 Q16 106 20 96 L26 84 H30 A20 20 0 0 1 10 64 V34 A20 20 0 0 1 30 14 Z"
      />
      <path
        fill="#FFFFFF"
        d="M20 8 H84 V30 A10.67 10.67 0 0 1 62.66 30 A10.67 10.67 0 0 1 41.33 30 A10.66 10.66 0 0 1 20 30 Z"
      />
      <path
        fill="#2B4C9B"
        stroke="#FFFFFF"
        strokeWidth="6"
        paintOrder="stroke"
        d="M69 52 h30 a13 13 0 0 1 13 13 v16 a13 13 0 0 1 -13 13 h-25 l-16 13 q-7 5 -4 -3 l4 -10 a13 13 0 0 1 -2 -13 v-16 a13 13 0 0 1 13 -13 z"
      />
    </svg>
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
      <span className={`font-logo font-bold tracking-tight text-[#2B4C9B] ${kelasTeks}`}>
        LapakAI
      </span>
    </div>
  );
}
