/**
 * Tipe modul WhatsApp.
 *
 * Modul ini HANYA MEMBACA — tidak ada tipe, fungsi, atau jalur apa pun yang
 * berkaitan dengan mengirim pesan. Aturan #4 ditegakkan struktur.
 */

/** Keadaan sambungan pembaca WhatsApp (Baileys). */
export type StatusWa = 'terputus' | 'menunggu_qr' | 'menyambung' | 'tersambung';

/** Jawaban GET /whatsapp/status — juga dikembalikan POST /whatsapp/hubungkan. */
export interface StatusWhatsappRes {
  status: StatusWa;
  /** QR mentah untuk dirender frontend; null kalau tidak sedang menunggu. */
  qr: string | null;
  /** Kode 8 digit yang dimasukkan pengguna di HP-nya; null kalau memakai QR. */
  kode_pairing: string | null;
  /** Selalu true — sistem tidak punya jalur mengirim. */
  hanya_baca: true;
  alasan: string | null;
}
