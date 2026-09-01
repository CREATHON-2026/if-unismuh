/**
 * Uji asap alur inti: login -> onboarding -> wawancara resep -> temuan pertama.
 *
 * Bukan unit test. Ini memastikan jalur yang paling menentukan demo benar-benar
 * hidup dari ujung ke ujung, dan yang terpenting: bahwa ANGKANYA BENAR.
 *
 * Jalankan (server harus sudah hidup di port 3000):
 *   node scripts/uji-alur.mjs
 */

const DASAR = process.env.API ?? 'http://localhost:3000';
let gagal = 0;

function periksa(nama, dapat, harap) {
  const cocok = dapat === harap;
  if (!cocok) gagal++;
  const tanda = cocok ? 'OK  ' : 'SALAH';
  console.log(`  ${tanda} ${nama}: ${dapat}${cocok ? '' : `  (seharusnya ${harap})`}`);
}

async function panggil(jalan, opsi = {}, token) {
  const res = await fetch(DASAR + jalan, {
    ...opsi,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opsi.headers,
    },
  });
  const body = await res.json();
  if (!body.ok) throw new Error(`${jalan} -> ${body.error.kode}: ${body.error.pesan}`);
  return body.data;
}

const rupiah = (n) => (n == null ? '—' : 'Rp ' + n.toLocaleString('id-ID'));

// Nomor acak supaya tiap kali dijalankan dapat pengguna baru dan hasilnya
// tidak tercampur data uji sebelumnya.
const NOMOR = '08' + String(Date.now()).slice(-10);

console.log('UJI ALUR INTI lapakAi');
console.log('='.repeat(58));

// --- 1. Kirim OTP -----------------------------------------------------------
console.log('\n1. Kirim OTP');
const kirim = await panggil('/auth/otp/kirim', {
  method: 'POST',
  body: JSON.stringify({ nomor_hp: NOMOR }),
});
periksa('terkirim', kirim.terkirim, true);
periksa('mode demo', kirim.mode_demo, true);

// --- 2. Verifikasi OTP ------------------------------------------------------
console.log('\n2. Verifikasi OTP (kode demo 123456)');
const masuk = await panggil('/auth/otp/verifikasi', {
  method: 'POST',
  body: JSON.stringify({ nomor_hp: NOMOR, kode: '123456' }),
});
periksa('dapat token', typeof masuk.token === 'string' && masuk.token.length > 20, true);
periksa('ditandai pengguna baru', masuk.pengguna_baru, true);
const token = masuk.token;

// Kode salah harus ditolak
let ditolak = false;
try {
  await panggil('/auth/otp/verifikasi', {
    method: 'POST',
    body: JSON.stringify({ nomor_hp: NOMOR, kode: '000000' }),
  });
} catch { ditolak = true; }
periksa('kode salah ditolak', ditolak, true);

// Tanpa token harus ditolak
let tanpaToken = false;
try {
  await panggil('/onboarding/usaha', {
    method: 'POST',
    body: JSON.stringify({ nama_usaha: 'X', jenis_usaha: 'makanan' }),
  });
} catch { tanpaToken = true; }
periksa('akses tanpa token ditolak', tanpaToken, true);

// --- 2b. Buka aplikasi lagi dengan token tersimpan --------------------------
console.log('\n2b. Buka aplikasi lagi (GET /auth/saya)');
const saya = await panggil('/auth/saya', {}, token);
periksa('pengguna dikenali', saya.pengguna.nomor_hp, NOMOR);
periksa('masih ditandai belum onboarding', saya.pengguna_baru, true);
periksa('dapat token perpanjangan', typeof saya.token === 'string' && saya.token.length > 20, true);

let tokenPalsuDitolak = false;
try {
  await panggil('/auth/saya', {}, 'token.palsu.sekali');
} catch { tokenPalsuDitolak = true; }
periksa('token palsu ditolak', tokenPalsuDitolak, true);

