/**
 * Uji fitur 3 (ketik manual transaksi) dan fitur 7 (Beranda).
 *
 * Yang dibuktikan di sini bukan "endpoint-nya hidup", tapi bahwa ANGKANYA
 * PERSIS sama dengan hitungan tangan. Beranda adalah layar pertama yang
 * dilihat juri; satu angka yang meleset menghancurkan seluruh cerita bahwa
 * perhitungan kami bisa ditelusuri.
 *
 *   node scripts/uji-beranda.mjs
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

/** Kripik Pisang: batch 848.000 / 40 bungkus = modal 21.200, jual 20.000 -> RUGI 1.200 */
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

/** Kacang Telur: batch 100.000 / 50 bungkus = modal 2.000, jual 5.000 -> untung 3.000 */
const KACANG = {
  nama_produk: 'Kacang Telur', hasil_per_batch: 50, harga_jual: 5000,
  bahan: [{ nama: 'kacang tanah', satuan: 'kg', jumlah: 10, harga_beli: 100000, jumlah_beli: 10 }],
};

console.log('UJI KETIK MANUAL (fitur 3) + BERANDA (fitur 7)');
console.log('='.repeat(62));

// ===========================================================================
// 1. Beranda KOSONG — inti keputusan desainnya
// ===========================================================================
console.log('\n1. Beranda saat belum ada transaksi');
const tokenKosong = await pedagangBaru('Warung Kosong');
const rugiKosong = await panggil('/onboarding/resep', {
  method: 'POST', body: JSON.stringify(KRIPIK),
}, tokenKosong);

const kosong = await panggil('/beranda', {}, tokenKosong);
console.log(`   omzet ${rupiah(kosong.omzet)}, untung ${rupiah(kosong.untung_bersih)}`);
console.log(`   produk paling merugi: ${kosong.produk_paling_merugi?.nama ?? '—'}`);
periksa('ada_transaksi false', kosong.ada_transaksi, false);
periksa('omzet nol', kosong.omzet, 0);
periksa('untung nol', kosong.untung_bersih, 0);
// Inilah keputusannya: temuan produk tetap tampil meski belum ada penjualan
periksa('produk merugi TETAP terhitung', kosong.jumlah_produk_merugi, 1);
periksa('produk paling merugi terisi', kosong.produk_paling_merugi?.nama, 'Kripik Pisang');
periksa('marginnya benar', kosong.produk_paling_merugi?.margin_per_unit, -1200);

// ===========================================================================
// 2. Ketik manual — banyak baris sekaligus
// ===========================================================================
console.log('\n2. Catat penjualan sekaligus');
const token = await pedagangBaru('Warung Bu Sari');
const kripik = await panggil('/onboarding/resep', { method: 'POST', body: JSON.stringify(KRIPIK) }, token);
const kacang = await panggil('/onboarding/resep', { method: 'POST', body: JSON.stringify(KACANG) }, token);
console.log(`   ${kripik.nama}: modal ${rupiah(kripik.modal_per_unit)}, jual ${rupiah(kripik.harga_jual)}`);
console.log(`   ${kacang.nama}: modal ${rupiah(kacang.modal_per_unit)}, jual ${rupiah(kacang.harga_jual)}`);
periksa('modal kacang', kacang.modal_per_unit, 2000);

const dicatat = await panggil('/transaksi', {
  method: 'POST',
  body: JSON.stringify({
    tanggal: new Date().toISOString().slice(0, 10),
    baris: [
      { produk_id: kripik.produk_id, jumlah: 10 },                        // pakai harga tersimpan
      { produk_id: kacang.produk_id, jumlah: 20, harga_satuan: 5000 },    // harga disebut
    ],
  }),
}, token);
periksa('dua baris tersimpan', dicatat.tersimpan, 2);

// ===========================================================================
// 3. Beranda — angka HARUS sama dengan hitungan tangan
// ===========================================================================
//   omzet  = 10 x 20.000  +  20 x 5.000            = 200.000 + 100.000 = 300.000
//   untung = 10 x (20.000 - 21.200) + 20 x (5.000 - 2.000)
//          = -12.000 + 60.000                                          =  48.000
console.log('\n3. Beranda setelah ada penjualan');
const b = await panggil('/beranda', {}, token);
console.log(`   Omzet          ${rupiah(b.omzet)}`);
console.log(`   Untung bersih  ${rupiah(b.untung_bersih)}`);
periksa('omzet = hitungan tangan', b.omzet, 300000);
periksa('untung bersih = hitungan tangan', b.untung_bersih, 48000);
periksa('ada_transaksi true', b.ada_transaksi, true);
periksa('tidak ada baris tanpa modal', b.baris_tanpa_modal, 0);
periksa('satu produk merugi', b.jumlah_produk_merugi, 1);
periksa('yang merugi Kripik Pisang', b.produk_paling_merugi?.nama, 'Kripik Pisang');

// ===========================================================================
// 4. Batal sebagian TIDAK BOLEH terjadi
// ===========================================================================
console.log('\n4. Batch dengan satu baris tidak sah');
const sebelum = (await panggil('/beranda', {}, token)).omzet;
let ditolak = false;
try {
  await panggil('/transaksi', {
    method: 'POST',
    body: JSON.stringify({
      baris: [
        { produk_id: kripik.produk_id, jumlah: 5 },   // sah
        { produk_id: 999999, jumlah: 3 },             // milik orang lain / tidak ada
      ],
    }),
  }, token);
} catch { ditolak = true; }
const sesudah = (await panggil('/beranda', {}, token)).omzet;
periksa('permintaan ditolak', ditolak, true);
periksa('omzet TIDAK berubah (tidak ada yang tersimpan)', sesudah, sebelum);

// ===========================================================================
// 5. Isolasi antar pengguna
// ===========================================================================
console.log('\n5. Produk pedagang lain tidak bisa dipakai');
let tolakMilikOrangLain = false;
try {
  await panggil('/transaksi', {
    method: 'POST',
    body: JSON.stringify({ baris: [{ produk_id: rugiKosong.produk_id, jumlah: 1 }] }),
  }, token);
} catch { tolakMilikOrangLain = true; }
periksa('produk milik pedagang lain ditolak', tolakMilikOrangLain, true);

// ===========================================================================
// 6. Daftar transaksi
// ===========================================================================
console.log('\n6. GET /transaksi');
const daftar = await panggil('/transaksi', {}, token);
periksa('dua transaksi terdaftar', daftar.length, 2);
periksa('nama produk ikut', typeof daftar[0]?.nama_produk, 'string');

console.log('\n' + '='.repeat(62));
if (gagal === 0) {
  console.log('SEMUA LOLOS — angka Beranda persis sama dengan hitungan tangan.');
} else {
  console.log(`${gagal} PEMERIKSAAN GAGAL.`);
  process.exit(1);
}

/*
 * TIDAK diuji di sini, dan sengaja tidak dipalsukan:
 *
 *   baris_tanpa_modal > 0 — transaksi atas produk yang modalnya tidak
 *   diketahui. Belum bisa dicapai lewat API, karena satu-satunya cara
 *   membuat produk saat ini adalah /onboarding/resep yang selalu mengisi
 *   resep dan hasil_per_batch. Jalur ini akan terjangkau begitu fitur 10
 *   (tambah produk tanpa form) ada. Query-nya sudah ditulis benar dengan
 *   LEFT JOIN + FILTER supaya siap saat itu tiba.
 */
