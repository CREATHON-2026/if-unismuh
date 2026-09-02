/**
 * Uji Rekap (fitur 14) — grafik tren omzet vs untung.
 *
 * Yang dibuktikan skrip ini, tujuh hal yang kalau salah satu meleset grafiknya
 * berbohong tanpa terlihat:
 *
 *   1. `hari` SELALU berisi 7 titik, termasuk hari yang tidak ada penjualannya.
 *      Hari kosong bernilai 0, bukan hilang. Kalau ia hilang, grafiknya menarik
 *      garis lurus melewatinya dan hari sepi tampak seolah tidak pernah ada.
 *   2. Total Rekap SAMA PERSIS dengan total Beranda untuk rentang yang sama.
 *      Dua layar yang menyebut angka berbeda untuk minggu yang sama adalah
 *      kegagalan terburuk di produk ini — pedagang tidak punya cara tahu yang
 *      mana yang benar.
 *   3. Omzet menghitung SEMUA penjualan; untung hanya yang modalnya diketahui.
 *   4. untung_bersih boleh negatif, dan memang negatif untuk produk merugi.
 *   5. Pedagang baru: ada_transaksi false, tapi `hari` tetap 7 titik nol.
 *   6. produk_terlaris benar id/nama/jumlahnya, null saat belum ada penjualan.
 *   7. ?hari=14 memberi 14 titik; nilai di luar 1-31 ditolak.
 *
 *   node scripts/uji-rekap.mjs
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

const rupiah = (n) => (n == null ? '—' : 'Rp ' + n.toLocaleString('id-ID'));

/** Tanggal N hari lalu, YYYY-MM-DD. Skrip uji boleh berhitung; produknya tidak. */
function hariLalu(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const nomorBaru = () => '08' + String(Date.now() + Math.floor(Math.random() * 1000)).slice(-10);

console.log('UJI REKAP (fitur 14)');
console.log('='.repeat(64));

// --- Pedagang BARU, belum punya apa-apa -------------------------------------
console.log('\n5. Pedagang baru — grafik kosong tapi tetap 7 titik');

const kosong = await panggil('/auth/otp/verifikasi', {
  method: 'POST', body: JSON.stringify({ nomor_hp: nomorBaru(), kode: '123456' }),
});
await panggil('/onboarding/usaha', {
  method: 'POST', body: JSON.stringify({ nama_usaha: 'Warung Kosong', jenis_usaha: 'makanan' }),
}, kosong.token);

const rKosong = await panggil('/rekap', {}, kosong.token);
periksa('ada_transaksi', rKosong.ada_transaksi, false);
periksa('tetap 7 titik', rKosong.hari.length, 7);
benar('semua titik nol', rKosong.hari.every((h) => h.omzet === 0 && h.untung_bersih === 0));
periksa('produk_terlaris null', rKosong.produk_terlaris, null);
benar('label terisi semua', rKosong.hari.every((h) => typeof h.label === 'string' && h.label.length > 0),
  rKosong.hari.map((h) => h.label).join(' '));

// --- Pedagang dengan data ---------------------------------------------------
const { token } = await panggil('/auth/otp/verifikasi', {
  method: 'POST', body: JSON.stringify({ nomor_hp: nomorBaru(), kode: '123456' }),
});
await panggil('/onboarding/usaha', {
  method: 'POST', body: JSON.stringify({ nama_usaha: 'Warung Bu Sari', jenis_usaha: 'makanan' }),
}, token);

// Produk MERUGI: modal 21.200, dijual 20.000.
const merugi = await panggil('/onboarding/resep', {
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

// Produk TANPA RESEP — modalnya tidak diketahui, jadi tidak boleh ikut untung.
const tanpaResep = await panggil('/produk', {
  method: 'POST',
  body: JSON.stringify({ nama_produk: 'Es Teh', harga_jual: 5000, bahan: [] }),
}, token);

// Penjualan sengaja diberi LUBANG: hari ini dan 3 hari lalu saja. Hari di
// antaranya harus tetap muncul bernilai nol — itu pemeriksaan nomor 1.
await panggil('/transaksi', {
  method: 'POST',
  body: JSON.stringify({
    tanggal: hariLalu(0),
    baris: [{ produk_id: merugi.produk_id, jumlah: 10 }],
  }),
}, token);
await panggil('/transaksi', {
  method: 'POST',
  body: JSON.stringify({
    tanggal: hariLalu(3),
    baris: [
      { produk_id: merugi.produk_id, jumlah: 5 },
      { produk_id: tanpaResep.produk_id, jumlah: 20 },
    ],
  }),
}, token);

const r = await panggil('/rekap', {}, token);

console.log('\n1. Hari kosong tetap muncul');
periksa('jumlah titik', r.hari.length, 7);
const berisi = r.hari.filter((h) => h.omzet > 0).length;
periksa('hari yang ada penjualannya', berisi, 2);
periksa('hari kosong', r.hari.length - berisi, 5);
benar('urut dari lama ke hari ini — titik terakhir ada isinya',
  r.hari[r.hari.length - 1].omzet > 0,
  r.hari.map((h) => `${h.label}:${h.omzet}`).join(' '));

console.log('\n3. Omzet menghitung semua, untung hanya yang bermodal');
// Es Teh 20 x 5.000 = 100.000 masuk omzet, tapi TIDAK punya modal.
// Kripik 15 x 20.000 = 300.000 masuk omzet, untungnya 15 x (-1.200) = -18.000.
periksa('omzet total', r.omzet, 400000);
periksa('untung total', r.untung_bersih, -18000);
console.log(`     omzet ${rupiah(r.omzet)}, untung ${rupiah(r.untung_bersih)}`);

console.log('\n4. Untung boleh negatif');
benar('untung negatif untuk produk merugi', r.untung_bersih < 0);
const hariIni = r.hari[r.hari.length - 1];
benar('titik hari ini juga negatif', hariIni.untung_bersih < 0,
  `${hariIni.label}: omzet ${rupiah(hariIni.omzet)}, untung ${rupiah(hariIni.untung_bersih)}`);

console.log('\n2. Rekap dan Beranda tidak boleh berbeda');
const b = await panggil(`/beranda?dari=${hariLalu(6)}&sampai=${hariLalu(0)}`, {}, token);
periksa('omzet sama dengan Beranda', r.omzet, b.omzet);
periksa('untung sama dengan Beranda', r.untung_bersih, b.untung_bersih);
periksa('ada_transaksi sama', r.ada_transaksi, b.ada_transaksi);

console.log('\n6. Produk terlaris');
benar('terisi', r.produk_terlaris !== null);
if (r.produk_terlaris) {
  // Es Teh 20 lawan Kripik 15 — yang menang jumlah unit, bukan nilai rupiah.
  periksa('nama', r.produk_terlaris.nama, 'Es Teh');
  periksa('jumlah terjual', r.produk_terlaris.jumlah_terjual, 20);
  periksa('id benar', r.produk_terlaris.id, tanpaResep.produk_id);
}

console.log('\n7. Parameter hari');
const r14 = await panggil('/rekap?hari=14', {}, token);
periksa('?hari=14 memberi 14 titik', r14.hari.length, 14);
benar('rentang lebih panjang tidak mengecilkan omzet', r14.omzet >= r.omzet,
  `${rupiah(r14.omzet)} vs ${rupiah(r.omzet)}`);

const rSalah = await coba('/rekap?hari=99', {}, token);
benar('?hari=99 ditolak', rSalah.ok === false,
  rSalah.ok ? 'JUSTRU DITERIMA' : `${rSalah.error.kode}: ${rSalah.error.pesan}`);
const rNol = await coba('/rekap?hari=0', {}, token);
benar('?hari=0 ditolak', rNol.ok === false,
  rNol.ok ? 'JUSTRU DITERIMA' : rNol.error.kode);

console.log('\n' + '='.repeat(64));
console.log(gagal === 0 ? 'SEMUA LOLOS' : `${gagal} PEMERIKSAAN GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
