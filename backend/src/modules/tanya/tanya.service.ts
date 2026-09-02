import { GalatTampil } from '../../lib/http.ts';
import { llmSiap } from '../../lib/llm.ts';
import { rupiah } from '../../lib/rupiah.ts';
import { KODE_GALAT, MAKSUD, type TanyaRes } from '../../../../shared/types.ts';
import { ringkasanPenjualan } from '../beranda/beranda.queries.ts';
import { cocokkanNamaProduk } from '../pesanan/pesanan.service.ts';
import { susunLembar, tambahHasilHitung, digit, type Lembar } from './tanya.fakta.ts';
import { tanyaTahapDua, tanyaTahapSatu } from './tanya.llm.ts';
import { riwayat, simpanGiliran, simulasiHarga } from './tanya.queries.ts';
import { HITUNG, type GiliranPercakapan, type HasilTanya, type PermintaanHitung } from './tanya.types.ts';

/**
 * Perangkaian chatbot: SQL menyiapkan fakta, LLM memilih dan merangkai,
 * penjaga memeriksa, database mengingat.
 *
 * Aturan yang mengikat seluruh berkas ini tetap sama seperti versi pertama,
 * hanya cara menegakkannya yang berubah:
 *
 *   SETIAP ANGKA YANG MUNCUL DI `jawaban` HARUS ADA PADANANNYA DI `acuan`.
 *
 * Dulu itu dijamin secara struktur — kalimatnya dirakit template dari `acuan`,
 * jadi mustahil menyimpang. Sekarang kalimatnya disusun model, jadi jaminannya
 * berpindah ke dua tempat: lembar fakta yang membatasi angka apa saja yang
 * model pernah lihat, dan `periksaRupiah()` di bawah yang mencocokkan hasilnya.
 *
 * Modul ini TIDAK PERNAH menulis ke tabel bisnis. Permintaan mencatat dialihkan
 * ke layar Catat yang sudah punya konfirmasi manusia (aturan #2). Satu-satunya
 * tulisan dari sini adalah ke tabel `percakapan`, yang tidak memuat angka.
 */

/** Delapan giliran = 16 baris (pedagang + asisten). */
const GILIRAN_DIINGAT = 8;
const BARIS_DIINGAT = GILIRAN_DIINGAT * 2;

/**
 * Apa yang dilakukan saat jawaban menyebut rupiah yang tidak ada di lembar
 * fakta.
 *
 * `catat` — dicatat ke log dan ke `acuan`, tapi jawabannya tetap ditampilkan.
 * `blokir` — jawabannya diganti permintaan maaf.
 *
 * Dipilih `catat` atas keputusan pemilik produk. Alasannya jujur: memblokir
 * berarti pedagang melihat "maaf" untuk jawaban yang kemungkinan besar benar,
 * dan satu jawaban hilang lebih merusak kepercayaan daripada satu angka
 * meleset yang tetap terpampang di kartu acuan di bawahnya.
 *
 * Dibiarkan sebagai satu konstanta supaya bisa dibalik dalam satu baris kalau
 * ketertelusuran dipertanyakan.
 */
const MODE_PENJAGA_RUPIAH: 'catat' | 'blokir' = 'catat';

type Acuan = Record<string, number | string>;

function jawab(
  maksud: TanyaRes['maksud'], jawaban: string,
  acuan: Acuan | null = null, peringatan: string[] = [],
): TanyaRes {
  return { maksud, jawaban, acuan, peringatan, alihkan_ke: null };
}

/**
 * Pedagang sedang melaporkan penjualan, bukan bertanya.
 *
 * Tidak disimpan di sini. Layar Catat sudah punya alur yang benar — usulan
 * ditampilkan dulu, pedagang memeriksa, baru tersimpan. Menyalin alur itu ke
 * sini berarti menyediakan tempat kedua bagi aturan #2 untuk bocor.
 */
