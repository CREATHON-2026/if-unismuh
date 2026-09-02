import type { CSSProperties } from "react";

// The reduced-motion rule travels with the component. app/globals.css calms CSS
// animation globally, but the registry bundles imports only, so an installed
// copy never receives that reset.
//
// `!important` because the sweep is an inline style, which outranks a plain rule
// in a media query. It selects a marker class carried by TEXT_SHIMMER_CLASS_NAME
// so it also reaches consumers that build their own span out of these exports.
export const TEXT_SHIMMER_KEYFRAMES =
  "@keyframes beui-text-shimmer{from{background-position:200% 0}to{background-position:-200% 0}}" +
  "@media (prefers-reduced-motion: reduce){.beui-text-shimmer{animation:none !important}}";

/*
 * DISESUAIKAN dari bawaan beUI. Jangan kembalikan ke aslinya.
 *
 * Aslinya memakai `var(--muted-foreground)` dan `var(--foreground)` — token
 * bawaan shadcn. lapakAi tidak mendefinisikan keduanya (paletnya `--color-redup`
 * dan `--color-tinta`, lihat index.css), dan kalau dibiarkan gradiennya jadi
 * tidak sah lalu seluruh `background-image` dibuang browser.
 *
 * Yang tersisa `bg-clip-text text-transparent`: tulisannya hilang sama sekali.
 * Tanpa galat, tanpa peringatan build — hanya ruang kosong, tepat di
 * detik-detik pengguna paling butuh tanda bahwa aplikasinya masih hidup.
 *
 * Kalau nanti menambah komponen beUI lain, periksa hal yang sama: cari
 * `var(--foreground)`, `var(--muted-foreground)`, `var(--background)`, dan
 * `var(--primary)` di berkas yang disalin.
 */
export const TEXT_SHIMMER_CLASS_NAME =
  "beui-text-shimmer bg-[length:200%_100%] bg-clip-text text-transparent bg-[linear-gradient(110deg,var(--color-redup)_30%,var(--color-tinta)_50%,var(--color-redup)_70%)]";

export function textShimmerStyle(duration: number): CSSProperties {
  return {
    animation: `beui-text-shimmer ${duration}s linear infinite`,
  };
}
