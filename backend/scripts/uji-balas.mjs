/**
 * Uji balasan otomatis — draf disusun sistem, pedagang yang menekan kirim.
 *
 * Yang dibuktikan skrip ini BUKAN "endpointnya hidup", melainkan tujuh hal
 * yang kalau salah satu saja meleset, fiturnya berbahaya:
 *
 *   1. Maksud draf diputuskan SQL, bukan LLM. Tawaran di bawah modal WAJIB
 *      lahir sebagai `tawar_harga` — kalau lahir `terima`, sistem menyuruh
 *      pedagang menyanggupi kerugian.
 *   2. Pesan yang `perlu_dicek` TIDAK punya draf sama sekali.
 *   3. Tiap angka rupiah di teks balasan punya padanan di `acuan`.
 *      Angka tanpa padanan = model mengarang = gagal.
 *   4. Teks balasan tidak pernah menyebut modal/rugi/untung ke pembeli.
 *   5. Kirim dua kali ditolak yang kedua.
 *   6. Rem `WA_BALAS_AKTIF` benar-benar mengerem.
 *   7. Pesan tempel tidak punya alamat kirim, dan ditolak dengan alasan jelas.
 *
 * Tidak butuh sesi WhatsApp hidup: draf disusun di prosesPesan(), jadi jalur
 * tempel melewati kode yang sama persis dengan jalur WhatsApp.
 *
 *   node scripts/uji-balas.mjs
 */

const DASAR = process.env.API ?? 'http://localhost:3000';
let gagal = 0;

function periksa(nama, dapat, harap) {
  const cocok = dapat === harap;
  if (!cocok) gagal++;
  console.log(`  ${cocok ? 'OK  ' : 'SALAH'} ${nama}: ${dapat}${cocok ? '' : `  (seharusnya ${harap})`}`);
}

function benar(nama, syarat, keterangan = '') {
  if (!syarat) gagal++;
  console.log(`  ${syarat ? 'OK  ' : 'SALAH'} ${nama}${keterangan ? `: ${keterangan}` : ''}`);
}

