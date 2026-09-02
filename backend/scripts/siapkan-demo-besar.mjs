/**
 * Akun demo BESAR — warung yang sudah lama jalan, bukan yang baru mulai.
 *
 *   node scripts/siapkan-demo-besar.mjs      (atau: npm run demo:besar)
 *
 * Bedanya dengan siapkan-demo.mjs: yang itu sengaja kecil dan angkanya tetap
 * (omzet 4.200.000, untung 268.000) supaya bisa dihafal saat gugup di panggung.
 * Yang ini kebalikannya — delapan produk, tiga bulan penjualan harian yang
 * naik-turun, dan pesanan yang sudah melewati seluruh tahapnya. Gunanya untuk
 * melihat apakah tiap layar masih terbaca saat datanya banyak, bukan saat
 * datanya tiga baris.
 *
 * Kedua skrip memakai akun berbeda, jadi menjalankan yang ini tidak mengubah
 * angka yang sudah dihafal untuk demo.
 *
 * Sama seperti skrip lama, semuanya masuk LEWAT HTTP, bukan INSERT langsung:
 * data yang lolos validasi yang sama dengan pengguna asli tidak akan pernah
 * menciptakan keadaan yang aplikasinya sendiri tidak bisa hasilkan. Dan skrip
 * ini TIDAK menghitung apa pun untuk ditampilkan — ia memasukkan jumlah unit,
 * lalu membaca omzet dan untung dari GET /beranda, yaitu dari SQL. Aturan #1
 * berlaku untuk skrip demo sama seperti untuk kode produksi.
 */

const DASAR = process.env.API ?? 'http://localhost:3000';

/** Nomor tetap, supaya tidak perlu diingat saat gugup. OTP selalu 123456. */
const AKUN = '081200000003';

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

const masuk = (nomor) => panggil('/auth/otp/verifikasi', {
  method: 'POST', body: JSON.stringify({ nomor_hp: nomor, kode: '123456' }),
});

const rupiah = (n) => (n == null ? '—' : 'Rp ' + n.toLocaleString('id-ID'));
const tgl = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Acak yang SELALU sama tiap dijalankan.
 *
 * Penjualan harian yang rata membuat grafik Rekap jadi garis lurus, dan garis
 * lurus tidak membuktikan apa pun tentang layarnya. Tapi acak yang berubah tiap
 * run juga salah: angka di layar ikut berubah tiap kali disiapkan ulang, dan
 * tidak ada yang bisa dihafal maupun diperiksa. Jadi acaknya berbenih tetap.
 */
