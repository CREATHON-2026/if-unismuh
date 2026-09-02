/**
 * Uji chatbot "Tanya lapakAi" — POST /tanya.
 *
 * Yang dibuktikan di sini bukan "chatbot-nya menjawab", tapi bahwa jawabannya
 * TIDAK MENGARANG. Chatbot adalah satu-satunya tempat LLM berbicara soal uang
 * dalam kalimat utuh, dan kalimat yang salah tidak terlihat seperti galat —
 * ia terlihat seperti jawaban.
 *
 * Sejak chatbot dibebaskan menjawab apa saja (lihat
 * docs/superpowers/specs/2026-09-02-chatbot-bebas-design.md), berkas ini jadi
 * SATU-SATUNYA penjaga otomatis aturan #1. Dulu kalimatnya dirakit template,
 * jadi menyimpang secara struktur mustahil. Sekarang kalimatnya disusun model,
 * dan yang menahannya cuma dua hal: lembar fakta yang membatasi angka apa saja
 * yang pernah dilihat model, dan pemeriksaan di kelompok 3 di bawah.
 *
 *   1. Kebebasan     — pertanyaan yang bentuknya bermacam-macam tetap terjawab
 *   2. Batas         — di luar cakupan ditolak, laporan penjualan dialihkan
 *   3. Ketertelusuran— tiap rupiah di `jawaban` punya padanan persis di `acuan`
 *   4. Pengandaian   — "kalau saya jual sekian" dihitung SQL, bukan model
 *   5. Ingatan       — pertanyaan lanjutan memahami rujukan
 *   6. Isolasi       — pedagang lain tidak melihat angka kita
 *
 *   node scripts/uji-tanya.mjs
 */

const DASAR = process.env.API ?? 'http://localhost:3000';
let gagal = 0;
let dilewati = 0;

function periksa(nama, dapat, harap) {
  const cocok = dapat === harap;
  if (!cocok) gagal++;
  console.log(`  ${cocok ? 'OK  ' : 'SALAH'} ${nama}: ${dapat}${cocok ? '' : `  (seharusnya ${harap})`}`);
}

function periksaBenar(nama, syarat, keterangan = '') {
  if (!syarat) gagal++;
  console.log(`  ${syarat ? 'OK  ' : 'SALAH'} ${nama}${syarat ? '' : `  ${keterangan}`}`);
}

/**
 * Untuk pemeriksaan yang hanya berlaku KALAU model menempuh jalur tertentu.
 *
 * Dilewati bukan lolos, dan dihitung terpisah supaya terlihat. Menghitungnya
 * sebagai lolos berarti berkas ini bisa hijau tanpa menguji apa pun.
 */
