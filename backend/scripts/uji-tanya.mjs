/**
 * Uji chatbot "Tanya lapakAi" — POST /tanya.
 *
 * Chatbotnya murni LLM: seluruh catatan pedagang masuk ke prompt, model
 * menjawab apa pun dengan caranya sendiri. Karena itu berkas ini TIDAK menguji
 * bentuk jawaban — jawaban yang benar bisa ditulis dengan seratus cara, dan
 * menuntut satu bentuk tertentu hanya menghasilkan uji yang rewel.
 *
 * Yang diuji cuma hal-hal yang memang harus selalu benar:
 *
 *   1. Terjawab   — pertanyaan yang bentuknya bermacam-macam tetap dapat isi
 *   2. Tak dibatasi — pertanyaan di luar soal usaha juga dijawab, bukan ditolak
 *   3. Bersandar data — angka yang jelas ada di catatan memang muncul
 *   4. Ingatan    — pertanyaan lanjutan paham sedang membahas apa
 *   5. Isolasi    — pedagang lain tidak melihat catatan kita
 *
 *   node scripts/uji-tanya.mjs
 */

const DASAR = process.env.API ?? 'http://localhost:3000';
let gagal = 0;

function periksa(nama, dapat, harap) {
  const cocok = dapat === harap;
  if (!cocok) gagal++;
  console.log(`  ${cocok ? 'OK  ' : 'SALAH'} ${nama}: ${dapat}${cocok ? '' : `  (seharusnya ${harap})`}`);
}

function periksaBenar(nama, syarat, keterangan = '') {
  if (!syarat) gagal++;
  console.log(`  ${syarat ? 'OK  ' : 'SALAH'} ${nama}${syarat ? '' : `  ${keterangan}`}`);
}

async function panggil(jalan, opsi = {}, token) {
  const res = await fetch(DASAR + jalan, {
    ...opsi,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
  });
  const body = await res.json();
  if (!body.ok) throw new Error(`${jalan} -> ${body.error.kode}: ${body.error.pesan}`);
  return body.data;
}

const rupiah = (n) => (n == null ? '—' : 'Rp ' + n.toLocaleString('id-ID'));

async function pedagangBaru(nama) {
  const nomor = '08' + String(Date.now() + Math.floor(Math.random() * 1000)).slice(-10);
  const { token } = await panggil('/auth/otp/verifikasi', {
    method: 'POST', body: JSON.stringify({ nomor_hp: nomor, kode: '123456' }),
  });
  await panggil('/onboarding/usaha', {
    method: 'POST', body: JSON.stringify({ nama_usaha: nama, jenis_usaha: 'makanan' }),
  }, token);
  return token;
}

const tanya = async (pertanyaan, token) => {
  const mulai = Date.now();
  const j = await panggil('/tanya', { method: 'POST', body: JSON.stringify({ pertanyaan }) }, token);
  j._detik = ((Date.now() - mulai) / 1000).toFixed(1);
  return j;
};

const ringkas = (t, n = 110) => (t ?? '').replace(/\s+/g, ' ').slice(0, n);

/**
 * Apakah kalimatnya menyebut angka ini?
 *
 * Longgar dengan sengaja. Model boleh menulis "Rp 48.000", "48000", atau
 * "48 ribu" — ketiganya jawaban yang sama benarnya, dan uji yang cuma
 * menerima satu bentuk akan merah karena selera penulisan, bukan karena salah.
 */
function menyebutAngka(kalimat, angka) {
  const teks = (kalimat ?? '').toLowerCase();
  const polos = teks.replace(/[.,\s]/g, '');
  if (polos.includes(String(angka))) return true;
  if (angka % 1000 === 0 && polos.includes(`${angka / 1000}ribu`)) return true;
  return false;
}

/** Kripik Pisang: batch 848.000 / 40 = modal 21.200, jual 20.000 -> RUGI 1.200 */
const KRIPIK = {
  nama_produk: 'Kripik Pisang', hasil_per_batch: 40, harga_jual: 20000,
  bahan: [
    { nama: 'pisang',  satuan: 'kg',     jumlah: 20, harga_beli: 300000, jumlah_beli: 20 },
    { nama: 'minyak',  satuan: 'liter',  jumlah: 10, harga_beli: 180000, jumlah_beli: 10 },
    { nama: 'gula',    satuan: 'kg',     jumlah: 10, harga_beli: 150000, jumlah_beli: 10 },
    { nama: 'gas',     satuan: 'tabung', jumlah: 1,  harga_beli: 200000, jumlah_beli: 1  },
    { nama: 'kemasan', satuan: 'buah',   jumlah: 40, harga_beli: 45000,  jumlah_beli: 100 },
  ],
};

