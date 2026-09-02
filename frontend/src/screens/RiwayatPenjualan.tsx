import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, ReceiptText, Wallet } from 'lucide-react';
import { formatRupiah } from '@shared/format/rupiah';
import type { Beranda, Transaksi } from '@shared/types';
import { ambilBeranda, ambilTransaksi } from '../api/client';
import { Layar } from '../components/Layar';
import { BarisDaftar, KartuDaftar } from '../components/BarisDaftar';
import { Lencana } from '../components/Lencana';
import { Segmented } from '../components/Segmented';
import { NavBawah } from '../components/NavBawah';
import { KeadaanGalat } from '../components/KeadaanGalat';
import { KeadaanKosong } from '../components/KeadaanKosong';
import { RangkaDaftar, RangkaKartu } from '../components/Rangka';

/**
 * Riwayat penjualan — rupa mengikuti rancangan tim; isinya yang benar-benar ada.
 *
 * Kartu total memakai `omzet` dari GET /beranda — satu-satunya total periode
 * yang dihitung SQL — jadi labelnya jujur: "bulan ini", apa pun filternya.
 * Filter Hari/Minggu/Bulan murni penyaring TAMPILAN atas data bulan berjalan
 * (membandingkan tanggal bukan aritmetika uang).
 *
 * Dari mockup yang sengaja TIDAK dibawa: "+12% dari kemarin" (API tidak
 * mengirim pembanding), badge Selesai/Dibatalkan (tidak ada status transaksi
 * — yang tercatat berarti terjadi), total per transaksi (API tidak mengirim
 * subtotal dan frontend tidak boleh mengalikan — aturan #7; usulan field
 * `subtotal` sudah dicatat di docs/06), dan pemilih tanggal bebas (friksi
 * untuk pengguna 35–60, lihat docs/07).
 */
const SUMBER_LABEL: Record<Transaksi['sumber'], string> = {
  foto: 'Foto',
  suara: 'Suara',
  manual: 'Ketik',
  pesanan: 'Pesanan',
};

type Saringan = 'hari' | 'minggu' | 'bulan';

const SARINGAN: readonly { nilai: Saringan; label: string }[] = [
  { nilai: 'hari', label: 'Hari ini' },
  { nilai: 'minggu', label: 'Minggu ini' },
  { nilai: 'bulan', label: 'Bulan ini' },
];

/** YYYY-MM-DD zona lokal — untuk membandingkan dengan `tanggal` dari API. */
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** "Selasa, 2 Sep" — murni format tampilan. */
function tanggalPanjang(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'short',
  });
}

