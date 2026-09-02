import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { Banknote, Check, Clock, CreditCard, QrCode } from 'lucide-react';
import { formatRupiah } from '@shared/format/rupiah';
import type { CaraBayar, Pesanan } from '@shared/types';
import {
  ambilPesanan,
  batalkanPesanan,
  bayarPesanan,
  cekBayarPesanan,
  selesaikanPesanan,
} from '../api/client';
import { BottomSheet } from '../components/BottomSheet';
import { KepalaHero } from '../components/KepalaHero';
import { Layar } from '../components/Layar';
import { Lembar } from '../components/Lembar';
import { Lencana } from '../components/Lencana';
import { Tombol } from '../components/Tombol';

/**
 * Proses Pesanan — satu pesanan, dua langkah, satu tombol yang menaikkan untung.
 *
 * Uang masuk dan barang keluar SENGAJA dipisah. Pesanan yang sudah dibayar tapi
 * barangnya belum diserahkan bukan penjualan, melainkan titipan uang; kalau
 * pembeli membatalkan sebelum barangnya diambil, uang itu harus kembali dan
 * tidak boleh pernah tercatat sebagai untung. Karena itu buku besar ditulis di
 * LANGKAH 2, bukan langkah 1.
 *
 * Setiap angka di layar ini datang sudah jadi dari `v_pesanan` (aturan #7).
 * Tidak ada satu pun perkalian di berkas ini — termasuk untuk total.
 */
const CARA: { nilai: CaraBayar; label: string; jelas: string; Ikon: typeof Banknote }[] = [
  { nilai: 'tunai', label: 'Tunai', jelas: 'Uangnya diterima langsung', Ikon: Banknote },
  { nilai: 'transfer', label: 'Transfer', jelas: 'Sudah masuk rekening', Ikon: CreditCard },
  { nilai: 'qris', label: 'QRIS', jelas: 'Buatkan kode QR', Ikon: QrCode },
  { nilai: 'nanti', label: 'Bayar nanti', jelas: 'Kasbon — dicatat sebagai piutang', Ikon: Clock },
];

const LABEL_CARA: Record<CaraBayar, string> = {
  tunai: 'Tunai',
  transfer: 'Transfer',
  qris: 'QRIS',
  nanti: 'Bayar nanti (kasbon)',
};

