import * as q from './tanya.queries.ts';
import type {
  BarisBahan, BarisBulan, BarisPenjualan, BarisPesanan, BarisProduk, BarisResep,
  ProfilUsaha, RingkasanPeriode,
} from './tanya.types.ts';

/**
 * Menyusun seluruh data pedagang jadi satu blok teks untuk dibaca model.
 *
 * Semua diambil sekaligus, bukan sesuai pertanyaan. Chatbotnya bebas — jadi
 * pertanyaan berikutnya tidak bisa ditebak, dan segalanya harus sudah ada di
 * meja sebelum model membaca pertanyaannya.
 *
 * Dua kebiasaan yang dipegang di seluruh berkas ini:
 *
 * 1. Angka ditulis polos (21200), bukan "Rp 21.200". Model kecil jauh lebih
 *    jarang salah berhitung pada bilangan tanpa titik ribuan. Perapiannya jadi
 *    tugas prompt, bukan tugas data.
 * 2. Yang tidak diketahui ditulis "belum dicatat", tidak pernah 0. Nol adalah
 *    pernyataan; kosong adalah ketidaktahuan. Menyamakan keduanya membuat
 *    model berkata "modalnya nol rupiah" untuk produk yang resepnya belum
 *    diisi.
 */

/** Data mentah satu pedagang, sebelum jadi teks. */
export interface DataUsaha {
  profil: ProfilUsaha | null;
  bulanIni: RingkasanPeriode | null;
  bulanan: BarisBulan[];
  produk: BarisProduk[];
  bahan: BarisBahan[];
  resep: BarisResep[];
  penjualan: BarisPenjualan[];
  pesanan: BarisPesanan[];
}

export async function ambilData(userId: number): Promise<DataUsaha> {
  const [profil, bulanIni, bulanan, produk, bahan, resep, penjualan, pesanan] =
    await Promise.all([
      q.profilUsaha(userId),
      q.ringkasanBulanIni(userId),
      q.ringkasanBulanan(userId),
      q.daftarProduk(userId),
      q.daftarBahan(userId),
      q.daftarResep(userId),
      q.penjualanTerakhir(userId),
      q.pesananTerakhir(userId),
    ]);
  return { profil, bulanIni, bulanan, produk, bahan, resep, penjualan, pesanan };
}

const KOSONG = 'belum dicatat';

function angka(n: number | null | undefined): string {
  return n === null || n === undefined ? KOSONG : String(Math.round(n));
}

/** Untuk jumlah yang bisa pecahan (0.5 kg). Buang nol di belakang koma. */
function desimal(n: number | null | undefined): string {
  if (n === null || n === undefined) return KOSONG;
  return String(Number(n.toFixed(3)));
}

function bagian(judul: string, isi: string[]): string {
  return isi.length === 0
    ? `## ${judul}\n(masih kosong)`
    : `## ${judul}\n${isi.join('\n')}`;
}

function tulisProfil(p: ProfilUsaha | null): string {
  const hariIni = new Date().toISOString().slice(0, 10);
  return [
    '## PROFIL',
    `nama usaha: ${p?.nama_usaha || KOSONG}`,
    `jenis usaha: ${p?.jenis_usaha || KOSONG}`,
    `tanggal hari ini: ${hariIni}`,
  ].join('\n');
}

function tulisBulanIni(r: RingkasanPeriode | null): string {
  if (!r) return '## BULAN INI\n(masih kosong)';
  const baris = [
    `omzet: ${angka(r.omzet)}`,
    `untung bersih: ${angka(r.untung_bersih)}`,
    `jumlah baris penjualan: ${r.jumlah_baris}`,
  ];
  if (r.baris_tanpa_modal > 0) {
    baris.push(
      `catatan: ${r.baris_tanpa_modal} baris penjualan belum punya modal, `
      + 'jadi untungnya belum ikut terhitung',
    );
  }
  return `## BULAN INI (${new Date().toISOString().slice(0, 7)})\n${baris.join('\n')}`;
}

function tulisBulanan(baris: BarisBulan[]): string {
  return bagian(
    'PER BULAN',
    baris.map((b) => `${b.bulan} | omzet ${angka(b.omzet)} | untung ${angka(b.untung_bersih)} `
      + `| ${b.jumlah_baris} baris`),
  );
}

function tulisProduk(baris: BarisProduk[]): string {
  const isi = baris.map((p) => {
    const bagianProduk = [
      `- ${p.nama}`,
      `  harga jual: ${angka(p.harga_jual)}`,
      `  modal per unit: ${angka(p.modal_per_unit)}`,
      `  untung per unit: ${angka(p.margin_per_unit)}`,
    ];
    if (p.merugi === true) bagianProduk.push('  status: MERUGI, harga jual di bawah modal');
    if (p.harga_disarankan !== null) {
      bagianProduk.push(
        `  harga disarankan aplikasi: ${angka(p.harga_disarankan)} `
        + `(untung jadi ${angka(p.untung_per_unit_disarankan)} per unit)`,
      );
    }
    bagianProduk.push(
      `  terjual bulan ini: ${desimal(p.terjual_periode)} (omzet ${angka(p.omzet_periode)})`,
      `  terjual sepanjang masa: ${desimal(p.terjual_total)}`,
      `  bahan cukup untuk: ${p.maks_unit === null ? 'belum bisa dihitung, stok bahan belum lengkap' : `${desimal(p.maks_unit)} unit`}`,
    );
    return bagianProduk.join('\n');
  });
  return bagian('PRODUK', isi);
}

function tulisBahan(baris: BarisBahan[]): string {
  return bagian(
    'BAHAN DAN STOK',
    baris.map((b) => `- ${b.nama} | beli ${angka(b.harga_beli)} per `
      + `${desimal(b.jumlah_beli)} ${b.satuan} | sisa stok: `
      + `${b.stok === null ? KOSONG : `${desimal(b.stok)} ${b.satuan}`}`),
  );
}

function tulisResep(baris: BarisResep[]): string {
  const per = new Map<string, string[]>();
  for (const r of baris) {
    const daftar = per.get(r.produk) ?? [];
    daftar.push(`${r.bahan} ${desimal(r.jumlah)} ${r.satuan}`);
    per.set(r.produk, daftar);
  }
  return bagian(
    'RESEP',
    [...per].map(([produk, bahan]) => `- ${produk}: ${bahan.join(', ')}`),
  );
}

function tulisPenjualan(baris: BarisPenjualan[]): string {
  return bagian(
    'PENJUALAN TERAKHIR',
    baris.map((t) => `${t.tanggal} | ${t.nama_produk ?? 'produk sudah dihapus'} `
      + `| ${desimal(t.jumlah)} unit @ ${angka(t.harga_satuan)} | dicatat lewat ${t.sumber}`),
  );
}

function tulisPesanan(baris: BarisPesanan[]): string {
  return bagian(
    'PESANAN MASUK TERAKHIR',
    baris.map((p) => `${p.diterima_pada} | ${p.pengirim_samar ?? 'tanpa nama'}: `
      + `${(p.teks ?? '').replace(/\s+/g, ' ').slice(0, 200)}`),
  );
}

/** Blok teks final yang masuk ke prompt. */
export function susunKonteks(d: DataUsaha): string {
  return [
    tulisProfil(d.profil),
    tulisBulanIni(d.bulanIni),
    tulisBulanan(d.bulanan),
    tulisProduk(d.produk),
    tulisBahan(d.bahan),
    tulisResep(d.resep),
    tulisPenjualan(d.penjualan),
    tulisPesanan(d.pesanan),
  ].join('\n\n');
}
