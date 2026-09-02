import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ChevronRight, Keyboard, MessageCircle, MessagesSquare, Mic, PiggyBank, ReceiptText, TriangleAlert, Wallet } from 'lucide-react';
import { formatRupiah } from '@shared/format/rupiah';
import type { Beranda as DataBeranda, PesanMasukItem, Rekap } from '@shared/types';
import { ambilBeranda, ambilRekap, ambilSaya, daftarPesanan, ekstraksiFoto } from '../api/client';
import { Layar } from '../components/Layar';
import { KepalaAplikasi } from '../components/KepalaAplikasi';
import { GrafikTren } from '../components/GrafikTren';
import { BarisDaftar, KartuDaftar } from '../components/BarisDaftar';
import { NavBawah } from '../components/NavBawah';
import { KeadaanGalat } from '../components/KeadaanGalat';
import { KeadaanKosong } from '../components/KeadaanKosong';
import { RangkaKartu } from '../components/Rangka';
import { bacaOnboarding } from '../state/onboarding';
import { tulisEkstraksi } from '../state/ekstraksi';

/**
 * Beranda — fitur 7, dan tamparan pertama demo. Rupa mengikuti rancangan tim:
 * omzet dan untung BERSEBELAHAN sebagai dua kartu (persis kalimat fitur 7),
 * untung menang lewat warna dan ukuran — yang satu uang lewat, yang satu uang
 * tinggal. Di bawahnya peringatan produk merugi, lalu kartu catat dengan tiga
 * jalan masuk sejajar: foto, suara, ketik (fitur 1–3, suara tidak disembunyikan).
 *
 * Warna mockup diadaptasi ke sistem: mint → hijau untung, cokelat → navy merek.
 * Lonceng notifikasi di mockup sengaja TIDAK dibawa — tidak ada sistem
 * notifikasi; afordansi yang berbohong lebih buruk daripada ruang kosong
 * (lihat KepalaAplikasi).
 *
 * Tidak ada satu pun angka di berkas ini yang dihitung. Semuanya datang jadi
 * dari GET /beranda — aturan #7. Perbandingan yang ada di sini cuma memilih
 * warna dan kalimat; tidak ada angka baru yang lahir dari sini.
 */
const JENIS_LABEL: Record<PesanMasukItem['jenis'], string> = {
  pesanan: 'Pesanan',
  tanya_harga: 'Tanya harga',
  menawar: 'Menawar',
};