export function ProsesPesanan() {
  const nav = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [pesanan, setPesanan] = useState<Pesanan | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState('');
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [sheetBatal, setSheetBatal] = useState(false);
  const [alasan, setAlasan] = useState('');
  const [tersalin, setTersalin] = useState(false);

  const muat = useCallback(async () => {
    if (!id) return;
    const j = await ambilPesanan(Number(id));
    if (j.ok) setPesanan(j.data);
    else setGalat(j.error.pesan);
  }, [id]);

  useEffect(() => {
    void muat();
  }, [muat]);

  // Midtrans tidak memberi tahu kita saat pembeli membayar — kita yang bertanya.
  // Webhook butuh alamat publik yang bisa dijangkau internet, dan itu hal yang
  // paling gampang mati di hari demo. Polling berhenti sendiri begitu statusnya
  // bukan lagi menunggu.
  useEffect(() => {
    if (!pesanan || pesanan.status !== 'menunggu_bayar' || !pesanan.midtrans_url) return;
    const jeda = window.setInterval(() => {
      void (async () => {
        const j = await cekBayarPesanan(pesanan.id);
        if (j.ok) setPesanan(j.data);
      })();
    }, 5000);
    return () => window.clearInterval(jeda);
  }, [pesanan]);

  async function bayar(cara: CaraBayar) {
    if (!pesanan) return;
    setSibuk(true);
    setGalat('');
    const j = await bayarPesanan(pesanan.id, cara);
    setSibuk(false);
    if (j.ok) setPesanan(j.data);
    else setGalat(j.error.pesan);
  }

  async function selesai() {
    if (!pesanan) return;
    setSibuk(true);
    setGalat('');
    const j = await selesaikanPesanan(pesanan.id);
    setSibuk(false);
    setKonfirmasi(false);
    if (j.ok) setPesanan(j.data);
    else setGalat(j.error.pesan);
  }

  async function batal() {
    if (!pesanan || !alasan.trim()) return;
    setSibuk(true);
    setGalat('');
    const j = await batalkanPesanan(pesanan.id, alasan.trim());
    setSibuk(false);
    setSheetBatal(false);
    if (j.ok) setPesanan(j.data);
    else setGalat(j.error.pesan);
  }

  async function salinTautan() {
    if (!pesanan?.midtrans_url) return;
    try {
      await navigator.clipboard.writeText(pesanan.midtrans_url);
      setTersalin(true);
    } catch {
      setGalat('Belum bisa menyalin otomatis. Tekan lama tautannya lalu salin.');
    }
  }

  if (!pesanan) {
    return (
      <Layar kembali={() => nav(-1)} atas>
        <p className="text-utama text-redup">{galat || 'Membuka pesanan…'}</p>
      </Layar>
    );
  }

  const p = pesanan;

  const lencanaStatus = (
    <Lencana nada={p.status === 'selesai' ? 'untung' : p.status === 'batal' ? 'netral' : 'tanda'}>
      {p.status === 'menunggu_bayar'
        ? 'LANGKAH 1 — BAYAR'
        : p.status === 'diproses'
          ? 'LANGKAH 2 — SERAHKAN'
          : p.status === 'selesai'
            ? 'SELESAI'
            : 'BATAL'}
    </Lencana>
  );

  return (
    <Layar
      hero={
        /* Angka terpenting layar ini hidup di dalam gradien, bukan di kartu:
           pesanan ini menambah untung atau menggerusnya. Nilai pesanan ikut di
           bawah garis karena nilai besar tanpa untung adalah jebakan yang
           persis mau kami tunjukkan. */
        <KepalaHero
          judul={`#${p.nomor}`}
          kembali={() => nav('/pesanan')}
          label={p.status === 'selesai' ? 'Untung yang sudah masuk' : 'Untung kalau diteruskan'}
          nilai={
            p.untung_pesanan == null
              ? '—'
              : `${p.merugi ? '\u2212' : '+'} ${formatRupiah(Math.abs(p.untung_pesanan))}`
          }
          nada={p.untung_pesanan == null ? 'netral' : p.merugi ? 'rugi' : 'untung'}
          catatan={
            p.untung_pesanan == null
              ? 'Modal produk ini belum lengkap, jadi untungnya belum bisa dihitung.'
              : undefined
          }
          bawah={
            <div className="mx-auto flex max-w-[19rem] items-center justify-between border-t border-white/20 pt-4 text-isi">
              <span className="text-white/70">Nilai pesanan</span>
              <span className="angka font-semibold text-white">{formatRupiah(p.nilai_pesanan)}</span>
            </div>
          }
          bawahIsi
        />
      }
    >
      <Lembar
        mengambang={
          <div className="rounded-kartu bg-kartu p-5 shadow-mengambang">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 text-sub font-bold text-tinta">{p.nama_produk}</p>
              {lencanaStatus}
            </div>
            <p className="angka mt-1 text-utama font-semibold text-sedang">
              {p.jumlah} × {formatRupiah(p.harga_satuan)}
            </p>
            {p.teks_pesan && (
              <p className="mt-3 rounded-kontrol bg-permukaan p-3 text-isi leading-relaxed text-sedang">
                “{p.teks_pesan}”
              </p>
            )}
          </div>
        }
        className="pb-6"
      >
      {/* Peringatan SEBELUM tombol, bukan sesudah — supaya pedagang tahu ini
          merugikan sebelum ia memutuskan, bukan setelah. */}
      {p.peringatan.map((t) => (
        <p
          key={t}
          className="mt-3 rounded-kartu border border-rugi/15 bg-rugi-muda p-4 text-utama leading-relaxed text-rugi-tua"
        >
          {t}
        </p>
      ))}

      {galat && (
        <p className="mt-3 rounded-kartu bg-rugi-muda p-4 text-utama text-rugi-tua">{galat}</p>
      )}

      {/* --- LANGKAH 1 --- */}
      {p.status === 'menunggu_bayar' && !p.midtrans_url && (
        <div className="kartu mt-3 px-5 py-5">
          <p className="label-bagian">BAGAIMANA DIBAYAR?</p>
          <p className="mt-2 text-isi leading-relaxed text-sedang">
            Belum ada yang tercatat di buku sampai barangnya diserahkan.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {CARA.map(({ nilai, label, jelas, Ikon }) => (
              <button
                key={nilai}
                type="button"
                disabled={sibuk}
                onClick={() => void bayar(nilai)}
                className="flex min-h-16 items-center gap-3.5 rounded-kontrol border-[1.5px] border-garis-tua bg-kartu px-4 text-left transition active:scale-[0.98] disabled:opacity-40"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-kanvas text-tinta"
                  aria-hidden="true"
                >
                  <Ikon size={18} strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-utama font-bold text-tinta">{label}</span>
                  <span className="block text-isi text-redup">{jelas}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* QRIS — kode dibuat lokal dari tautan Midtrans supaya pedagang bisa
          menyodorkan layarnya. Tautannya DISALIN pedagang, tidak pernah dikirim
          sistem ke pembeli (aturan #4). */}
      {p.status === 'menunggu_bayar' && p.midtrans_url && (
        <div className="kartu mt-3 px-5 py-5">
          <p className="label-bagian">TUNJUKKAN KODE INI</p>
          <div className="mt-4 flex justify-center rounded-kartu bg-white p-4">
            <QRCode value={p.midtrans_url} size={188} />
          </div>
          <p className="mt-3 text-center text-isi leading-relaxed text-sedang">
            Sodorkan layar ini ke pembeli, atau salin tautannya lalu tempel sendiri di chat.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Tombol varian="garis" onClick={() => void salinTautan()}>
              {tersalin ? 'Tautan tersalin ✓' : 'Salin tautan bayar'}
            </Tombol>
            <button
              type="button"
              onClick={() => void muat()}
              className="min-h-12 text-utama font-semibold text-sedang transition active:scale-95"
            >
              Cek pembayaran sekarang
            </button>
          </div>
          <p className="mt-2 text-center text-isi text-redup">
            Status dicek sendiri tiap beberapa detik.
          </p>
        </div>
      )}

      {/* --- LANGKAH 2 --- */}
      {p.status === 'diproses' && (
        <div className="kartu mt-3 px-5 py-5">
          <p className="label-bagian">PEMBAYARAN</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-utama font-semibold text-tinta">
              {p.cara_bayar ? LABEL_CARA[p.cara_bayar] : '—'}
            </span>
            {p.cara_bayar === 'nanti' ? (
              <Lencana nada="tanda">BELUM DIBAYAR</Lencana>
            ) : (
              <Lencana nada="untung">SUDAH DIBAYAR</Lencana>
            )}
          </div>
          <p className="mt-4 text-utama leading-relaxed text-sedang">
            Barangnya sudah diserahkan ke pembeli? Untungnya baru dihitung setelah itu.
          </p>
          <div className="mt-3">
            <Tombol varian="utama" disabled={sibuk} onClick={() => setKonfirmasi(true)}>
              Barang sudah diserahkan
            </Tombol>
          </div>
        </div>
      )}

      {/* --- SELESAI --- */}
      {p.status === 'selesai' && (
        <div className="kartu mt-3 px-5 py-6">
          {/* Centang hijau, bukan hijau "berhasil" bawaan rujukan: di titik
              inilah untungnya benar-benar tercatat, jadi hijau di sini memang
              berarti untung — bukan sekadar "operasi sukses". */}
          <div className="flex justify-center">
            <span
              className="flex h-20 w-20 items-center justify-center rounded-full bg-untung-muda"
              aria-hidden="true"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-untung text-white">
                <Check size={30} strokeWidth={3} />
              </span>
            </span>
          </div>
          <p className="mt-4 text-center text-sub font-bold text-tinta">Pesanan selesai</p>
          <p className="mt-2 text-center text-utama leading-relaxed text-sedang">
            Sudah tercatat di buku sebagai penjualan
            {p.transaksi_id != null && (
              <span className="angka font-semibold text-tinta"> nomor {p.transaksi_id}</span>
            )}
            . Untung di Beranda sudah bertambah.
          </p>
          {p.cara_bayar === 'nanti' && !p.dibayar_pada && (
            <p className="mt-3 rounded-kontrol bg-tanda p-4 text-isi leading-relaxed text-tanda-tinta">
              Uangnya belum masuk. Pesanan ini tercatat sebagai piutang di Riwayat.
            </p>
          )}
          <div className="mt-5 flex flex-col gap-2">
            <Tombol varian="utama" onClick={() => nav(`/struk/${p.id}`)}>
              Lihat struk
            </Tombol>
            <Tombol varian="garis" onClick={() => nav('/pesanan')}>
              Kembali ke pesanan masuk
            </Tombol>
          </div>
        </div>
      )}

      {/* --- BATAL --- */}
      {p.status === 'batal' && (
        <div className="kartu mt-3 px-5 py-5">
          <p className="text-utama leading-relaxed text-sedang">
            Pesanan ini dibatalkan
            {p.alasan_batal && <span className="text-tinta"> — {p.alasan_batal}</span>}. Buku besar
            tidak tersentuh dan stok tidak berkurang.
          </p>
          <div className="mt-4">
            <Tombol varian="garis" onClick={() => nav('/pesanan')}>
              Kembali ke pesanan masuk
            </Tombol>
          </div>
        </div>
      )}

      {(p.status === 'menunggu_bayar' || p.status === 'diproses') && (
        <button
          type="button"
          onClick={() => setSheetBatal(true)}
          className="mt-4 min-h-12 text-utama font-semibold text-rugi transition active:scale-95"
        >
          Batalkan pesanan
        </button>
      )}
      </Lembar>

      {/* Konfirmasi. Satu-satunya tombol di aplikasi ini yang menulis ke buku
          besar dari jalur pesanan — aturan #2 menuntut mata manusia melihatnya
          dulu, dan angkanya diulang di sini supaya yang dilihat adalah angka,
          bukan sekadar kata "yakin?". */}
      <BottomSheet
        buka={konfirmasi}
        onTutup={() => setKonfirmasi(false)}
        judul="Catat penjualan ini?"
        keterangan="Setelah dicatat, angkanya masuk buku dan tidak dihapus lagi."
        aksi={
          <div className="flex flex-col gap-2">
            <Tombol varian="utama" disabled={sibuk} onClick={() => void selesai()}>
              {sibuk ? 'Mencatat…' : 'Ya, catat sekarang'}
            </Tombol>
            <button
              type="button"
              onClick={() => setKonfirmasi(false)}
              className="min-h-12 text-utama font-semibold text-sedang transition active:scale-95"
            >
              Belum
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-2 py-1">
          <Baris kiri="Pesanan" kanan={`#${p.nomor}`} />
          <Baris kiri="Produk" kanan={`${p.nama_produk} × ${p.jumlah}`} />
          <Baris kiri="Nilai pesanan" kanan={formatRupiah(p.nilai_pesanan)} />
          <Baris
            kiri="Untung"
            kanan={
              p.untung_pesanan == null
                ? '—'
                : `${p.merugi ? '\u2212' : '+'} ${formatRupiah(Math.abs(p.untung_pesanan))}`
            }
            nada={p.untung_pesanan == null ? undefined : p.merugi ? 'rugi' : 'untung'}
          />
          <Baris kiri="Stok" kanan="Berkurang sesuai resep" />
        </div>
      </BottomSheet>

      <BottomSheet
        buka={sheetBatal}
        onTutup={() => setSheetBatal(false)}
        judul="Kenapa dibatalkan?"
        keterangan="Alasannya ikut tersimpan, supaya nanti terlihat pola pembatalannya."
        aksi={
          <Tombol varian="gelap" disabled={sibuk || !alasan.trim()} onClick={() => void batal()}>
            {sibuk ? 'Membatalkan…' : 'Batalkan pesanan'}
          </Tombol>
        }
      >
        <div className="flex flex-col gap-2 py-1">
          {['Pembeli berubah pikiran', 'Stok habis', 'Harganya tidak cocok', 'Salah tekan'].map(
            (a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAlasan(a)}
                className={`min-h-14 rounded-kontrol border-[1.5px] px-4 text-left text-utama font-semibold transition active:scale-[0.98] ${
                  alasan === a ? 'border-hero bg-kanvas text-tinta' : 'border-garis-tua text-sedang'
                }`}
              >
                {a}
              </button>
            ),
          )}
          <input
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            placeholder="Atau tulis sendiri"
            className="mt-1 min-h-14 rounded-kontrol border-[1.5px] border-garis-tua bg-kartu px-4 text-utama text-tinta outline-none placeholder:text-redup focus:border-hero"
          />
        </div>
      </BottomSheet>
    </Layar>
  );
}

function Baris({
  kiri,
  kanan,
  nada,
}: {
  kiri: string;
  kanan: string;
  nada?: 'untung' | 'rugi';
}) {
  const warna = nada === 'rugi' ? 'text-rugi' : nada === 'untung' ? 'text-untung' : 'text-tinta';
  return (
    <div className="flex items-center justify-between gap-3 border-b border-garis py-2.5 last:border-0">
      <span className="text-isi text-sedang">{kiri}</span>
      <span className={`angka text-utama font-bold ${warna}`}>{kanan}</span>
    </div>
  );
}
