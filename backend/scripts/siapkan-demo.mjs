/**
 * Siapkan dua akun demo — dijalankan sekali sebelum tampil di depan juri.
 *
 *   node scripts/siapkan-demo.mjs
 *
 * Kenapa lewat HTTP dan bukan INSERT langsung: data yang masuk lewat validasi
 * yang sama dengan pengguna asli tidak akan pernah menciptakan keadaan yang
 * aplikasinya sendiri tidak bisa hasilkan. Seed yang menyelundup lewat SQL
 * bisa menyembunyikan bug yang baru muncul di panggung.
 *
 * Skrip ini juga TIDAK menghitung apa pun untuk ditampilkan. Ia memasukkan
 * jumlah unit, lalu membaca omzet dan untung dari GET /beranda — yaitu dari
 * SQL. Aturan #1 berlaku untuk skrip demo sama seperti untuk kode produksi.
 */

const DASAR = process.env.API ?? 'http://localhost:3000';

/** Nomor tetap, supaya tidak perlu diingat saat gugup. OTP selalu 123456. */
const AKUN_TERISI = '081200000001';
const AKUN_KOSONG = '081200000002';

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

// ===========================================================================
// Produk
// ===========================================================================

/**
 * Resep Kripik Pisang dan Kacang Telur disalin dari scripts/uji-produk.mjs —
 * angkanya sudah terverifikasi menghasilkan modal 21.200 dan 2.000, jadi tidak
 * ada rumus baru yang perlu dipercaya di sini.
 *
 * Harga per satuan bahan yang muncul di dua resep sengaja dibuat SAMA
 * (minyak 18.000/liter, gula 15.000/kg). Bahan dengan nama sama dipakai ulang
 * oleh simpanResep, jadi harga yang berbeda akan diam-diam kalah oleh resep
 * yang dimasukkan lebih dulu.
 */
const PRODUK = [
  {
    // batch 848.000 / 40 = modal 21.200, jual 20.000 -> RUGI 1.200
    nama_produk: 'Kripik Pisang', hasil_per_batch: 40, harga_jual: 20000,
    bahan: [
      { nama: 'pisang',  satuan: 'kg',     jumlah: 20, harga_beli: 300000, jumlah_beli: 20 },
      { nama: 'minyak',  satuan: 'liter',  jumlah: 10, harga_beli: 180000, jumlah_beli: 10 },
      { nama: 'gula',    satuan: 'kg',     jumlah: 10, harga_beli: 150000, jumlah_beli: 10 },
      { nama: 'gas',     satuan: 'tabung', jumlah: 1,  harga_beli: 200000, jumlah_beli: 1  },
      { nama: 'kemasan', satuan: 'buah',   jumlah: 40, harga_beli: 45000,  jumlah_beli: 100 },
    ],
  },
  {
    // batch 100.000 / 50 = modal 2.000, jual 5.000 -> untung 3.000
    nama_produk: 'Kacang Telur', hasil_per_batch: 50, harga_jual: 5000,
    bahan: [
      { nama: 'kacang tanah', satuan: 'kg', jumlah: 10, harga_beli: 100000, jumlah_beli: 10 },
    ],
  },
  {
    // batch 280.000 / 100 = modal 2.800, jual 3.500 -> untung 700
    nama_produk: 'Donat', hasil_per_batch: 100, harga_jual: 3500,
    bahan: [
      { nama: 'terigu',  satuan: 'kg',      jumlah: 10, harga_beli: 120000, jumlah_beli: 10 },
      { nama: 'gula',    satuan: 'kg',      jumlah: 4,  harga_beli: 60000,  jumlah_beli: 4  },
      { nama: 'telur',   satuan: 'kg',      jumlah: 1,  harga_beli: 28000,  jumlah_beli: 1  },
      { nama: 'mentega', satuan: 'kg',      jumlah: 1,  harga_beli: 22000,  jumlah_beli: 1  },
      { nama: 'minyak',  satuan: 'liter',   jumlah: 2,  harga_beli: 36000,  jumlah_beli: 2  },
      { nama: 'ragi',    satuan: 'bungkus', jumlah: 1,  harga_beli: 14000,  jumlah_beli: 1  },
    ],
  },
];

