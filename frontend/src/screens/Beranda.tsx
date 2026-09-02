import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleAlert, MessageCircle, Mic, Package, Sparkles, TrendingDown } from 'lucide-react';
import { formatRupiah } from '@shared/format/rupiah';
import type { Beranda as DataBeranda } from '@shared/types';
import { ambilBeranda, ambilSaya } from '../api/client';
import { Layar } from '../components/Layar';
import { KepalaHero } from '../components/KepalaHero';
import { Lembar } from '../components/Lembar';
import { KartuAksi } from '../components/KartuAksi';
import { GridMetrik, KartuMetrik } from '../components/KartuMetrik';
import { BarisDaftar, KartuDaftar } from '../components/BarisDaftar';
import { NavBawah } from '../components/NavBawah';
import { KeadaanGalat } from '../components/KeadaanGalat';
import { KeadaanKosong } from '../components/KeadaanKosong';
import { RangkaKartu } from '../components/Rangka';
import { bacaOnboarding } from '../state/onboarding';

/**
 * Beranda — fitur 7, dan tamparan pertama demo.
 *
 * Untung bersih tidak lagi duduk di dalam kartu. Ia ADA DI DALAM kepala
 * bergradien, yaitu bidang yang menjadi layarnya sendiri. Bedanya bukan hiasan:
 * angka di dalam kartu selalu bisa disaingi kartu di sebelahnya, sedangkan
 * angka yang menjadi kepala halaman tidak punya saingan sederajat. Ini inti
 * seluruh layar — pedagang datang mengira omzet adalah untung, dan menaruh
 * keduanya sama besar justru membuatnya terasa setara padahal yang satu uang
 * lewat dan yang satu uang tinggal.
 *
 * Uang masuk tetap ikut, tepat di bawah untung, dan tetap ditulis besar. Kalau
 * ia disusutkan jadi catatan kaki, hierarkinya MEMBALIK besaran: Rp 268.000
 * tampil raksasa dan Rp 4.200.000 tampil kecil, lalu mata yang melirik sekilas
 * menyimpulkan untungnya lebih banyak — kebalikan persis dari maksud layar ini.
 *
 * Tidak ada satu pun angka di berkas ini yang dihitung. Semuanya datang jadi
 * dari GET /beranda — aturan #7. Perbandingan yang ada di sini cuma memilih
 * warna dan kalimat; tidak ada angka baru yang lahir dari sini.
 *
 * Sengaja tidak ada lencana delta ("+12%") seperti di rujukan rupanya:
 * GET /beranda tidak mengirim pembanding periode sebelumnya. Mengarangnya
 * supaya mirip dashboard di internet adalah persis kebohongan yang aplikasi ini
 * ada untuk menghapusnya.
 *
 * Tidak ada juga ikon lonceng di pojok kanan, walau rujukan rupanya punya.
 * Tidak ada sistem notifikasi di aplikasi ini, dan lingkaran seukuran tombol
 * yang tidak melakukan apa-apa saat ditekan membuat pengguna baru ragu apakah
 * aplikasinya rusak atau mereka yang salah. Afordansi yang berbohong lebih
 * buruk daripada ruang kosong.
 */
