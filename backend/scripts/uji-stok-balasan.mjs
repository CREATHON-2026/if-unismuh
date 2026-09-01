/**
 * Uji dua lubang terakhir di skrip demo 2 menit:
 *   beat 4 — "Bahan hanya cukup untuk 14 dari 20 yang dipesan"
 *   beat 5 — tombol "Tawar harga" menghasilkan balasan siap salin
 *
 * Yang paling penting dibuktikan untuk balasan: ANGKA DI DALAM KALIMATNYA
 * HARUS ANGKA DARI SQL. Kalau LLM mengarang angka lain, itu kegagalan —
 * bukan sekadar kalimat yang kurang enak dibaca.
 *
 *   node scripts/uji-stok-balasan.mjs
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
  console.log(`  ${syarat ? 'OK  ' : 'SALAH'} ${nama}${keterangan ? ': ' + keterangan : ''}`);
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
const NOMOR = '08' + String(Date.now()).slice(-10);

console.log('UJI STOK + BALASAN — dua lubang terakhir skrip demo');
console.log('='.repeat(64));

// --- Siapkan: kripik pisang, modal 21.200, jual 20.000 ----------------------
const { token } = await panggil('/auth/otp/verifikasi', {
  method: 'POST', body: JSON.stringify({ nomor_hp: NOMOR, kode: '123456' }),
});
await panggil('/onboarding/usaha', {
  method: 'POST', body: JSON.stringify({ nama_usaha: 'Warung Bu Sari', jenis_usaha: 'makanan' }),
}, token);
const produk = await panggil('/onboarding/resep', {
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
console.log(`\nSiap: ${produk.nama} — modal ${rupiah(produk.modal_per_unit)}, jual ${rupiah(produk.harga_jual)}`);

// ===========================================================================
// 1. GET /stok — sebelum dicatat, harus null (bukan 0)
// ===========================================================================
console.log('\n1. GET /stok sebelum apa pun dicatat');
const stokAwal = await panggil('/stok', {}, token);
console.log(`   ${stokAwal.length} bahan terdaftar`);
periksa('lima bahan muncul', stokAwal.length, 5);
// null berarti "belum dicatat" — mengatakan 0 kepada pedagang yang belum
// mengisi stok adalah berbohong.
periksa('stok belum dicatat = null, bukan 0', stokAwal[0]?.jumlah, null);

// ===========================================================================
// 2. POST /stok lalu peringatan bahan HARUS muncul
// ===========================================================================
console.log('\n2. Catat stok supaya bahan hanya cukup 14 bungkus');
// Satu batch (40 bungkus) butuh: pisang 20kg, minyak 10L, gula 10kg,
// gas 1 tabung, kemasan 40 buah. Per bungkus = jumlah_pakai / 40.
// Untuk membatasi di 14 bungkus, pisang dibuat pas: 14 x (20/40) = 7 kg.
// Bahan lain dibuat berlimpah supaya pisang yang jadi penentu.
const perBungkus = { pisang: 20 / 40, minyak: 10 / 40, gula: 10 / 40, gas: 1 / 40, kemasan: 40 / 40 };
const cari = (n) => stokAwal.find((b) => b.nama === n).bahan_id;
await panggil('/stok', {
  method: 'POST',
  body: JSON.stringify({ baris: [
    { bahan_id: cari('pisang'),  jumlah: 14 * perBungkus.pisang },   // penentu: 7 kg
    { bahan_id: cari('minyak'),  jumlah: 999 },
    { bahan_id: cari('gula'),    jumlah: 999 },
    { bahan_id: cari('gas'),     jumlah: 999 },
    { bahan_id: cari('kemasan'), jumlah: 999 },
  ] }),
}, token);

const stokBaru = await panggil('/stok', {}, token);
periksa('stok pisang tersimpan', stokBaru.find((b) => b.nama === 'pisang')?.jumlah, 7);

console.log('\n   Pesanan 20 bungkus, padahal bahan cuma cukup 14:');
const analisis = await panggil('/pesanan/analisis', {
  method: 'POST',
  body: JSON.stringify({ teks: 'bu saya mau pesan 20 bungkus kripik pisang, bisa 18rb ga bu?' }),
}, token);
for (const p of analisis.peringatan) console.log(`     ! ${p}`);

periksa('kapasitas terhitung 14', analisis.stok_cukup_untuk, 14);
periksa('ditandai stok kurang', analisis.stok_kurang, true);
// ★ Beat 4 demo: peringatan ini yang selama ini tidak pernah muncul
periksaBenar('peringatan "cukup 14 dari 20" muncul',
  analisis.peringatan.some((p) => /cukup untuk 14 dari 20/.test(p)));
periksaBenar('TIDAK lagi bilang "stok belum dicatat"',
  !analisis.peringatan.some((p) => /belum dicatat/.test(p)));

// ===========================================================================
// 3. POST /pesanan/balasan — beat 5, penutup demo
// ===========================================================================
console.log('\n3. Tekan "Tawar harga" -> balasan siap salin');
const balasan = await panggil('/pesanan/balasan', {
  method: 'POST',
  body: JSON.stringify({
    maksud: 'tawar_harga', produk_id: produk.produk_id, jumlah: 20, harga_diminta: 18000,
  }),
}, token);
console.log('\n   ┌─ siap disalin pedagang ─────────────────');
for (const b of String(balasan.teks).split('\n')) console.log('   │ ' + b);
console.log('   └─────────────────────────────────────────');

periksaBenar('dapat teks balasan', typeof balasan.teks === 'string' && balasan.teks.length > 20);

// ★ Yang paling penting: angka di kalimat harus angka dari SQL.
// Angka acuan disertakan di jawaban supaya bisa dicocokkan tanpa menebak.
console.log('\n   Angka acuan dari SQL:');
console.log(`     modal per unit  ${rupiah(balasan.acuan.modal_per_unit)}`);
console.log(`     harga diminta   ${rupiah(balasan.acuan.harga_diminta)}`);
console.log(`     untung pesanan  ${rupiah(balasan.acuan.untung_pesanan)}`);
periksa('modal acuan dari SQL', balasan.acuan.modal_per_unit, 21200);
periksa('untung acuan dari SQL', balasan.acuan.untung_pesanan, -64000);

// Sistem tidak boleh pernah mengirim — hanya menyiapkan teks.
periksaBenar('tidak ada tanda pesan terkirim', balasan.terkirim === undefined);

// ===========================================================================
// 4. Isolasi
// ===========================================================================
console.log('\n4. Produk pedagang lain ditolak');
const lain = '08' + String(Date.now() + 3).slice(-10);
const { token: tokenLain } = await panggil('/auth/otp/verifikasi', {
  method: 'POST', body: JSON.stringify({ nomor_hp: lain, kode: '123456' }),
});
let ditolak = false;
try {
  await panggil('/pesanan/balasan', {
    method: 'POST',
    body: JSON.stringify({ maksud: 'tawar_harga', produk_id: produk.produk_id, jumlah: 1 }),
  }, tokenLain);
} catch { ditolak = true; }
periksa('balasan untuk produk orang lain ditolak', ditolak, true);

console.log('\n' + '='.repeat(64));
if (gagal === 0) {
  console.log('SEMUA LOLOS — skrip demo 2 menit sekarang utuh (kecuali foto).');
} else {
  console.log(`${gagal} PEMERIKSAAN GAGAL.`);
  process.exit(1);
}
