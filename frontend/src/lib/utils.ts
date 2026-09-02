import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Penggabung kelas Tailwind — dibutuhkan komponen yang disalin dari registri
 * shadcn (beUI), yang seluruh sumbernya mengimpor `@/lib/utils`.
 *
 * `twMerge` membuang kelas Tailwind yang saling bertabrakan dan menyisakan yang
 * terakhir. Tanpa itu, `cn('px-4', 'px-6')` menghasilkan dua padding yang menang
 * berdasarkan urutan di berkas CSS, bukan urutan yang ditulis di komponen.
 *
 * Kode lapakAi sendiri tidak wajib memakai ini — layar yang sudah ada memakai
 * template literal biasa dan itu tetap sah.
 *
 * Catatan: `shadcn add` menimpa berkas ini dengan versinya sendiri. Kalau nanti
 * menambah komponen lagi, periksa apakah komentar ini masih ada.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
