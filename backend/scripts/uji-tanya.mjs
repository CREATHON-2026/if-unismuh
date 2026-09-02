/**
 * Uji chatbot "Tanya lapakAi" — POST /tanya.
 *
 * Yang dibuktikan di sini bukan "chatbot-nya menjawab", tapi bahwa jawabannya
 * TIDAK MENGARANG. Chatbot adalah satu-satunya tempat LLM berbicara soal uang
 * dalam kalimat utuh, dan kalimat yang salah tidak terlihat seperti galat —
 * ia terlihat seperti jawaban.
 *
 * Tiga kelompok pemeriksaan, dan yang ketiga paling berharga:
 *
 *   1. Klasifikasi   — delapan pertanyaan, satu per maksud
 *   2. Kejujuran     — di luar cakupan dijawab tidak_paham, acuan null
 *   3. Ketertelusuran— tiap rupiah di `jawaban` punya padanan persis di `acuan`
 *
 * Tanpa yang ketiga, pelanggaran aturan #1 lolos tanpa suara: tidak ada galat,
 * hanya angka salah dengan kalimat yang meyakinkan.
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
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

const tanya = (pertanyaan, token) =>
  panggil('/tanya', { method: 'POST', body: JSON.stringify({ pertanyaan }) }, token);

// ---------------------------------------------------------------------------
// Inti berkas ini: menangkap angka yang dikarang
// ---------------------------------------------------------------------------

/**
 * Tarik semua nilai rupiah dari kalimat. "Rp 3.600.000" -> 3600000.
 *
 * Titik di sini pemisah ribuan bahasa Indonesia, bukan desimal.
 */
function rupiahDalam(kalimat) {
  const cocok = kalimat.match(/Rp\s?[\d.]+/g) ?? [];
  return cocok.map((s) => Number(s.replace(/[^\d]/g, '')));
}

/** Semua angka yang boleh disebut: nilai numerik di `acuan`, apa adanya. */
function angkaSah(acuan) {
  if (!acuan) return [];
  return Object.values(acuan).filter((v) => typeof v === 'number');
}

/**
 * Setiap rupiah yang diucapkan harus berasal dari SQL.
 *
 * Kalau ada yang tidak punya padanan di `acuan`, berarti kalimatnya menyebut
 * angka yang tidak pernah dihitung siapa pun — LLM menjumlahkan sendiri, dan
 * itu aturan #1 yang jebol.
 */
