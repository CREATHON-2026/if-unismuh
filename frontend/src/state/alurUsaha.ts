import type { LucideIcon } from 'lucide-react';
import { CupSoda, Shapes, Store, UtensilsCrossed, Wrench } from 'lucide-react';
import type { JenisUsaha } from '@shared/types';
import { bacaOnboarding } from './onboarding';

/**
 * Cabang alur per jenis usaha.
 *
 * Rutenya satu (produk → bahan → hasil → harga), tapi pertanyaannya mengikuti
 * jenis yang dipilih di onboarding: warung kelontong tidak "sekali bikin",
 * dia kulakan; bengkel tidak menjual "bungkus", dia melayani pelanggan.
 * Pertanyaan yang salah kosakata membuat pengguna merasa aplikasinya bukan
 * untuk mereka — dan berhenti di layar itu.
 *
 * Semuanya tetap dipetakan ke kontrak POST /onboarding/resep yang sama:
 * bahan = yang dibeli, hasil_per_batch = jadi berapa satuan jual, harga_jual =
 * harga per satuan. Modal per unit tetap dihitung SQL — hanya kosakatanya
 * yang berubah, bukan datanya.
 */
export interface AlurUsaha {
  ikon: LucideIcon;
  tanyaProduk: string;
  penjelasProduk: string;
  labelProduk: string;
  placeholderProduk: string;
  saranProduk: readonly string[];
  tanyaBahan: string;
  penjelasBahan: string;
  tanyaHasil: string;
  penjelasHasil: string;
  placeholderHasil: string;
  tanyaHarga: string;
  /** Satuan jual untuk label — "porsi", "gelas", "pelanggan" */
  satuanJual: string;
  /** Kalimat penutup di layar temuan, mis. "setiap satu porsi terjual" */
  kalimatTemuan: string;
  /** Kolom form bahan — kosakata dan susunannya ikut jenis usaha */
  form: {
    labelNama: string;
    placeholderNama: string;
    labelJumlah: string;
    placeholderJumlah: string;
    placeholderSatuan: string;
    labelHarga: string;
    /** false: sekali beli = yang dipakai (kulakan) — kolom jumlah beli disembunyikan */
    pakaiJumlahBeli: boolean;
    labelTambah: string;
    /**
     * Kulakan satu barang: nama barang TIDAK ditanya lagi (otomatis = nama
     * produk), tanpa daftar dan tombol tambah. Mencegah kelontong memasukkan
     * beberapa barang berbeda ke modal SATU produk.
     */
    kulakanTunggal: boolean;
  };
}