export function RiwayatPenjualan() {
  const nav = useNavigate();
  const [daftar, setDaftar] = useState<Transaksi[] | null>(null);
  const [beranda, setBeranda] = useState<Beranda | null>(null);
  const [saring, setSaring] = useState<Saringan>('hari');
  const [galat, setGalat] = useState('');
  const [memuat, setMemuat] = useState(true);

  async function muat() {
    setMemuat(true);
    setGalat('');
    const j = await ambilTransaksi();
    if (j.ok) setDaftar(j.data);
    else setGalat(j.error.pesan);
    setMemuat(false);
  }

  useEffect(() => {
    void muat();
    // Kartu total: omzet bulan berjalan dari SQL. Gagal diam-diam tidak apa —
    // kartunya disembunyikan, daftar tetap jalan.
    void ambilBeranda().then((j) => {
      if (j.ok) setBeranda(j.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Penyaring tampilan atas data bulan berjalan — membandingkan tanggal saja.
  const kini = new Date();
  const hariIni = ymd(kini);
  const tujuhHariLalu = ymd(new Date(kini.getFullYear(), kini.getMonth(), kini.getDate() - 6));
  const tersaring = (daftar ?? []).filter((t) =>
    saring === 'hari' ? t.tanggal === hariIni : saring === 'minggu' ? t.tanggal >= tujuhHariLalu : true,
  );

  // Kelompok per tanggal, urutan mengikuti kiriman API (terbaru dulu dari SQL).
  const kelompok: { tanggal: string; baris: Transaksi[] }[] = [];
  for (const t of tersaring) {
    const akhir = kelompok[kelompok.length - 1];
    if (akhir && akhir.tanggal === t.tanggal) akhir.baris.push(t);
    else kelompok.push({ tanggal: t.tanggal, baris: [t] });
  }

  const kepala = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Kembali"
        onClick={() => nav(-1)}
        className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-tinta transition active:scale-95"
      >
        <ArrowLeft size={24} strokeWidth={2} aria-hidden="true" />
      </button>
      <h1 className="text-judul-kecil font-bold tracking-[-0.02em] text-tinta">
        Riwayat Penjualan
      </h1>
    </div>
  );

  if (galat) {
    return (
      <Layar tanpaLogo atas>
        {kepala}
        <KeadaanGalat pesan={galat} onCoba={() => void muat()} sedangMencoba={memuat} />
        <NavBawah />
      </Layar>
    );
  }

  if (!daftar) {
    return (
      <Layar tanpaLogo atas>
        {kepala}
        <div className="mt-5 flex flex-col gap-3">
          <RangkaKartu tinggi="h-32" />
          <RangkaDaftar baris={3} />
        </div>
        <NavBawah />
      </Layar>
    );
  }

  return (
    <Layar tanpaLogo atas>
      {kepala}

      {/* Total periode dari SQL (/beranda) — angka oranye besar 34px lolos
          batas kontras teks besar (aksen-tua 3,6:1 ≥ 3:1). Tanpa "+12% dari
          kemarin": API tidak mengirim pembanding, tidak dikarang. */}
      {beranda && beranda.ada_transaksi && (
        <div className="kartu mt-4 flex flex-col p-5">
          <span className="flex items-center gap-2 text-isi font-medium text-sedang">
            <Wallet size={17} strokeWidth={1.8} aria-hidden="true" />
            Uang masuk bulan ini
          </span>
          <span className="angka mt-2 break-words text-nomor font-extrabold leading-none text-merek-tua">
            {formatRupiah(beranda.omzet)}
          </span>
          <span className="mt-2 text-kecil text-redup">Belum dikurangi modal</span>
        </div>
      )}

      <div className="mt-4">
        <Segmented label="Saring periode" pilihan={SARINGAN} nilai={saring} onPilih={setSaring} />
      </div>

      {tersaring.length === 0 ? (
        daftar.length === 0 ? (
          <KeadaanKosong
            ikon={Mic}
            judul="Belum ada penjualan bulan ini"
            pesan="Catat yang hari ini dulu — cukup diucapkan, tidak perlu diketik satu per satu."
            labelAksi="Catat penjualan"
            onAksi={() => nav('/catat')}
          />
        ) : (
          <KeadaanKosong
            ikon={ReceiptText}
            judul={saring === 'hari' ? 'Belum ada penjualan hari ini' : 'Tidak ada di periode ini'}
            pesan="Coba periode yang lebih panjang — catatan bulan ini tetap tersimpan."
          />
        )
      ) : (
        kelompok.map((k) => (
          <div key={k.tanggal}>
            <p className="label-bagian mt-6">{tanggalPanjang(k.tanggal).toUpperCase()}</p>
            <div className="mt-2">
              <KartuDaftar>
                {k.baris.map((t) => (
                  <BarisDaftar
                    key={t.id}
                    ikon={ReceiptText}
                    judul={t.nama_produk ?? 'Produk tidak dikenali'}
                    meta={`#${t.id} · ${t.jumlah} × ${formatRupiah(t.harga_satuan)}`}
                    kanan={<Lencana nada="netral">{SUMBER_LABEL[t.sumber]}</Lencana>}
                    onClick={
                      t.produk_id != null ? () => nav(`/produk/${t.produk_id}`) : undefined
                    }
                  />
                ))}
              </KartuDaftar>
            </div>
          </div>
        ))
      )}

      <NavBawah />
    </Layar>
  );
}