function periksaKalau(nama, berlaku, dapat, harap) {
  if (!berlaku) {
    dilewati++;
    console.log(`  -    ${nama}: dilewati, model tidak menempuh jalur ini`);
    return;
  }
  periksa(nama, dapat, harap);
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
  const cocok = (kalimat ?? '').match(/Rp\s?[\d.]+/g) ?? [];
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
 * angka yang tidak pernah dihitung siapa pun — model menjumlahkan sendiri, dan
 * itu aturan #1 yang jebol.
 *
 * Tanda minus diabaikan: lembar fakta menulis untung negatif sebagai
 * "-Rp 1.200" sedangkan kalimatnya berbunyi "rugi Rp 1.200". Yang dibandingkan
 * besarnya, bukan cara menuliskannya.
 */
function periksaKetertelusuran(label, jawab) {
  const disebut = rupiahDalam(jawab.jawaban);
  const boleh = angkaSah(jawab.acuan).map(Math.abs);
  const liar = disebut.filter((n) => !boleh.includes(Math.abs(n)));
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

const b = await panggil('/beranda', {}, token);
console.log(`   omzet ${rupiah(b.omzet)}, untung ${rupiah(b.untung_bersih)}`);
periksa('siap: omzet 300.000', b.omzet, 300000);
periksa('siap: untung 48.000', b.untung_bersih, 48000);

// ===========================================================================
// 1. Kebebasan menjawab
//
// Yang diuji: pertanyaan yang bentuknya SANGAT berbeda-beda tetap dapat
// jawaban sungguhan. Empat di antaranya tidak akan terjawab sama sekali oleh
// versi delapan-maksud — itulah sebabnya versi itu diganti.
// ===========================================================================
console.log('\n1. Pertanyaan bebas tetap terjawab');

const BEBAS = [
  'bulan ini untung saya berapa?',
  'kenapa untung saya kecil padahal jualan terus?',
  'menurutmu produk mana yang sebaiknya saya hentikan?',
  'apa yang harus saya perbaiki minggu ini?',
  'di aplikasi ini saya catat penjualan di mana?',
];

const bebas = [];
for (const pertanyaan of BEBAS) {
  const j = await tanya(pertanyaan, token);
  bebas.push([pertanyaan, j]);
  const terjawab = j.maksud === 'bebas' && typeof j.jawaban === 'string' && j.jawaban.length > 15;
  periksaBenar(`"${pertanyaan}"`, terjawab, `maksud=${j.maksud} jawaban="${j.jawaban}"`);
}

// ===========================================================================
// 2. Batas cakupan
// ===========================================================================
console.log('\n2. Batasnya tetap dijaga');

const luar = await tanya('menurutmu siapa yang akan menang pemilu nanti?', token);
periksa('pertanyaan politik ditolak', luar.maksud, 'tidak_paham');
periksa('acuan WAJIB null', luar.acuan, null);
periksaBenar('tidak menyebut rupiah sama sekali', rupiahDalam(luar.jawaban).length === 0,
  `menyebut ${rupiahDalam(luar.jawaban).map(rupiah).join(', ')} padahal tidak menghitung apa pun`);

console.log('\n   Mencatat dialihkan, bukan disimpan diam-diam');
const catat = await tanya('tadi laku 12 kripik pisang', token);
periksa('maksud catat_transaksi', catat.maksud, 'catat_transaksi');
periksa('alihkan_ke terisi', catat.alihkan_ke?.rute, '/catat');
periksaBenar('kalimat asli ikut dibawa',
  typeof catat.alihkan_ke?.teks === 'string' && catat.alihkan_ke.teks.length > 0);

const sesudahTanya = await panggil('/beranda', {}, token);
periksa('omzet TIDAK berubah setelah bertanya', sesudahTanya.omzet, 300000);
periksa('untung TIDAK berubah setelah bertanya', sesudahTanya.untung_bersih, 48000);

// ===========================================================================
// 3. Ketertelusuran — bagian terpenting berkas ini
// ===========================================================================
console.log('\n3. Tiap angka bisa ditelusuri ke SQL');
for (const [pertanyaan, j] of bebas) {
  periksaKetertelusuran(pertanyaan.slice(0, 34), j);
}

console.log('\n   Angkanya bukan cuma bisa ditelusuri, tapi juga benar');
const acuanUntung = bebas[0][1].acuan ?? {};
periksaKalau('untung bersih = hitungan tangan',
  'untung_bersih_periode' in acuanUntung, acuanUntung.untung_bersih_periode, 48000);
periksaKalau('omzet = hitungan tangan',
  'omzet_periode' in acuanUntung, acuanUntung.omzet_periode, 300000);

const modal = await tanya('modal kripik pisang berapa per bungkus?', token);
periksaKetertelusuran('modal kripik pisang', modal);
periksaKalau('modal kripik = 21.200',
  'kripik_pisang_modal_per_unit' in (modal.acuan ?? {}),
  modal.acuan?.kripik_pisang_modal_per_unit, 21200);

// ===========================================================================
// 4. Pengandaian — dihitung SQL, bukan model
//
// Ini kemampuan yang TIDAK ADA di versi sebelumnya, dan alasan utama
// arsitekturnya diubah. Modal kripik 21.200; kalau dijual 25.000 untungnya
// 3.800 per bungkus, dan 10 bungkus yang sudah terjual jadi 38.000.
// ===========================================================================
console.log('\n4. "Kalau saya jual sekian" dihitung database');
const sim = await tanya('kalau kripik pisang saya jual 25000, untungnya jadi berapa per bungkus?', token);
console.log(`   -> ${sim.jawaban}`);
periksaKetertelusuran('simulasi harga', sim);

const acuanSim = sim.acuan ?? {};
periksaKalau('untung per bungkus di harga baru = 3.800',
  'simulasi_untung_per_unit_harga_baru' in acuanSim,
  acuanSim.simulasi_untung_per_unit_harga_baru, 3800);
periksaKalau('untung periode di harga baru = 38.000',
  'simulasi_untung_periode_kalau_pakai_harga_baru' in acuanSim,
  acuanSim.simulasi_untung_periode_kalau_pakai_harga_baru, 38000);

// ===========================================================================
// 5. Ingatan percakapan
//
// Pertanyaan kedua tidak menyebut produk apa pun. Ia hanya bisa dijawab benar
// kalau giliran sebelumnya terbawa.
// ===========================================================================
console.log('\n5. Pertanyaan lanjutan memahami rujukan');
await tanya('modal kacang telur berapa?', token);
const lanjut = await tanya('kalau yang itu saya jual 7000 bagaimana?', token);
console.log(`   -> ${lanjut.jawaban}`);
periksaKetertelusuran('pertanyaan lanjutan', lanjut);
periksaBenar('lanjutan tidak jatuh ke luar cakupan', lanjut.maksud !== 'tidak_paham',
  `maksud=${lanjut.maksud}`);

// ===========================================================================
// 6. Isolasi antar pengguna
// ===========================================================================
console.log('\n6. Pedagang lain tidak melihat angka kita');
const tokenLain = await pedagangBaru('Warung Sebelah');
const lain = await tanya('bulan ini untung saya berapa?', tokenLain);
periksaBenar('jawaban pedagang baru tidak menyebut 48.000',
  !rupiahDalam(lain.jawaban).includes(48000),
  `jawabannya: "${lain.jawaban}" — data bocor antar pengguna`);
periksaBenar('jawaban pedagang baru tidak menyebut 300.000',
  !rupiahDalam(lain.jawaban).includes(300000),
  `jawabannya: "${lain.jawaban}" — data bocor antar pengguna`);

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
if (dilewati > 0) console.log(`${dilewati} pemeriksaan dilewati — model tidak menempuh jalurnya.`);
if (gagal === 0) {
  console.log('SEMUA LOLOS — tiap rupiah yang diucapkan chatbot berasal dari SQL.');
} else {
  console.log(`${gagal} PEMERIKSAAN GAGAL.`);
  process.exit(1);
}

/*
 * Catatan soal kestabilan.
 *
 * Kelompok 1, 4, dan 5 bergantung pada model, jadi bisa goyah. Kegagalan di
 * sana berarti chatbotnya kurang pintar — pedagang akan bertanya ulang dengan
 * kalimat lain, dan tidak ada angka salah yang tertinggal.
 *
 * Kelompok 3 TIDAK BOLEH goyah, dan ia berlaku untuk SETIAP jawaban di berkas
 * ini, bukan cuma yang di kelompoknya sendiri. Ia tidak menguji kepintaran
 * model melainkan apakah kalimatnya masih terikat pada angka SQL. Kalau yang
 * ini merah, jangan diulang sampai kebetulan hijau — cari angka yang lolos ke
 * kalimat tanpa lewat lembar fakta. Itu aturan #1 yang jebol, dan satu-satunya
 * yang akan ditanyakan juri.
 */