/** Format tampilan waktu, mis. "2 Sep 03.05". Murni tampilan, bukan hitungan. */
function waktuSingkat(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

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

  const inputFoto = useRef<HTMLInputElement>(null);
  const [sibukFoto, setSibukFoto] = useState(false);
  const [galatFoto, setGalatFoto] = useState('');
  const [tren, setTren] = useState<Rekap | null>(null);
  const [pesanan, setPesanan] = useState<PesanMasukItem[]>([]);

  // Alur yang sama dengan TemuanPertama: hasil baca foto hanya usulan, wajib
  // lewat layar konfirmasi sebelum tersimpan (aturan #2).
  async function pilihFoto(berkas: File) {
    setSibukFoto(true);
    setGalatFoto('');
    const j = await ekstraksiFoto(berkas);
    if (j.ok) {
      tulisEkstraksi(j.data);
      nav('/konfirmasi', { state: { fotoUrl: URL.createObjectURL(berkas) } });
      return;
    }
    setGalatFoto(j.error.pesan);
    setSibukFoto(false);
  }

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
    // Dua seksi bawah: tren mingguan dan pesanan terbaru. Gagal diam-diam
    // tidak apa-apa — seksinya disembunyikan, bukan menggagalkan seluruh layar.
    void ambilRekap().then((j) => {
      if (j.ok) setTren(j.data);
    });
    void daftarPesanan().then((j) => {
      if (j.ok) setPesanan(j.data);
    });
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

  // Rangkanya meniru susunan barunya — dua kartu bersebelahan lalu kartu catat —
  // supaya layar tidak melompat saat angkanya tiba.
  if (!data) {
    return (
      <Layar tanpaLogo atas>
        <KepalaAplikasi nama={namaUsaha} />
        <div className="mt-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <RangkaKartu tinggi="h-36" />
            <RangkaKartu tinggi="h-36" />
          </div>
          <RangkaKartu tinggi="h-52" />
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
        <p className="text-judul-kecil font-bold tracking-[-0.02em] text-tinta">
          Halo{namaUsaha ? `, ${namaUsaha}` : ''}! 👋
        </p>
        <p className="mt-1 text-utama leading-relaxed text-sedang">
          Ini ringkasan jualan bulan ini.
        </p>
      </div>

      {/* Fitur 7 apa adanya: omzet dan untung BERSEBELAHAN. Untung menang
          lewat ukuran dan warna, tapi uang masuk tetap terbaca jelas —
          membandingkan keduanya adalah seluruh guna layar ini. Saat belum ada
          transaksi, dua angka nol bukan hasil; tampilkan ajakan (docs/06). */}
      {data.ada_transaksi ? (
        <div className="mt-5 grid grid-cols-2 gap-3">
          {/* Uang masuk = daftar penjualan — kartunya membuka riwayat. */}
          <button
            type="button"
            onClick={() => nav('/riwayat')}
            className="kartu flex flex-col p-4 text-left transition hover:bg-kanvas/40 active:scale-[0.99]"
          >
            <span className="flex items-center gap-2 text-isi font-medium text-sedang">
              <Wallet size={17} strokeWidth={1.8} aria-hidden="true" />
              Uang masuk
            </span>
            <span className="angka mt-3 break-words text-judul-kecil font-bold leading-tight text-tinta">
              {formatRupiah(data.omzet)}
            </span>
            <span className="mt-1.5 text-label text-redup">Belum dikurangi modal · riwayat ›</span>
          </button>

          <div
            className={`flex flex-col rounded-kartu p-4 ${rugi ? 'bg-rugi-muda' : 'bg-untung-muda'}`}
          >
            <span
              className={`flex items-center gap-2 text-isi font-semibold ${rugi ? 'text-rugi-tua' : 'text-untung-tua'}`}
            >
              <PiggyBank size={17} strokeWidth={1.8} aria-hidden="true" />
              Untung bersih
            </span>
            <span
              className={`angka mt-3 break-words text-judul font-extrabold leading-tight ${rugi ? 'text-rugi' : 'text-untung'}`}
            >
              {formatRupiah(data.untung_bersih)}
            </span>
            <span className={`mt-1.5 text-label ${rugi ? 'text-rugi-tua' : 'text-untung-tua'}`}>
              {rugi ? 'Uang keluar lebih besar' : 'Yang benar-benar tinggal'}
            </span>
          </div>
        </div>
      ) : (
        <KeadaanKosong
          ikon={Mic}
          judul="Belum ada penjualan bulan ini"
          pesan="Catat yang hari ini dulu lewat tombol di bawah — cukup diucapkan."
        />
      )}

      {/* Terisi meski belum ada transaksi — dihitung dari resep, bukan
          penjualan. Math.abs hanya untuk tampilan; angkanya datang jadi. */}
      {data.jumlah_produk_merugi > 0 && (
        <button
          type="button"
          onClick={() => nav('/produk')}
          className="mt-3 flex w-full items-center gap-3.5 rounded-kartu bg-rugi-muda p-4 text-left transition active:scale-[0.99]"
        >
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rugi text-white"
            aria-hidden="true"
          >
            <TriangleAlert size={20} strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-utama font-bold text-rugi">
              {data.jumlah_produk_merugi} produk merugi
            </span>
            <span className="mt-0.5 block text-kecil leading-relaxed text-rugi-tua">
              {data.produk_paling_merugi
                ? `Paling parah ${data.produk_paling_merugi.nama}, rugi ${formatRupiah(
                    Math.abs(data.produk_paling_merugi.margin_per_unit),
                  )} tiap terjual`
                : 'Cek modal dan harga jualnya'}
            </span>
          </span>
          <ChevronRight size={20} className="shrink-0 text-rugi" aria-hidden="true" />
        </button>
      )}

      {/* Angka yang tidak lengkap harus mengaku tidak lengkap. */}
      {data.baris_tanpa_modal > 0 && (
        <p className="mt-3 rounded-kontrol bg-tanda px-4 py-3.5 text-isi leading-relaxed text-tanda-tinta">
          {data.baris_tanpa_modal} penjualan belum ikut dihitung untungnya — modal produknya belum
          lengkap. Sudah masuk uang masuk, belum masuk untung bersih.
        </p>
      )}

      {/* Tiga jalan masuk pencatatan, sejajar dan sama terhormat (fitur 1–3).
          Suara paling besar di tengah — bukan disembunyikan di menu. */}
      <div className="kartu mt-5 px-4 py-5">
        <p className="text-center text-utama font-bold text-tinta">Catat penjualan</p>

        <div className="mt-5 flex items-start justify-center gap-8">
          <button
            type="button"
            disabled={sibukFoto}
            onClick={() => inputFoto.current?.click()}
            className="flex w-16 flex-col items-center gap-2 transition active:scale-95 disabled:opacity-40"
          >
            <span
              className="flex h-14 w-14 items-center justify-center rounded-full bg-kanvas text-tinta ring-1 ring-garis-tua"
              aria-hidden="true"
            >
              <Camera size={22} strokeWidth={1.8} />
            </span>
            <span className="text-kecil font-medium text-sedang">
              {sibukFoto ? 'Membaca…' : 'Foto buku'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => nav('/catat')}
            className="-mt-2 flex w-20 flex-col items-center gap-2 transition active:scale-95"
          >
            <span
              className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-hero text-white shadow-sm"
              aria-hidden="true"
            >
              <Mic size={30} strokeWidth={1.9} />
            </span>
            <span className="text-kecil font-bold text-tinta">Suara</span>
          </button>

          <button
            type="button"
            onClick={() => nav('/catat')}
            className="flex w-16 flex-col items-center gap-2 transition active:scale-95"
          >
            <span
              className="flex h-14 w-14 items-center justify-center rounded-full bg-kanvas text-tinta ring-1 ring-garis-tua"
              aria-hidden="true"
            >
              <Keyboard size={22} strokeWidth={1.8} />
            </span>
            <span className="text-kecil font-medium text-sedang">Ketik</span>
          </button>
        </div>

        <p className="mt-4 text-center text-kecil leading-relaxed text-redup">
          Cukup ucapkan “kripik pisang 5 bungkus 100 ribu”.
        </p>

        {galatFoto && (
          <p className="mt-3 text-center text-isi font-semibold text-rugi">{galatFoto}</p>
        )}

        <input
          ref={inputFoto}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const berkas = e.target.files?.[0];
            if (berkas) void pilihFoto(berkas);
            e.target.value = '';
          }}
        />
      </div>

      {/* Chatbot Tanya (modul tanya) — masuk dari sini, bukan tab kelima. */}
      <div className="mt-3">
        <KartuDaftar>
          <BarisDaftar
            ikon={MessagesSquare}
            judul="Tanya lapakAi"
            meta="Tanya apa saja soal untung dan penjualan Anda"
            onClick={() => nav('/tanya')}
          />
        </KartuDaftar>
      </div>

      {/* Cuplikan tren dari GET /rekap — titik dan totalnya dihitung SQL;
          di sini hanya digambar. Ketuk di mana pun menuju rekap penuh. */}
      {tren && tren.ada_transaksi && tren.hari.length > 1 && (
        <>
          <p className="label-bagian mt-7">ARAH USAHA</p>
          <button
            type="button"
            onClick={() => nav('/rekap')}
            className="kartu mt-2 w-full px-4 pb-4 pt-5 text-left transition active:scale-[0.99]"
          >
            <GrafikTren titik={tren.hari} />
            <span className="mt-3 flex items-center justify-between text-isi font-semibold text-tinta">
              Lihat rekap lengkap
              <ChevronRight size={18} className="text-redup" aria-hidden="true" />
            </span>
          </button>
        </>
      )}

      {/* Pesanan tersimpan terbaru — pintu cepat ke fitur 9. */}
      {pesanan.length > 0 && (
        <>
          <p className="label-bagian mt-7">PESANAN TERBARU</p>
          <div className="mt-2">
            <KartuDaftar>
              {pesanan.slice(0, 2).map((p) => (
                <BarisDaftar
                  key={p.pesan_id}
                  ikon={MessageCircle}
                  nadaIkon={p.merugi === true ? 'rugi' : p.perlu_dicek ? 'tanda' : 'netral'}
                  judul={p.nama_produk ?? p.nama_produk_mentah ?? 'Pesanan masuk'}
                  meta={`${JENIS_LABEL[p.jenis]} · ${waktuSingkat(p.diterima_pada)}`}
                  nilai={p.nilai_pesanan != null ? formatRupiah(p.nilai_pesanan) : '—'}
                  nadaNilai={p.merugi === true ? 'rugi' : 'netral'}
                  onClick={() => nav('/pesanan')}
                />
              ))}
            </KartuDaftar>
            <p className="mt-2 px-1 text-kecil leading-relaxed text-redup">
              Ketuk untuk membuka dan menyiapkan balasannya.
            </p>
          </div>
        </>
      )}

      {/* Selalu tampil — pintu riwayat tidak boleh ikut hilang saat kartu
          Uang masuk disembunyikan (belum ada transaksi). */}
      <div className="mt-5">
        <KartuDaftar>
          <BarisDaftar
            ikon={ReceiptText}
            judul="Riwayat penjualan"
            meta="Semua catatan bulan ini, satu per satu"
            onClick={() => nav('/riwayat')}
          />
        </KartuDaftar>
      </div>

      <NavBawah />
    </Layar>
  );
}
