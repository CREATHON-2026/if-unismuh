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
 */
export function Tombol({
  varian = 'utama',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { varian?: 'utama' | 'gelap' | 'garis' }) {
  const dasar =
    'min-h-16 w-full rounded-2xl px-4 text-[17px] font-semibold transition active:scale-[0.98] disabled:opacity-35';
  // `utama` dan `gelap` sengaja sama: keduanya sudah tersebar di layar yang
  // ditulis dua orang, dan menyeragamkannya di sini lebih aman daripada
  // menyisir semua pemanggilnya di tengah lomba.
  const gaya =
    varian === 'garis'
      ? 'border-[1.5px] border-garis-tua bg-transparent text-tinta'
      : 'bg-hero text-white';
  return <button className={`${dasar} ${gaya} ${className}`} {...props} />;
}