const ALUR: Record<JenisUsaha, AlurUsaha> = {
  makanan: {
    ikon: UtensilsCrossed,
    tanyaProduk: 'Menu apa yang paling laku?',
    penjelasProduk: 'Satu menu andalan dulu — dari sinilah untung mulai dihitung.',
    labelProduk: 'Nama menu',
    placeholderProduk: 'Misal: Nasi kuning, Kripik pisang',
    saranProduk: ['Nasi Kuning', 'Kripik Pisang', 'Ayam Geprek'],
    tanyaBahan: 'Sekali masak, habis bahan apa saja?',
    penjelasBahan: 'Isi satu per satu bahan untuk sekali masak.',
    tanyaHasil: 'Sekali masak jadi berapa porsi?',
    penjelasHasil: 'Hasil sekali masak dari bahan tadi.',
    placeholderHasil: 'Contoh: 40',
    tanyaHarga: 'Dijual berapa per porsi?',
    satuanJual: 'porsi',
    kalimatTemuan: 'setiap satu porsi terjual',
    form: {
      labelNama: 'Nama bahan',
      placeholderNama: 'Contoh: Tepung',
      labelJumlah: 'Dipakai',
      placeholderJumlah: '2',
      placeholderSatuan: 'kg',
      labelHarga: 'Harga beli',
      pakaiJumlahBeli: true,
      labelTambah: 'Tambah bahan',
      kulakanTunggal: false,
    },
  },
  minuman: {
    ikon: CupSoda,
    tanyaProduk: 'Minuman apa yang paling laku?',
    penjelasProduk: 'Satu minuman andalan dulu — yang lain menyusul.',
    labelProduk: 'Nama minuman',
    placeholderProduk: 'Misal: Es teh, Kopi susu',
    saranProduk: ['Es Teh', 'Kopi Susu', 'Es Jeruk'],
    tanyaBahan: 'Sekali meracik, habis bahan apa saja?',
    penjelasBahan: 'Isi bahan untuk sekali meracik atau satu wadah besar.',
    tanyaHasil: 'Sekali meracik jadi berapa gelas?',
    penjelasHasil: 'Hasil sekali racik dari bahan tadi.',
    placeholderHasil: 'Contoh: 20',
    tanyaHarga: 'Dijual berapa per gelas?',
    satuanJual: 'gelas',
    kalimatTemuan: 'setiap satu gelas terjual',
    form: {
      labelNama: 'Nama bahan',
      placeholderNama: 'Contoh: Gula pasir',
      labelJumlah: 'Dipakai',
      placeholderJumlah: '1',
      placeholderSatuan: 'kg',
      labelHarga: 'Harga beli',
      pakaiJumlahBeli: true,
      labelTambah: 'Tambah bahan',
      kulakanTunggal: false,
    },
  },
  sembako: {
    ikon: Store,
    tanyaProduk: 'Barang apa yang paling laku?',
    penjelasProduk: 'Satu barang andalan warung — yang lain bisa menyusul.',
    labelProduk: 'Nama barang',
    placeholderProduk: 'Misal: Beras 5kg, Minyak goreng',
    saranProduk: ['Beras 5kg', 'Minyak Goreng', 'Gula Pasir'],
    tanyaBahan: 'Sekali kulakan barang ini, beli apa saja?',
    penjelasBahan: 'Contoh: 1 dus isi 40 — tulis harga beli kulakannya.',
    tanyaHasil: 'Sekali kulakan, dapat berapa yang siap dijual?',
    penjelasHasil: 'Jumlah eceran dari sekali kulakan tadi.',
    placeholderHasil: 'Contoh: 40',
    tanyaHarga: 'Dijual berapa per satuan?',
    satuanJual: 'satuan',
    kalimatTemuan: 'setiap satu terjual',
    form: {
      labelNama: 'Nama barang',
      placeholderNama: 'Contoh: Mie instan',
      labelJumlah: 'Kulakan',
      placeholderJumlah: '1',
      placeholderSatuan: 'dus',
      labelHarga: 'Harga kulakan',
      // Sekali kulakan = yang dipakai; jumlah beli otomatis sama.
      pakaiJumlahBeli: false,
      labelTambah: 'Tambah barang',
      kulakanTunggal: true,
    },
  },
  jasa: {
    ikon: Wrench,
    tanyaProduk: 'Layanan apa yang paling laku?',
    penjelasProduk: 'Satu layanan andalan dulu — bengkel, laundry, salon, servis.',
    labelProduk: 'Nama layanan',
    placeholderProduk: 'Misal: Cuci setrika, Ganti oli',
    saranProduk: ['Cuci Setrika', 'Ganti Oli', 'Potong Rambut'],
    tanyaBahan: 'Sekali melayani, habis bahan apa saja?',
    penjelasBahan: 'Sabun, oli, plastik. Nyaris tak ada? Isi satu ongkos terbesar — listrik atau air.',
    tanyaHasil: 'Belanjaan tadi cukup untuk berapa pelanggan?',
    penjelasHasil: 'Perkiraan saja tidak apa-apa — bisa diubah nanti.',
    placeholderHasil: 'Contoh: 10',
    tanyaHarga: 'Ongkosnya berapa per pelanggan?',
    satuanJual: 'pelanggan',
    kalimatTemuan: 'setiap satu pelanggan dilayani',
    form: {
      labelNama: 'Nama bahan',
      placeholderNama: 'Contoh: Sampo',
      labelJumlah: 'Dipakai',
      placeholderJumlah: '1',
      placeholderSatuan: 'botol',
      labelHarga: 'Harga beli',
      pakaiJumlahBeli: true,
      labelTambah: 'Tambah bahan',
      kulakanTunggal: false,
    },
  },
  lainnya: {
    ikon: Shapes,
    tanyaProduk: 'Produk apa yang paling laku?',
    penjelasProduk: 'Satu produk andalan dulu — yang lain bisa menyusul.',
    labelProduk: 'Nama produk',
    placeholderProduk: 'Misal: Kaos polos, Aksesoris HP',
    saranProduk: ['Kaos Polos', 'Pulsa & Kuota', 'Aksesoris HP'],
    tanyaBahan: 'Untuk menyiapkan produk ini, apa saja yang dibeli?',
    penjelasBahan: 'Isi satu per satu beserta harga belinya.',
    tanyaHasil: 'Dari belanjaan itu, jadi berapa yang siap dijual?',
    penjelasHasil: 'Jumlah yang bisa dijual dari sekali belanja.',
    placeholderHasil: 'Contoh: 12',
    tanyaHarga: 'Dijual berapa per satuan?',
    satuanJual: 'satuan',
    kalimatTemuan: 'setiap satu terjual',
    form: {
      labelNama: 'Nama barang',
      placeholderNama: 'Contoh: Kaos polos',
      labelJumlah: 'Banyaknya',
      placeholderJumlah: '12',
      placeholderSatuan: 'pcs',
      labelHarga: 'Harga beli',
      pakaiJumlahBeli: true,
      labelTambah: 'Tambah barang',
      kulakanTunggal: false,
    },
  },
};

/** Alur mengikuti jenis usaha terpilih; 'lainnya' jadi bawaan yang aman. */
export function alurUsahaAktif(): AlurUsaha {
  const jenis = bacaOnboarding().jenis_usaha as JenisUsaha | undefined;
  return (jenis && ALUR[jenis]) || ALUR.lainnya;
}
