// Pemformat tampilan. 20000 -> "Rp 20.000". Ini format, bukan perhitungan.

export function formatRupiah(nilai: number): string {
  return `Rp ${new Intl.NumberFormat('id-ID').format(nilai)}`;
}