function acakBerbenih(benih) {
  let s = benih;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// ===========================================================================
// Bahan — harga satuan ditulis SEKALI di sini
//
// Bahan dengan nama sama dipakai ulang lintas resep, dan harga yang berbeda
// akan diam-diam kalah oleh resep yang dimasukkan lebih dulu. Skrip demo lama
// menuliskan harga di tiap resep dan harus menjaganya cocok secara manual;
// di sini sumbernya satu, jadi tidak bisa meleset.
// ===========================================================================
const BAHAN = {
  pisang:         { satuan: 'kg',      harga: 15000 },
  singkong:       { satuan: 'kg',      harga: 6000 },
  minyak:         { satuan: 'liter',   harga: 18000 },
  gula:           { satuan: 'kg',      harga: 15000 },
  gas:            { satuan: 'tabung',  harga: 200000 },
  kemasan:        { satuan: 'buah',    harga: 450 },
  'kacang tanah': { satuan: 'kg',      harga: 10000 },
  terigu:         { satuan: 'kg',      harga: 12000 },
  telur:          { satuan: 'kg',      harga: 28000 },
  mentega:        { satuan: 'kg',      harga: 22000 },
  ragi:           { satuan: 'bungkus', harga: 14000 },
  teh:            { satuan: 'kotak',   harga: 30000 },
  'es batu':      { satuan: 'balok',   harga: 3000 },
  beras:          { satuan: 'kg',      harga: 13000 },
  ayam:           { satuan: 'kg',      harga: 38000 },
  santan:         { satuan: 'liter',   harga: 12000 },
  kopi:           { satuan: 'kg',      harga: 90000 },
  'susu kental':  { satuan: 'kaleng',  harga: 12000 },
  wortel:         { satuan: 'kg',      harga: 8000 },
  'kulit lumpia': { satuan: 'bungkus', harga: 9000 },
};

/** Ubah {nama: jumlah} jadi bentuk yang diterima POST /onboarding/resep. */
const resep = (pakai) => Object.entries(pakai).map(([nama, jumlah]) => ({
  nama,
  satuan: BAHAN[nama].satuan,
  jumlah,
  harga_beli: BAHAN[nama].harga,
  jumlah_beli: 1,
}));

// ===========================================================================
// Produk
//
// Sengaja beragam, karena yang diuji adalah apakah layarnya masih terbaca saat
// isinya bermacam-macam: dua produk merugi (satu tipis, satu dalam), beberapa
// untung besar, beberapa tipis, dan satu TANPA RESEP sama sekali — yang
// terakhir itu yang membuktikan aplikasi menampilkan "modal belum diisi"
// alih-alih mengaku tahu.
// ===========================================================================
const PRODUK = [
  { nama_produk: 'Kripik Pisang', hasil_per_batch: 40, harga_jual: 20000,
    bahan: resep({ pisang: 20, minyak: 10, gula: 10, gas: 1, kemasan: 40 }) },

  { nama_produk: 'Bakwan Sayur', hasil_per_batch: 60, harga_jual: 2000,
    bahan: resep({ terigu: 5, wortel: 3, minyak: 3, telur: 1 }) },

  { nama_produk: 'Kacang Telur', hasil_per_batch: 50, harga_jual: 5000,
    bahan: resep({ 'kacang tanah': 10 }) },

  { nama_produk: 'Donat Gula', hasil_per_batch: 100, harga_jual: 3500,
    bahan: resep({ terigu: 10, gula: 4, telur: 1, mentega: 1, minyak: 2, ragi: 1 }) },

  { nama_produk: 'Es Teh Manis', hasil_per_batch: 80, harga_jual: 3000,
    bahan: resep({ teh: 1, gula: 3, 'es batu': 4 }) },

  { nama_produk: 'Nasi Kuning', hasil_per_batch: 40, harga_jual: 12000,
    bahan: resep({ beras: 8, ayam: 3, santan: 2, gas: 1 }) },

  { nama_produk: 'Kopi Susu', hasil_per_batch: 60, harga_jual: 6000,
    bahan: resep({ kopi: 1, 'susu kental': 6, gula: 2, 'es batu': 3 }) },

  { nama_produk: 'Risoles', hasil_per_batch: 50, harga_jual: 4000,
    bahan: resep({ 'kulit lumpia': 5, wortel: 2, ayam: 1, minyak: 2 }) },
];

/** Produk tanpa resep — modal, margin, dan merugi bernilai null (bukan nol). */
const PRODUK_TANPA_RESEP = { nama_produk: 'Keripik Singkong', harga_jual: 8000, bahan: [] };

/**
 * Stok bahan.
 *
 * Pisang sengaja pas-pasan supaya ada satu produk yang kapasitasnya membatasi
 * — itu yang membuat peringatan "bahan cuma cukup untuk sekian" muncul saat
 * memproses pesanan. Sisanya longgar supaya pisang yang jadi pembatas.
 *
 * Semua bahan HARUS ada di sini: v_kapasitas_produk mengembalikan NULL kalau
 * ada satu saja bahan yang stoknya belum dicatat.
 */
const STOK_LONGGAR = 60;
const STOK_KHUSUS = { pisang: 9, gas: 3, kemasan: 400, 'es batu': 30 };

console.log('SIAPKAN AKUN DEMO BESAR');
console.log('='.repeat(66));

const { token } = await masuk(AKUN);

const sudahAda = await panggil('/produk', {}, token);
if (sudahAda.length > 0) {
  console.log('');
  console.log(`Akun ${AKUN} SUDAH terisi (${sudahAda.length} produk).`);
  console.log('Tidak ada yang diubah — menjalankan ulang akan menggandakan produk.');
  console.log('');
  console.log('Kalau mau menyiapkan dari nol:');
  console.log('  1. hentikan server dengan Ctrl+C (jangan dimatikan paksa)');
  console.log('  2. hapus folder backend/db/data');
  console.log('  3. npm run dev, lalu jalankan skrip ini lagi');
  process.exit(0);
}

await panggil('/onboarding/usaha', {
  method: 'POST',
  body: JSON.stringify({ nama_usaha: 'Warung Bu Sari Jaya', jenis_usaha: 'makanan' }),
}, token);
console.log('\n1. Usaha  : Warung Bu Sari Jaya');

// --- Produk ---------------------------------------------------------------
const idProduk = {};
console.log('\n2. Produk');
for (const p of PRODUK) {
  const t = await panggil('/onboarding/resep', { method: 'POST', body: JSON.stringify(p) }, token);
  idProduk[p.nama_produk] = t.produk_id;
  console.log(`   ${p.nama_produk.padEnd(16)} modal ${rupiah(t.modal_per_unit).padEnd(10)}`
    + ` jual ${rupiah(t.harga_jual).padEnd(10)} margin ${rupiah(t.margin_per_unit).padEnd(10)}`
    + `${t.merugi ? ' [MERUGI]' : ''}`);
}
const tanpaResep = await panggil('/produk', {
  method: 'POST', body: JSON.stringify(PRODUK_TANPA_RESEP),
}, token);
idProduk[PRODUK_TANPA_RESEP.nama_produk] = tanpaResep.produk_id;
console.log(`   ${PRODUK_TANPA_RESEP.nama_produk.padEnd(16)} modal ${String(tanpaResep.modal_per_unit).padEnd(16)}`
  + ` margin ${String(tanpaResep.margin_per_unit).padEnd(11)} [RESEP BELUM DIISI]`);

// --- Stok -----------------------------------------------------------------
const daftarBahan = await panggil('/stok', {}, token);
const barisStok = daftarBahan.map((b) => ({
  bahan_id: b.bahan_id,
  jumlah: STOK_KHUSUS[b.nama.toLowerCase()] ?? STOK_LONGGAR,
}));
await panggil('/stok', { method: 'POST', body: JSON.stringify({ baris: barisStok }) }, token);
console.log(`\n3. Stok   : ${barisStok.length} bahan dicatat (pisang sengaja 9 kg)`);

// ===========================================================================
// 4. Penjualan — tiga bulan, harian, naik-turun
//
// Beranda memakai date_trunc bulan berjalan sebagai batas bawah bawaannya,
// jadi penjualan bulan ini HARUS bertanggal di bulan ini. Tanggalnya dihitung
// relatif terhadap hari ini supaya skrip tetap benar kapan pun dijalankan.
// ===========================================================================
const hariIni = new Date();
const acak = acakBerbenih(20260902);

/** Berapa unit produk ini terjual pada satu hari. Nol berarti hari itu sepi. */
function unitHarian(dasar, pengali) {
  const goyang = 0.45 + acak() * 1.3;            // 0,45x sampai 1,75x
  const sepi = acak() < 0.08 ? 0 : 1;            // sesekali benar-benar kosong
  return Math.max(0, Math.round(dasar * pengali * goyang) * sepi);
}

/**
 * Rata-rata unit per hari per produk. Kripik Pisang paling laku SEKALIGUS
 * paling merugi — itu inti tesis produk ini, dan harus terlihat dari datanya
 * sendiri, bukan dari cerita.
 */
const LAJU = {
  'Kripik Pisang': 9, 'Es Teh Manis': 8, 'Donat Gula': 7, 'Kacang Telur': 5,
  'Kopi Susu': 4, Risoles: 4, 'Bakwan Sayur': 6, 'Nasi Kuning': 3,
  'Keripik Singkong': 2,
};

/** Bulan lalu sedikit lebih sepi; dua bulan lalu lebih sepi lagi. */
const PENGALI_BULAN = [1, 0.85, 0.7];

const kelompok = [];
for (let mundur = 0; mundur < 3; mundur++) {
  const awal = new Date(hariIni.getFullYear(), hariIni.getMonth() - mundur, 1);
  const hariTerakhir = mundur === 0
    ? hariIni.getDate()
    : new Date(awal.getFullYear(), awal.getMonth() + 1, 0).getDate();

  for (let d = 1; d <= hariTerakhir; d++) {
    const baris = [];
    for (const [nama, dasar] of Object.entries(LAJU)) {
      const jumlah = unitHarian(dasar, PENGALI_BULAN[mundur]);
      if (jumlah > 0) baris.push({ produk_id: idProduk[nama], jumlah });
    }
    if (baris.length > 0) {
      kelompok.push({ tanggal: tgl(new Date(awal.getFullYear(), awal.getMonth(), d)), baris });
    }
  }
}

let barisTersimpan = 0;
for (const k of kelompok) {
  const { tersimpan } = await panggil('/transaksi', { method: 'POST', body: JSON.stringify(k) }, token);
  barisTersimpan += Array.isArray(tersimpan) ? tersimpan.length : tersimpan;
}
console.log(`\n4. Penjualan: ${barisTersimpan} baris di ${kelompok.length} hari`);
console.log(`   ${kelompok[0].tanggal} s/d ${kelompok.at(-1).tanggal}`);

// ===========================================================================
// 5. Pesanan — melewati seluruh tahapnya, bukan cuma dibuat
//
// `pesan_id: null` sah menurut kontrak: pesanan bisa lahir dari pembeli yang
// datang langsung, tanpa chat. Itu juga yang membuat langkah ini TIDAK
// bergantung pada LLM — kalau Ollama kampus sedang bermasalah, akun demo tetap
// jadi. Pesanan yang lahir dari chat diuji terpisah di uji-pesanan.mjs.
// ===========================================================================
const PESANAN = [
  { produk: 'Kripik Pisang', jumlah: 20, harga: 18000, cara: 'tunai',    akhir: 'selesai' },
  { produk: 'Donat Gula',    jumlah: 50, harga: 3500,  cara: 'transfer', akhir: 'selesai' },
  { produk: 'Es Teh Manis',  jumlah: 30, harga: 3000,  cara: 'tunai',    akhir: 'selesai' },
  { produk: 'Nasi Kuning',   jumlah: 15, harga: 12000, cara: 'transfer', akhir: 'selesai' },
  { produk: 'Kacang Telur',  jumlah: 40, harga: 5000,  cara: 'tunai',    akhir: 'selesai' },
  // Kasbon: sudah diserahkan, uangnya belum masuk. cara_bayar 'nanti' dengan
  // dibayar_pada NULL — inilah yang membuat ringkasan "belum dibayar" berisi.
  { produk: 'Risoles',       jumlah: 25, harga: 4000,  cara: 'nanti',    akhir: 'selesai' },
  { produk: 'Kopi Susu',     jumlah: 20, harga: 6000,  cara: 'nanti',    akhir: 'selesai' },
  // Sudah dibayar, barangnya belum diserahkan.
  { produk: 'Donat Gula',    jumlah: 30, harga: 3500,  cara: 'tunai',    akhir: 'diproses' },
  { produk: 'Bakwan Sayur',  jumlah: 60, harga: 2000,  cara: 'transfer', akhir: 'diproses' },
  // Belum dibayar sama sekali.
  { produk: 'Kripik Pisang', jumlah: 10, harga: 20000, cara: null,       akhir: 'menunggu_bayar' },
  { produk: 'Es Teh Manis',  jumlah: 12, harga: 3000,  cara: null,       akhir: 'menunggu_bayar' },
  // Batal — tidak boleh menyentuh buku besar sama sekali.
  { produk: 'Nasi Kuning',   jumlah: 8,  harga: 12000, cara: null,       akhir: 'batal' },
];

const jumlahAkhir = {};
for (const p of PESANAN) {
  const dibuat = await panggil('/proses', {
    method: 'POST',
    body: JSON.stringify({
      pesan_id: null, produk_id: idProduk[p.produk], jumlah: p.jumlah, harga_satuan: p.harga,
    }),
  }, token);

  if (p.akhir === 'batal') {
    await panggil(`/proses/${dibuat.id}/batal`, {
      method: 'POST', body: JSON.stringify({ alasan: 'Pembeli berubah pikiran' }),
    }, token);
  } else if (p.cara) {
    await panggil(`/proses/${dibuat.id}/bayar`, {
      method: 'POST', body: JSON.stringify({ cara: p.cara }),
    }, token);
    if (p.akhir === 'selesai') {
      await panggil(`/proses/${dibuat.id}/selesai`, { method: 'POST', body: '{}' }, token);
    }
  }
  jumlahAkhir[p.akhir] = (jumlahAkhir[p.akhir] ?? 0) + 1;
}
console.log(`\n5. Pesanan: ${PESANAN.length} dibuat — `
  + Object.entries(jumlahAkhir).map(([k, v]) => `${v} ${k}`).join(', '));

// ===========================================================================
// Yang akan dilihat juri — semuanya dibaca dari SQL, bukan dihitung di sini
// ===========================================================================
const [beranda, produk, rekap, riwayat] = await Promise.all([
  panggil('/beranda', {}, token),
  panggil('/produk', {}, token),
  panggil('/rekap', {}, token),
  panggil('/proses', {}, token),
]);

console.log('\n' + '='.repeat(66));
console.log('BERANDA (bulan berjalan, dari GET /beranda)');
console.log(`   Omzet         ${rupiah(beranda.omzet)}`);
console.log(`   Untung bersih ${rupiah(beranda.untung_bersih)}`);
console.log(`   Belum bermodal ${beranda.baris_tanpa_modal} baris (produk tanpa resep)`);
console.log(`   Produk merugi ${beranda.jumlah_produk_merugi}`
  + (beranda.produk_paling_merugi
    ? ` — ${beranda.produk_paling_merugi.nama} ${rupiah(beranda.produk_paling_merugi.margin_per_unit)}/unit`
    : ''));

console.log('\nREKAP 7 HARI (dari GET /rekap)');
console.log('   ' + rekap.hari.map((h) => `${h.label} ${Math.round(h.omzet / 1000)}rb`).join('  '));
console.log(`   Total omzet ${rupiah(rekap.omzet)}, untung ${rupiah(rekap.untung_bersih)}`);
if (rekap.produk_terlaris) {
  console.log(`   Terlaris: ${rekap.produk_terlaris.nama} (${rekap.produk_terlaris.jumlah_terjual} terjual)`);
}

console.log('\nPRODUK (urut margin terendah, dari GET /produk)');
for (const p of produk) {
  console.log(`   ${p.nama.padEnd(16)} margin ${String(p.margin_per_unit === null ? 'belum diisi' : rupiah(p.margin_per_unit)).padEnd(12)}`
    + `${p.merugi ? ' [MERUGI]' : ''}${p.terlaris ? ' [TERLARIS]' : ''}`);
}

console.log('\nRIWAYAT PESANAN (dari GET /proses)');
const r = riwayat.ringkasan;
console.log(`   total ${r.total} · selesai ${r.selesai} · diproses ${r.diproses}`
  + ` · menunggu bayar ${r.menunggu_bayar} · batal ${r.gagal}`);
console.log(`   belum dibayar ${r.belum_dibayar} pesanan · untung dari pesanan selesai ${rupiah(r.untung)}`);

console.log('\nMasuk dengan nomor di bawah, OTP selalu 123456:');
console.log(`   banyak data : ${AKUN}`);