function alihkanKeCatat(teks: string): TanyaRes {
  return {
    maksud: MAKSUD.CATAT_TRANSAKSI,
    jawaban: 'Sepertinya Bapak/Ibu sedang mencatat penjualan. Saya bukakan layar Catat — tinggal diperiksa dulu, lalu disimpan.',
    acuan: null,
    peringatan: [],
    alihkan_ke: { rute: '/catat', teks },
  };
}

/**
 * Penolakan di luar cakupan memakai kalimat baku, bukan karangan model.
 *
 * Kalimat tetap juga berarti pengguna belajar mengenali batasnya, alih-alih
 * mendapat alasan berbeda tiap kali dan menyangka aplikasinya rusak.
 */
const DI_LUAR_CAKUPAN = 'Maaf, saya hanya bisa membantu soal usaha Bapak/Ibu — untung, modal, '
  + 'harga, stok, bahan, penjualan, pesanan, dan cara memakai aplikasi ini.';

const BELUM_ADA_PRODUK = 'Belum ada produk yang tercatat, jadi belum ada yang bisa saya hitung. '
  + 'Isi dulu produk beserta bahannya di layar Produk, nanti saya bisa langsung '
  + 'memberitahu modal dan untungnya.';

// ---------------------------------------------------------------------------
// Penjaga rupiah
// ---------------------------------------------------------------------------

/**
 * Tarik setiap tulisan rupiah dari kalimat, jadikan angka telanjang.
 *
 * Titik dan spasi dibuang supaya "Rp 21.200", "Rp21200", dan "Rp 21 200"
 * dianggap sama — lihat catatan di `digit()`.
 */
function angkaRupiah(teks: string): string[] {
  const cocok = teks.match(/Rp\s*[\d][\d.\s]*/gi) ?? [];
  return cocok.map(digit).filter(Boolean);
}

function periksaRupiah(jawaban: string, lembar: Lembar): string[] {
  const sah = new Set([...lembar.rupiahSah].map(digit));
  return angkaRupiah(jawaban).filter((a) => !sah.has(a));
}

// ---------------------------------------------------------------------------
// Menjalankan perhitungan yang diminta model
// ---------------------------------------------------------------------------

/** Angka telanjang di dalam kalimat: "jual 25.000" -> ["25000"]. */
function angkaDalam(teks: string): string[] {
  return (teks.match(/\d[\d.]*/g) ?? []).map(digit).filter(Boolean);
}

/**
 * Apakah harga yang dikembalikan model benar-benar diucapkan pedagang?
 *
 * Ini lahir dari kesalahan sungguhan: pertanyaan "kalau kripik pisang saya
 * jual 25000" dijawab dengan simulasi harga 25.500 — angka `harga_disarankan`
 * yang model ambil dari lembar fakta karena kelihatan lebih pantas. Jawabannya
 * benar secara aritmetika dan lolos penjaga rupiah, tapi menjawab pertanyaan
 * yang tidak pernah diajukan. Itu kelas kesalahan paling sulit dilihat
 * pedagang: semuanya terlihat masuk akal.
 *
 * Yang dilakukan di sini MEMBANDINGKAN TULISAN, bukan menghitung. "25 ribu"
 * ditulis model sebagai 25000, dan itu diterima kalau kalimatnya memang
 * mengandung "25" diikuti kata "ribu" dan sisanya nol. Tidak ada perkalian di
 * mana pun — menurunkan rupiah dari teks di TypeScript adalah aturan #1 yang
 * bocor lewat pintu belakang.
 *
 * Kalimat tanpa angka sama sekali diloloskan: pedagang mungkin berkata "kalau
 * saya pakai harga yang kamu sarankan", dan di situ model memang benar
 * mengambil angka dari lembar fakta.
 */
function hargaSesuaiPertanyaan(pertanyaan: string, harga: number): boolean {
  const angka = angkaDalam(pertanyaan);
  if (angka.length === 0) return true;
  const s = String(harga);
  if (angka.includes(s)) return true;
  return /\b(ribu|rb)\b/i.test(pertanyaan)
    && angka.some((a) => a.length < s.length && s.startsWith(a) && /^0+$/.test(s.slice(a.length)));
}

