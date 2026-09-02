import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, PackagePlus, Plus, Search, ThumbsUp } from 'lucide-react';
import { formatRupiah } from '@shared/format/rupiah';
import type { RingkasanProduk } from '@shared/types';
import { ambilDaftarProduk } from '../api/client';
import { Layar } from '../components/Layar';
import { KepalaAplikasi } from '../components/KepalaAplikasi';
import { Lencana } from '../components/Lencana';
import { Segmented } from '../components/Segmented';
import { NavBawah } from '../components/NavBawah';
import { KeadaanGalat } from '../components/KeadaanGalat';
import { KeadaanKosong } from '../components/KeadaanKosong';
import { RangkaDaftar } from '../components/Rangka';

type Saringan = 'semua' | 'merugi' | 'untung';

const SARINGAN: readonly { nilai: Saringan; label: string }[] = [
  { nilai: 'semua', label: 'Semua' },
  { nilai: 'merugi', label: 'Merugi' },
  { nilai: 'untung', label: 'Untung' },
];

/**
 * Daftar produk — fitur 6.
 *
 * Urutannya datang dari API: margin TERENDAH lebih dulu. Itu bagian dari
 * fiturnya, bukan selera — pedagang tidak tahu produk mana yang merugikan,
 * jadi yang merugi harus terlihat tanpa perlu dicari.
 *
 * Frontend tidak mengurutkan ulang dan tidak menghitung apa pun. Penyaring di
 * bawah hanya MENYEMBUNYIKAN baris memakai penanda `merugi` yang sudah dikirim
 * API; ia tidak pernah memutuskan sendiri mana yang merugi.
 */
