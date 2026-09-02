// Logo lapakAi — aset brand; warna persis spesifikasi (#29447D / #FF7100)
// sengaja hard-code di sini, bukan token UI.

const NAVY = '#29447D';
const ORANYE = '#FF7100';

export function LogoIkon({ ukuran = 36 }: { ukuran?: number }) {
  // Aset resmi di public/logo.svg — bukan digambar ulang di kode, supaya mark
  // di aplikasi, favicon, dan materi presentasi dijamin satu gambar yang sama.
  return (
    <img
      src="/logo.svg"
      alt=""
      width={ukuran}
      height={Math.round(ukuran * (118 / 120))}
      aria-hidden="true"
    />
  );
}

export function LogoTeks({ className = '' }: { className?: string }) {
  return (
    <span
      className={`font-logo font-bold tracking-tight ${className}`}
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
      <LogoTeks className={kelasTeks} />
    </div>
  );
}