/**
 * Stok bahan. Pisang sengaja dibuat pas-pasan.
 *
 * Kripik memakai pisang 20 kg per batch 40 bungkus = 0,5 kg per bungkus, jadi
 * stok 7 kg berarti kapasitas 14 bungkus — tepat seperti peringatan di skrip
 * demo, "bahan cuma cukup untuk 14 dari 20 yang dipesan". Bahan lain diisi
 * longgar supaya pisang yang jadi pembatas, bukan yang lain.
 *
 * Semua bahan HARUS ada di sini: v_kapasitas_produk mengembalikan NULL kalau
 * ada satu saja bahan yang stoknya belum dicatat.
 */
const STOK = {
  pisang: 7,
  minyak: 20, gula: 20, gas: 2, kemasan: 200,
  'kacang tanah': 50,
  terigu: 40, telur: 10, mentega: 10, ragi: 20,
};

/**
 * Penjualan bulan berjalan, dalam unit.
 *
 * Bentuknya yang jadi inti demo: Kripik Pisang paling laku (jadi bertanda
 * TERLARIS) sekaligus satu-satunya yang merugi. Omzet terlihat besar, untung
 * bersih tipis — dan selisih itu muncul dari data, bukan dari cerita.
 */
const JUAL_BULAN_INI = { 'Kripik Pisang': 160, 'Kacang Telur': 130, Donat: 100 };

/** Dua bulan sebelumnya, lebih tipis — riwayat untuk GET /transaksi?dari=&sampai= */
const JUAL_BULAN_LALU = { 'Kripik Pisang': 120, 'Kacang Telur': 90, Donat: 80 };

console.log('SIAPKAN AKUN DEMO');
console.log('='.repeat(64));

// ===========================================================================
// 1. Akun terisi
// ===========================================================================
const { token } = await masuk(AKUN_TERISI);

const sudahAda = await panggil('/produk', {}, token);
if (sudahAda.length > 0) {
  console.log('');
  console.log(`Akun ${AKUN_TERISI} SUDAH terisi (${sudahAda.length} produk).`);
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
  body: JSON.stringify({ nama_usaha: 'Warung Bu Sari', jenis_usaha: 'makanan' }),
}, token);
console.log('');
console.log('1. Usaha  : Warung Bu Sari');

const idProduk = {};
console.log('');
console.log('2. Produk');
for (const p of PRODUK) {
  const t = await panggil('/onboarding/resep', { method: 'POST', body: JSON.stringify(p) }, token);
  idProduk[p.nama_produk] = t.produk_id;
  console.log(`   ${p.nama_produk.padEnd(15)} modal ${rupiah(t.modal_per_unit).padEnd(10)}`
    + ` jual ${rupiah(t.harga_jual).padEnd(10)} margin ${rupiah(t.margin_per_unit).padEnd(9)}`
    + `${t.merugi ? ' [MERUGI]' : ''}`);
}

// ===========================================================================
// 3. Stok
// ===========================================================================
const daftarBahan = await panggil('/stok', {}, token);
const barisStok = [];
for (const b of daftarBahan) {
  const jumlah = STOK[b.nama.toLowerCase()];
  if (jumlah === undefined) {
    console.log(`   PERINGATAN: bahan "${b.nama}" tidak ada di STOK — kapasitas akan NULL`);
    continue;
  }
  barisStok.push({ bahan_id: b.bahan_id, jumlah });
}
await panggil('/stok', { method: 'POST', body: JSON.stringify({ baris: barisStok }) }, token);
console.log('');
console.log(`3. Stok   : ${barisStok.length} bahan dicatat (pisang sengaja 7 kg)`);

// ===========================================================================
// 4. Penjualan
// ===========================================================================

/**
 * Sebar sejumlah unit ke beberapa tanggal.
 *
 * Beranda memakai date_trunc bulan berjalan sebagai batas bawah bawaannya,
 * jadi penjualan bulan ini HARUS bertanggal di bulan ini — kalau semuanya
 * ditaruh di bulan lalu, Beranda kosong saat demo. Tanggalnya dihitung relatif
 * terhadap hari ini, bukan ditulis mati, supaya skrip ini tetap benar kapan pun
 * dijalankan.
 */
