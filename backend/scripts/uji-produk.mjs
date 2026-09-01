/**
 * Uji fitur 6 — daftar & detail produk.
 *
 * Invariant yang paling berharga diuji di sini: RINCIAN BIAYA PER BAHAN HARUS
 * BERJUMLAH PERSIS SAMA DENGAN MODAL PER UNIT. Kalau layar detail memperlihatkan
 * rincian yang tidak menjumlah ke totalnya sendiri, pedagang berhenti percaya
 * pada seluruh angka di aplikasi — dan juri akan menemukannya dalam sepuluh detik.
 *
 *   node scripts/uji-produk.mjs
 */

const DASAR = process.env.API ?? 'http://localhost:3000';
let gagal = 0;

function periksa(nama, dapat, harap) {
  const cocok = dapat === harap;
  if (!cocok) gagal++;
  console.log(`  ${cocok ? 'OK  ' : 'SALAH'} ${nama}: ${dapat}${cocok ? '' : `  (seharusnya ${harap})`}`);
}

function periksaBenar(nama, syarat) {
  if (!syarat) gagal++;
  console.log(`  ${syarat ? 'OK  ' : 'SALAH'} ${nama}`);
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
const NOMOR = '08' + String(Date.now()).slice(-10);

/** batch 848.000 / 40 = modal 21.200, jual 20.000 -> RUGI 1.200 */
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

/** batch 100.000 / 50 = modal 2.000, jual 5.000 -> untung 3.000 */
const KACANG = {
  nama_produk: 'Kacang Telur', hasil_per_batch: 50, harga_jual: 5000,
  bahan: [{ nama: 'kacang tanah', satuan: 'kg', jumlah: 10, harga_beli: 100000, jumlah_beli: 10 }],
};

console.log('UJI DAFTAR & DETAIL PRODUK (fitur 6)');
console.log('='.repeat(62));

const { token } = await panggil('/auth/otp/verifikasi', {
  method: 'POST', body: JSON.stringify({ nomor_hp: NOMOR, kode: '123456' }),
});
await panggil('/onboarding/usaha', {
  method: 'POST', body: JSON.stringify({ nama_usaha: 'Warung Bu Sari', jenis_usaha: 'makanan' }),
}, token);
const kripik = await panggil('/onboarding/resep', { method: 'POST', body: JSON.stringify(KRIPIK) }, token);
const kacang = await panggil('/onboarding/resep', { method: 'POST', body: JSON.stringify(KACANG) }, token);

// Kacang terjual 20, kripik 10 -> kacang yang TERLARIS
await panggil('/transaksi', {
  method: 'POST',
  body: JSON.stringify({ baris: [
    { produk_id: kripik.produk_id, jumlah: 10 },
    { produk_id: kacang.produk_id, jumlah: 20 },
  ] }),
}, token);

// ===========================================================================
// 1. Daftar produk — yang merugi harus di ATAS
// ===========================================================================
console.log('\n1. GET /produk');
const daftar = await panggil('/produk', {}, token);
for (const p of daftar) {
  console.log(`   ${p.nama.padEnd(15)} modal ${rupiah(p.modal_per_unit).padEnd(11)}` +
    ` jual ${rupiah(p.harga_jual).padEnd(11)} margin ${rupiah(p.margin_per_unit).padEnd(10)}` +
    `${p.merugi ? ' [MERUGI]' : ''}${p.terlaris ? ' [TERLARIS]' : ''}`);
}
periksa('dua produk', daftar.length, 2);
// Fitur 6: diurutkan dari margin TERENDAH, jadi yang merugi terlihat lebih dulu
periksa('yang merugi di urutan pertama', daftar[0]?.nama, 'Kripik Pisang');
periksa('ditandai merugi', daftar[0]?.merugi, true);
periksa('marginnya benar', daftar[0]?.margin_per_unit, -1200);
periksa('produk untung tidak ditandai merugi', daftar[1]?.merugi, false);
// Kacang terjual 20 vs kripik 10
periksa('terlaris = Kacang Telur', daftar.find((p) => p.terlaris)?.nama, 'Kacang Telur');
periksa('kripik bukan terlaris', daftar[0]?.terlaris, false);

// ===========================================================================
// 2. Detail — rincian bahan HARUS berjumlah sama dengan modal
// ===========================================================================
console.log('\n2. GET /produk/:id — rincian bahan');
const detail = await panggil(`/produk/${kripik.produk_id}`, {}, token);
let jumlahRincian = 0;
for (const b of detail.bahan) {
  console.log(`   ${b.nama.padEnd(14)} ${String(b.jumlah_pakai).padStart(4)} ${b.satuan.padEnd(7)}` +
    ` -> ${rupiah(b.biaya_per_unit)} per bungkus`);
  jumlahRincian += b.biaya_per_unit;
}
console.log(`   ${'JUMLAH'.padEnd(14)}      ${''.padEnd(7)} -> ${rupiah(jumlahRincian)}`);
console.log(`   modal_per_unit dari SQL         : ${rupiah(detail.modal_per_unit)}`);

periksa('lima bahan', detail.bahan.length, 5);
// ★ Invariant: rincian harus menjumlah ke totalnya sendiri
periksa('rincian berjumlah = modal per unit', jumlahRincian, detail.modal_per_unit);
periksa('modal per unit', detail.modal_per_unit, 21200);
periksa('total terjual', detail.total_terjual, 10);

// ===========================================================================
// 2b. Saran perbaikan harga (fitur 8)
// ===========================================================================
// Hitungan tangan: modal 21.200, markup 20% -> 25.440,
// dibulatkan NAIK ke kelipatan 500 -> 25.500.
// kenaikan  = 25.500 - 20.000 = 5.500
// untung    = 25.500 - 21.200 = 4.300
console.log('');
console.log('2b. Saran harga untuk produk yang merugi');
const sh = detail.saran_harga;
if (!sh) {
  gagal++;
  console.log('  SALAH saran_harga masih null');
} else {
  console.log(`   impas ${rupiah(sh.harga_impas)} | disarankan ${rupiah(sh.harga_disarankan)}` +
    ` | naik ${rupiah(sh.kenaikan)} | untung ${rupiah(sh.untung_per_unit)}`);
  console.log(`   "${sh.alasan}"`);
  periksa('harga impas = modal', sh.harga_impas, 21200);
  // Dibulatkan NAIK: membulatkan turun berarti menyarankan untung di bawah target
  periksa('harga disarankan dibulatkan naik', sh.harga_disarankan, 25500);
  periksa('kenaikan dari harga sekarang', sh.kenaikan, 5500);
  periksa('untung di harga disarankan', sh.untung_per_unit, 4300);
  // Kalau ketiganya tidak konsisten, ada dua tempat yang menghitung berbeda
  periksa('untung = disarankan - modal',
    sh.harga_disarankan - detail.modal_per_unit, sh.untung_per_unit);
  periksaBenar('alasan menyebut angka yang sama',
    sh.alasan.includes('25.500') && sh.alasan.includes('21.200'));
}

// Produk yang harganya SUDAH cukup tidak perlu disarankan apa-apa
console.log('');
console.log('2c. Produk yang sudah untung besar');
const detKacang = await panggil(`/produk/${kacang.produk_id}`, {}, token);
console.log(`   ${detKacang.nama}: modal ${rupiah(detKacang.modal_per_unit)}` +
  ` jual ${rupiah(detKacang.harga_jual)} -> saran: ${detKacang.saran_harga ? 'ada' : 'null'}`);
periksa('tidak menyarankan apa-apa', detKacang.saran_harga, null);

// ===========================================================================
// 3. Isolasi — produk pedagang lain tidak boleh terbaca
// ===========================================================================
console.log('\n3. Isolasi antar pengguna');
const lain = '08' + String(Date.now() + 7).slice(-10);
const { token: tokenLain } = await panggil('/auth/otp/verifikasi', {
  method: 'POST', body: JSON.stringify({ nomor_hp: lain, kode: '123456' }),
}, null);
let ditolak = false;
try {
  await panggil(`/produk/${kripik.produk_id}`, {}, tokenLain);
} catch { ditolak = true; }
periksa('produk pedagang lain ditolak', ditolak, true);
periksa('daftar pedagang lain kosong', (await panggil('/produk', {}, tokenLain)).length, 0);

console.log('\n' + '='.repeat(62));
if (gagal === 0) {
  console.log('SEMUA LOLOS — rincian bahan menjumlah tepat ke modalnya.');
} else {
  console.log(`${gagal} PEMERIKSAAN GAGAL.`);
  process.exit(1);
}
