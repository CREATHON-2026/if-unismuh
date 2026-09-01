/**
 * Uji alur Pesanan Masuk -> Pembayaran -> Proses -> Untung.
 *
 * DITULIS SEBELUM IMPLEMENTASINYA ADA. Untuk rumus finansial ini wajib
 * (lihat CLAUDE.md): angka yang salah adalah kegagalan paling mahal di produk
 * ini, dan satu-satunya cara memastikannya adalah menuliskan dulu angka yang
 * kita harapkan sebelum ada kode yang bisa membenarkan dirinya sendiri.
 *
 * Yang dibuktikan skrip ini:
 *   1. Nomor pesanan berurut per hari, dan TIDAK bocor antar pedagang
 *   2. Buku besar TIDAK tersentuh sampai barangnya diserahkan (aturan #2)
 *   3. Untung di Beranda naik PERSIS sebesar untung pesanan itu
 *   4. Menyelesaikan dua kali tetap menghasilkan satu baris (idempoten)
 *   5. Harga yang ditawar pembeli yang tercatat, bukan harga daftar
 *   6. Koreksi produk oleh pedagang mengalahkan tebakan AI
 *   7. Stok bahan berkurang sesuai resep, dan yang belum dicatat tetap NULL
 *   8. Pedagang lain tidak bisa menyentuh pesanan yang bukan miliknya
 *   9. Struk TIDAK memuat modal maupun untung
 *
 * Butuh server hidup:  node scripts/uji-proses.mjs
 */

const DASAR = process.env.API ?? 'http://localhost:3000';
let gagal = 0;

function periksa(nama, dapat, harap) {
  const cocok = JSON.stringify(dapat) === JSON.stringify(harap);
  if (!cocok) gagal++;
  console.log(`  ${cocok ? 'OK  ' : 'SALAH'} ${nama}: ${JSON.stringify(dapat)}${cocok ? '' : `  (seharusnya ${JSON.stringify(harap)})`}`);
}

function periksaBenar(nama, syarat, keterangan = '') {
  if (!syarat) gagal++;
  console.log(`  ${syarat ? 'OK  ' : 'SALAH'} ${nama}${syarat ? '' : `  ${keterangan}`}`);
}

/** Melempar kalau gagal — untuk langkah yang memang harus berhasil. */
async function panggil(jalan, opsi = {}, token) {
  const body = await mentah(jalan, opsi, token);
  if (!body.ok) throw new Error(`${jalan} -> ${body.error.kode}: ${body.error.pesan}`);
  return body.data;
}

