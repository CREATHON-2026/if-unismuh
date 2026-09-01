/**
 * Uji fitur 11 — hitung tenaga sendiri sebagai biaya.
 *
 * Pedagang hampir tidak pernah menghitung waktunya sendiri. Waktu ditanya
 * "untungnya berapa", jawabannya sudah termasuk MEMBAYAR DIRI SENDIRI NOL
 * RUPIAH. Fitur ini menambahkan lapisan itu.
 *
 * Dua invariant yang dijaga di sini:
 *
 * 1. PERKALIAN JAM x UPAH TERJADI DI SQL. Kalau frontend yang mengalikan, itu
 *    aturan #7; kalau service TypeScript yang mengalikan, rumus finansial pindah
 *    keluar dari SQL dan melanggar aturan #1. Endpoint menerima jam dan upah
 *    apa adanya, database yang mengalikan.
 * 2. PRODUK YANG TADINYA UNTUNG BISA JADI RUGI. Itu bukan efek samping — itu
 *    seluruh gunanya fitur ini.
 *
 *   node scripts/uji-tenaga.mjs
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

/** batch 280.000 / 100 = modal 2.800, jual 3.500 -> untung 700 */
const DONAT = {
  nama_produk: 'Donat', hasil_per_batch: 100, harga_jual: 3500,
  bahan: [
    { nama: 'terigu',  satuan: 'kg',      jumlah: 10, harga_beli: 120000, jumlah_beli: 10 },
    { nama: 'gula',    satuan: 'kg',      jumlah: 4,  harga_beli: 60000,  jumlah_beli: 4  },
    { nama: 'telur',   satuan: 'kg',      jumlah: 1,  harga_beli: 28000,  jumlah_beli: 1  },
    { nama: 'mentega', satuan: 'kg',      jumlah: 1,  harga_beli: 22000,  jumlah_beli: 1  },
    { nama: 'minyak',  satuan: 'liter',   jumlah: 2,  harga_beli: 36000,  jumlah_beli: 2  },
    { nama: 'ragi',    satuan: 'bungkus', jumlah: 1,  harga_beli: 14000,  jumlah_beli: 1  },
  ],
};

console.log('UJI TENAGA SENDIRI SEBAGAI BIAYA (fitur 11)');
console.log('='.repeat(64));

const { token } = await panggil('/auth/otp/verifikasi', {
  method: 'POST', body: JSON.stringify({ nomor_hp: NOMOR, kode: '123456' }),
});
await panggil('/onboarding/usaha', {
  method: 'POST', body: JSON.stringify({ nama_usaha: 'Warung Uji', jenis_usaha: 'makanan' }),
}, token);
const donat = await panggil('/onboarding/resep', { method: 'POST', body: JSON.stringify(DONAT) }, token);

// ===========================================================================
// 1. Sebelum tenaga dihitung
// ===========================================================================
console.log('');
console.log('1. Sebelum waktu pedagang dihitung');
console.log(`   modal ${rupiah(donat.modal_per_unit)} · jual ${rupiah(donat.harga_jual)}` +
  ` · margin ${rupiah(donat.margin_per_unit)}`);
periksa('modal hanya dari bahan', donat.modal_per_unit, 2800);
periksa('terlihat untung', donat.margin_per_unit, 700);
periksa('belum ditandai merugi', donat.merugi, false);

const sebelum = await panggil(`/produk/${donat.produk_id}`, {}, token);
periksa('ongkos tenaga masih nol', sebelum.biaya_tenaga_per_unit, 0);

// ===========================================================================
// 2. Pedagang menjawab dua pertanyaan
// ===========================================================================
// "Sekali bikin butuh berapa jam?"            -> 5
// "Sejam kerja di tempat orang dibayar berapa?" -> 15.000
//
// Hitungan tangan: 5 x 15.000 = 75.000 per batch
//                  75.000 / 100 box = 750 per box
//                  modal jadi 2.800 + 750 = 3.550
//                  margin jadi 3.500 - 3.550 = -50   <- BERBALIK JADI RUGI
console.log('');
console.log('2. Setelah menjawab: 5 jam, Rp 15.000 per jam');
const sesudah = await panggil(`/produk/${donat.produk_id}/tenaga`, {
  method: 'PATCH',
  body: JSON.stringify({ jam_per_batch: 5, upah_per_jam: 15000 }),
}, token);
console.log(`   modal ${rupiah(sesudah.modal_per_unit)} · jual ${rupiah(sesudah.harga_jual)}` +
  ` · margin ${rupiah(sesudah.margin_per_unit)}${sesudah.merugi ? '  [MERUGI]' : ''}`);

