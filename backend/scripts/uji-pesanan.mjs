/**
 * Uji fitur 9 — Pesanan Masuk.
 *
 * Yang dibuktikan skrip ini bukan sekadar "endpoint-nya hidup", tapi:
 *   1. Keempat jenis pesan dikenali benar
 *   2. Angka untung-rugi datang dari SQL, bukan dari LLM
 *   3. Pesan "bukan pesanan" TIDAK disimpan
 *
 * Butuh server hidup dan GEMINI_API_KEY terisi.
 *   node scripts/uji-pesanan.mjs
 */

const DASAR = process.env.API ?? 'http://localhost:3000';
let gagal = 0;

function periksa(nama, dapat, harap) {
  const cocok = dapat === harap;
  if (!cocok) gagal++;
  console.log(`  ${cocok ? 'OK  ' : 'SALAH'} ${nama}: ${dapat}${cocok ? '' : `  (seharusnya ${harap})`}`);
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

console.log('UJI PESANAN MASUK (fitur 9)');
console.log('='.repeat(60));

// --- Siapkan pedagang dengan satu produk yang MERUGI ------------------------
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
console.log(`\nSiap: ${produk.nama} — modal ${rupiah(produk.modal_per_unit)}, jual ${rupiah(produk.harga_jual)}\n`);

async function uji(judul, teks) {
  console.log('-'.repeat(60));
  console.log(`${judul}\n  "${teks}"`);
  const h = await panggil('/pesanan/analisis', {
    method: 'POST', body: JSON.stringify({ teks }),
  }, token);
  console.log(`  -> jenis: ${h.jenis}` +
    (h.produk ? ` | produk: ${h.produk.nama}` : '') +
    (h.jumlah != null ? ` | jumlah: ${h.jumlah}` : '') +
    (h.harga_diminta != null ? ` | diminta: ${rupiah(h.harga_diminta)}` : ''));
  if (h.untung_pesanan != null) {
    console.log(`  -> nilai ${rupiah(h.nilai_pesanan)}, untung ${rupiah(h.untung_pesanan)}, merugi: ${h.merugi}`);
  }
  for (const p of h.peringatan) console.log(`     ! ${p}`);
  return h;
}

// --- 1. Menawar di bawah modal ---------------------------------------------
const tawar = await uji(
  '1. Menawar di bawah modal',
  'bu saya mau pesan 20 bungkus kripik pisang buat hari sabtu, bisa 18rb ga bu?',
);
periksa('dikenali sebagai menawar', tawar.jenis, 'menawar');
periksa('produk tercocokkan', tawar.produk?.nama, 'Kripik Pisang');
periksa('jumlah terbaca', tawar.jumlah, 20);
periksa('harga diminta terbaca', tawar.harga_diminta, 18000);
// 20 x (18.000 - 21.200) = -64.000. Dihitung SQL, bukan LLM.
periksa('untung dihitung SQL', tawar.untung_pesanan, -64000);
periksa('ditandai merugi', tawar.merugi, true);
periksa('ada peringatan rugi', tawar.peringatan.some((p) => /rugi/i.test(p)), true);

// --- 2. Pesanan biasa tanpa menyebut harga ----------------------------------
const pesan = await uji('2. Pesanan tanpa menyebut harga', 'assalamualaikum bu, pesan kripik pisang 5 bungkus ya');
periksa('dikenali sebagai pesanan', pesan.jenis, 'pesanan');
periksa('harga diminta kosong', pesan.harga_diminta, null);
// Tanpa harga diminta, dipakai harga jual: 5 x (20.000 - 21.200) = -6.000
periksa('pakai harga jual tersimpan', pesan.untung_pesanan, -6000);

// --- 3. Tanya harga ---------------------------------------------------------
const tanya = await uji('3. Tanya harga', 'bu kripik pisangnya berapaan sekarang?');
periksa('dikenali sebagai tanya_harga', tanya.jenis, 'tanya_harga');

// --- 4. Bukan pesanan — TIDAK boleh disimpan --------------------------------
const bukan = await uji('4. Bukan pesanan', 'assalamualaikum bu, apa kabar?');
periksa('dikenali sebagai bukan_pesanan', bukan.jenis, 'bukan_pesanan');
periksa('TIDAK disimpan (pesan_id null)', bukan.pesan_id, null);

// --- 5. Daftar hanya berisi yang relevan ------------------------------------
console.log('-'.repeat(60));
const daftar = await panggil('/pesanan', {}, token);
console.log(`5. GET /pesanan -> ${daftar.length} pesan tersimpan`);
periksa('bukan_pesanan tidak masuk daftar', daftar.length, 3);

console.log('\n' + '='.repeat(60));
if (gagal === 0) {
  console.log('SEMUA LOLOS — klasifikasi benar, dan angkanya dari SQL.');
} else {
  console.log(`${gagal} PEMERIKSAAN GAGAL.`);
  process.exit(1);
}
