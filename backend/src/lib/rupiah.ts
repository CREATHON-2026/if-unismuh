/**
 * Memformat angka jadi rupiah untuk kalimat peringatan yang dikirim ke layar.
 *
 * Ini MEMFORMAT, bukan menghitung — angkanya sudah jadi dari SQL. Jangan
 * pernah menambahkan fungsi yang menjumlahkan atau mengalikan di berkas ini.
 */
export function rupiah(n: number): string {
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}