/**
 * Angka harga yang pedagang tulis sendiri, kalau kalimatnya hanya memuat satu.
 *
 * Ini MENYALIN, bukan menghitung. Yang dikembalikan adalah deretan digit yang
 * memang ada di kalimat, apa adanya. Tidak ada penjumlahan, tidak ada
 * penafsiran satuan — "25 ribu" sengaja tidak dikenali di sini, karena
 * menurunkan 25000 dari "25" adalah perkalian, dan perkalian di TypeScript
 * adalah aturan #1 yang bocor lewat pintu belakang.
 *
 * Syaratnya ketat supaya tidak pernah salah tebak: tepat satu angka berbeda di
 * seluruh kalimat, dan angka itu ditulis penuh (tiga digit ke atas). Kalimat
 * seperti "kalau saya jual 10 bungkus seharga 25000" punya dua angka, jadi
 * dikembalikan null — di situ bertanya balik memang jawaban yang benar.
 */
function hargaTertulis(pertanyaan: string): number | null {
  const unik = [...new Set(angkaDalam(pertanyaan))];
  if (unik.length !== 1 || unik[0].length < 3) return null;
  return Number(unik[0]);
}

/** "yang itu", "yang tadi" — pedagang merujuk, bukan menyebut. */
const KATA_TUNJUK = /\b(itu|tadi|tersebut|barusan)\b/i;

/** Nama produk pedagang yang muncul di kalimat, kalau ada. */
function produkDalam(teks: string, namaProduk: string[]): string | null {
  const bawah = teks.toLowerCase();
  return namaProduk.find((n) => bawah.includes(n.toLowerCase())) ?? null;
}

function menyebutProduk(teks: string, namaProduk: string[]): boolean {
  return produkDalam(teks, namaProduk) !== null;
}

/** Kalimat pengandaian: "kalau", "seandainya", "misalnya". */
const KATA_ANDAI = /\b(kalau|kalo|seandainya|misal|misalnya|andai|andaikan|gimana|bagaimana)\b/i;

/** Kalimat itu berbicara soal harga jual, bukan soal jumlah atau tanggal. */
const KATA_HARGA = /\b(jual|dijual|jualnya|jualan|harga|harganya|naikkan|naikin|naikan|turunkan|turunin|banderol|patok)\b/i;

/**
 * Pengandaian harga yang WAJIB dihitung database, bukan dijawab model.
 *
 * Ini penjaga yang paling penting di berkas ini, dan ia lahir dari kegagalan
 * yang nyaris lolos: ditanya "kalau yang itu saya jual 7000 bagaimana?", model
 * menjawab "untungnya jadi Rp 5.000" tanpa pernah meminta perhitungan. Angkanya
 * kebetulan benar — 7.000 dikurangi modal 2.000 — tapi model yang
 * menghitungnya, di kepalanya sendiri. Itu aturan #1 yang dilanggar telak.
 *
 * Yang membuatnya nyaris tidak terlihat: Rp 5.000 juga kebetulan sama dengan
 * `kacang_telur_harga_jual`, fakta yang sama sekali tidak berhubungan, sehingga
 * penelusuran rupiah menganggapnya sah. Penjaga berbasis pencocokan angka tidak
 * akan pernah bisa menangkap kebetulan semacam itu.
 *
 * Maka keputusannya dipindahkan ke server: kalau kalimatnya pengandaian harga
 * dan memuat satu angka yang jelas, SQL dijalankan — mau model memintanya atau
 * tidak. Model tidak lagi punya kesempatan menghitung sendiri.
 */
function pengandaianHarga(pertanyaan: string): number | null {
  if (!KATA_ANDAI.test(pertanyaan) || !KATA_HARGA.test(pertanyaan)) return null;
  return hargaTertulis(pertanyaan);
}

/**
 * Produk yang PALING BARU disebut di percakapan.
 *
 * Model kecil menyelesaikan "yang itu" dengan produk yang paling sering muncul
 * di riwayat, bukan yang terakhir — dan setelah lima pertanyaan soal kripik,
 * satu pertanyaan soal kacang telur kalah suara. Akibatnya jawabannya benar
 * angkanya tapi salah barangnya, persis kegagalan yang dulu jadi alasan
 * ingatan percakapan tidak dipasang sama sekali.
 *
 * Dipindai dari yang terbaru ke yang terlama, jadi yang menang selalu yang
 * terakhir.
 */
