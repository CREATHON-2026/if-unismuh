import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellOff, ChevronRight, CircleAlert, ShoppingCart, TriangleAlert } from 'lucide-react';
import { formatRupiah } from '@shared/format/rupiah';
import type { Beranda, PesanMasukItem } from '@shared/types';
import { ambilBeranda, daftarPesanan } from '../api/client';
import { Layar } from '../components/Layar';
import { KepalaAplikasi } from '../components/KepalaAplikasi';
import { NavBawah } from '../components/NavBawah';
import { KeadaanKosong } from '../components/KeadaanKosong';
import { RangkaDaftar } from '../components/Rangka';

/**
 * Notifikasi — rupa mengikuti rancangan tim; isinya hanya yang benar-benar ada.
 *
 * Bukan sistem push. Dua jenis isi:
 * 1. KEJADIAN: pesanan masuk (punya waktu, bisa "belum/sudah dibaca" —
 *    disimpan sebagai stempel waktu di localStorage, murni keadaan tampilan).
 * 2. KONDISI: produk merugi & penjualan tanpa modal — tampil selama masih
 *    benar, tidak bisa "ditandai dibaca" karena bukan kejadian sekali lewat.
 *
 * Dari mockup yang sengaja TIDAK dibawa: "Info Sistem/Tips" (tidak ada sistem
 * konten — baris karangan), "Stok Menipis" (GET /stok tidak punya penanda
 * menipis; ambang batasnya keputusan bisnis — kalau mau, minta flag `menipis`
 * hasil SQL ke backend lewat docs/06, jangan diputuskan frontend).
 */
const KUNCI_DIBACA = 'lapakai_notif_dibaca';

