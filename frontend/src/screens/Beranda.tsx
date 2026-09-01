import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleAlert, Mic, TrendingDown } from 'lucide-react';
import { formatRupiah } from '@shared/format/rupiah';
import type { Beranda as DataBeranda } from '@shared/types';
import { ambilBeranda, ambilSaya } from '../api/client';
import { Layar } from '../components/Layar';
import { KepalaAplikasi } from '../components/KepalaAplikasi';
import { KartuHero } from '../components/KartuHero';
import { GridMetrik, KartuMetrik } from '../components/KartuMetrik';
import { BarisDaftar, KartuDaftar } from '../components/BarisDaftar';
import { NavBawah } from '../components/NavBawah';
import { KeadaanGalat } from '../components/KeadaanGalat';
import { KeadaanKosong } from '../components/KeadaanKosong';
import { RangkaHero, RangkaKartu } from '../components/Rangka';
import { Tombol } from '../components/Tombol';
import { bacaOnboarding } from '../state/onboarding';

/**
 * Beranda — fitur 7, dan tamparan pertama demo.
 *
 * Untung jadi angka utama di kartu gelap; uang masuk turun jadi salah satu
 * kotak metrik di bawahnya. Ini inti seluruh layar: pedagang datang mengira
 * omzet adalah untung. Menaruh keduanya sama besar justru membuatnya terasa
 * setara — padahal yang satu uang lewat, yang satu uang tinggal. Kartu gelap
 * dipakai sekali saja di layar ini, supaya "paling penting" tetap berarti.
 *
 * Tidak ada satu pun angka di berkas ini yang dihitung. Semuanya datang jadi
 * dari GET /beranda — aturan #7. Perbandingan yang ada di sini cuma memilih
 * warna dan kalimat; tidak ada angka baru yang lahir dari sini.
 *
 * Sengaja tidak ada lencana delta ("+12%") seperti di rujukan rupanya:
 * GET /beranda tidak mengirim pembanding periode sebelumnya. Mengarangnya
 * supaya mirip dashboard di internet adalah persis kebohongan yang aplikasi ini
 * ada untuk menghapusnya.
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

  if (galat) {
    return (
      <Layar tanpaLogo atas>
        <KepalaAplikasi nama={namaUsaha} />
        <KeadaanGalat pesan={galat} onCoba={() => void muat()} sedangMencoba={memuat} />
        <NavBawah />
      </Layar>
    );
  }

  // Rangkanya meniru susunan aslinya — kartu gelap lalu dua kotak metrik —
  // supaya layar tidak melompat saat angkanya tiba.
  if (!data) {
    return (
      <Layar tanpaLogo atas>
        <KepalaAplikasi nama={namaUsaha} />
        <div className="mt-6 flex flex-col gap-4">
          <RangkaHero />
          <RangkaKartu tinggi="h-24" />
        </div>
        <NavBawah />
      </Layar>
    );
  }

  const rugi = data.untung_bersih < 0;

  return (
    <Layar tanpaLogo atas>
      <KepalaAplikasi nama={namaUsaha} />

      <div className="mt-6">
        <p className="text-isi text-redup">Bulan ini</p>
        <p className="text-judul-kecil font-bold tracking-[-0.02em] text-tinta">
          {namaUsaha ?? 'Warung Anda'}
        </p>
      </div>

      <div className="mt-4">
        <KartuHero
          label="Untung bersih"
          nilai={formatRupiah(data.untung_bersih)}
          nada={rugi ? 'rugi' : 'untung'}
          catatan={
            rugi
              ? 'Bulan ini uang yang keluar lebih besar daripada yang masuk.'
              : 'Ini yang benar-benar tinggal, bukan yang lewat.'
          }
          bawah={
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-isi font-medium text-white/60">Uang masuk</p>
                <p className="mt-0.5 text-label text-white/40">Belum dikurangi modal</p>
              </div>
              <span className="angka shrink-0 text-sub font-bold text-white">
                {formatRupiah(data.omzet)}
              </span>
            </div>
          }
        />
      </div>

      <div className="mt-3">
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
          {data.baris_tanpa_modal} penjualan belum ikut dihitung untungnya — modal produknya belum
          lengkap. Sudah masuk uang masuk, belum masuk untung bersih.
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

      <div className="mt-5 flex gap-2.5">
        <Tombol className="flex-1" onClick={() => nav('/catat')}>
          Catat penjualan
        </Tombol>
        <Tombol varian="garis" className="flex-1" onClick={() => nav('/pesanan')}>
          Pesanan
        </Tombol>
      </div>

      <NavBawah />
    </Layar>
  );
}