function produkTerakhirDisebut(
  lalu: GiliranPercakapan[], namaProduk: string[],
): string | null {
  for (let i = lalu.length - 1; i >= 0; i -= 1) {
    const bawah = lalu[i].teks.toLowerCase();
    const ketemu = namaProduk.find((n) => bawah.includes(n.toLowerCase()));
    if (ketemu) return ketemu;
  }
  return null;
}

interface HasilJalanHitung {
  /** Berhasil: lembar sudah bertambah. Gagal: kalimat untuk pedagang. */
  gagal: string | null;
}

async function jalankanHitung(
  userId: number, minta: PermintaanHitung, lembar: Lembar,
  pertanyaan: string, lalu: GiliranPercakapan[],
): Promise<HasilJalanHitung> {
  if (minta.jenis === HITUNG.SIMULASI_HARGA) {
    if (!minta.produk || minta.harga_baru === null) {
      return { gagal: 'Boleh sebutkan produk mana dan mau dijual berapa? Misalnya "kalau kripik pisang saya jual 25 ribu, bagaimana?".' };
    }

    // Model kadang menjawab pertanyaan yang lain: ditanya "kalau dijual 25000"
    // tapi yang dihitung 25.500, angka `harga_disarankan` dari lembar fakta
    // yang kelihatan lebih pantas. Kalau pedagang menulis angkanya dengan
    // jelas, angka itu yang dipakai — menyalin tulisan pedagang selalu lebih
    // benar daripada pilihan model. Kalau kalimatnya memang ambigu, barulah
    // bertanya balik (aturan #8).
    let hargaBaru = minta.harga_baru;
    if (!hargaSesuaiPertanyaan(pertanyaan, hargaBaru)) {
      const tertulis = hargaTertulis(pertanyaan);
      if (tertulis === null) {
        return { gagal: 'Maaf, saya belum yakin harga yang Bapak/Ibu maksud. Boleh tulis angkanya saja, misalnya "kalau kripik pisang saya jual 25000"?' };
      }
      hargaBaru = tertulis;
    }

    // Pedagang berkata "yang itu" tanpa menyebut nama — yang dimaksud adalah
    // yang paling baru dibicarakan, bukan yang paling sering.
    let namaDicari = minta.produk;
    if (!menyebutProduk(pertanyaan, lembar.namaProduk) && KATA_TUNJUK.test(pertanyaan)) {
      namaDicari = produkTerakhirDisebut(lalu, lembar.namaProduk) ?? namaDicari;
    }

    // Satu pintu pencocokan nama yang sama dengan Pesanan Masuk. Menebak
    // produk yang salah di sini berarti menjawab dengan angka yang benar
    // tentang barang yang salah, dan pedagang tidak punya cara tahu (aturan #8).
    const cocok = await cocokkanNamaProduk(userId, namaDicari);
    if (cocok.produkId === null || cocok.perluDicek) {
      const saran = cocok.kandidat.length > 0
        ? ` Maksudnya ${cocok.kandidat.map((k) => `"${k.nama}"`).join(' atau ')}?`
        : ' Produk itu belum ada di daftar.';
      return { gagal: `Saya belum yakin produk "${namaDicari}" yang mana.${saran}` };
    }

    const s = await simulasiHarga(userId, cocok.produkId, hargaBaru);
    if (!s) {
      return { gagal: 'Modal produk itu belum bisa dihitung karena resepnya belum diisi, jadi saya belum bisa memperkirakan untungnya.' };
    }

    tambahHasilHitung(lembar, 'HASIL SIMULASI HARGA (baru saja dihitung database)', [
      { kunci: 'simulasi_produk', nilai: s.nama, jenis: 'teks' },
      { kunci: 'simulasi_harga_sekarang', nilai: s.harga_lama, jenis: 'rupiah' },
      { kunci: 'simulasi_harga_baru', nilai: s.harga_baru, jenis: 'rupiah' },
      { kunci: 'simulasi_modal_per_unit', nilai: s.modal_per_unit, jenis: 'rupiah' },
      { kunci: 'simulasi_untung_per_unit_harga_baru', nilai: s.margin_baru, jenis: 'rupiah' },
      { kunci: 'simulasi_terjual_periode_berjalan', nilai: s.terjual_periode, jenis: 'angka' },
      { kunci: 'simulasi_untung_periode_kalau_pakai_harga_baru', nilai: s.untung_periode_harga_baru, jenis: 'rupiah' },
      { kunci: 'simulasi_tambahan_untung_dibanding_sekarang', nilai: s.selisih_untung, jenis: 'rupiah' },
      {
        kunci: 'simulasi_asumsi',
        nilai: 'perkiraan ini memakai jumlah penjualan periode berjalan apa adanya; belum tentu orang tetap membeli sebanyak itu setelah harga naik',
        jenis: 'teks',
      },
    ]);
    return { gagal: null };
  }

  if (!minta.dari || !minta.sampai) {
    return { gagal: 'Periodenya belum jelas. Boleh sebutkan tanggalnya, misalnya "1 sampai 15 Agustus"?' };
  }

  const r = await ringkasanPenjualan(userId, minta.dari, minta.sampai);
  if (!r || r.jumlah_baris === 0) {
    return { gagal: `Tidak ada penjualan yang tercatat antara ${minta.dari} dan ${minta.sampai}.` };
  }

  tambahHasilHitung(lembar, 'HASIL HITUNG PERIODE (baru saja dihitung database)', [
    { kunci: 'periode_diminta_dari', nilai: minta.dari, jenis: 'teks' },
    { kunci: 'periode_diminta_sampai', nilai: minta.sampai, jenis: 'teks' },
    { kunci: 'periode_diminta_omzet', nilai: r.omzet, jenis: 'rupiah' },
    { kunci: 'periode_diminta_untung_bersih', nilai: r.untung_bersih, jenis: 'rupiah' },
    { kunci: 'periode_diminta_jumlah_transaksi', nilai: r.jumlah_baris, jenis: 'angka' },
  ]);
  return { gagal: null };
}

