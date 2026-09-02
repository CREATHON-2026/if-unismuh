import type { ButtonHTMLAttributes } from 'react';

/**
 * Tombol target-sentuh besar.
 *
 * Persegi membulat, bukan pil. Pil penuh membuat teks panjang terlihat
 * mengambang dan memaksa tepi kiri-kanan kosong percuma — di layar 390px itu
 * ruang yang mahal.
 *
 * Hanya ada satu tombol berisi penuh per layar. Kalau ada dua yang sama-sama
 * gelap, pengguna harus memilih tanpa petunjuk mana yang dimaksud — jadi aksi
 * kedua selalu `garis`.
 *
 * `utama` memakai gradien ungu menurun dengan cahaya di bawahnya; `gelap`
 * memakai ungu pekat pejal. Keduanya bukan lagi peran yang sama: sejak rupa
 * hero jadi gradien, gradien dipakai untuk **aksi utama layar**, dan `gelap`
 * turun pangkat jadi aksi berisi yang kedua — yang tetap perlu terlihat tegas
 * tapi bukan tujuan layar (mis. "Baca kalimat ini" di samping tombol bicara,
 * atau "Batalkan pesanan" di dalam sheet).
 */
export function Tombol({
  varian = 'utama',
  className = '',
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { varian?: 'utama' | 'gelap' | 'garis' }) {
  const dasar = 'min-h-16 w-full rounded-kontrol px-4 text-utama font-semibold transition';

  // Keadaan nonaktif dipilih di sini, bukan lewat varian `disabled:` dari
  // Tailwind. Dua alasan, keduanya sudah terbukti salah kalau diabaikan:
  //
  // 1. Opacity tidak bisa dipakai. Gradien ungu yang diredupkan jadi lavender
  //    pucat, dan tulisan putih di atasnya jatuh ke 2,3:1 — terukur, tidak
  //    terbaca. Abu pejal dengan tulisan `sedang` memberi 6,2:1.
  // 2. `disabled:bg-none` TIDAK bisa mematikan `.tombol-gradien`. Kelas itu
  //    ditulis langsung di index.css tanpa `@layer`, dan CSS selalu
  //    memenangkan aturan tak berlapis di atas aturan berlapis — berapa pun
  //    specificity-nya. Utilitas Tailwind semuanya hidup di `@layer utilities`,
  //    jadi ia kalah. Satu-satunya cara yang jujur adalah tidak memasang
  //    gradiennya sejak awal.
  const gaya = disabled
    ? // `garis` tetap bergaris saat mati. Kalau ia ikut jadi balok abu pejal,
      // tombol sekunder yang mati terlihat lebih berat daripada saat hidup —
      // dan mirip tombol utama yang mati, padahal perannya berbeda.
      varian === 'garis'
      ? 'border-[1.5px] border-garis bg-transparent text-redup'
      : 'bg-garis text-sedang'
    : varian === 'garis'
      ? 'border-[1.5px] border-garis-tua bg-transparent text-tinta active:scale-[0.98]'
      : varian === 'gelap'
        ? 'bg-hero text-white active:scale-[0.98]'
        : 'tombol-gradien text-white shadow-fab active:scale-[0.98]';

  return <button className={`${dasar} ${gaya} ${className}`} disabled={disabled} {...props} />;
}