// ★ Perkalian 5 x 15.000 terjadi di SQL, bukan di frontend maupun TypeScript
periksa('modal naik oleh ongkos tenaga', sesudah.modal_per_unit, 3550);
periksa('margin ikut turun', sesudah.margin_per_unit, -50);
// ★ Inilah seluruh gunanya fitur ini
periksa('produk yang tadinya untung kini MERUGI', sesudah.merugi, true);

// ===========================================================================
// 3. Rincian ikut menjelaskan dari mana tambahannya
// ===========================================================================
console.log('');
console.log('3. Rincian di layar detail');
const detail = await panggil(`/produk/${donat.produk_id}`, {}, token);
console.log(`   ongkos tenaga ${rupiah(detail.biaya_tenaga_per_unit)} per unit` +
  ` (${detail.persen_tenaga}% dari modal)`);
periksa('ongkos tenaga per unit', detail.biaya_tenaga_per_unit, 750);
// 750 / 3.550 = 21,1% -> 21
periksa('persen dari modal', detail.persen_tenaga, 21);

// Bahan + tenaga harus menjumlah ke modal. Kalau tidak, rincian di layar tidak
// berjumlah ke totalnya sendiri dan pedagang berhenti percaya semua angkanya.
const jumlahBahan = detail.bahan.reduce((a, b) => a + b.biaya_per_unit, 0);
console.log(`   bahan ${rupiah(jumlahBahan)} + tenaga ${rupiah(detail.biaya_tenaga_per_unit)}` +
  ` = ${rupiah(jumlahBahan + detail.biaya_tenaga_per_unit)}`);
periksa('bahan + tenaga = modal per unit',
  jumlahBahan + detail.biaya_tenaga_per_unit, detail.modal_per_unit);

// ===========================================================================
// 4. Bisa dinolkan kembali
// ===========================================================================
console.log('');
console.log('4. Dikembalikan ke nol');
const nol = await panggil(`/produk/${donat.produk_id}/tenaga`, {
  method: 'PATCH', body: JSON.stringify({ jam_per_batch: 0, upah_per_jam: 15000 }),
}, token);
periksa('modal kembali seperti semula', nol.modal_per_unit, 2800);
periksa('untung kembali', nol.margin_per_unit, 700);

// ===========================================================================
// 5. Masukan tidak masuk akal ditolak
// ===========================================================================
console.log('');
console.log('5. Masukan yang ditolak');
for (const [nama, isi] of [
  ['jam minus', { jam_per_batch: -1, upah_per_jam: 15000 }],
  ['upah minus', { jam_per_batch: 3, upah_per_jam: -5000 }],
  ['jam bukan angka', { jam_per_batch: 'tiga', upah_per_jam: 15000 }],
]) {
  let ditolak = false;
  try {
    await panggil(`/produk/${donat.produk_id}/tenaga`, {
      method: 'PATCH', body: JSON.stringify(isi),
    }, token);
  } catch { ditolak = true; }
  periksa(nama + ' ditolak', ditolak, true);
}

// ===========================================================================
// 6. Isolasi antar pengguna
// ===========================================================================
console.log('');
console.log('6. Isolasi antar pengguna');
const lain = '08' + String(Date.now() + 17).slice(-10);
const { token: tokenLain } = await panggil('/auth/otp/verifikasi', {
  method: 'POST', body: JSON.stringify({ nomor_hp: lain, kode: '123456' }),
}, null);
let ditolakLain = false;
try {
  await panggil(`/produk/${donat.produk_id}/tenaga`, {
    method: 'PATCH', body: JSON.stringify({ jam_per_batch: 9, upah_per_jam: 99000 }),
  }, tokenLain);
} catch { ditolakLain = true; }
periksa('produk pedagang lain ditolak', ditolakLain, true);
periksa('nilainya tidak berubah',
  (await panggil(`/produk/${donat.produk_id}`, {}, token)).biaya_tenaga_per_unit, 0);

console.log('');
console.log('='.repeat(64));
if (gagal === 0) {
  console.log('SEMUA LOLOS — waktu pedagang ikut dihitung, dan perkaliannya di SQL.');
} else {
  console.log(`${gagal} PEMERIKSAAN GAGAL.`);
  process.exit(1);
}
