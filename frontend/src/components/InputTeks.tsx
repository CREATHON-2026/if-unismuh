import type { InputHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';

// Gaya input standar — dipakai semua kolom isian supaya seragam antar layar.
export const KELAS_INPUT =
  'h-14 w-full rounded-kontrol border-[1.5px] border-garis-tua bg-kartu px-4 text-utama text-tinta outline-none transition placeholder:text-redup focus:border-hero';

// Input besar untuk jari yang tidak terbiasa; angka utama mudah dibaca.
export function InputTeks(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="h-14 w-full rounded-kontrol border-[1.5px] border-garis-tua bg-kartu px-4 text-lg text-tinta outline-none transition placeholder:text-redup focus:border-merek"
      {...props}
    />
  );
}

/**
 * Kolom cari — pil berlatar permukaan, ikon di kiri, tanpa garis.
 *
 * Sengaja beda bentuk dari `InputTeks`. Kolom yang mengisi data punya garis dan
 * sudut yang sama seperti tombol karena ia bagian dari sebuah formulir; kolom
 * yang MENYARING tidak menghasilkan apa-apa dan tidak boleh terlihat seperti
 * sesuatu yang harus diisi sebelum lanjut.
 */
export function KolomCari({
  ikon: Ikon,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { ikon: LucideIcon }) {
  return (
    <div className="flex h-14 w-full items-center gap-3 rounded-full bg-permukaan px-4">
      <Ikon size={20} strokeWidth={2} className="shrink-0 text-redup" aria-hidden="true" />
      <input
        type="search"
        className="min-w-0 flex-1 bg-transparent text-utama text-tinta outline-none placeholder:text-redup"
        {...props}
      />
    </div>
  );
}
