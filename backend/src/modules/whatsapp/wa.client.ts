import path from 'node:path';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import qrterminal from 'qrcode-terminal';
import { WA_AUTH_DIR } from '../../config/env.ts';
import { satu } from '../../db/index.ts';
import { prosesPesan } from '../pesanan/pesanan.service.ts';
import type { StatusWa, StatusWhatsappRes } from './wa.types.ts';

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
const AUTH_DIR = WA_AUTH_DIR || path.join(DIR, '..', '..', '..', 'db', 'baileys-auth');

/**
 * Siapa pemilik sesi, disimpan DI DALAM direktori auth.
 *
 * Server dev di-restart setiap ada berkas yang disimpan (tsx watch), dan
 * semua variabel modul ikut hilang — termasuk siapa pemilik sesi. Kredensial
 * Baileys selamat karena ada di disk; pemiliknya harus ikut selamat juga,
 * kalau tidak sesi yang sah tampil sebagai "Belum tersambung" setiap kali
 * seseorang menyimpan berkas. Ditaruh di dalam AUTH_DIR supaya ikut terhapus
 * bersama kredensialnya saat sesi dikeluarkan.
 */
const PEMILIK_PATH = path.join(AUTH_DIR, 'pemilik.json');

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
  const dari = samarkan(m.key.remoteJid);
  const cuplikan = teks.length > 60 ? teks.slice(0, 60) + '…' : teks;

  try {
    const hasil = await prosesPesan(pemilik, teks, 'whatsapp', dari);

    // SETIAP hasil dicatat, termasuk bukan_pesanan. Sebelumnya kasus itu
    // diam-diam tidak mencetak apa pun, sehingga pesan yang sebenarnya sudah
    // terbaca dan terklasifikasi tampak persis seperti pesan yang tidak pernah
    // sampai. Itu membuat fitur yang berfungsi terlihat rusak selama berjam-jam.
    if (hasil.jenis === 'bukan_pesanan') {
      console.log(`[wa] dibaca dari ${dari}: "${cuplikan}" -> bukan pesanan (tidak disimpan)`);
      return;
    }
    const angka = hasil.untung_pesanan !== null
      ? `, untung ${hasil.untung_pesanan}` : '';
    console.log(
      `[wa] PESANAN dari ${dari}: "${cuplikan}" -> ${hasil.jenis}` +
      `${hasil.produk ? `, produk ${hasil.produk.nama}` : ''}${angka}`,
    );
    for (const p of hasil.peringatan) console.log(`[wa]    ! ${p}`);
  } catch (err) {
    // Kegagalan membaca satu pesan tidak boleh menjatuhkan koneksi.
    console.error(`[wa] GAGAL memproses pesan dari ${dari}: "${cuplikan}" —`,
      err instanceof Error ? err.message : err);
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
  qrTerakhir = null;
  // Nomor menentukan mode penautan. Diisi -> kode pairing, dan tetap diingat
  // untuk sambung ulang (penangan 'close' meneruskan nomornya eksplisit).
  // Kosong -> permintaan QR yang DISENGAJA, jadi nomor lama dibuang — tanpa
  // ini, sekali saja pernah mencoba pairing, permintaan QR berikutnya
  // diam-diam tetap bermode pairing dan QR tidak pernah muncul.
  nomorPairing = nomorInternasional ?? null;
  status = 'menyambung';

  let { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  // Kredensial setengah jadi = percobaan tautan yang tidak pernah selesai
  // (mis. kode pairing diminta tapi tidak pernah dimasukkan di HP). Baileys
  // menandai `me` begitu kode diminta, tapi `account` baru ada setelah tautan
  // benar-benar sukses. Kredensial seperti ini meracuni percobaan berikutnya:
  // socket mencoba masuk dengan identitas yang tidak pernah terdaftar dan
  // langsung ditolak. Buang, mulai bersih. Sesi yang sah (me + account) aman.
  if (state.creds.me && !state.creds.account) {
    await rm(AUTH_DIR, { recursive: true, force: true }).catch(() => {});
    ({ state, saveCreds } = await useMultiFileAuthState(AUTH_DIR));
  }

  // Tutup socket lama sebelum membuat yang baru — terjadi saat pengguna
  // berganti mode (QR <-> kode pairing) sebelum tautan pertama selesai. Dua
  // socket hidup di direktori auth yang sama saling merusak sesi.
  if (sock) {
    try { sock.end(undefined); } catch { /* sudah mati — tidak apa-apa */ }
    sock = null;
  }

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
    // Socket yang sudah digantikan (pengguna berganti mode) tidak boleh
    // menyentuh status modul atau menjadwalkan sambung ulang — event
    // penutupannya datang justru karena kita menggantikannya.
    if (s !== sock) return;
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
      alasanBerhenti = null;
      // Supaya restart server berikutnya bisa memulihkan sesi ini sendiri.
      void writeFile(
        PEMILIK_PATH,
        JSON.stringify({ pemilik, nomor_pairing: nomorPairing }),
        'utf8',
      ).catch((err) => console.error('[wa] gagal menyimpan pemilik sesi:', err));
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
        // Kredensial yang sudah dikeluarkan tidak berlaku lagi. Kalau
        // dibiarkan, penautan berikutnya memakai kredensial mati ini:
        // QR tidak pernah terbit, langsung dikeluarkan lagi — buntu.
        void rm(AUTH_DIR, { recursive: true, force: true }).catch(() => {});
        console.log('[wa] sesi dikeluarkan, kredensial dihapus — tautkan lagi dari awal');
      } else {
        alasanBerhenti = 'Koneksi terputus, mencoba menyambung ulang.';
        console.log('[wa] terputus, menyambung ulang...');
        setTimeout(() => hubungkanWhatsapp(userId, nomorPairing ?? undefined).catch(() => {}), 3000);
      }
    }
  });

  s.ev.on('messages.upsert', async ({ messages, type }: any) => {
    if (s !== sock) return;   // socket lama yang sudah digantikan
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

export function statusWhatsapp(): StatusWhatsappRes {
  return {
    status,
    qr: qrTerakhir,
    kode_pairing: kodePairing,
    hanya_baca: true,
    alasan: alasanBerhenti,
  };
}

/**
 * Pulihkan sesi WhatsApp saat server start.
 *
 * tsx watch me-restart server setiap ada berkas yang disimpan. Tanpa
 * pemulihan ini, setiap restart membuat sesi yang SAH tampil sebagai
 * "Belum tersambung" dan pesan yang masuk tidak dibaca — padahal
 * kredensialnya masih berlaku di disk.
 *
 * Hanya memulihkan sesi yang benar-benar selesai ditautkan (me + account).
 * Kredensial setengah jadi dibiarkan; jalur hubungkanWhatsapp yang akan
 * membersihkannya saat pengguna mencoba menautkan lagi.
 */
export async function pulihkanWhatsapp(): Promise<void> {
  let pemilikTersimpan: number;
  let nomorTersimpan: string | null;
  try {
    const creds = JSON.parse(await readFile(path.join(AUTH_DIR, 'creds.json'), 'utf8'));
    if (!creds?.me || !creds?.account) return;   // tidak ada sesi yang sah
    const p = JSON.parse(await readFile(PEMILIK_PATH, 'utf8'));
    if (typeof p?.pemilik !== 'number') return;
    pemilikTersimpan = p.pemilik;
    nomorTersimpan = typeof p?.nomor_pairing === 'string' ? p.nomor_pairing : null;
  } catch {
    return;   // belum pernah ditautkan — bukan galat
  }

  // Database bisa lebih muda daripada berkas pemilik — direktori data PGlite
  // dihapus saat pemulihan korupsi, sementara kredensial WhatsApp selamat.
  // Sesi yang dipulihkan untuk user yang sudah tidak ada akan menyimpan pesan
  // ke user_id hantu (ditolak foreign key). Lebih jujur tidak memulihkan:
  // pemilik barunya cukup menekan tombol sambungkan sekali, langsung
  // tersambung tanpa QR karena kredensialnya masih berlaku.
  const ada = await satu<{ id: number }>(
    'SELECT id FROM pengguna WHERE id = $1', [pemilikTersimpan],
  );
  if (!ada) {
    await rm(PEMILIK_PATH, { force: true }).catch(() => {});
    console.log('[wa] pemilik sesi tersimpan sudah tidak ada di database — pemulihan dilewati');
    return;
  }

  console.log('[wa] sesi tersimpan ditemukan, menyambung ulang...');
  try {
    await hubungkanWhatsapp(pemilikTersimpan, nomorTersimpan ?? undefined);
  } catch (err) {
    console.error('[wa] gagal memulihkan sesi:', err instanceof Error ? err.message : err);
  }
}
