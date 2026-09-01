/**
 * Uji fitur 10 — tambah produk tanpa form.
 *
 * Dua invariant yang paling berharga diuji di sini:
 *
 * 1. MENGUSULKAN, TIDAK MENYIMPAN. /produk/dari-teks adalah hasil AI, jadi
 *    aturan #2 berlaku penuh: sampai pengguna menekan simpan, daftar produk
 *    tidak boleh bertambah satu pun.
 * 2. YANG TIDAK DISEBUT TIDAK DITEBAK. Pedagang yang lupa menyebut harga jual
 *    harus DITANYA, bukan diberi harga karangan. Aturan #8.
 *
 *   node scripts/uji-produk-baru.mjs
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

console.log('UJI TAMBAH PRODUK TANPA FORM (fitur 10)');
console.log('='.repeat(64));

const { token } = await panggil('/auth/otp/verifikasi', {
  method: 'POST', body: JSON.stringify({ nomor_hp: NOMOR, kode: '123456' }),
});
await panggil('/onboarding/usaha', {
  method: 'POST', body: JSON.stringify({ nama_usaha: 'Warung Uji', jenis_usaha: 'makanan' }),
}, token);

// ===========================================================================
// 1. Kalimat lengkap — semua bagian resep disebut
// ===========================================================================
console.log('');
console.log('1. Kalimat lengkap');
const kalimatLengkap = 'Saya mau tambah produk kacang telur. Sekali bikin jadi 50 bungkus, '
  + 'dijual 5 ribu. Bahannya cuma kacang tanah 10 kilo, belinya 100 ribu.';
console.log(`   "${kalimatLengkap}"`);

const usul = await panggil('/produk/dari-teks', {
  method: 'POST', body: JSON.stringify({ teks: kalimatLengkap }),
}, token);

console.log(`   nama            : ${usul.nama_produk}`);
console.log(`   hasil per batch : ${usul.hasil_per_batch}`);
console.log(`   harga jual      : ${rupiah(usul.harga_jual)}`);
for (const b of usul.bahan) {
  console.log(`   bahan           : ${b.nama} — ${b.jumlah} ${b.satuan ?? '?'}`
    + ` beli ${rupiah(b.harga_beli)} per ${b.jumlah_beli ?? '?'}${b.perlu_dicek ? '  [DICEK]' : ''}`);
}
console.log(`   perlu dicek     : ${usul.perlu_dicek}`);
if (usul.yang_kurang.length) console.log(`   yang kurang     : ${usul.yang_kurang.join(' | ')}`);
if (usul.catatan.length) console.log(`   catatan         : ${usul.catatan.join(' | ')}`);

periksaBenar('nama produk terbaca', /kacang/i.test(usul.nama_produk ?? ''));
periksa('hasil per batch', usul.hasil_per_batch, 50);
periksa('harga jual', usul.harga_jual, 5000);
periksa('satu bahan', usul.bahan.length, 1);
periksa('harga beli bahan', usul.bahan[0]?.harga_beli, 100000);
periksa('tidak ada yang perlu dilengkapi', usul.perlu_dicek, false);

// ★ Aturan #2: mengusulkan saja, belum menyimpan apa pun
periksa('BELUM tersimpan — daftar produk masih kosong',
  (await panggil('/produk', {}, token)).length, 0);

// ===========================================================================
// 1b. REGRESI: kalimat dengan banyak bahan
// ===========================================================================
// Kalimat ini pernah gagal total dan konsisten — hasil_per_batch dan harga_beli
// selalu null, dan "20 kilo" nyasar ke jumlah_beli. Sebabnya satu keluaran LLM
// berisi delapan angka bersemantik mirip; ekstraksinya lalu dipecah dua.
// Jangan hapus kasus ini: ia yang menjaga pemecahan itu tidak digabung lagi.
console.log('');
console.log('1b. Regresi — banyak bahan dalam satu kalimat');
const banyak = await panggil('/produk/dari-teks', {
  method: 'POST',
  body: JSON.stringify({
    teks: 'tambah kripik pisang, sekali bikin jadi 40 bungkus, dijual 20 ribu. '
      + 'bahannya pisang 20 kilo 300 ribu, minyak 10 liter 180 ribu',
  }),
}, token);
for (const b of banyak.bahan) {
  console.log(`   ${b.nama.padEnd(8)} ${b.jumlah} ${b.satuan ?? '?'}`
    + ` beli ${rupiah(b.harga_beli)} per ${b.jumlah_beli}`);
}
periksa('hasil per batch terbaca', banyak.hasil_per_batch, 40);
periksa('harga jual terbaca', banyak.harga_jual, 20000);
periksa('dua bahan', banyak.bahan.length, 2);
// Jumlah dan harga TIDAK boleh tertukar — inilah kegagalan aslinya
periksa('pisang: jumlah dipakai', banyak.bahan[0]?.jumlah, 20);
periksa('pisang: harga beli', banyak.bahan[0]?.harga_beli, 300000);
periksa('minyak: harga beli', banyak.bahan[1]?.harga_beli, 180000);
periksa('tidak ada yang perlu dilengkapi', banyak.perlu_dicek, false);

// ===========================================================================
// 2. Harga jual tidak disebut — harus DITANYA, bukan ditebak
// ===========================================================================
console.log('');
console.log('2. Harga jual tidak disebut');
const tanpaHarga = await panggil('/produk/dari-teks', {
  method: 'POST', body: JSON.stringify({ teks: 'tambah produk donat, sekali bikin jadi 100 biji' }),
}, token);
console.log(`   harga jual  : ${tanpaHarga.harga_jual}`);
console.log(`   perlu dicek : ${tanpaHarga.perlu_dicek}`);
console.log(`   yang kurang : ${tanpaHarga.yang_kurang.join(' | ')}`);

// ★ Aturan #8: yang tidak disebut tidak boleh ditebak
periksa('harga jual dibiarkan kosong', tanpaHarga.harga_jual, null);
periksa('ditandai perlu dicek', tanpaHarga.perlu_dicek, true);
periksaBenar('ada pertanyaan tentang harga',
  tanpaHarga.yang_kurang.some((p) => /harga|dijual|berapa/i.test(p)));

// ===========================================================================
// 3. Tanpa bahan sama sekali — boleh, tapi harus jujur soal akibatnya
// ===========================================================================
console.log('');
console.log('3. Tanpa bahan sama sekali');
const esTeh = await panggil('/produk/dari-teks', {
  method: 'POST', body: JSON.stringify({ teks: 'saya juga jual es teh 3 ribu' }),
}, token);
console.log(`   nama        : ${esTeh.nama_produk}`);
console.log(`   harga jual  : ${rupiah(esTeh.harga_jual)}`);
console.log(`   bahan       : ${esTeh.bahan.length}`);
console.log(`   perlu dicek : ${esTeh.perlu_dicek}`);
console.log(`   catatan     : ${esTeh.catatan.join(' | ')}`);

periksa('harga jual terbaca', esTeh.harga_jual, 3000);
periksa('tidak ada bahan', esTeh.bahan.length, 0);
// Boleh disimpan — tapi akibatnya harus disebutkan, bukan didiamkan
periksa('tidak memblokir penyimpanan', esTeh.perlu_dicek, false);
periksaBenar('memberi tahu modal belum bisa dihitung',
  esTeh.catatan.some((c) => /modal|untung/i.test(c)));

// ===========================================================================
// 4. Simpan produk TANPA resep — modal harus null, bukan nol
// ===========================================================================
console.log('');
console.log('4. Simpan produk tanpa resep');
const disimpan = await panggil('/produk', {
  method: 'POST',
  body: JSON.stringify({ nama_produk: 'Es Teh', harga_jual: 3000, bahan: [] }),
}, token);
console.log(`   tersimpan id ${disimpan.produk_id}, modal ${disimpan.modal_per_unit}`);

periksa('modal per unit NULL, bukan 0', disimpan.modal_per_unit, null);
periksa('margin NULL, bukan untung penuh', disimpan.margin_per_unit, null);
// Produk tanpa modal TIDAK boleh dihitung merugi — belum diketahui bukan rugi
periksa('tidak diklaim merugi', disimpan.merugi, null);

const daftar1 = await panggil('/produk', {}, token);
periksa('daftar produk jadi 1', daftar1.length, 1);

// ===========================================================================
// 5. Simpan produk LENGKAP — modal dihitung SQL
// ===========================================================================
// Hitungan tangan: 10 kg kacang seharga 100.000 -> batch 100.000,
// dibagi 50 bungkus = modal 2.000. Jual 5.000 -> margin +3.000.
console.log('');
console.log('5. Simpan produk lengkap');
const kacang = await panggil('/produk', {
  method: 'POST',
  body: JSON.stringify({
    nama_produk: 'Kacang Telur', harga_jual: 5000, hasil_per_batch: 50,
    bahan: [{ nama: 'kacang tanah', satuan: 'kg', jumlah: 10, harga_beli: 100000, jumlah_beli: 10 }],
  }),
}, token);
console.log(`   modal ${rupiah(kacang.modal_per_unit)} jual ${rupiah(kacang.harga_jual)}`
  + ` margin ${rupiah(kacang.margin_per_unit)}`);

periksa('modal per unit dihitung SQL', kacang.modal_per_unit, 2000);
periksa('margin per unit', kacang.margin_per_unit, 3000);
periksa('tidak merugi', kacang.merugi, false);

// ===========================================================================
// 6. Nama mirip produk yang sudah ada — jangan diam-diam bikin duplikat
// ===========================================================================
console.log('');
console.log('6. Nama mirip produk yang sudah ada');
const mirip = await panggil('/produk/dari-teks', {
  method: 'POST', body: JSON.stringify({ teks: 'tambah kacang telor 5 ribu, sekali bikin 50' }),
}, token);
console.log(`   nama diucapkan : ${mirip.nama_produk}`);
for (const k of mirip.produk_mirip) {
  console.log(`   sudah ada      : ${k.nama} (skor ${k.skor.toFixed(3)})`);
}
periksaBenar('produk mirip ditemukan', mirip.produk_mirip.length > 0);
periksaBenar('yang ditemukan Kacang Telur',
  mirip.produk_mirip.some((k) => /kacang telur/i.test(k.nama)));

// ===========================================================================
// 7. Isolasi antar pengguna
// ===========================================================================
console.log('');
console.log('7. Isolasi antar pengguna');
const lain = '08' + String(Date.now() + 11).slice(-10);
const { token: tokenLain } = await panggil('/auth/otp/verifikasi', {
  method: 'POST', body: JSON.stringify({ nomor_hp: lain, kode: '123456' }),
});
const miripLain = await panggil('/produk/dari-teks', {
  method: 'POST', body: JSON.stringify({ teks: 'tambah kacang telur 5 ribu, sekali bikin 50' }),
}, tokenLain);
periksa('pedagang lain tidak melihat produk kita', miripLain.produk_mirip.length, 0);
periksa('daftar produk pedagang lain kosong', (await panggil('/produk', {}, tokenLain)).length, 0);

console.log('');
console.log('='.repeat(64));
if (gagal === 0) {
  console.log('SEMUA LOLOS — mengusulkan tanpa menyimpan, dan yang tidak disebut ditanya.');
} else {
  console.log(`${gagal} PEMERIKSAAN GAGAL.`);
  process.exit(1);
}