// ---------------------------------------------------------------------------

/**
 * `acuan` dirakit dari dua arah, dan keduanya perlu.
 *
 * Maju: kunci yang model akui dipakai — termasuk fakta bukan-uang seperti
 * "cukup untuk 40 bungkus" yang tidak akan pernah ketemu lewat pencarian angka.
 *
 * Mundur: setiap fakta rupiah yang angkanya benar-benar muncul di kalimat,
 * ditemukan kembali dari kalimatnya. Ini yang membuat kartu "angka yang
 * dipakai" jujur meski model lupa menyebutkan kuncinya — dan tanpanya angka
 * yang benar terlihat seperti angka karangan oleh siapa pun yang memeriksa.
 *
 * Nilainya selalu dibaca ulang dari lembar fakta, tidak pernah dari kalimat.
 * Kalimat adalah keluaran model; lembar fakta adalah keluaran SQL.
 */
function susunAcuan(hasil: HasilTanya, lembar: Lembar): Acuan | null {
  const acuan: Acuan = {};
  for (const k of hasil.kunci_dipakai) acuan[k] = lembar.peta[k];

  const disebut = new Set(angkaRupiah(hasil.jawaban));
  for (const [kunci, angka] of lembar.digitPerKunci) {
    if (disebut.has(angka)) acuan[kunci] = lembar.peta[kunci];
  }

  return Object.keys(acuan).length > 0 ? acuan : null;
}

function peringatanData(lembar: Lembar): string[] {
  const belum = lembar.peta.transaksi_belum_dihitung_untungnya;
  if (typeof belum === 'number' && belum > 0) {
    return [`${belum} penjualan belum ikut dihitung untungnya karena resep produknya belum diisi.`];
  }
  return [];
}

