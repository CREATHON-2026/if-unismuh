import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatRupiah } from '@shared/format/rupiah';
import type { RiwayatPesanan as Riwayat, StatusPesanan } from '@shared/types';
import { riwayatPesanan } from '../api/client';
import { KepalaHero } from '../components/KepalaHero';
import { Layar } from '../components/Layar';
import { Lembar } from '../components/Lembar';
import { Lencana } from '../components/Lencana';
import { NavBawah } from '../components/NavBawah';

/**
 * Riwayat Pesanan — buku pesanan, bukan buku kas.
 *
 * Yang batal ikut ditampilkan. Riwayat yang hanya memuat keberhasilan bukan
 * riwayat, melainkan brosur — dan pedagang justru butuh melihat pola
 * pembatalannya untuk tahu ada yang salah di harga atau stoknya.
 *
 * Ringkasan atas dihitung SQL sebagai agregat penuh, bukan dari menjumlahkan
 * daftar di bawahnya. Daftar ini dibatasi; menjumlahkan yang terlihat akan
 * diam-diam salah begitu pesanannya lebih banyak dari batas itu.
 */
const TAB: { nilai: StatusPesanan | 'semua'; label: string }[] = [
  { nilai: 'semua', label: 'Semua' },
  { nilai: 'menunggu_bayar', label: 'Belum bayar' },
  { nilai: 'diproses', label: 'Diproses' },
  { nilai: 'selesai', label: 'Selesai' },
  { nilai: 'batal', label: 'Batal' },
];

const LABEL_STATUS: Record<StatusPesanan, string> = {
  menunggu_bayar: 'BELUM DIBAYAR',
  diproses: 'SIAP DISERAHKAN',
  selesai: 'SELESAI',
  batal: 'BATAL',
};

const NADA_STATUS: Record<StatusPesanan, 'netral' | 'untung' | 'tanda'> = {
  menunggu_bayar: 'tanda',
  diproses: 'tanda',
  selesai: 'untung',
  batal: 'netral',
};

function waktuSingkat(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export function RiwayatPesanan() {
  const nav = useNavigate();
  const [tab, setTab] = useState<StatusPesanan | 'semua'>('semua');
  const [data, setData] = useState<Riwayat | null>(null);
  const [galat, setGalat] = useState('');

  useEffect(() => {
    let batal = false;
    void (async () => {
      const j = await riwayatPesanan(tab === 'semua' ? undefined : tab);
      if (batal) return;
      if (j.ok) setData(j.data);
      else setGalat(j.error.pesan);
    })();
    return () => {
      batal = true;
    };
  }, [tab]);

  const r = data?.ringkasan;

  return (
    <Layar
      hero={
        <KepalaHero
          judul="Riwayat Pesanan"
          kembali={() => nav('/pesanan')}
          label={r ? 'Untung dari pesanan yang sudah selesai' : undefined}
          nilai={r ? `${r.untung < 0 ? '\u2212' : '+'} ${formatRupiah(Math.abs(r.untung))}` : undefined}
          nada={r && r.untung < 0 ? 'rugi' : 'untung'}
          catatan={
            r && r.gagal > 0
              ? `${r.gagal} pesanan batal tidak ikut dihitung — memang tidak pernah menyentuh buku.`
              : undefined
          }
          bawah={
            r && (
              <div className="mx-auto grid max-w-[19rem] grid-cols-3 gap-3 border-t border-white/20 pt-4">
                <Angka label="Selesai" nilai={r.selesai} />
                <Angka label="Diproses" nilai={r.diproses + r.menunggu_bayar} />
                <Angka label="Piutang" nilai={r.belum_dibayar} sorot={r.belum_dibayar > 0} />
              </div>
            )
          }
        />
      }
    >
      <Lembar className="pb-2">
        {/* Lima tab tidak muat di 390px kalau dipaksa satu baris rata. Digulir
            mendatar, bukan dikecilkan hurufnya — target sentuh tetap besar. */}
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {TAB.map((t) => (
            <button
              key={t.nilai}
              type="button"
              onClick={() => setTab(t.nilai)}
              aria-pressed={tab === t.nilai}
              className={`min-h-11 shrink-0 rounded-full px-4 text-isi font-semibold transition active:scale-95 ${
                tab === t.nilai
                  ? 'bg-merek text-white'
                  : 'border-[1.5px] border-garis-tua bg-kartu text-sedang'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {galat && (
          <p className="mt-3 rounded-kartu bg-rugi-muda p-4 text-utama text-rugi-tua">{galat}</p>
        )}

        {data && data.daftar.length === 0 && (
          <p className="kartu mt-3 p-5 text-utama leading-relaxed text-redup">
            Belum ada pesanan di bagian ini.
          </p>
        )}

        {data && data.daftar.length > 0 && (
          <div className="kartu mt-3 flex flex-col divide-y divide-garis px-5">
            {data.daftar.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => nav(`/proses/${p.id}`)}
                className="py-4 text-left transition active:scale-[0.99]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="angka text-utama font-bold text-tinta">#{p.nomor}</span>
                  <Lencana nada={NADA_STATUS[p.status]}>{LABEL_STATUS[p.status]}</Lencana>
                </div>
                <p className="mt-1 truncate text-utama text-sedang">
                  {p.nama_produk} × {p.jumlah}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-isi">
                  <span className="text-redup">{waktuSingkat(p.dibuat_pada)}</span>
                  <span className="angka font-semibold text-tinta">
                    {formatRupiah(p.nilai_pesanan)}
                  </span>
                  {p.status === 'selesai' && p.untung_pesanan != null && (
                    <span className={`angka font-semibold ${p.merugi ? 'text-rugi' : 'text-untung'}`}>
                      {p.merugi ? '\u2212' : '+'} {formatRupiah(Math.abs(p.untung_pesanan))}
                    </span>
                  )}
                  {/* Piutang ditandai jelas: pesanan yang sudah diserahkan tapi
                      uangnya belum masuk paling gampang terlupakan. */}
                  {p.cara_bayar === 'nanti' && !p.dibayar_pada && p.status !== 'batal' && (
                    <Lencana nada="tanda">UANG BELUM MASUK</Lencana>
                  )}
                </div>
                {p.alasan_batal && (
                  <p className="mt-1 text-isi text-redup">Batal — {p.alasan_batal}</p>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Riwayat sekarang salah satu dari lima slot navigasi. Tanpa NavBawah
            di sini, masuk ke Riwayat berarti terjebak — satu-satunya jalan
            keluar tombol kembali di pojok. */}
        <NavBawah />
      </Lembar>
    </Layar>
  );
}

function Angka({ label, nilai, sorot }: { label: string; nilai: number; sorot?: boolean }) {
  return (
    <div>
      <p className="text-isi text-white/70">{label}</p>
      <p className={`angka mt-0.5 text-judul-kecil font-bold ${sorot ? 'text-rugi-terang' : 'text-white'}`}>
        {nilai}
      </p>
    </div>
  );
}