// --- 3. Onboarding usaha ----------------------------------------------------
console.log('\n3. Nama & jenis usaha');
const usaha = await panggil('/onboarding/usaha', {
  method: 'POST',
  body: JSON.stringify({ nama_usaha: 'Warung Bu Sari', jenis_usaha: 'makanan' }),
}, token);
periksa('nama usaha tersimpan', usaha.nama_usaha, 'Warung Bu Sari');

// Setelah onboarding, /auth/saya harus berhenti menandai pengguna baru —
// inilah yang menentukan aplikasi membuka Beranda, bukan alur onboarding lagi.
const sayaLagi = await panggil('/auth/saya', {}, token);
periksa('tidak lagi ditandai pengguna baru', sayaLagi.pengguna_baru, false);

// --- 4. Wawancara resep -> TEMUAN PERTAMA -----------------------------------
console.log('\n4. Wawancara resep — kripik pisang');
//   pisang  Rp 300.000 / 20 kg  = 15.000/kg  x 20 kg  = 300.000
//   minyak  Rp 180.000 / 10 L   = 18.000/L   x 10 L   = 180.000
//   gula    Rp 150.000 / 10 kg  = 15.000/kg  x 10 kg  = 150.000
//   gas     Rp 200.000 / 1 tbg  = 200.000    x 1      = 200.000
//   kemasan Rp  45.000 / 100 bh =     450/bh x 40     =  18.000
//                                             total   = 848.000
//   848.000 / 40 bungkus = 21.200 per bungkus
const temuan = await panggil('/onboarding/resep', {
  method: 'POST',
  body: JSON.stringify({
    nama_produk: 'Kripik Pisang',
    hasil_per_batch: 40,
    harga_jual: 20000,
    bahan: [
      { nama: 'pisang',  satuan: 'kg',    jumlah: 20, harga_beli: 300000, jumlah_beli: 20 },
      { nama: 'minyak',  satuan: 'liter', jumlah: 10, harga_beli: 180000, jumlah_beli: 10 },
      { nama: 'gula',    satuan: 'kg',    jumlah: 10, harga_beli: 150000, jumlah_beli: 10 },
      { nama: 'gas',     satuan: 'tabung', jumlah: 1, harga_beli: 200000, jumlah_beli: 1  },
      { nama: 'kemasan', satuan: 'buah',  jumlah: 40, harga_beli: 45000,  jumlah_beli: 100 },
    ],
  }),
}, token);

console.log('');
console.log('   ┌────────────────────────────────────┐');
console.log(`   │  Modal Anda     ${rupiah(temuan.modal_per_unit).padEnd(19)}│`);
console.log(`   │  Dijual         ${rupiah(temuan.harga_jual).padEnd(19)}│`);
console.log(`   │  ${(temuan.merugi ? 'RUGI' : 'UNTUNG')} ${rupiah(Math.abs(temuan.margin_per_unit)).padEnd(28)}│`);
console.log('   └────────────────────────────────────┘');
console.log('');

periksa('modal per unit', temuan.modal_per_unit, 21200);
periksa('harga jual', temuan.harga_jual, 20000);
periksa('margin per unit', temuan.margin_per_unit, -1200);
periksa('ditandai merugi', temuan.merugi, true);

// --- 5. Validasi menolak resep tak lengkap ---------------------------------
console.log('\n5. Resep tanpa bahan harus ditolak');
let tolakKosong = false;
try {
  await panggil('/onboarding/resep', {
    method: 'POST',
    body: JSON.stringify({ nama_produk: 'Tanpa Bahan', hasil_per_batch: 10, harga_jual: 5000, bahan: [] }),
  }, token);
} catch { tolakKosong = true; }
periksa('resep kosong ditolak', tolakKosong, true);

// --- Hasil ------------------------------------------------------------------
console.log('\n' + '='.repeat(58));
if (gagal === 0) {
  console.log('SEMUA LOLOS — alur inti hidup, dan angkanya benar.');
  console.log('Temuan pertama muncul tanpa satu pun transaksi dicatat.');
} else {
  console.log(`${gagal} PEMERIKSAAN GAGAL — perbaiki sebelum lanjut.`);
  process.exit(1);
}
