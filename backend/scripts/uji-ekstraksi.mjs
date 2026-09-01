/**
 * Uji modul /ekstraksi — bentuk yang dipakai layar konfirmasi frontend.
 *
 * Dua invariant yang paling berharga diuji di sini:
 *
 * 1. SUBTOTAL DAN TOTAL DATANG DARI SQL. Frontend punya layar yang menampilkan
 *    keduanya dan menghitung ulang setiap kali pengguna menyunting baris. Kalau
 *    angka itu boleh dihitung di browser, aturan #7 bocor lewat pintu belakang.
 * 2. TABEL `transaksi` TETAP KOSONG SAMPAI DIKONFIRMASI. Ini hasil AI, jadi
 *    aturan #2 berlaku penuh — tidak ada yang tersimpan diam-diam.
 *
 *   node scripts/uji-ekstraksi.mjs
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

/** modal 21.200, jual 20.000 */
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
/** modal 2.000, jual 5.000 */
const KACANG = {
  nama_produk: 'Kacang Telur', hasil_per_batch: 50, harga_jual: 5000,
  bahan: [{ nama: 'kacang tanah', satuan: 'kg', jumlah: 10, harga_beli: 100000, jumlah_beli: 10 }],
};

console.log('UJI EKSTRAKSI (bentuk layar konfirmasi)');
console.log('='.repeat(64));

const { token } = await panggil('/auth/otp/verifikasi', {
  method: 'POST', body: JSON.stringify({ nomor_hp: NOMOR, kode: '123456' }),
});
await panggil('/onboarding/usaha', {
  method: 'POST', body: JSON.stringify({ nama_usaha: 'Warung Uji', jenis_usaha: 'makanan' }),
}, token);
const kripik = await panggil('/onboarding/resep', { method: 'POST', body: JSON.stringify(KRIPIK) }, token);
const kacang = await panggil('/onboarding/resep', { method: 'POST', body: JSON.stringify(KACANG) }, token);

// ===========================================================================
// 1. Kalimat -> ekstraksi, dengan subtotal dan total dari SQL
// ===========================================================================
// Hitungan tangan: kripik 10 x 20.000 = 200.000
//                  kacang  5 x  5.000 =  25.000
//                  total_item 15, total_belanja 225.000
console.log('');
console.log('1. POST /ekstraksi/dari-teks');
const e = await panggil('/ekstraksi/dari-teks', {
  method: 'POST',
  body: JSON.stringify({ teks: 'hari ini laku 10 kripik pisang sama 5 kacang telur' }),
}, token);

for (const b of e.baris) {
  console.log(`   #${b.urutan} "${b.nama_mentah}" -> ${b.nama_produk ?? '(belum cocok)'}`
    + ` ${b.jumlah} x ${rupiah(b.harga_satuan)} = ${rupiah(b.subtotal)}`
    + ` yakin ${b.keyakinan.toFixed(2)}${b.perlu_dicek ? ' [DICEK]' : ''}`);
}
console.log(`   total_item ${e.total_item} · total_belanja ${rupiah(e.total_belanja)}`);

periksaBenar('punya ekstraksi_id', Number.isInteger(e.ekstraksi_id));
periksa('dua baris', e.baris.length, 2);
periksaBenar('urutan mulai dari 1', e.baris[0]?.urutan === 1 && e.baris[1]?.urutan === 2);

const barisKripik = e.baris.find((b) => b.produk_id === kripik.produk_id);
const barisKacang = e.baris.find((b) => b.produk_id === kacang.produk_id);
periksaBenar('kripik dikenali', barisKripik !== undefined);
periksaBenar('kacang dikenali', barisKacang !== undefined);

// ★ Harga tidak disebut di kalimat -> dipakai harga jual tersimpan, oleh SQL
periksa('harga kripik dari harga jual tersimpan', barisKripik?.harga_satuan, 20000);
periksa('subtotal kripik', barisKripik?.subtotal, 200000);
periksa('subtotal kacang', barisKacang?.subtotal, 25000);
periksa('total item', e.total_item, 15);
periksa('total belanja', e.total_belanja, 225000);
// Kalau ketiganya tidak konsisten, ada dua tempat yang menghitung berbeda
periksa('total = jumlah subtotal', e.baris[0].subtotal + e.baris[1].subtotal, e.total_belanja);

// ★ Aturan #2 — belum ada apa pun yang tersimpan
periksa('BELUM tersimpan — transaksi masih kosong',
  (await panggil('/transaksi', {}, token)).length, 0);

