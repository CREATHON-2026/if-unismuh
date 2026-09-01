import { mintaTeks } from '../../lib/llm.ts';
import { rupiah } from '../../lib/rupiah.ts';
import type { BalasanReq } from '../../../../shared/types.ts';
import type { HitungPesanan } from './pesanan.queries.ts';

/**
 * Menyusun balasan untuk DISALIN pedagang sendiri.
 *
 * Satu-satunya tempat di seluruh aplikasi tempat keluaran LLM tampil sebagai
 * bahasa, bukan data. Dan justru karena itu paling rawan: model akan tergoda
 * "membantu" dengan menghitung ulang atau membulatkan angka.
 *
 * Penjagaannya berlapis:
 *   1. Semua angka dihitung SQL dulu, lalu disodorkan ke prompt sebagai fakta
 *   2. Prompt melarang keras mengubah atau menambah angka
 *   3. Jawaban tetap menyertakan `acuan` berisi angka SQL, sehingga siapa pun
 *      bisa mencocokkan apakah kalimatnya jujur
 *
 * Sistem TIDAK PERNAH mengirim teks ini — aturan #4.
 */

function bangunPrompt(h: HitungPesanan, req: BalasanReq): string {
  const jumlah = req.jumlah ?? null;
  const fakta: string[] = [
    `Nama produk: ${h.nama}`,
    `Harga jual normal: ${rupiah(h.harga_jual)} per unit`,
  ];
  if (h.modal_per_unit !== null) fakta.push(`Modal pedagang: ${rupiah(h.modal_per_unit)} per unit`);
  if (jumlah !== null) fakta.push(`Jumlah yang diminta pembeli: ${jumlah} unit`);
  if (req.harga_diminta != null) fakta.push(`Harga yang ditawar pembeli: ${rupiah(req.harga_diminta)} per unit`);
  if (h.untung_pesanan !== null) {
    fakta.push(h.merugi
      ? `Kalau diterima di harga itu, pedagang RUGI ${rupiah(Math.abs(h.untung_pesanan))} untuk pesanan ini`
      : `Kalau diterima, pedagang untung ${rupiah(h.untung_pesanan)} untuk pesanan ini`);
  }
  if (h.stok_cukup_untuk !== null && jumlah !== null && h.stok_cukup_untuk < jumlah) {
    fakta.push(`Bahan pedagang hanya cukup untuk ${h.stok_cukup_untuk} unit, bukan ${jumlah}`);
  }

  const arahan: Record<BalasanReq['maksud'], string> = {
    tawar_harga: h.merugi
      ? 'Pembeli menawar di bawah modal. Tolak tawarannya dengan halus, sebutkan harga yang bisa diberikan, dan tetap tawarkan agar ia jadi membeli.'
      : 'Pembeli menawar. Balas dengan sopan — boleh diterima atau ditawar balik sedikit.',
    terima: 'Terima pesanannya dengan ramah dan sebutkan totalnya.',
    tolak: 'Tolak pesanan dengan halus, sebutkan alasannya secara sopan.',
    jawab_harga: 'Pembeli menanyakan harga. Jawab dengan ramah dan singkat.',
  };

  return `Kamu membantu pedagang mikro Indonesia menyusun balasan WhatsApp untuk pembeli.

FAKTA (sudah dihitung sistem, semuanya benar):
${fakta.map((f) => '- ' + f).join('\n')}

TUGAS: ${arahan[req.maksud]}

Aturan yang wajib dipatuhi:
1. JANGAN menghitung apa pun. Jangan menjumlahkan, mengalikan, atau membulatkan.
   Pakai HANYA angka yang tertulis di FAKTA, persis apa adanya.
2. JANGAN menyebut kata "modal", "rugi", atau "untung" kepada pembeli. Itu
   urusan dalam pedagang; pembeli tidak boleh tahu.
3. Tulis seperti pedagang Indonesia menulis WhatsApp: ramah, singkat, sopan.
   Sapa dengan "Kak". Maksimal 3 kalimat.
4. Keluarkan HANYA teks balasannya. Tanpa tanda kutip, tanpa penjelasan,
   tanpa pilihan ganda.`;
}

export async function susunBalasan(h: HitungPesanan, req: BalasanReq): Promise<string> {
  const teks = await mintaTeks(bangunPrompt(h, req));
  // Model kadang membungkus jawabannya dengan tanda kutip meski sudah dilarang.
  return teks.replace(/^["'`]+|["'`]+$/g, '').trim();
}