function sebar(unitPerProduk, tanggalTersedia) {
  const perTanggal = tanggalTersedia.map(() => []);
  for (const [nama, total] of Object.entries(unitPerProduk)) {
    const dasar = Math.floor(total / tanggalTersedia.length);
    let sisa = total - dasar * tanggalTersedia.length;
    for (let i = 0; i < tanggalTersedia.length; i++) {
      const jumlah = dasar + (sisa > 0 ? 1 : 0);
      if (sisa > 0) sisa--;
      if (jumlah > 0) perTanggal[i].push({ produk_id: idProduk[nama], jumlah });
    }
  }
  return perTanggal.map((baris, i) => ({ tanggal: tanggalTersedia[i], baris }));
}

const hariIni = new Date();

/** Tanggal 1 bulan ini sampai hari ini. Kalau hari ini tanggal 1, isinya satu hari. */
const tanggalBulanIni = [];
for (let d = 1; d <= hariIni.getDate(); d++) {
  tanggalBulanIni.push(tgl(new Date(hariIni.getFullYear(), hariIni.getMonth(), d)));
}

/** Tiga tanggal contoh di bulan-bulan sebelumnya. */
function tanggalBulanSebelum(mundur) {
  const dasar = new Date(hariIni.getFullYear(), hariIni.getMonth() - mundur, 1);
  return [5, 15, 25].map((d) => tgl(new Date(dasar.getFullYear(), dasar.getMonth(), d)));
}

const kelompok = [
  ...sebar(JUAL_BULAN_INI, tanggalBulanIni),
  ...sebar(JUAL_BULAN_LALU, tanggalBulanSebelum(1)),
  ...sebar(JUAL_BULAN_LALU, tanggalBulanSebelum(2)),
];

let barisTersimpan = 0;
for (const k of kelompok) {
  if (k.baris.length === 0) continue;
  const { tersimpan } = await panggil('/transaksi', {
    method: 'POST', body: JSON.stringify(k),
  }, token);
  barisTersimpan += Array.isArray(tersimpan) ? tersimpan.length : tersimpan;
}
console.log('');
console.log(`4. Penjualan: ${barisTersimpan} baris di ${kelompok.length} tanggal`);
console.log(`   bulan ini : ${tanggalBulanIni[0]} s/d ${tanggalBulanIni.at(-1)}`);
console.log(`   riwayat   : ${tanggalBulanSebelum(2)[0]} s/d ${tanggalBulanSebelum(1).at(-1)}`);

// ===========================================================================
// 5. Akun kosong
// ===========================================================================
// Hanya login, tidak diisi apa-apa. pengguna_baru dinilai dari nama_usaha yang
// masih null, jadi akun ini tetap masuk ke alur onboarding saat demo.
const kosong = await masuk(AKUN_KOSONG);
console.log('');
console.log(`5. Akun kosong: ${AKUN_KOSONG} (pengguna_baru: ${kosong.pengguna_baru})`);

// ===========================================================================
// Yang akan dilihat juri — dibaca dari SQL, bukan dihitung di sini
// ===========================================================================
const beranda = await panggil('/beranda', {}, token);
const produk = await panggil('/produk', {}, token);

console.log('');
console.log('='.repeat(64));
console.log('BERANDA (bulan berjalan, langsung dari GET /beranda)');
console.log(`   Omzet         ${rupiah(beranda.omzet)}`);
console.log(`   Untung bersih ${rupiah(beranda.untung_bersih)}`);
console.log(`   Produk merugi ${beranda.jumlah_produk_merugi}`
  + (beranda.produk_paling_merugi
    ? ` — ${beranda.produk_paling_merugi.nama} ${rupiah(beranda.produk_paling_merugi.margin_per_unit)}/unit`
    : ''));
console.log('');
console.log('PRODUK (urut margin terendah, dari GET /produk)');
for (const p of produk) {
  console.log(`   ${p.nama.padEnd(15)} margin ${rupiah(p.margin_per_unit).padEnd(10)}`
    + `${p.merugi ? ' [MERUGI]' : ''}${p.terlaris ? ' [TERLARIS]' : ''}`);
}
console.log('');
console.log('Masuk dengan nomor di bawah, OTP selalu 123456:');
console.log(`   terisi : ${AKUN_TERISI}`);
console.log(`   kosong : ${AKUN_KOSONG}`);