export async function jawabPertanyaan(userId: number, pertanyaan: string): Promise<TanyaRes> {
  const bersih = pertanyaan.trim();
  if (!bersih) {
    throw new GalatTampil(KODE_GALAT.PERMINTAAN_TIDAK_VALID, 'Pertanyaannya masih kosong.');
  }
  if (!llmSiap()) {
    throw new GalatTampil(
      KODE_GALAT.EKSTRAKSI_GAGAL,
      'Fitur tanya-jawab sedang tidak tersedia. Angka di Beranda tetap bisa dilihat seperti biasa.',
      503,
    );
  }

  const [lembar, lalu] = await Promise.all([
    susunLembar(userId),
    riwayat(userId, BARIS_DIINGAT),
  ]);

  // Tanpa produk, lembar faktanya kosong dan model hanya bisa mengarang atau
  // berputar-putar. Dijawab langsung: lebih cepat, dan mengarahkan pedagang ke
  // satu langkah berikutnya yang benar-benar menolongnya.
  if (!lembar.adaProduk) return jawab(MAKSUD.BEBAS, BELUM_ADA_PRODUK);

  let hasil = await tanyaTahapSatu(lembar, lalu, bersih);

  if (hasil.di_luar_cakupan) return jawab(MAKSUD.TIDAK_PAHAM, DI_LUAR_CAKUPAN);
  if (hasil.lapor_penjualan) return alihkanKeCatat(bersih);

  // Pengandaian harga tidak boleh dijawab model, sekeras apa pun promptnya
  // melarang. Kalau kalimatnya jelas-jelas bertanya "kalau dijual sekian",
  // perhitungannya dipaksa lewat SQL — server yang memutuskan, bukan model.
  if (!hasil.perlu_hitung) {
    const hargaAndai = pengandaianHarga(bersih);
    const produkAndai = produkDalam(bersih, lembar.namaProduk)
      ?? (KATA_TUNJUK.test(bersih) ? produkTerakhirDisebut(lalu, lembar.namaProduk) : null);
    if (hargaAndai !== null && produkAndai !== null) {
      hasil = {
        ...hasil,
        perlu_hitung: {
          jenis: HITUNG.SIMULASI_HARGA,
          produk: produkAndai,
          harga_baru: hargaAndai,
          dari: null,
          sampai: null,
        },
      };
    }
  }

  if (hasil.perlu_hitung) {
    const jalan = await jalankanHitung(userId, hasil.perlu_hitung, lembar, bersih, lalu);
    if (jalan.gagal) {
      await simpanGiliran(userId, bersih, jalan.gagal, BARIS_DIINGAT);
      return jawab(MAKSUD.BEBAS, jalan.gagal);
    }
    hasil = await tanyaTahapDua(lembar, lalu, bersih);
  }

  // Model kadang mengembalikan jawaban kosong setelah diminta menghitung.
  // Lebih baik mengaku daripada mengirim gelembung kosong ke layar.
  if (!hasil.jawaban) {
    return jawab(MAKSUD.BEBAS, 'Maaf, saya belum berhasil menyusun jawabannya. Boleh ditanyakan sekali lagi dengan kalimat lain?');
  }

  const acuan = susunAcuan(hasil, lembar);
  const peringatan = peringatanData(lembar);
  const liar = periksaRupiah(hasil.jawaban, lembar);

  if (liar.length > 0) {
    console.warn(
      `[tanya] ${liar.length} angka rupiah tanpa padanan di lembar fakta: `
      + liar.map((a) => rupiah(Number(a))).join(', '),
    );
    if (MODE_PENJAGA_RUPIAH === 'blokir') {
      return jawab(MAKSUD.BEBAS,
        'Maaf, saya belum yakin dengan angkanya. Boleh ditanyakan sekali lagi dengan kalimat lain?');
    }
    peringatan.push(
      `${liar.length} angka di jawaban ini belum bisa saya cocokkan dengan catatan. Mohon diperiksa dulu sebelum dipakai.`,
    );
  }

  await simpanGiliran(userId, bersih, hasil.jawaban, BARIS_DIINGAT);
  return jawab(MAKSUD.BEBAS, hasil.jawaban, acuan, peringatan);
}