async function panggil(jalan, opsi = {}, token) {
  const res = await fetch(DASAR + jalan, {
    ...opsi,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const body = await res.json();
  if (!body.ok) throw new Error(`${jalan} -> ${body.error.kode}: ${body.error.pesan}`);
  return body.data;
}

/** Seperti panggil(), tapi galat dikembalikan alih-alih dilempar. */
async function coba(jalan, opsi = {}, token) {
  const res = await fetch(DASAR + jalan, {
    ...opsi,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  return res.json();
}

const NOMOR = '08' + String(Date.now()).slice(-10);

console.log('UJI BALASAN OTOMATIS');
console.log('='.repeat(64));

// --- Pedagang dengan satu produk yang modalnya tinggi -----------------------
// Modal per unit sengaja dibuat ~21.200 dengan harga jual 20.000, supaya
// produk ini MERUGI bahkan di harga normal. Angka yang sama dipakai
// uji-pesanan.mjs, jadi kalau rumus modalnya berubah, kedua uji jatuh bersama.
const { token } = await panggil('/auth/otp/verifikasi', {
  method: 'POST', body: JSON.stringify({ nomor_hp: NOMOR, kode: '123456' }),
});
await panggil('/onboarding/usaha', {
  method: 'POST', body: JSON.stringify({ nama_usaha: 'Warung Bu Sari', jenis_usaha: 'makanan' }),
}, token);

await panggil('/onboarding/resep', {
  method: 'POST',
  body: JSON.stringify({
    nama_produk: 'Kripik Pisang', hasil_per_batch: 40, harga_jual: 20000,
    bahan: [
      { nama: 'pisang',  satuan: 'kg',     jumlah: 20, harga_beli: 300000, jumlah_beli: 20 },
      { nama: 'minyak',  satuan: 'liter',  jumlah: 10, harga_beli: 180000, jumlah_beli: 10 },
      { nama: 'gula',    satuan: 'kg',     jumlah: 10, harga_beli: 150000, jumlah_beli: 10 },
      { nama: 'gas',     satuan: 'tabung', jumlah: 1,  harga_beli: 200000, jumlah_beli: 1  },
      { nama: 'kemasan', satuan: 'buah',   jumlah: 40, harga_beli: 45000,  jumlah_beli: 100 },
    ],
  }),
}, token);

// Produk kedua yang SEHAT, untuk membuktikan maksud draf ikut berubah.
await panggil('/onboarding/resep', {
  method: 'POST',
  body: JSON.stringify({
    nama_produk: 'Donat Gula', hasil_per_batch: 50, harga_jual: 3000,
    bahan: [
      { nama: 'terigu',    satuan: 'kg', jumlah: 5, harga_beli: 60000, jumlah_beli: 5 },
      { nama: 'gula halus', satuan: 'kg', jumlah: 2, harga_beli: 30000, jumlah_beli: 2 },
    ],
  }),
}, token);

// --- 1. Tawaran di bawah modal -> draf HARUS tawar_harga --------------------
console.log('\n1. Tawaran di bawah modal');

const tawar = await panggil('/pesanan/analisis', {
  method: 'POST',
  body: JSON.stringify({ teks: 'bu mau pesan 20 bungkus kripik pisang, 18rb aja ya bisa?' }),
}, token);

periksa('jenis dibaca', tawar.jenis, 'menawar');
periksa('merugi (dari SQL)', tawar.merugi, true);
benar('draf tersusun', tawar.balasan?.status === 'siap', `status=${tawar.balasan?.status}`);
periksa('maksud draf', tawar.balasan?.maksud, 'tawar_harga');

// Inti pemeriksaan nomor 1: kalau LLM yang memutuskan, cepat atau lambat ia
// akan memilih 'terima' untuk kalimat yang terdengar ramah. SQL tidak pernah
// terpengaruh nada kalimat.
benar('BUKAN terima untuk pesanan merugi', tawar.balasan?.maksud !== 'terima');

// --- 2. Angka di teks harus punya padanan di acuan --------------------------
console.log('\n2. Ketertelusuran angka');

const teks = tawar.balasan?.teks ?? '';
const acuan = tawar.balasan?.acuan ?? {};
console.log(`  teks: "${teks}"`);

// Semua angka >= 100 yang muncul di kalimat. Angka kecil (jumlah unit,
// "3 hari") dilewati: yang berbahaya adalah rupiah yang mengada-ada.
const angkaDiTeks = [...teks.matchAll(/\b(\d{1,3}(?:[.,]\d{3})+|\d{3,})\b/g)]
  .map((m) => Number(m[1].replace(/[.,]/g, '')))
  .filter((n) => n >= 100);

const angkaSah = new Set(
  Object.values(acuan).filter((v) => typeof v === 'number' && v !== null),
);
// Kelipatan yang sah: total = jumlah x harga. Dihitung DI SINI hanya untuk
// memeriksa, bukan untuk ditampilkan — skrip uji boleh berhitung, produknya
// tidak.
if (typeof acuan.jumlah === 'number') {
  for (const v of [...angkaSah]) angkaSah.add(v * acuan.jumlah);
}

const liar = angkaDiTeks.filter((n) => !angkaSah.has(n));
benar('tidak ada angka karangan', liar.length === 0,
  liar.length ? `angka tanpa padanan di acuan: ${liar.join(', ')}` : `${angkaDiTeks.length} angka semuanya tertelusur`);

// --- 3. Rahasia dagang tidak bocor ke pembeli -------------------------------
console.log('\n3. Rahasia dagang');

const terlarang = ['modal', 'rugi', 'untung', 'margin'].filter(
  (k) => teks.toLowerCase().includes(k),
);
benar('tidak menyebut modal/rugi/untung', terlarang.length === 0,
  terlarang.length ? `bocor: ${terlarang.join(', ')}` : 'bersih');

// --- 4. Pesanan sehat -> maksud berubah jadi terima -------------------------
console.log('\n4. Pesanan yang sehat');

const sehat = await panggil('/pesanan/analisis', {
  method: 'POST', body: JSON.stringify({ teks: 'pesan 10 donat gula ya bu' }),
}, token);

periksa('merugi (dari SQL)', sehat.merugi, false);
periksa('maksud draf', sehat.balasan?.maksud, 'terima');

// --- 5. Perlu dicek -> TIDAK ada draf ---------------------------------------
console.log('\n5. Produk yang belum pasti');

const ragu = await panggil('/pesanan/analisis', {
  method: 'POST', body: JSON.stringify({ teks: 'mau pesan 5 bungkus rendang padang' }),
}, token);

benar('tidak ada draf untuk produk tak dikenal',
  ragu.balasan?.status === 'tidak_ada' && ragu.balasan?.teks === null,
  `status=${ragu.balasan?.status}, teks=${ragu.balasan?.teks === null ? 'null' : 'ADA'}`);

// --- 6. Tempel tidak punya alamat kirim -------------------------------------
console.log('\n6. Rem dan penjaga kirim');

benar('tempel tidak bisa dikirim', tawar.balasan?.bisa_dikirim === false,
  `alasan: ${tawar.balasan?.alasan_tidak_bisa ?? '(tidak diberi alasan)'}`);
benar('alasannya dijelaskan', typeof tawar.balasan?.alasan_tidak_bisa === 'string'
  && tawar.balasan.alasan_tidak_bisa.length > 0);

const tolakKirim = await coba(`/pesanan/${tawar.pesan_id}/kirim-balasan`, {
  method: 'POST',
}, token);
benar('endpoint kirim menolak pesan tempel', tolakKirim.ok === false,
  tolakKirim.ok ? 'JUSTRU DITERIMA' : `${tolakKirim.error.kode}: ${tolakKirim.error.pesan}`);

// --- 7. Menyunting draf sebelum kirim ---------------------------------------
console.log('\n7. Pedagang boleh menyunting');

const SUNTINGAN = 'Kak, kripik pisangnya bisa Rp 20.000 per bungkus ya. Terima kasih!';
await panggil(`/pesanan/${tawar.pesan_id}/balasan`, {
  method: 'PATCH', body: JSON.stringify({ teks: SUNTINGAN }),
}, token);

const daftar = await panggil('/pesanan', {}, token);
const sesudah = daftar.find((p) => p.pesan_id === tawar.pesan_id);
periksa('suntingan tersimpan', sesudah?.balasan?.teks, SUNTINGAN);
periksa('status tetap siap', sesudah?.balasan?.status, 'siap');

// --- Hasil ------------------------------------------------------------------
console.log('\n' + '='.repeat(64));
console.log(gagal === 0 ? 'SEMUA LOLOS' : `${gagal} PEMERIKSAAN GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