export function DaftarProduk() {
  const nav = useNavigate();
  const [daftar, setDaftar] = useState<RingkasanProduk[] | null>(null);
  const [saring, setSaring] = useState<Saringan>('semua');
  const [cari, setCari] = useState('');
  const [galat, setGalat] = useState('');

  const [memuat, setMemuat] = useState(true);

  async function muat() {
    setMemuat(true);
    setGalat('');
    const j = await ambilDaftarProduk();
    if (j.ok) setDaftar(j.data);
    else setGalat(j.error.pesan);
    setMemuat(false);
  }

  useEffect(() => {
    void muat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // `merugi` bisa null kalau modalnya belum diketahui. Yang belum diketahui
  // tidak masuk "Untung" — belum tahu bukan berarti aman. Pencarian nama
  // murni penyaring tampilan; urutan margin terendah dari API tidak diubah.
  const kataCari = cari.trim().toLowerCase();
  const terlihat = daftar?.filter(
    (p) =>
      (saring === 'semua' ? true : saring === 'merugi' ? p.merugi === true : p.merugi === false) &&
      (kataCari === '' || p.nama.toLowerCase().includes(kataCari)),
  );

  return (
    <Layar tanpaLogo atas>
      <KepalaAplikasi />
      <h1 className="mt-7 text-judul font-bold tracking-[-0.02em] text-tinta">Daftar Produk</h1>
      <p className="mt-1 text-utama leading-relaxed text-sedang">
        Kelola barang dagangan Anda di sini.
      </p>

      {galat && <KeadaanGalat pesan={galat} onCoba={() => void muat()} sedangMencoba={memuat} />}
      {!daftar && !galat && (
        <div className="mt-4">
          <RangkaDaftar baris={3} />
        </div>
      )}

      {daftar && daftar.length > 0 && (
        <>
          <label className="mt-4 flex items-center gap-3 rounded-full border border-garis bg-kartu px-4 py-3.5">
            <Search size={20} strokeWidth={1.8} className="shrink-0 text-redup" aria-hidden="true" />
            <input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari produk…"
              className="w-full bg-transparent text-utama text-tinta placeholder:text-redup focus:outline-none"
            />
          </label>
          <div className="mt-3">
            <Segmented
              label="Saring produk"
              pilihan={SARINGAN}
              nilai={saring}
              onPilih={setSaring}
            />
          </div>
        </>
      )}

      {daftar?.length === 0 && (
        <KeadaanKosong
          ikon={PackagePlus}
          judul="Belum ada produk"
          pesan="Ceritakan satu produk beserta bahannya, lalu modal dan untungnya dihitung sendiri."
          labelAksi="Tambah produk"
          onAksi={() => nav('/onboarding/produk')}
        />
      )}

      {/* Saringan atau pencarian yang tidak menghasilkan apa-apa. "Tidak ada
          yang merugi" adalah kabar baik, bukan pekerjaan — jadi tanpa tombol. */}
      {terlihat?.length === 0 && daftar && daftar.length > 0 && (
        kataCari !== '' ? (
          <KeadaanKosong
            ikon={Search}
            judul="Tidak ketemu"
            pesan={`Tidak ada produk bernama “${cari.trim()}”. Coba kata yang lain.`}
          />
        ) : saring === 'merugi' ? (
          <KeadaanKosong
            ikon={ThumbsUp}
            judul="Tidak ada yang merugi"
            pesan="Semua produk Anda menutup modalnya. Tidak ada yang perlu dibetulkan sekarang."
          />
        ) : (
          <KeadaanKosong
            ikon={Package}
            judul="Belum ada yang pasti untung"
            pesan="Produk yang resepnya belum lengkap tidak dihitung untung — modalnya belum diketahui."
            labelAksi="Lengkapi resep"
            onAksi={() => nav('/onboarding/produk')}
          />
        )
      )}

      {terlihat && terlihat.length > 0 && (
        <div className="mt-3 flex flex-col gap-3">
          {terlihat.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => nav(`/produk/${p.id}`)}
              /* .kartu tidak dipakai saat merugi: kelasnya tak berlapis (unlayered)
                 sehingga menang atas utilitas border-rugi. Ditulis penuh saja. */
              className={`w-full rounded-kartu border bg-kartu p-4 text-left transition active:scale-[0.99] ${
                p.merugi ? 'border-rugi' : 'border-garis'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 flex items-center gap-3">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      p.merugi ? 'bg-rugi-muda text-rugi' : 'bg-kanvas text-sedang'
                    }`}
                    aria-hidden="true"
                  >
                    <Package size={20} strokeWidth={1.8} />
                  </span>
                  <span className="truncate text-sub font-bold text-tinta">{p.nama}</span>
                </span>
                {/* Produk bisa TERLARIS sekaligus MERUGI — dan justru itu inti
                    ceritanya. TERLARIS kuning HANYA kalau produknya juga merugi:
                    kuning berarti "perlu dicek", dan terlaris-tapi-rugi persis itu. */}
                {(p.merugi || p.terlaris) && (
                  <span className="flex shrink-0 flex-col items-end gap-1.5">
                    {p.merugi && <Lencana nada="rugi">MERUGI</Lencana>}
                    {p.terlaris && (
                      <Lencana nada={p.merugi ? 'tanda' : 'netral'}>TERLARIS</Lencana>
                    )}
                  </span>
                )}
              </div>

              <div className="mt-3.5 flex items-end justify-between gap-3 border-t border-garis pt-3">
                <span className="flex flex-col gap-1 text-isi text-redup">
                  <span>
                    Modal{' '}
                    <span className="angka font-semibold text-sedang">
                      {p.modal_per_unit == null ? 'belum diisi' : formatRupiah(p.modal_per_unit)}
                    </span>
                  </span>
                  <span>
                    Jual{' '}
                    <span className="angka font-semibold text-sedang">
                      {formatRupiah(p.harga_jual)}
                    </span>
                  </span>
                </span>
                {/* null = belum diketahui. Bukan nol, dan bukan untung penuh. */}
                <span className="flex shrink-0 flex-col items-end">
                  <span
                    className={`text-label font-semibold ${
                      p.margin_per_unit == null
                        ? 'text-redup'
                        : p.merugi
                          ? 'text-rugi'
                          : 'text-untung'
                    }`}
                  >
                    Margin
                  </span>
                  <span
                    className={`angka text-judul-kecil font-extrabold leading-tight ${
                      p.margin_per_unit == null
                        ? 'text-redup'
                        : p.merugi
                          ? 'text-rugi'
                          : 'text-untung'
                    }`}
                  >
                    {p.margin_per_unit == null
                      ? '—'
                      : `${p.merugi ? '−' : '+'} ${formatRupiah(Math.abs(p.margin_per_unit))}`}
                  </span>
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* FAB tambah produk — aksen merek. Ikon navy di atas oranye: 3,4:1,
          lolos batas kontras non-teks; putih hanya 2,8:1, makanya bukan putih. */}
      {daftar && daftar.length > 0 && (
        <div className="pointer-events-none sticky bottom-24 z-10 mt-4 flex justify-end">
          <button
            type="button"
            aria-label="Tambah produk"
            onClick={() => nav('/onboarding/produk')}
            className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-aksen text-tinta shadow-lg transition active:scale-95"
          >
            <Plus size={26} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>
      )}

      <NavBawah />
    </Layar>
  );
}
