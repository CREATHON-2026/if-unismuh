/**
 * Uji fitur 2 — kalimat bebas (hasil transkripsi suara) jadi usulan transaksi.
 *
 * Yang paling penting dibuktikan di sini bukan ekstraksinya, tapi ATURAN #2:
 * endpoint ini MENGUSULKAN, tidak menyimpan. Kalau ia diam-diam menyimpan,
 * seluruh janji "tidak ada yang tersimpan diam-diam" runtuh — dan itu
 * pertanyaan yang akan ditanyakan juri.
 *
 *   node scripts/uji-suara.mjs
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
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
  });
  const body = await res.json();
  if (!body.ok) throw new Error(`${jalan} -> ${body.error.kode}: ${body.error.pesan}`);
  return body.data;
}

const rupiah = (n) => (n == null ? '—' : 'Rp ' + n.toLocaleString('id-ID'));
const NOMOR = '08' + String(Date.now()).slice(-10);

console.log('UJI CATATAN SUARA -> USULAN TRANSAKSI (fitur 2)');
console.log('='.repeat(64));

// --- Siapkan dua produk ------------------------------------------------------
const { token } = await panggil('/auth/otp/verifikasi', {
  method: 'POST', body: JSON.stringify({ nomor_hp: NOMOR, kode: '123456' }),
});
await panggil('/onboarding/usaha', {
  method: 'POST', body: JSON.stringify({ nama_usaha: 'Warung Bu Sari', jenis_usaha: 'makanan' }),
}, token);

const kripik = await panggil('/onboarding/resep', {
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
const kacang = await panggil('/onboarding/resep', {
  method: 'POST',
  body: JSON.stringify({
    nama_produk: 'Kacang Telur', hasil_per_batch: 50, harga_jual: 5000,
    bahan: [{ nama: 'kacang tanah', satuan: 'kg', jumlah: 10, harga_beli: 100000, jumlah_beli: 10 }],
  }),
}, token);
console.log(`\nSiap: ${kripik.nama} (${rupiah(kripik.harga_jual)}) dan ${kacang.nama} (${rupiah(kacang.harga_jual)})`);

// ===========================================================================
// 1. Satu kalimat, dua produk
// ===========================================================================
console.log('\n1. "hari ini laku 10 kripik pisang sama 5 kacang telur"');
const usulan = await panggil('/transaksi/dari-teks', {
  method: 'POST',
  body: JSON.stringify({ teks: 'hari ini laku 10 kripik pisang sama 5 kacang telur' }),
}, token);

for (const b of usulan.baris) {
  console.log(`   "${b.nama_mentah}" x${b.jumlah} -> ${b.nama_produk ?? '(belum cocok)'}` +
    `${b.perlu_dicek ? '  [PERLU DICEK]' : ''}`);
}
periksa('dua baris diusulkan', usulan.baris.length, 2);
periksaBenar('kripik tercocokkan',
  usulan.baris.some((b) => b.nama_produk === 'Kripik Pisang' && b.jumlah === 10));
periksaBenar('kacang tercocokkan',
  usulan.baris.some((b) => b.nama_produk === 'Kacang Telur' && b.jumlah === 5));

// ===========================================================================
// 2. ★ ATURAN #2 — mengusulkan, TIDAK menyimpan
// ===========================================================================
console.log('\n2. Aturan #2: belum boleh ada yang tersimpan');
const berandaSesudah = await panggil('/beranda', {}, token);
periksa('omzet masih nol', berandaSesudah.omzet, 0);
periksa('belum ada transaksi', berandaSesudah.ada_transaksi, false);
periksa('daftar transaksi masih kosong', (await panggil('/transaksi', {}, token)).length, 0);

// ===========================================================================
// 3. Bentuknya harus langsung cocok untuk POST /transaksi
// ===========================================================================
console.log('\n3. Usulan dikirim apa adanya ke POST /transaksi');
const siapSimpan = usulan.baris
  .filter((b) => b.produk_id && !b.perlu_dicek)
  .map((b) => ({ produk_id: b.produk_id, jumlah: b.jumlah,
                 ...(b.harga_satuan != null ? { harga_satuan: b.harga_satuan } : {}) }));
const disimpan = await panggil('/transaksi', {
  method: 'POST', body: JSON.stringify({ tanggal: usulan.tanggal, baris: siapSimpan }),
}, token);
periksa('tersimpan setelah dikonfirmasi', disimpan.tersimpan, siapSimpan.length);

// 10 x 20.000 + 5 x 5.000 = 225.000
const b2 = await panggil('/beranda', {}, token);
console.log(`   Omzet sekarang ${rupiah(b2.omzet)}`);
periksa('omzet = hitungan tangan', b2.omzet, 225000);

// ===========================================================================
// 4. Nama yang meragukan ditandai, bukan ditebak
// ===========================================================================
console.log('\n4. "laku 3 kripik" — nama tidak lengkap');
const ragu = await panggil('/transaksi/dari-teks', {
  method: 'POST', body: JSON.stringify({ teks: 'laku 3 kripik' }),
}, token);
const barisRagu = ragu.baris[0];
console.log(`   "${barisRagu?.nama_mentah}" -> perlu_dicek: ${barisRagu?.perlu_dicek}` +
  ` | kandidat: ${barisRagu?.kandidat.map((k) => k.nama).join(', ') || '-'}`);
periksaBenar('ditandai perlu dicek', barisRagu?.perlu_dicek === true);
periksaBenar('kandidat disodorkan, bukan ditebak', (barisRagu?.kandidat.length ?? 0) > 0);

// ===========================================================================
// 5. Bug bentuk data tidak boleh kambuh
// ===========================================================================
console.log('\n5. Kalimat tanpa jumlah dan tanpa harga');
const tanpa = await panggil('/transaksi/dari-teks', {
  method: 'POST', body: JSON.stringify({ teks: 'tadi ada yang beli kripik pisang' }),
}, token);
const b5 = tanpa.baris[0];
console.log(`   jumlah: ${JSON.stringify(b5?.jumlah)} | harga_satuan: ${JSON.stringify(b5?.harga_satuan)}`);
periksaBenar('harga_satuan null, bukan 0',
  b5 === undefined || b5.harga_satuan === null);
periksaBenar('jumlah null atau angka wajar, bukan 0',
  b5 === undefined || b5.jumlah === null || b5.jumlah > 0);

// ===========================================================================
// 6. Teks kosong ditolak
// ===========================================================================
console.log('\n6. Teks kosong');
let ditolak = false;
try {
  await panggil('/transaksi/dari-teks', { method: 'POST', body: JSON.stringify({ teks: '  ' }) }, token);
} catch { ditolak = true; }
periksa('teks kosong ditolak', ditolak, true);

console.log('\n' + '='.repeat(64));
if (gagal === 0) {
  console.log('SEMUA LOLOS — mengusulkan, tidak menyimpan. Aturan #2 utuh.');
} else {
  console.log(`${gagal} PEMERIKSAAN GAGAL.`);
  process.exit(1);
}
