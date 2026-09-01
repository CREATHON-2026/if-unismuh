/**
 * Nomor HP adalah identitas pengguna, jadi bentuknya harus diseragamkan
 * sebelum disimpan. Kalau tidak, "0812...", "+62812...", dan "62812..."
 * akan jadi tiga pengguna berbeda untuk orang yang sama — dan datanya
 * terpecah tanpa ada yang menyadarinya.
 */

/** Buang spasi dan tanda baca, seragamkan awalan +62 / 62 menjadi 0. */
export function rapikanNomor(nomor: string): string {
  const bersih = nomor.replace(/[\s\-().]/g, '');
  if (bersih.startsWith('+62')) return '0' + bersih.slice(3);
  if (bersih.startsWith('62')) return '0' + bersih.slice(2);
  return bersih;
}

export function nomorValid(nomor: string): boolean {
  return /^0\d{8,13}$/.test(nomor);
}

/**
 * "081244085616" -> "6281244085616"
 *
 * WhatsApp meminta nomor dalam format internasional tanpa tanda "+".
 * Dipakai saat meminta pairing code.
 */
export function keInternasional(nomor: string): string {
  const bersih = rapikanNomor(nomor);
  return bersih.startsWith('0') ? '62' + bersih.slice(1) : bersih;
}