/** "2 mnt lalu", "3 jam lalu", "Kemarin", lalu tanggal — murni tampilan. */
function waktuRelatif(iso: string): string {
  const detik = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (detik < 60) return 'baru saja';
  const mnt = Math.floor(detik / 60);
  if (mnt < 60) return `${mnt} mnt lalu`;
  const jam = Math.floor(mnt / 60);
  if (jam < 24) return `${jam} jam lalu`;
  if (jam < 48) return 'Kemarin';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export function Notifikasi() {
  const nav = useNavigate();
  const [beranda, setBeranda] = useState<Beranda | null>(null);
  const [pesanan, setPesanan] = useState<PesanMasukItem[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [dibacaSejak, setDibacaSejak] = useState(
    () => localStorage.getItem(KUNCI_DIBACA) ?? '',
  );

  useEffect(() => {
    // Dua sumber independen; yang gagal cukup tidak menyumbang item.
    void Promise.all([
      ambilBeranda().then((j) => {
        if (j.ok) setBeranda(j.data);
      }),
      daftarPesanan().then((j) => {
        if (j.ok) setPesanan(j.data);
      }),
    ]).finally(() => setMemuat(false));
  }, []);

  function tandaiSemuaDibaca() {
    const kini = new Date().toISOString();
    localStorage.setItem(KUNCI_DIBACA, kini);
    setDibacaSejak(kini);
  }

  const kejadian = pesanan.slice(0, 5);
  const adaBelumDibaca = kejadian.some((p) => p.diterima_pada > dibacaSejak);
  const adaKondisi =
    (beranda?.jumlah_produk_merugi ?? 0) > 0 || (beranda?.baris_tanpa_modal ?? 0) > 0;
  const kosong = !memuat && kejadian.length === 0 && !adaKondisi;

  return (
    <Layar tanpaLogo atas>
      <KepalaAplikasi />

      <div className="mt-7 flex items-center justify-between gap-3">
        <h1 className="text-judul font-bold tracking-[-0.02em] text-tinta">Notifikasi</h1>
        {adaBelumDibaca && (
          <button
            type="button"
            onClick={tandaiSemuaDibaca}
            className="min-h-11 shrink-0 rounded-full bg-merek-muda px-4 text-isi font-semibold text-tinta transition hover:bg-merek-muda/70 active:scale-95"
          >
            Tandai sudah dibaca
          </button>
        )}
      </div>

      {memuat && (
        <div className="mt-4">
          <RangkaDaftar baris={3} />
        </div>
      )}

      {kosong && (
        <KeadaanKosong
          ikon={BellOff}
          judul="Tidak ada yang perlu diperhatikan"
          pesan="Semua produk menutup modalnya dan tidak ada pesanan yang menunggu. Kabar baik."
        />
      )}

      {!memuat && (
        <div className="mt-4 flex flex-col gap-3">
          {/* KEJADIAN: pesanan masuk, terbaru dulu. Belum dibaca = bilah aksen. */}
          {kejadian.map((p) => {
            const belumDibaca = p.diterima_pada > dibacaSejak;
            return (
              <button
                key={p.pesan_id}
                type="button"
                onClick={() => nav('/pesanan')}
                /* Ditulis penuh, bukan .kartu: kelas .kartu tak berlapis dan
                   menang atas utilitas border-l — bilah kirinya tak akan tampak. */
                className={`flex w-full items-start gap-3.5 rounded-kartu border border-garis bg-kartu p-4 text-left transition active:scale-[0.99] ${
                  belumDibaca ? 'border-l-4 border-l-aksen' : ''
                }`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                    p.perlu_dicek ? 'bg-tanda text-tanda-tinta' : 'bg-merek-muda text-merek-tua'
                  }`}
                  aria-hidden="true"
                >
                  <ShoppingCart size={20} strokeWidth={1.9} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-utama font-bold text-tinta">
                      {p.perlu_dicek ? 'Pesanan perlu dicek' : 'Pesanan baru'}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-kecil text-redup">
                      {waktuRelatif(p.diterima_pada)}
                      {belumDibaca && (
                        <span className="h-2 w-2 rounded-full bg-merek" aria-hidden="true" />
                      )}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-isi leading-relaxed text-sedang">
                    {p.jumlah != null
                      ? `Pelanggan memesan ${p.jumlah}× ${p.nama_produk ?? p.nama_produk_mentah ?? 'produk'}.`
                      : (p.nama_produk ?? p.nama_produk_mentah ?? p.teks)}
                  </span>
                </span>
              </button>
            );
          })}

          {/* KONDISI: tampil selama masih benar — tidak ikut "tandai dibaca". */}
          {beranda && beranda.jumlah_produk_merugi > 0 && (
            <button
              type="button"
              onClick={() => nav('/produk')}
              className="kartu flex w-full items-start gap-3.5 p-4 text-left transition active:scale-[0.99]"
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rugi-muda text-rugi"
                aria-hidden="true"
              >
                <TriangleAlert size={20} strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-3">
                  <span className="text-utama font-bold text-rugi">Peringatan margin</span>
                  <ChevronRight size={18} className="shrink-0 text-redup" aria-hidden="true" />
                </span>
                <span className="mt-0.5 block text-isi leading-relaxed text-sedang">
                  {beranda.jumlah_produk_merugi} produk dijual di bawah modal
                  {beranda.produk_paling_merugi
                    ? ` — paling parah ${beranda.produk_paling_merugi.nama}, rugi ${formatRupiah(
                        Math.abs(beranda.produk_paling_merugi.margin_per_unit),
                      )} tiap terjual.`
                    : '.'}
                </span>
              </span>
            </button>
          )}

          {beranda && beranda.baris_tanpa_modal > 0 && (
            <button
              type="button"
              onClick={() => nav('/produk')}
              className="kartu flex w-full items-start gap-3.5 p-4 text-left transition active:scale-[0.99]"
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tanda text-tanda-tinta"
                aria-hidden="true"
              >
                <CircleAlert size={20} strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-3">
                  <span className="text-utama font-bold text-tinta">Belum terhitung</span>
                  <ChevronRight size={18} className="shrink-0 text-redup" aria-hidden="true" />
                </span>
                <span className="mt-0.5 block text-isi leading-relaxed text-sedang">
                  {beranda.baris_tanpa_modal} penjualan belum ikut dihitung untungnya — lengkapi
                  resep produknya.
                </span>
              </span>
            </button>
          )}

          {!kosong && (
            <p className="px-1 text-kecil leading-relaxed text-redup">
              Ketuk untuk menindaklanjuti — tidak ada yang dikirim ke HP Anda.
            </p>
          )}
        </div>
      )}

      <NavBawah />
    </Layar>
  );
}