/** Kacang Telur: batch 100.000 / 50 = modal 2.000, jual 5.000 -> untung 3.000 */
const KACANG = {
  nama_produk: 'Kacang Telur', hasil_per_batch: 50, harga_jual: 5000,
  bahan: [{ nama: 'kacang tanah', satuan: 'kg', jumlah: 10, harga_beli: 100000, jumlah_beli: 10 }],
};

console.log('UJI CHATBOT — Tanya lapakAi');
console.log('='.repeat(62));

// ===========================================================================
// Persiapan — fixture yang sama dengan uji-beranda.mjs, supaya angkanya sudah
// dihitung tangan dan bisa dibandingkan langsung.
//   omzet  = 10 x 20.000 + 20 x 5.000                       = 300.000
//   untung = 10 x (20.000 - 21.200) + 20 x (5.000 - 2.000)  =  48.000
// ===========================================================================
console.log('\n0. Menyiapkan pedagang dengan angka yang sudah diketahui');
const token = await pedagangBaru('Warung Uji Tanya');
const kripik = await panggil('/onboarding/resep', { method: 'POST', body: JSON.stringify(KRIPIK) }, token);
const kacang = await panggil('/onboarding/resep', { method: 'POST', body: JSON.stringify(KACANG) }, token);
await panggil('/transaksi', {
  method: 'POST',
  body: JSON.stringify({
    tanggal: new Date().toISOString().slice(0, 10),
    baris: [
      { produk_id: kripik.produk_id, jumlah: 10 },
      { produk_id: kacang.produk_id, jumlah: 20, harga_satuan: 5000 },
    ],
  }),
}, token);

const b = await panggil('/beranda', {}, token);
console.log(`   omzet ${rupiah(b.omzet)}, untung ${rupiah(b.untung_bersih)}`);
periksa('siap: omzet 300.000', b.omzet, 300000);
periksa('siap: untung 48.000', b.untung_bersih, 48000);

// ===========================================================================
// 1. Pertanyaan apa pun terjawab
//
// Bentuknya sengaja dibikin sangat berbeda-beda: angka lugas, sebab-akibat,
// minta pendapat, minta prioritas, sampai pertanyaan soal aplikasinya sendiri.
// ===========================================================================
console.log('\n1. Pertanyaan bebas tetap terjawab');

const BEBAS = [
  'bulan ini untung saya berapa?',
  'kenapa untung saya kecil padahal jualan terus?',
  'menurutmu produk mana yang sebaiknya saya hentikan?',
  'kalau kripik saya jual 25 ribu, untungnya jadi berapa?',
  'apa yang harus saya perbaiki minggu ini?',
];

for (const pertanyaan of BEBAS) {
  const j = await tanya(pertanyaan, token);
  periksaBenar(
    `"${pertanyaan}"`,
    typeof j.jawaban === 'string' && j.jawaban.trim().length > 15,
    `jawaban="${ringkas(j.jawaban)}"`,
  );
  console.log(`       -> [${j._detik}s] ${ringkas(j.jawaban)}`);
}

// ===========================================================================
// 2. Tidak ada topik yang ditolak
//
// Versi sebelumnya menolak apa pun di luar soal usaha. Itu dicabut, dan di
// sinilah pencabutannya dijaga: kalau suatu saat ada yang memasang penyaring
// topik lagi, kelompok ini yang merah lebih dulu.
// ===========================================================================
console.log('\n2. Pertanyaan di luar soal usaha juga dijawab');

const PENOLAKAN = [
  'di luar cakupan', 'tidak bisa menjawab', 'saya hanya bisa', 'hanya bisa menjawab',
  'di luar kemampuan', 'tidak dapat menjawab', 'bukan urusan saya',
];