export function Beranda() {
  const nav = useNavigate();
  const [data, setData] = useState<DataBeranda | null>(null);
  const [galat, setGalat] = useState('');
  // Nama usaha ada di sessionStorage — kosong kalau tab baru dibuka langsung ke
  // /beranda. Kalau kosong, ambil dari server daripada memanggil pemiliknya
  // "Warung Anda" padahal namanya tersimpan.
  const [namaUsaha, setNamaUsaha] = useState(() => bacaOnboarding().nama_usaha ?? null);

  // Dipisah jadi fungsi bernama supaya tombol "Coba lagi" bisa memanggil ulang
  // hal yang sama persis dengan pemuatan pertama — bukan jalur pemulihan kedua
  // yang bisa berbeda diam-diam.
  const [memuat, setMemuat] = useState(true);

  async function muat() {
    setMemuat(true);
    setGalat('');
    const j = await ambilBeranda();
    if (j.ok) setData(j.data);
    else setGalat(j.error.pesan);
    setMemuat(false);
  }

  useEffect(() => {
    void muat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (namaUsaha) return;
    void ambilSaya().then((j) => {
      if (j.ok && j.data.pengguna.nama_usaha) setNamaUsaha(j.data.pengguna.nama_usaha);
    });
  }, [namaUsaha]);

  const inisial = ((namaUsaha ?? 'W').trim().charAt(0) || 'W').toUpperCase();

  const avatar = (
    <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/15 text-lg font-bold text-white">
      {inisial}
    </span>
  );

  /**
   * Kartu aksi dikunci empat (KartuAksi.tsx). Jadi Tanya masuk dengan MENUKAR,
   * bukan menambah: aksi kelima hilang diam-diam.
   *
   * Yang ditukar adalah Riwayat, karena Riwayat sudah punya slot sendiri di
   * NavBawah — satu ibu jari di bawah kartu ini. Tanya tidak punya slot di mana
   * pun, dan ini satu-satunya pintu masuknya.
   */
  const aksiCepat = [
    { ikon: Mic, label: 'Catat', onClick: () => nav('/catat') },
    { ikon: Package, label: 'Produk', onClick: () => nav('/produk') },
    { ikon: MessageCircle, label: 'Pesanan', onClick: () => nav('/pesanan') },
    { ikon: Sparkles, label: 'Tanya', onClick: () => nav('/tanya') },
  ];

  if (galat) {
    return (
      <Layar
        hero={
          <KepalaHero
            kiri={avatar}
            judul="lapakAi"
            label="Untung bersih"
            nilai="—"
            catatan="Angkanya belum bisa diambil."
          />
        }
      >
        <Lembar>
          <KeadaanGalat pesan={galat} onCoba={() => void muat()} sedangMencoba={memuat} />
          <NavBawah />
        </Lembar>
      </Layar>
    );
  }

  // Rangkanya meniru susunan aslinya supaya layar tidak melompat saat angkanya
  // tiba: kepala bergradien lebih dulu, lalu kartu aksi, lalu dua kotak metrik.
  if (!data) {
    return (
      <Layar
        hero={
          <KepalaHero
            kiri={avatar}
            judul="lapakAi"
            label="Untung bersih bulan ini"
            nilai="…"
            bawahIsi
          />
        }
      >
        <Lembar mengambang={<KartuAksi aksi={aksiCepat} />}>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <RangkaKartu tinggi="h-28" />
            <RangkaKartu tinggi="h-28" />
          </div>
          <NavBawah />
        </Lembar>
      </Layar>
    );
  }

  const rugi = data.untung_bersih < 0;

  return (
    <Layar
      hero={
        <KepalaHero
          kiri={avatar}
          judul={namaUsaha ?? 'lapakAi'}
          label="Untung bersih bulan ini"
          nilai={formatRupiah(data.untung_bersih)}
          nada={rugi ? 'rugi' : 'untung'}
          catatan={
            rugi
              ? 'Bulan ini uang yang keluar lebih besar daripada yang masuk.'
              : 'Ini yang benar-benar tinggal, bukan yang lewat.'
          }
          bawahIsi
          bawah={
            <div className="mx-auto flex max-w-[19rem] items-center justify-between gap-3 border-t border-white/20 pt-4">
              <div className="min-w-0 text-left">
                <p className="text-isi font-medium text-white/80">Uang masuk</p>
                {/* /75, bukan /50 seperti dulu: angka lama diukur di atas navy
                    #1B2536. Di atas ujung terang gradien ungu (#4C00BA), /50
                    jatuh ke 3,35:1 dan gagal WCAG AA. /75 memberi 6,16:1. */}
                <p className="mt-0.5 text-label text-white/75">Belum dikurangi modal</p>
              </div>
              <span className="angka shrink-0 text-judul-kecil font-bold text-white">
                {formatRupiah(data.omzet)}
              </span>
            </div>
          }
        />
      }
    >
      <Lembar mengambang={<KartuAksi aksi={aksiCepat} />}>
        <p className="label-bagian">RINGKASAN BULAN INI</p>
        <div className="mt-2.5">
          <GridMetrik>
            <KartuMetrik
              ikon={TrendingDown}
              label="Produk merugi"
              nilai={String(data.jumlah_produk_merugi)}
              sub={data.jumlah_produk_merugi > 0 ? 'Dijual di bawah modal' : 'Tidak ada, aman'}
              nada={data.jumlah_produk_merugi > 0 ? 'rugi' : 'untung'}
              onClick={() => nav('/produk')}
            />
            <KartuMetrik
              ikon={CircleAlert}
              label="Belum dihitung"
              nilai={String(data.baris_tanpa_modal)}
              sub={data.baris_tanpa_modal > 0 ? 'Modal belum lengkap' : 'Semua sudah terhitung'}
              nada={data.baris_tanpa_modal > 0 ? 'tanda' : 'netral'}
            />
          </GridMetrik>
        </div>

        {/* Angka yang tidak lengkap harus mengaku tidak lengkap. */}
        {data.baris_tanpa_modal > 0 && (
          <p className="mt-3 rounded-kontrol bg-tanda px-4 py-3.5 text-isi leading-relaxed text-tanda-tinta">
            {data.baris_tanpa_modal} penjualan belum ikut dihitung untungnya — modal produknya
            belum lengkap. Sudah masuk uang masuk, belum masuk untung bersih.
          </p>
        )}

        {!data.ada_transaksi && (
          <KeadaanKosong
            ikon={Mic}
            judul="Belum ada penjualan bulan ini"
            pesan="Catat yang hari ini dulu — cukup diucapkan, tidak perlu diketik satu per satu."
            labelAksi="Catat penjualan"
            onAksi={() => nav('/catat')}
          />
        )}

        {/* Terisi meski belum ada transaksi — dihitung dari resep, bukan penjualan. */}
        {data.produk_paling_merugi && (
          <>
            <p className="label-bagian mt-7">PALING MERUGI</p>
            <div className="mt-2">
              <KartuDaftar>
                <BarisDaftar
                  ikon={TrendingDown}
                  nadaIkon="rugi"
                  judul={data.produk_paling_merugi.nama}
                  meta="Rugi sebanyak itu setiap kali terjual"
                  nilai={`\u2212 ${formatRupiah(Math.abs(data.produk_paling_merugi.margin_per_unit))}`}
                  nadaNilai="rugi"
                  onClick={() => nav('/produk')}
                />
              </KartuDaftar>
              <p className="mt-2 px-1 text-kecil leading-relaxed text-redup">
                Ketuk untuk melihat harga yang sebaiknya dipakai.
              </p>
            </div>
          </>
        )}

        <NavBawah />
      </Lembar>
    </Layar>
  );
}