/** Tidak melempar — untuk menguji penolakan (409, 404). */
async function mentah(jalan, opsi = {}, token) {
  const res = await fetch(DASAR + jalan, {
    ...opsi,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const teks = await res.text();
  let body;
  try {
    body = JSON.parse(teks);
  } catch {
    // Express membalas HTML untuk rute yang belum ada. Dibungkus jadi bentuk
    // yang sama supaya pesan gagalnya menyebut jalur, bukan "Unexpected token <".
    body = { ok: false, error: { kode: 'BUKAN_JSON', pesan: `${jalan} membalas ${res.status} bukan JSON` } };
  }
  body._status = res.status;
  return body;
}

const POST = (isi) => ({ method: 'POST', body: JSON.stringify(isi) });
const rupiah = (n) => (n == null ? '—' : 'Rp ' + n.toLocaleString('id-ID'));

/** Untung bersih bulan berjalan — satu-satunya angka yang boleh menentukan lolos. */
async function untungBeranda(token) {
  const b = await panggil('/beranda', {}, token);
  return b.untung_bersih;
}

async function jumlahTransaksi(token) {
  const t = await panggil('/transaksi', {}, token);
  return t.length;
}

async function buatPedagang(nama) {
  const nomor = '08' + String(Date.now()).slice(-8) + String(Math.floor(Math.random() * 90) + 10);
  const { token } = await panggil('/auth/otp/verifikasi', POST({ nomor_hp: nomor, kode: '123456' }));
  await panggil('/onboarding/usaha', POST({ nama_usaha: nama, jenis_usaha: 'makanan' }), token);
  return token;
}

console.log('UJI PROSES PESANAN — pesanan masuk sampai jadi untung');
console.log('='.repeat(66));

// ---------------------------------------------------------------------------
// Siapkan: satu produk UNTUNG, satu produk RUGI.
//
// Angkanya sengaja dibuat bulat supaya kalau ada yang meleset, selisihnya
// langsung kelihatan tanpa perlu kalkulator.
//   Donat         : modal 50.000/50 = 1.000, jual 3.000  -> untung 2.000/unit
//   Kripik Pisang : modal 848.000/40 = 21.200, jual 20.000 -> RUGI 1.200/unit
// ---------------------------------------------------------------------------
const token = await buatPedagang('Warung Uji Proses');

const donat = await panggil('/onboarding/resep', POST({
  nama_produk: 'Donat', hasil_per_batch: 50, harga_jual: 3000,
  bahan: [{ nama: 'tepung', satuan: 'kg', jumlah: 5, harga_beli: 50000, jumlah_beli: 5 }],
}), token);

const kripik = await panggil('/produk', POST({
  nama_produk: 'Kripik Pisang', hasil_per_batch: 40, harga_jual: 20000,
  bahan: [{ nama: 'pisang', satuan: 'kg', jumlah: 20, harga_beli: 848000, jumlah_beli: 20 }],
}), token);

console.log(`\nSiap: ${donat.nama} modal ${rupiah(donat.modal_per_unit)} jual ${rupiah(donat.harga_jual)}`);
console.log(`      Kripik Pisang modal ${rupiah(21200)} jual ${rupiah(20000)} (sengaja merugi)`);

periksa('modal Donat dihitung SQL', donat.modal_per_unit, 1000);

// Stok tepung 10 kg. Satu donat memakai 5/50 = 0,1 kg.
const stok = await panggil('/stok', {}, token);
const tepung = stok.find((b) => b.nama === 'tepung');
await panggil('/stok', POST({ baris: [{ bahan_id: tepung.bahan_id, jumlah: 10 }] }), token);
console.log('      stok tepung 10 kg; pisang sengaja TIDAK dicatat\n');

/** Bikin satu pesan masuk lewat pipeline sungguhan, lalu kembalikan pesan_id. */
async function pesanMasuk(teks) {
  const h = await panggil('/pesanan/analisis', POST({ teks }), token);
  return h;
}

// ---------------------------------------------------------------------------
// 1. Nomor pesanan
// ---------------------------------------------------------------------------
console.log('-'.repeat(66));
console.log('1. Nomor pesanan');

const pesanA = await pesanMasuk('bu pesan donat 20 biji ya buat besok');
const order1 = await panggil('/proses', POST({
  pesan_id: pesanA.pesan_id, produk_id: donat.produk_id, jumlah: 20, harga_satuan: 3000,
}), token);

console.log(`  -> ${order1.nomor}  ${order1.status}  ${rupiah(order1.nilai_pesanan)}`);
periksaBenar('format nomor MMDD-NN', /^\d{4}-\d{2}$/.test(order1.nomor), `dapat "${order1.nomor}"`);
periksaBenar('nomor pertama berakhiran -01', order1.nomor.endsWith('-01'), `dapat "${order1.nomor}"`);

const order2 = await panggil('/proses', POST({
  pesan_id: pesanA.pesan_id, produk_id: donat.produk_id, jumlah: 5, harga_satuan: 3000,
}), token);
periksaBenar('nomor kedua berakhiran -02', order2.nomor.endsWith('-02'), `dapat "${order2.nomor}"`);

// Pedagang lain mulai dari -01 lagi: nomor tidak boleh membocorkan volume usaha.
const tokenB = await buatPedagang('Warung Sebelah');
const donatB = await panggil('/onboarding/resep', POST({
  nama_produk: 'Donat', hasil_per_batch: 50, harga_jual: 3000,
  bahan: [{ nama: 'tepung', satuan: 'kg', jumlah: 5, harga_beli: 50000, jumlah_beli: 5 }],
}), tokenB);
const pesanB = await panggil('/pesanan/analisis', POST({ teks: 'pesan donat 3 biji' }), tokenB);
const orderB = await panggil('/proses', POST({
  pesan_id: pesanB.pesan_id, produk_id: donatB.produk_id, jumlah: 3, harga_satuan: 3000,
}), tokenB);
periksaBenar('pedagang lain mulai dari -01', orderB.nomor.endsWith('-01'), `dapat "${orderB.nomor}"`);

// ---------------------------------------------------------------------------
// 2. Buku besar tidak tersentuh sampai barang diserahkan (aturan #2)
// ---------------------------------------------------------------------------
console.log('-'.repeat(66));
console.log('2. Buku besar tidak tersentuh sebelum barang diserahkan');

const untungAwal = await untungBeranda(token);
const trxAwal = await jumlahTransaksi(token);
console.log(`  untung Beranda sekarang ${rupiah(untungAwal)}, ${trxAwal} baris transaksi`);

periksa('status setelah dibuat', order1.status, 'menunggu_bayar');
periksa('belum ada baris transaksi', await jumlahTransaksi(token), trxAwal);
periksa('untung Beranda belum berubah', await untungBeranda(token), untungAwal);

const dibayar = await panggil(`/proses/${order1.id}/bayar`, POST({ cara: 'tunai' }), token);
// 'diproses', bukan 'dibayar': status menyatakan tahap penyerahan barang.
// Fakta uangnya ada di cara_bayar + dibayar_pada, supaya pesanan kasbon tidak
// pernah tampil "Dibayar" padahal uangnya belum masuk.
periksa('status setelah langkah bayar', dibayar.status, 'diproses');
periksaBenar('tanggal bayar tunai terisi', dibayar.dibayar_pada != null, 'null');
periksa('dibayar TIDAK menulis transaksi', await jumlahTransaksi(token), trxAwal);
periksa('dibayar TIDAK menaikkan untung', await untungBeranda(token), untungAwal);

// ---------------------------------------------------------------------------
// 3. Selesai -> untung naik PERSIS sebesar untung pesanan
// ---------------------------------------------------------------------------
console.log('-'.repeat(66));
console.log('3. Selesai menaikkan untung persis sebesar untung pesanan');

// 20 donat x (3.000 - 1.000) = 40.000. Dihitung SQL, bukan di sini.
periksa('untung pesanan dari SQL', order1.untung_pesanan, 40000);

const selesai = await panggil(`/proses/${order1.id}/selesai`, POST({}), token);
console.log(`  -> ${selesai.nomor} ${selesai.status}, transaksi ${selesai.transaksi_id}`);

periksa('status selesai', selesai.status, 'selesai');
periksa('tepat satu baris transaksi baru', await jumlahTransaksi(token), trxAwal + 1);
periksa('untung Beranda naik persis', await untungBeranda(token), untungAwal + 40000);
periksaBenar('nomor transaksi diberikan', selesai.transaksi_id != null, 'null');

// ---------------------------------------------------------------------------
// 4. Idempoten — ketuk dua kali tetap satu baris
// ---------------------------------------------------------------------------
console.log('-'.repeat(66));
console.log('4. Menyelesaikan dua kali tidak boleh mencatat dua kali');

const ulang = await mentah(`/proses/${order1.id}/selesai`, POST({}), token);
periksa('penyelesaian kedua ditolak', ulang.ok, false);
periksa('kode status 409', ulang._status, 409);
periksa('tetap satu baris transaksi', await jumlahTransaksi(token), trxAwal + 1);
periksa('untung tidak dobel', await untungBeranda(token), untungAwal + 40000);

// ---------------------------------------------------------------------------
// 5. Stok berkurang sesuai resep
// ---------------------------------------------------------------------------
console.log('-'.repeat(66));
console.log('5. Stok bahan berkurang sesuai resep');

const stokSesudah = await panggil('/stok', {}, token);
const tepungSesudah = stokSesudah.find((b) => b.nama === 'tepung');
const pisangSesudah = stokSesudah.find((b) => b.nama === 'pisang');
console.log(`  tepung ${tepungSesudah.jumlah} kg (dari 10), pisang ${pisangSesudah.jumlah}`);

// 20 donat x (5 kg / 50 per batch) = 2 kg. Sisa 8.
periksa('tepung berkurang 2 kg', tepungSesudah.jumlah, 8);
periksa('pisang yang belum dicatat tetap NULL', pisangSesudah.jumlah, null);

// ---------------------------------------------------------------------------
// 6. Batal tidak menyentuh buku besar
// ---------------------------------------------------------------------------
console.log('-'.repeat(66));
console.log('6. Pesanan batal tidak menyentuh buku besar');

const untungSebelumBatal = await untungBeranda(token);
const trxSebelumBatal = await jumlahTransaksi(token);

const batal = await panggil(`/proses/${order2.id}/batal`, POST({ alasan: 'pembeli berubah pikiran' }), token);
periksa('status batal', batal.status, 'batal');
periksa('alasan tersimpan', batal.alasan_batal, 'pembeli berubah pikiran');
periksa('tidak ada transaksi baru', await jumlahTransaksi(token), trxSebelumBatal);
periksa('untung tidak berubah', await untungBeranda(token), untungSebelumBatal);

const selesaiSetelahBatal = await mentah(`/proses/${order2.id}/selesai`, POST({}), token);
periksa('pesanan batal tidak bisa diselesaikan', selesaiSetelahBatal._status, 409);

// ---------------------------------------------------------------------------
// 7. Harga tawar yang tercatat, bukan harga daftar
// ---------------------------------------------------------------------------
console.log('-'.repeat(66));
console.log('7. Harga yang disepakati yang tercatat, bukan harga daftar');

const pesanTawar = await pesanMasuk('bu saya mau pesan 20 bungkus kripik pisang, bisa 18rb ga bu?');
const orderTawar = await panggil('/proses', POST({
  pesan_id: pesanTawar.pesan_id, produk_id: kripik.produk_id, jumlah: 20, harga_satuan: 18000,
}), token);

// 20 x (18.000 - 21.200) = -64.000. Pedagang RUGI kalau menerima tawaran ini.
periksa('untung pesanan negatif', orderTawar.untung_pesanan, -64000);
periksa('ditandai merugi', orderTawar.merugi, true);
periksaBenar('ada peringatan rugi', orderTawar.peringatan.some((p) => /rugi/i.test(p)), 'tidak ada');

const untungSebelumTawar = await untungBeranda(token);
await panggil(`/proses/${orderTawar.id}/bayar`, POST({ cara: 'transfer' }), token);
await panggil(`/proses/${orderTawar.id}/selesai`, POST({}), token);

periksa('untung Beranda TURUN 64.000', await untungBeranda(token), untungSebelumTawar - 64000);

const trxTawar = await panggil('/transaksi', {}, token);
const barisTawar = trxTawar.find((t) => t.nama_produk === 'Kripik Pisang');
periksa('harga satuan tercatat 18.000 bukan 20.000', barisTawar.harga_satuan, 18000);
periksa('asal-usul baris tercatat', barisTawar.sumber, 'pesanan');

// ---------------------------------------------------------------------------
// 8. Koreksi pedagang mengalahkan tebakan AI
// ---------------------------------------------------------------------------
console.log('-'.repeat(66));
console.log('8. Koreksi produk oleh pedagang mengalahkan tebakan AI');

const pesanSalah = await pesanMasuk('bu pesan donat 2 biji');
const pilihan = await panggil(`/pesanan/${pesanSalah.pesan_id}/pilihan`, {}, token);
console.log(`  kandidat: ${pilihan.kandidat.map((k) => k.nama).join(', ') || '(kosong)'}`);
console.log(`  semua produk: ${pilihan.produk.map((p) => p.nama).join(', ')}`);
periksaBenar('semua produk ditawarkan', pilihan.produk.length >= 2, `dapat ${pilihan.produk.length}`);

// Pedagang memilih Kripik Pisang walau AI membaca "donat".
const orderKoreksi = await panggil('/proses', POST({
  pesan_id: pesanSalah.pesan_id, produk_id: kripik.produk_id, jumlah: 2, harga_satuan: 20000,
}), token);
periksa('produk mengikuti pilihan pedagang', orderKoreksi.nama_produk, 'Kripik Pisang');

// Bacaan AI di kotak masuk TIDAK boleh ikut berubah — itu jejak audit.
const daftarPesan = await panggil('/pesanan', {}, token);
const pesanAsli = daftarPesan.find((p) => p.pesan_id === pesanSalah.pesan_id);
periksa('bacaan AI di kotak masuk tetap utuh', pesanAsli.nama_produk_mentah, pesanSalah.nama_produk_mentah);

// ---------------------------------------------------------------------------
// 9. Isolasi antar pedagang
// ---------------------------------------------------------------------------
console.log('-'.repeat(66));
console.log('9. Pedagang lain tidak bisa menyentuh pesanan orang lain');

periksa('membaca pesanan orang lain ditolak', (await mentah(`/proses/${order1.id}`, {}, tokenB))._status, 404);
periksa('menyelesaikan pesanan orang lain ditolak', (await mentah(`/proses/${orderKoreksi.id}/selesai`, POST({}), tokenB))._status, 404);
periksa('membatalkan pesanan orang lain ditolak', (await mentah(`/proses/${orderKoreksi.id}/batal`, POST({ alasan: 'x' }), tokenB))._status, 404);
periksa('memproses pesan orang lain ditolak', (await mentah('/proses', POST({ pesan_id: pesanA.pesan_id, produk_id: donatB.produk_id, jumlah: 1, harga_satuan: 3000 }), tokenB))._status, 404);

// ---------------------------------------------------------------------------
// 10. Riwayat memisahkan sukses dan gagal
// ---------------------------------------------------------------------------
console.log('-'.repeat(66));
console.log('10. Riwayat memisahkan yang sukses dan yang gagal');

const riwayat = await panggil('/proses', {}, token);
console.log(`  ${riwayat.daftar.length} pesanan: ` +
  riwayat.daftar.map((p) => `${p.nomor}/${p.status}`).join(' '));

periksaBenar('riwayat memuat semua status', riwayat.daftar.length >= 4, `dapat ${riwayat.daftar.length}`);
periksa('ringkasan selesai', riwayat.ringkasan.selesai, 2);
periksa('ringkasan gagal', riwayat.ringkasan.gagal, 1);
periksa('ringkasan untung hanya dari yang selesai', riwayat.ringkasan.untung, 40000 - 64000);

const hanyaSelesai = await panggil('/proses?status=selesai', {}, token);
periksaBenar('saringan status bekerja',
  hanyaSelesai.daftar.every((p) => p.status === 'selesai'),
  hanyaSelesai.daftar.map((p) => p.status).join(','));

// ---------------------------------------------------------------------------
// 11. Struk tidak boleh membocorkan margin
// ---------------------------------------------------------------------------
console.log('-'.repeat(66));
console.log('11. Struk tidak memuat modal maupun untung');

const struk = await panggil(`/proses/${order1.id}/struk`, {}, token);
console.log(`  ${struk.nama_usaha} · ${struk.nomor} · TRX-${struk.transaksi_id} · ${rupiah(struk.total)}`);

periksa('nomor pesanan ada di struk', struk.nomor, order1.nomor);
periksaBenar('nomor transaksi ada di struk', struk.transaksi_id != null, 'null');
periksa('total dari SQL', struk.total, 60000);
periksa('nama usaha ada', struk.nama_usaha, 'Warung Uji Proses');

const bocor = ['modal_per_unit', 'untung_pesanan', 'merugi', 'modal'];
const ditemukan = bocor.filter((k) => k in struk);
periksa('tidak ada field margin di struk', ditemukan, []);

// ---------------------------------------------------------------------------
// 12. Bayar nanti — piutang
// ---------------------------------------------------------------------------
console.log('-'.repeat(66));
console.log('12. Bayar nanti tetap bisa diselesaikan, tapi ditandai piutang');

const pesanNanti = await pesanMasuk('bu pesan donat 10 biji, bayarnya besok ya');
const orderNanti = await panggil('/proses', POST({
  pesan_id: pesanNanti.pesan_id, produk_id: donat.produk_id, jumlah: 10, harga_satuan: 3000,
}), token);
await panggil(`/proses/${orderNanti.id}/bayar`, POST({ cara: 'nanti' }), token);
const nantiSelesai = await panggil(`/proses/${orderNanti.id}/selesai`, POST({}), token);

periksa('cara bayar tersimpan', nantiSelesai.cara_bayar, 'nanti');
periksa('belum ada tanggal bayar', nantiSelesai.dibayar_pada, null);
periksa('tetap selesai', nantiSelesai.status, 'selesai');
periksa('untungnya tetap dihitung', await untungBeranda(token), untungAwal + 40000 - 64000 + 20000);

const riwayatAkhir = await panggil('/proses', {}, token);
periksa('piutang terhitung', riwayatAkhir.ringkasan.belum_dibayar, 1);

console.log('\n' + '='.repeat(66));
if (gagal === 0) {
  console.log('SEMUA LOLOS — untung naik dari SQL, dan tidak ada yang tercatat dua kali.');
} else {
  console.log(`${gagal} PEMERIKSAAN GAGAL.`);
  process.exit(1);
}