function periksaKetertelusuran(label, jawab) {
  const disebut = rupiahDalam(jawab.jawaban);
  const boleh = angkaSah(jawab.acuan);
  const liar = disebut.filter((n) => !boleh.includes(n));
  periksaBenar(
    `${label}: semua rupiah ada di acuan`,
    liar.length === 0,
    `angka tanpa asal: ${liar.map(rupiah).join(', ')} — acuan hanya punya ${boleh.map(rupiah).join(', ') || '(kosong)'}`,
  );
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
// Persiapan — sengaja fixture yang sama dengan uji-beranda.mjs, supaya
// angkanya sudah dihitung tangan dan bisa dibandingkan langsung.
//   omzet  = 10 x 20.000 + 20 x 5.000                      = 300.000
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
await panggil('/stok', {
  method: 'POST',
  body: JSON.stringify({ baris: [{ bahan_id: kripik.bahan?.[0]?.bahan_id ?? 1, jumlah: 20 }] }),
}, token).catch(() => console.log('   (stok dilewati — bahan_id belum terbawa di jawaban resep)'));

const b = await panggil('/beranda', {}, token);
console.log(`   omzet ${rupiah(b.omzet)}, untung ${rupiah(b.untung_bersih)}`);
periksa('siap: omzet 300.000', b.omzet, 300000);
periksa('siap: untung 48.000', b.untung_bersih, 48000);

// ===========================================================================
// 1. Klasifikasi — delapan pertanyaan, satu per maksud
// ===========================================================================
console.log('\n1. Membaca maksud pertanyaan');

const PERTANYAAN = [
  ['bulan ini untung saya berapa?',                          'untung_periode'],
  ['produk mana yang bikin saya rugi?',                      'produk_merugi'],
  ['modal kripik pisang berapa?',                            'modal_produk'],
  ['kripik pisang sebaiknya saya jual berapa?',              'saran_harga'],
  ['bahan saya cukup untuk berapa bungkus kripik pisang?',   'kapasitas_stok'],
  ['produk apa yang paling laku?',                           'produk_terlaris'],
  ['tadi laku 12 kripik pisang',                             'catat_transaksi'],
  ['besok cuacanya bagaimana?',                              'tidak_paham'],
];

const jawaban = {};
for (const [pertanyaan, harap] of PERTANYAAN) {
  const j = await tanya(pertanyaan, token);
  jawaban[harap] = j;
  periksa(`"${pertanyaan}"`, j.maksud, harap);
}

// ===========================================================================
// 2. Kejujuran di batas cakupan
// ===========================================================================
console.log('\n2. Yang tidak dipahami dijawab jujur');
const tp = jawaban['tidak_paham'];
periksa('maksud tidak_paham', tp?.maksud, 'tidak_paham');
periksa('acuan WAJIB null', tp?.acuan, null);
periksaBenar('tidak menyebut rupiah sama sekali', rupiahDalam(tp?.jawaban ?? '').length === 0,
  `menyebut ${rupiahDalam(tp?.jawaban ?? '').map(rupiah).join(', ')} padahal tidak menghitung apa pun`);

console.log('\n   Mencatat dialihkan, bukan disimpan diam-diam');
const ct = jawaban['catat_transaksi'];
periksa('alihkan_ke terisi', ct?.alihkan_ke?.rute, '/catat');
periksaBenar('kalimat asli ikut dibawa', typeof ct?.alihkan_ke?.teks === 'string' && ct.alihkan_ke.teks.length > 0);

const sesudahTanya = await panggil('/beranda', {}, token);
periksa('omzet TIDAK berubah setelah bertanya', sesudahTanya.omzet, 300000);
periksa('untung TIDAK berubah setelah bertanya', sesudahTanya.untung_bersih, 48000);

// ===========================================================================
// 3. Ketertelusuran — bagian terpenting berkas ini
// ===========================================================================
console.log('\n3. Tiap angka bisa ditelusuri ke SQL');
for (const [maksud, j] of Object.entries(jawaban)) {
  if (!j) continue;
  periksaKetertelusuran(maksud, j);
}

console.log('\n   Angkanya bukan cuma bisa ditelusuri, tapi juga benar');
const up = jawaban['untung_periode'];
periksa('acuan.untung_bersih = hitungan tangan', up?.acuan?.untung_bersih, 48000);
periksa('acuan.omzet = hitungan tangan', up?.acuan?.omzet, 300000);

const mp = jawaban['modal_produk'];
periksa('acuan modal kripik = 21.200', mp?.acuan?.modal_per_unit, 21200);

const pm = jawaban['produk_merugi'];
periksaBenar('yang merugi Kripik Pisang', JSON.stringify(pm?.acuan ?? {}).includes('Kripik Pisang'),
  `acuan: ${JSON.stringify(pm?.acuan)}`);

// ===========================================================================
// 4. Isolasi antar pengguna
// ===========================================================================
console.log('\n4. Pedagang lain tidak melihat angka kita');
const tokenLain = await pedagangBaru('Warung Sebelah');
const lain = await tanya('bulan ini untung saya berapa?', tokenLain);
periksaBenar('untung pedagang baru bukan 48.000', lain.acuan?.untung_bersih !== 48000,
  `dapat ${rupiah(lain.acuan?.untung_bersih)} — data bocor antar pengguna`);

let ditolak = false;
try {
  await fetch(DASAR + '/tanya', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pertanyaan: 'untung saya berapa?' }),
  }).then((r) => r.json()).then((body) => { if (!body.ok) throw new Error(body.error.kode); });
} catch { ditolak = true; }
periksa('tanpa token ditolak', ditolak, true);

console.log('\n' + '='.repeat(62));
if (gagal === 0) {
  console.log('SEMUA LOLOS — tiap rupiah yang diucapkan chatbot berasal dari SQL.');
} else {
  console.log(`${gagal} PEMERIKSAAN GAGAL.`);
  process.exit(1);
}

/*
 * Catatan soal kestabilan.
 *
 * Kelompok 1 bergantung pada model, jadi ia bisa goyah — model lokal kadang
 * membaca "produk apa yang paling laku" sebagai produk_merugi. Itu memang yang
 * ingin diketahui: klasifikasi yang meleset menghasilkan jawaban yang jelas
 * tidak nyambung, dan pedagang akan bertanya ulang.
 *
 * Kelompok 3 TIDAK BOLEH goyah. Ia tidak menguji kepintaran model, melainkan
 * apakah kalimatnya masih terikat pada angka SQL. Kalau yang ini merah, jangan
 * diulang sampai hijau — cari template yang menyulih angka di luar `acuan`.
 */
