import path from 'node:path';
import { fileURLToPath } from 'node:url';
import qrterminal from 'qrcode-terminal';
import { prosesPesan } from '../pesanan/pesanan.proses.ts';

/**
 * Pembaca WhatsApp — HANYA MEMBACA.
 *
 * Modul ini sengaja TIDAK PERNAH mengekspor apa pun yang bisa mengirim pesan.
 * Socket Baileys disimpan di variabel privat dan tidak pernah dikembalikan ke
 * pemanggil. Aturan #4 bukan janji di dokumen — di sini ia ditegakkan struktur:
 * yang tidak ada tidak bisa dipanggil.
 *
 * Batasan yang diketahui dan tidak disembunyikan:
 *  - Satu koneksi WhatsApp Web per pedagang. Tidak akan menskala ke ribuan
 *    pengguna; cukup untuk demo dan pilot.
 *  - Baileys tidak resmi. Nomor bisa kena banned. Karena itu jalur tempel
 *    manual TIDAK PERNAH dihapus — lihat pesanan.routes.ts.
 *  - Baileys 7.x masih release candidate saat ini.
 */

const DIR = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(DIR, '..', '..', '..', 'db', 'baileys-auth');

export type StatusWa = 'terputus' | 'menunggu_qr' | 'menyambung' | 'tersambung';

let sock: any = null;
let status: StatusWa = 'terputus';
let qrTerakhir: string | null = null;
let kodePairing: string | null = null;
/** Diingat supaya sambung ulang tidak jatuh kembali ke mode QR. */
let nomorPairing: string | null = null;
let pemilik: number | null = null;
let alasanBerhenti: string | null = null;

/**
 * Baca status lewat fungsi, bukan variabelnya langsung.
 *
 * `status` diubah dari dalam callback Baileys, tapi TypeScript tidak bisa
 * melihat itu dan mempersempit tipenya ke nilai terakhir yang diberikan
 * secara lurus — sehingga perbandingan yang sah dianggap mustahil.
 */
const statusKini = (): StatusWa => status;

/**
 * Nomor pengirim disimpan TERSAMAR — empat digit terakhir saja.
 *
 * Pembeli tidak pernah setuju datanya diproses aplikasi ini. Pedagang cukup
 * butuh mengenali percakapannya ("yang nomornya 7890"), tidak butuh kita
 * menyimpan identitas lengkap orang lain. Dan karena sistem tidak pernah
 * membalas sendiri, nomor lengkapnya memang tidak diperlukan.
 */
function samarkan(jid: string): string {
  const nomor = jid.split('@')[0]?.replace(/\D/g, '') ?? '';
  return nomor.length >= 4 ? '…' + nomor.slice(-4) : '…';
}

/** Ambil teks dari berbagai bentuk pesan. Media diabaikan. */
function ambilTeks(m: any): string | null {
  const p = m.message;
  if (!p) return null;
  return p.conversation ?? p.extendedTextMessage?.text ?? null;
}

/**
 * Pesan mana yang diproses.
 *
 * Membaca inbox berarti menelan SEMUANYA — termasuk chat keluarga dan orang
 * yang bukan pembeli. Penyaringan di sini yang menjaga supaya aplikasi tidak
 * memproses hal yang bukan urusannya.
 */
function alasanDilewati(m: any): string | null {
  const jid: string = m.key?.remoteJid ?? '';
  if (m.key?.fromMe) return 'dikirim oleh pedagang sendiri (fromMe)';
  if (jid.endsWith('@g.us')) return 'pesan grup';
  if (jid === 'status@broadcast') return 'status/story';
  if (jid.endsWith('@newsletter')) return 'channel/newsletter';
  if (!ambilTeks(m)) {
    return `bukan teks (bentuknya: ${Object.keys(m.message ?? {}).join(', ') || 'kosong'})`;
  }
  return null;
}

async function tanganiPesan(m: any): Promise<void> {
  if (pemilik === null) {
    console.log('[wa] pesan diabaikan: belum ada pemilik sesi');
    return;
  }
  // Kenapa sebuah pesan tidak diproses harus TERLIHAT. Diam-diam membuang
  // pesan adalah kegagalan yang paling sulit ditelusuri: tidak ada galat,
  // tidak ada keluaran, dan mustahil dibedakan dari "tidak ada pesan masuk".
  const dilewati = alasanDilewati(m);
  if (dilewati) {
    console.log(`[wa] dilewati (${dilewati}) dari ${samarkan(m.key?.remoteJid ?? '')}`);
    return;
  }
  const teks = ambilTeks(m)!;
  try {
    const hasil = await prosesPesan(pemilik, teks, 'whatsapp', samarkan(m.key.remoteJid));
    if (hasil.jenis !== 'bukan_pesanan') {
      console.log(`[wa] pesanan masuk dari ${samarkan(m.key.remoteJid)}: ${hasil.jenis}`);
    }
  } catch (err) {
    // Kegagalan membaca satu pesan tidak boleh menjatuhkan koneksi.
    console.error('[wa] gagal memproses pesan:', err instanceof Error ? err.message : err);
  }
}