const UMUM = [
  'ibu kota Jepang apa?',
  'kasih tips supaya saya tidak gampang ngantuk sore hari dong',
  'tulis pantun tentang jualan',
];

for (const pertanyaan of UMUM) {
  const j = await tanya(pertanyaan, token);
  const teks = (j.jawaban ?? '').toLowerCase();
  const ditolak = PENOLAKAN.some((p) => teks.includes(p));
  // Ambang panjangnya sengaja rendah. "Tokyo." adalah jawaban yang benar dan
  // lengkap untuk pertanyaan ibu kota; menuntutnya panjang berarti menghukum
  // jawaban yang bagus.
  periksaBenar(
    `"${pertanyaan}" dijawab, bukan ditolak`,
    teks.trim().length > 2 && !ditolak,
    `jawaban="${ringkas(j.jawaban)}"`,
  );
  console.log(`       -> [${j._detik}s] ${ringkas(j.jawaban)}`);
}

// ===========================================================================
// 3. Jawabannya bersandar pada catatan sungguhan
//
// Bukan menuntut satu bentuk kalimat, hanya menuntut angkanya nyambung.
// Untung bulan ini 48.000 dan modal kripik 21.200 keduanya ada apa adanya di
// konteks — model tinggal membacanya.
// ===========================================================================
console.log('\n3. Angka yang jelas ada di catatan memang dipakai');

const jUntung = await tanya('untung bersih saya bulan ini berapa? sebutkan angkanya', token);
console.log(`       -> [${jUntung._detik}s] ${ringkas(jUntung.jawaban, 160)}`);
periksaBenar('untung bulan ini menyebut 48.000', menyebutAngka(jUntung.jawaban, 48000));

const jModal = await tanya('modal per bungkus Kripik Pisang berapa? sebutkan angkanya', token);
console.log(`       -> [${jModal._detik}s] ${ringkas(jModal.jawaban, 160)}`);
periksaBenar('modal kripik menyebut 21.200', menyebutAngka(jModal.jawaban, 21200));

// ===========================================================================
// 4. Ingatan percakapan
//
// Yang dibuktikan bukan model menyebut ulang namanya — jawaban yang baik justru
// sering tidak mengulang. Yang dibuktikan angkanya: modal Kacang Telur 2.000,
// jadi 7.000 - 2.000 = 5.000. Kalau ingatannya putus dan model mengira ini
// masih soal Kripik Pisang, angkanya mustahil 5.000.
// ===========================================================================
console.log('\n4. Pertanyaan lanjutan paham sedang membahas apa');

await tanya('coba jelaskan soal Kacang Telur saya', token);
const jLanjut = await tanya('kalau yang itu saya jual 7.000, gimana?', token);
console.log(`       -> [${jLanjut._detik}s] ${ringkas(jLanjut.jawaban, 160)}`);
periksaBenar(
  'lanjutan masih membahas Kacang Telur',
  /kacang/i.test(jLanjut.jawaban ?? '') || menyebutAngka(jLanjut.jawaban, 5000),
  `jawaban="${ringkas(jLanjut.jawaban)}"`,
);

// ===========================================================================
// 5. Isolasi antar pedagang
//
// Satu-satunya batasan yang tersisa di modul ini, dan bukan soal chatbot.
// ===========================================================================
console.log('\n5. Pedagang lain tidak melihat catatan kita');

const tokenLain = await pedagangBaru('Warung Sebelah');
const jLain = await tanya('produk saya apa saja? untung saya berapa?', tokenLain);
console.log(`       -> [${jLain._detik}s] ${ringkas(jLain.jawaban, 160)}`);
const bocor = /kripik pisang|kacang telur/i.test(jLain.jawaban ?? '');
periksaBenar('tidak menyebut produk pedagang lain', !bocor, `jawaban="${ringkas(jLain.jawaban)}"`);
periksaBenar(
  'tidak menyebut untung pedagang lain',
  !menyebutAngka(jLain.jawaban, 48000) && !menyebutAngka(jLain.jawaban, 300000),
  `jawaban="${ringkas(jLain.jawaban)}"`,
);

// ===========================================================================
console.log('\n' + '='.repeat(62));
console.log(gagal === 0 ? 'SEMUA LOLOS' : `${gagal} PEMERIKSAAN GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
