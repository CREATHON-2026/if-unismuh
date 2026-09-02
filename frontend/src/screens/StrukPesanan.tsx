import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import { formatRupiah } from '@shared/format/rupiah';
import type { CaraBayar, Struk } from '@shared/types';
import { strukPesanan } from '../api/client';
import { KepalaHero } from '../components/KepalaHero';
import { Layar } from '../components/Layar';
import { Lembar } from '../components/Lembar';
import { Tombol } from '../components/Tombol';
import { TombolIkon } from '../components/TombolIkon';

/**
 * Struk pesanan — 58 mm, lebar kertas printer termal warung.
 *
 * TIDAK ADA MODAL DAN UNTUNG DI SINI, dan itu ditegakkan di SQL, bukan di CSS.
 * Struk ini dilihat pembeli; margin adalah rahasia dagang. Yang disembunyikan
 * CSS tetap terkirim lewat kabel dan tinggal dibuka lewat Inspect Element.
 *
 * Dua jalan keluar: cetak (untuk yang punya printer) dan salin teks (untuk yang
 * tidak, jauh lebih banyak). Teks salinannya ditempel pedagang sendiri ke chat —
 * sistem tidak pernah mengirimnya (aturan #4).
 */
const LABEL_CARA: Record<CaraBayar, string> = {
  tunai: 'Tunai',
  transfer: 'Transfer',
  qris: 'QRIS',
  nanti: 'Belum dibayar',
};

/** Merangkai teks salin. Murni menyusun kalimat — tidak ada angka yang dihitung. */
function jadiTeks(s: Struk): string {
  return [
    s.nama_usaha ?? 'Struk',
    `No. ${s.nomor}`,
    `${s.tanggal} ${s.waktu}`,
    '',
    `${s.nama_produk} x${s.jumlah}`,
    `@ ${formatRupiah(s.harga_satuan)}`,
    `TOTAL ${formatRupiah(s.total)}`,
    '',
    s.cara_bayar ? `Bayar: ${LABEL_CARA[s.cara_bayar]}` : '',
    s.lunas ? 'LUNAS' : 'BELUM LUNAS',
    '',
    'Terima kasih 🙏',
  ]
    .filter((b) => b !== null)
    .join('\n');
}

export function StrukPesanan() {
  const nav = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [struk, setStruk] = useState<Struk | null>(null);
  const [galat, setGalat] = useState('');
  const [tersalin, setTersalin] = useState(false);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const j = await strukPesanan(Number(id));
      if (j.ok) setStruk(j.data);
      else setGalat(j.error.pesan);
    })();
  }, [id]);

  async function salin() {
    if (!struk) return;
    try {
      await navigator.clipboard.writeText(jadiTeks(struk));
      setTersalin(true);
    } catch {
      setGalat('Belum bisa menyalin otomatis. Tekan lama teksnya lalu salin.');
    }
  }

  if (!struk) {
    return (
      <Layar hero={<KepalaHero judul="Struk" kembali={() => nav(-1)} />}>
        <Lembar>
          <p className="text-utama text-redup">{galat || 'Membuka struk…'}</p>
        </Lembar>
      </Layar>
    );
  }

  const s = struk;

  return (
    <Layar
      hero={
        <KepalaHero
          judul="Struk"
          kembali={() => nav(-1)}
          kanan={<TombolIkon ikon={Share2} label="Salin teks struk" onClick={() => void salin()} />}
        />
      }
    >
      <Lembar>
        {/* Lebar dikunci 58 mm supaya yang terlihat di layar sama dengan yang
            keluar dari printer — bukan kejutan setelah kertasnya terlanjur
            terpakai. Struknya sendiri tidak ikut berganti rupa: ini benda
            cetak, dan yang menentukan bentuknya adalah kertasnya, bukan
            bahasa visual aplikasi. */}
        <div
          id="struk-cetak"
          className="mx-auto w-[58mm] max-w-full rounded-kartu border border-garis bg-white p-4 font-mono text-[12px] leading-relaxed text-tinta"
        >
          <p className="text-center text-[14px] font-bold uppercase">{s.nama_usaha ?? 'Struk'}</p>
          <p className="mt-1 text-center">No. {s.nomor}</p>
          <p className="text-center">
            {s.tanggal} {s.waktu}
          </p>

          <div className="my-2 border-t border-dashed border-garis-tua" />

          <div className="flex justify-between gap-2">
            <span className="min-w-0 break-words">{s.nama_produk}</span>
            <span className="angka shrink-0">x{s.jumlah}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-redup">@ {formatRupiah(s.harga_satuan)}</span>
          </div>

          <div className="my-2 border-t border-dashed border-garis-tua" />

          <div className="flex justify-between gap-2 text-[14px] font-bold">
            <span>TOTAL</span>
            <span className="angka">{formatRupiah(s.total)}</span>
          </div>
          {s.cara_bayar && (
            <div className="mt-1 flex justify-between gap-2">
              <span>Bayar</span>
              <span>{LABEL_CARA[s.cara_bayar]}</span>
            </div>
          )}
          <p className="mt-1 text-center font-bold">{s.lunas ? 'LUNAS' : 'BELUM LUNAS'}</p>

          <div className="my-2 border-t border-dashed border-garis-tua" />

          <p className="text-center">Terima kasih 🙏</p>
          {s.transaksi_id != null && (
            <p className="mt-1 text-center text-[10px] text-redup">TRX-{s.transaksi_id}</p>
          )}
        </div>

        {galat && (
          <p className="mt-3 rounded-kartu bg-rugi-muda p-4 text-utama text-rugi-tua">{galat}</p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <Tombol varian="utama" onClick={() => void salin()}>
            {tersalin ? 'Tersalin ✓' : 'Salin teks struk'}
          </Tombol>
          <Tombol varian="garis" onClick={() => window.print()}>
            Cetak
          </Tombol>
        </div>
        <p className="mt-3 pb-6 text-center text-isi leading-relaxed text-redup">
          Tempel sendiri di WhatsApp Anda kalau mau dikirim. lapakAi tidak pernah mengirim pesan ke
          pembeli.
        </p>
      </Lembar>

      {/* Saat dicetak, sisakan struknya saja — header, tombol, dan navigasi
          hanya menghabiskan kertas. */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #struk-cetak, #struk-cetak * { visibility: visible; }
          #struk-cetak {
            position: absolute; left: 0; top: 0;
            border: 0; margin: 0; padding: 0;
          }
        }
      `}</style>
    </Layar>
  );
}
