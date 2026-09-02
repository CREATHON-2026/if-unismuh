import {
  MIDTRANS_SERVER_KEY, MIDTRANS_CLIENT_KEY, MIDTRANS_PRODUKSI, MIDTRANS_AKTIF,
} from '../config/env.ts';

/**
 * Midtrans Snap — QRIS untuk pembeli yang tidak datang membawa uang tunai.
 *
 * Snap, bukan Core API: satu panggilan mengembalikan satu tautan yang bisa
 * DISALIN pedagang ke chat, sekaligus bisa digambar jadi QR di layar untuk
 * pembeli yang berdiri di depan lapak. Core API QRIS hanya melayani yang kedua.
 *
 * ATURAN #4 — SISTEM TIDAK PERNAH MENGIRIM APA PUN KE NOMOR PEMBELI.
 * Berkas ini hanya berbicara dengan api.midtrans.com. Tautan yang dihasilkan
 * dikembalikan ke layar pedagang, dan pedagang sendiri yang menyalinnya.
 *
 * ATURAN #1 — LLM TIDAK MENGHITUNG, dan begitu juga berkas ini. `gross`
 * diterima sebagai parameter dari `v_pesanan.nilai_pesanan`. Tidak ada
 * perkalian jumlah × harga di sini; kalau ada, itu akan jadi tempat kedua yang
 * menghitung nilai pesanan, dan cepat atau lambat kedua tempat itu berbeda.
 */

const DASAR_SNAP = MIDTRANS_PRODUKSI
  ? 'https://app.midtrans.com/snap/v1'
  : 'https://app.sandbox.midtrans.com/snap/v1';

const DASAR_API = MIDTRANS_PRODUKSI
  ? 'https://api.midtrans.com/v2'
  : 'https://api.sandbox.midtrans.com/v2';

/** Basic auth Midtrans: server key sebagai username, password kosong. */
function kepala(): Record<string, string> {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: 'Basic ' + Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString('base64'),
  };
}

/** Bentuk jawaban Midtrans yang kita pakai. Sisanya sengaja diabaikan. */
interface JawabanSnap {
  redirect_url?: string;
  transaction_status?: string;
  error_messages?: string[];
}

async function bacaJson(res: globalThis.Response): Promise<JawabanSnap | null> {
  return res.json().then((v) => v as JawabanSnap).catch(() => null);
}

export function midtransSiap(): boolean {
  return MIDTRANS_AKTIF;
}

export function kunciKlien(): string {
  return MIDTRANS_CLIENT_KEY;
}

/**
 * Status Midtrans yang berarti uangnya benar-benar sudah masuk.
 *
 * `capture` dan `settlement` saja. `pending` adalah QR yang sudah dibuat tapi
 * belum dibayar — memperlakukannya sebagai lunas berarti pedagang menyerahkan
 * barang untuk uang yang tidak pernah datang.
 */
export function statusLunas(status: string | null | undefined): boolean {
  return status === 'settlement' || status === 'capture';
}

export interface TagihanQris {
  orderId: string;
  url: string;
  status: string;
}

/**
 * Buat tagihan Snap.
 *
 * `orderId` harus unik selamanya di akun Midtrans — id pesanan saja tidak cukup
 * karena dua pedagang bisa punya pesanan dengan id yang sama di database yang
 * berbeda, dan karena tagihan yang kedaluwarsa tidak bisa dipakai ulang
 * nomornya. Karena itu dibubuhi stempel waktu.
 */
export async function buatTagihanQris(
  pesananId: number, gross: number, namaProduk: string, jumlah: number,
): Promise<TagihanQris> {
  if (!MIDTRANS_AKTIF) throw new Error('Midtrans belum dikonfigurasi');

  const orderId = `LAPAK-${pesananId}-${Date.now()}`;
  const res = await fetch(`${DASAR_SNAP}/transactions`, {
    method: 'POST',
    headers: kepala(),
    body: JSON.stringify({
      transaction_details: { order_id: orderId, gross_amount: gross },
      item_details: [{
        id: String(pesananId),
        name: namaProduk.slice(0, 50),
        // Harga satuan diturunkan dari gross supaya total Midtrans TIDAK MUNGKIN
        // berbeda dari total kita. Kalau keduanya dikirim terpisah dan meleset
        // satu rupiah karena pembulatan, Midtrans menolak seluruh tagihan.
        price: Math.round(gross / Math.max(1, jumlah)),
        quantity: Math.max(1, Math.round(jumlah)),
      }],
      // Sengaja TIDAK mengirim customer_details: kita tidak punya izin pembeli
      // atas datanya, dan Midtrans akan mengiriminya email kalau diberi alamat.
      // Lihat aturan #4 dan docs/08-keamanan-data.md.
      enabled_payments: ['other_qris', 'gopay', 'shopeepay'],
    }),
  });

  const isi = await bacaJson(res);
  if (!res.ok || !isi?.redirect_url) {
    throw new Error(`Midtrans menolak (${res.status}): ${isi?.error_messages?.join('; ') ?? 'tidak diketahui'}`);
  }
  return { orderId, url: isi.redirect_url, status: 'pending' };
}

/** Tanya Midtrans apakah tagihan ini sudah dibayar. */
export async function cekStatusQris(orderId: string): Promise<{ status: string; lunas: boolean }> {
  if (!MIDTRANS_AKTIF) throw new Error('Midtrans belum dikonfigurasi');

  const res = await fetch(`${DASAR_API}/${encodeURIComponent(orderId)}/status`, {
    headers: kepala(),
  });
  const isi = await bacaJson(res);

  // 404 berarti tagihannya belum pernah sampai ke Midtrans — bukan galat, dan
  // bukan lunas. Dijawab apa adanya supaya layar bisa mengatakan "belum ada".
  if (res.status === 404) return { status: 'belum_ada', lunas: false };
  if (!res.ok) throw new Error(`Midtrans menolak (${res.status})`);

  const status = String(isi?.transaction_status ?? 'tidak_diketahui');
  return { status, lunas: statusLunas(status) };
}

/**
 * Periksa kunci TANPA membuat tagihan.
 *
 * Menanyakan status order id acak yang mustahil ada. Midtrans menjawab 401
 * kalau kuncinya salah dan 404 kalau kuncinya benar tapi ordernya tidak ada —
 * jadi keabsahan kunci bisa dipastikan tanpa satu rupiah pun berpindah.
 * Ini satu-satunya cara memverifikasi kunci PRODUCTION dengan aman.
 */
export async function periksaKunci(): Promise<{ sah: boolean; pesan: string }> {
  if (!MIDTRANS_AKTIF) return { sah: false, pesan: 'Kunci Midtrans belum diisi.' };
  try {
    const res = await fetch(`${DASAR_API}/lapakai-periksa-${Date.now()}/status`, {
      headers: kepala(),
    });
    if (res.status === 401) return { sah: false, pesan: 'Kunci Midtrans ditolak (401).' };
    return {
      sah: true,
      pesan: `Kunci Midtrans sah (mode ${MIDTRANS_PRODUKSI ? 'PRODUCTION' : 'sandbox'}).`,
    };
  } catch (err) {
    return { sah: false, pesan: `Tidak bisa menghubungi Midtrans: ${String(err)}` };
  }
}