// ===========================================================================
// 2. Pengguna menyunting -> pratinjau menghitung ULANG di SQL
// ===========================================================================
// Kripik diubah jadi 12 -> 12 x 20.000 = 240.000, total 265.000, item 17
console.log('');
console.log('2. POST /ekstraksi/pratinjau setelah disunting');
const disunting = e.baris.map((b) => ({
  urutan: b.urutan,
  produk_id: b.produk_id,
  jumlah: b.produk_id === kripik.produk_id ? 12 : b.jumlah,
  harga_satuan: b.harga_satuan,
  tanggal: b.tanggal,
}));
const pra = await panggil('/ekstraksi/pratinjau', {
  method: 'POST', body: JSON.stringify({ baris: disunting }),
}, token);
console.log(`   total_item ${pra.total_item} · total_belanja ${rupiah(pra.total_belanja)}`);
for (const r of pra.baris) console.log(`   #${r.urutan} subtotal ${rupiah(r.subtotal)}`);

periksa('subtotal kripik ikut naik',
  pra.baris.find((r) => r.urutan === barisKripik.urutan)?.subtotal, 240000);
periksa('total item', pra.total_item, 17);
periksa('total belanja', pra.total_belanja, 265000);

// Harga dikosongkan -> SQL memakai harga jual tersimpan, bukan nol
console.log('');
console.log('2b. Harga dikosongkan pengguna');
const tanpaHarga = await panggil('/ekstraksi/pratinjau', {
  method: 'POST',
  body: JSON.stringify({
    baris: [{ urutan: 1, produk_id: kripik.produk_id, jumlah: 3, harga_satuan: null, tanggal: null }],
  }),
}, token);
periksa('dipakai harga jual tersimpan', tanpaHarga.total_belanja, 60000);

// ===========================================================================
// 3. Konfirmasi -> baru masuk transaksi
// ===========================================================================
console.log('');
console.log('3. POST /ekstraksi/konfirmasi');
const k = await panggil('/ekstraksi/konfirmasi', {
  method: 'POST',
  body: JSON.stringify({ ekstraksi_id: e.ekstraksi_id, baris: disunting }),
}, token);
console.log(`   tersimpan ${k.tersimpan}, berkas dihapus ${k.berkas_dihapus}`);

periksa('dua baris tersimpan', k.tersimpan, 2);
periksa('transaksi sekarang terisi', (await panggil('/transaksi', {}, token)).length, 2);

// Beranda harus ikut memakai angka yang sama — dihitung SQL dari baris yang masuk
const beranda = await panggil('/beranda', {}, token);
console.log(`   omzet ${rupiah(beranda.omzet)} · untung ${rupiah(beranda.untung_bersih)}`);
periksa('omzet = total yang dikonfirmasi', beranda.omzet, 265000);
// kripik 12 x (20.000-21.200) = -14.400 ; kacang 5 x (5.000-2.000) = +15.000
periksa('untung bersih cocok hitungan tangan', beranda.untung_bersih, 600);

// Ekstraksi yang sudah dikonfirmasi tidak boleh dikonfirmasi dua kali —
// kalau bisa, satu penjualan tercatat berkali-kali tanpa ada yang sadar.
let ditolak = false;
try {
  await panggil('/ekstraksi/konfirmasi', {
    method: 'POST', body: JSON.stringify({ ekstraksi_id: e.ekstraksi_id, baris: disunting }),
  }, token);
} catch { ditolak = true; }
periksa('konfirmasi kedua ditolak', ditolak, true);

// ===========================================================================
// 4. Isolasi antar pengguna
// ===========================================================================
console.log('');
console.log('4. Isolasi antar pengguna');
const lain = '08' + String(Date.now() + 13).slice(-10);
const { token: tokenLain } = await panggil('/auth/otp/verifikasi', {
  method: 'POST', body: JSON.stringify({ nomor_hp: lain, kode: '123456' }),
});
let ditolakLain = false;
try {
  await panggil('/ekstraksi/konfirmasi', {
    method: 'POST', body: JSON.stringify({ ekstraksi_id: e.ekstraksi_id, baris: disunting }),
  }, tokenLain);
} catch { ditolakLain = true; }
periksa('ekstraksi pedagang lain ditolak', ditolakLain, true);

console.log('');
console.log('='.repeat(64));
if (gagal === 0) {
  console.log('SEMUA LOLOS — subtotal dari SQL, dan tidak ada yang tersimpan diam-diam.');
} else {
  console.log(`${gagal} PEMERIKSAAN GAGAL.`);
  process.exit(1);
}
