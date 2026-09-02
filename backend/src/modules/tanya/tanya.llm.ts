import { mintaTeks } from '../../lib/llm.ts';
import type { GiliranPercakapan } from './tanya.types.ts';

/**
 * Satu panggilan LLM, keluarannya langsung dipakai.
 *
 * Tidak ada JSON, tidak ada skema, tidak ada tahap kedua. Model menerima
 * seluruh data pedagang dan pertanyaannya, lalu menjawab dengan kalimatnya
 * sendiri — termasuk kalau pertanyaannya tidak ada hubungannya dengan usaha.
 *
 * Ada satu kalimat yang tetap dipertahankan di prompt: jangan mengarang data
 * yang tidak ada. Itu bukan pembatasan topik, melainkan syarat supaya
 * jawabannya masih ada gunanya — asisten yang menyebut angka penjualan yang
 * tidak pernah terjadi lebih buruk daripada asisten yang bilang "belum ada
 * catatannya".
 */

const GAYA = `Cara bicara:
- Bahasa Indonesia sehari-hari. Pedagang yang membaca berumur 35-60 tahun dan
  tidak akrab dengan istilah teknis. Hindari kata seperti "margin", "revenue",
  "profit", "cash flow" — pakai "untung", "uang masuk", "modal".
- Ringkas. Dua sampai lima kalimat untuk pertanyaan biasa. Boleh lebih panjang
  kalau memang perlu penjelasan bertahap, dan boleh memakai daftar berpoin.
- Tulis rupiah dengan titik ribuan: Rp 21.200, bukan Rp21200 atau 21200 rupiah.
- Sapa dengan "Bapak/Ibu" bila perlu, jangan berlebihan.
- Jangan menyebut "database", "SQL", "sistem", atau "data di atas". Bicaralah
  seperti orang yang memang tahu isi warungnya.`;

const TUGAS = `Kamu adalah asisten lapakAi. Kamu membantu pemilik usaha kecil di
Indonesia memahami usahanya.

Kamu bebas menjawab apa saja yang ditanyakan. Boleh berhitung, memperkirakan,
membandingkan, memberi saran, berpendapat, menolak setuju, atau sekadar
mengobrol. Kalau pertanyaannya tidak ada hubungannya dengan usaha, jawab saja
seperti asisten pada umumnya.

Yang perlu dijaga hanya satu hal: jangan mengarang catatan yang tidak ada.
Kalau sesuatu belum dicatat pedagang, katakan apa adanya bahwa belum ada
catatannya, lalu sebutkan apa yang perlu dicatat supaya bisa dijawab. Selain
itu, tidak ada larangan.

Satu petunjuk berhitung, bukan larangan: untung per unit itu harga jual
dikurangi MODAL per unit. Jadi kalau pedagang bertanya "kalau saya jual
sekian", kurangi harga barunya dengan modal per unit — bukan dengan untung
yang sekarang.`;

function tulisRiwayat(riwayat: GiliranPercakapan[]): string {
  if (riwayat.length === 0) return '';
  const baris = riwayat.map(
    (g) => `${g.peran === 'pedagang' ? 'Pedagang' : 'Kamu'}: ${g.teks}`,
  );
  return `\n# PERCAKAPAN SEBELUMNYA\n${baris.join('\n')}\n`;
}

/**
 * Membersihkan kebiasaan model kecil yang mengganggu: membungkus jawaban dalam
 * blok kode, atau membuka dengan "Jawaban:". Isi jawabannya tidak disentuh.
 */
function rapikan(teks: string): string {
  let hasil = teks.trim();
  hasil = hasil.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '');
  hasil = hasil.replace(/^(jawaban|asisten|kamu)\s*:\s*/i, '');
  return hasil.trim();
}

/**
 * Batas panjang jawaban, jendela konteks, dan kelonggaran gaya.
 *
 * `num_predict` 600 kira-kira 400 kata — jauh di atas jawaban terpanjang yang
 * masuk akal di layar HP, tapi cukup rendah untuk memutus pengulangan yang
 * tidak berhenti sendiri. Tanpa batas ini satu pertanyaan pernah menggantung
 * sampai socketnya diputus, dan gejalanya ECONNRESET tanpa galat apa pun.
 *
 * `num_ctx` disebut eksplisit karena prompt di sini jauh lebih panjang
 * daripada prompt modul lain: seluruh catatan pedagang ikut masuk. Kalau
 * promptnya melewati jendela bawaan Ollama, yang terpotong adalah bagian
 * PALING AWAL — yaitu instruksinya — dan modelnya balas dengan teks kosong
 * tanpa mengeluh. Kegagalan yang paling mahal adalah yang tidak berbunyi.
 *
 * `temperature` 0.4, bukan 0. Suhu nol tepat untuk mengekstrak data, tapi
 * untuk percakapan ia menghasilkan kalimat kaku dan memperbesar peluang model
 * tersangkut mengulang frasa yang sama.
 */
const OPSI = { num_predict: 600, num_ctx: 8192, temperature: 0.4 } as const;

export async function jawabBebas(
  konteks: string, riwayat: GiliranPercakapan[], pertanyaan: string,
): Promise<string> {
  const prompt = `${TUGAS}

${GAYA}

# CATATAN USAHA PEDAGANG INI
Semua angka di bawah dalam rupiah. Angka ditulis polos tanpa titik ribuan;
kamu yang merapikannya saat menjawab.

${konteks}
${tulisRiwayat(riwayat)}
# PERTANYAAN PEDAGANG
${pertanyaan}

Jawab langsung, tanpa pengantar dan tanpa menyebut bahwa kamu membaca catatan.`;

  return rapikan(await mintaTeks(prompt, OPSI));
}