/**
 * @param nomorInternasional kalau diisi (mis. "6281244085616"), penautan pakai
 *   PAIRING CODE: pengguna memasukkan 8 digit di HP-nya, tidak perlu memindai
 *   QR dari terminal. Jauh lebih ramah untuk pengguna yang tidak terbiasa —
 *   dan itu justru inti produk ini.
 *   Kalau dikosongkan, dipakai cara QR seperti biasa.
 */
export async function hubungkanWhatsapp(
  userId: number, nomorInternasional?: string,
): Promise<StatusWa> {
  if (status === 'tersambung' && pemilik === userId) return status;

  const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } =
    await import('@whiskeysockets/baileys');

  pemilik = userId;
  alasanBerhenti = null;
  kodePairing = null;
  // Diingat supaya sambung ulang tetap memakai mode pairing, bukan jatuh ke QR.
  if (nomorInternasional) nomorPairing = nomorInternasional;
  status = 'menyambung';

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  // Pegang instance-nya di variabel LOKAL. Variabel modul `sock` bisa
  // di-null-kan oleh penangan 'close' sebelum permintaan pairing dijalankan —
  // itulah yang membuat percobaan pertama gagal dengan
  // "Cannot read properties of null (reading 'requestPairingCode')".
  const s = makeWASocket({ auth: state });
  sock = s;
  const pakaiPairing = Boolean(nomorPairing);

  s.ev.on('creds.update', saveCreds);

  // Pairing code hanya bisa diminta kalau perangkatnya belum terdaftar.
  // Socket butuh sesaat untuk siap; kalau belum, dicoba lagi beberapa kali
  // daripada gagal sekali lalu menyerah.
  if (pakaiPairing && !state.creds.registered) {
    void (async () => {
      for (let percobaan = 1; percobaan <= 5; percobaan++) {
        await new Promise((r) => setTimeout(r, 3000));
        if (kodePairing || statusKini() === 'tersambung') return;
        try {
          const kode = await s.requestPairingCode(nomorPairing!);
          kodePairing = kode;
          status = 'menunggu_qr';
          console.log(`\n[wa] ==============================`);
          console.log(`[wa]  KODE PAIRING: ${kode}`);
          console.log(`[wa] ==============================`);
          console.log('[wa] Di HP: WhatsApp > Perangkat Tertaut >');
          console.log('[wa] Tautkan perangkat > Tautkan dengan nomor telepon\n');
          return;
        } catch (err) {
          const pesan = err instanceof Error ? err.message : String(err);
          console.error(`[wa] percobaan ${percobaan}/5 minta kode gagal: ${pesan}`);
          alasanBerhenti = `Gagal meminta kode pairing: ${pesan}`;
        }
      }
      console.error('[wa] menyerah meminta kode pairing. Coba panggil ulang endpoint-nya.');
    })();
  }

  s.ev.on('connection.update', (u: any) => {
    if (u.qr && !pakaiPairing) {
      qrTerakhir = u.qr;
      status = 'menunggu_qr';
      console.log('\n[wa] pindai QR ini dari WhatsApp > Perangkat Tertaut:\n');
      qrterminal.generate(u.qr, { small: true });
    }
    if (u.connection === 'open') {
      status = 'tersambung';
      qrTerakhir = null;
      kodePairing = null;
      console.log('[wa] tersambung — mode HANYA BACA, tidak akan pernah mengirim pesan');
    }
    if (u.connection === 'close') {
      const kode = u.lastDisconnect?.error?.output?.statusCode;
      const keluar = kode === DisconnectReason.loggedOut;
      status = 'terputus';
      sock = null;
      if (keluar) {
        alasanBerhenti = 'Sesi dikeluarkan dari WhatsApp. Perlu ditautkan lagi.';
        nomorPairing = null;
        console.log('[wa] sesi dikeluarkan, tidak menyambung ulang');
      } else {
        alasanBerhenti = 'Koneksi terputus, mencoba menyambung ulang.';
        console.log('[wa] terputus, menyambung ulang...');
        setTimeout(() => hubungkanWhatsapp(userId, nomorPairing ?? undefined).catch(() => {}), 3000);
      }
    }
  });

  s.ev.on('messages.upsert', async ({ messages, type }: any) => {
    // Dicatat SEBELUM disaring. Kalau tidak ada baris ini sama sekali saat
    // chat masuk, berarti masalahnya di koneksi — bukan di penyaringan.
    console.log(`[wa] messages.upsert: type=${type}, ${messages?.length ?? 0} pesan`);
    if (type !== 'notify') {
      console.log(`[wa] dilewati semua (type "${type}", bukan pesan baru)`);
      return;
    }
    for (const m of messages) await tanganiPesan(m);
  });

  return status;
}

export function statusWhatsapp() {
  return {
    status,
    /** QR mentah untuk ditampilkan frontend nanti; null kalau tidak sedang menunggu */
    qr: qrTerakhir,
    /** Kode 8 digit yang dimasukkan pengguna di HP-nya; null kalau memakai cara QR */
    kode_pairing: kodePairing,
    hanya_baca: true as const,
    alasan: alasanBerhenti,
  };
}
