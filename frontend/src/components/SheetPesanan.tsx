import { useEffect, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { formatRupiah } from '@shared/format/rupiah';
import type { PesanMasukItem, PilihanPesanan, RingkasanProduk } from '@shared/types';
import { pilihanPesan } from '../api/client';
import { BottomSheet } from './BottomSheet';
import { Lencana } from './Lencana';
import { Tombol } from './Tombol';

/**
 * Sheet keputusan pesanan.
 *
 * Menggantikan tombol "Periksa pesanan ini" yang lama. Tombol itu menjalankan
 * ulang LLM tiap kali ditekan — hasilnya bisa berbeda dari kali sebelumnya, dan
 * tiap ketukan menyisipkan baris baru ke kotak masuk. Pemeriksaan ulang oleh AI
 * bukan yang dibutuhkan pedagang; yang dibutuhkan adalah MEMILIH, sekali,
 * dengan bacaan AI sebagai titik awal.
 *
 * Yang ditampilkan: seberapa yakin AI, lalu pilihan-pilihannya. Kalau AI ragu
 * (aturan #8) daftar produk dibuka sendiri — jangan menunggu pedagang menemukan
 * tombol untuk mengoreksi sesuatu yang ia belum tahu salah.
 *
 * TIDAK ADA HITUNGAN UANG DI SINI. Untung pesanan baru muncul setelah pesanan
 * dibuat, langsung dari SQL (aturan #7).
 */
export function SheetPesanan({
  pesan,
  onTutup,
  onProses,
  onBalas,
  sibuk,
}: {
  pesan: PesanMasukItem | null;
  onTutup: () => void;
  onProses: (arg: { produk_id: number; jumlah: number; harga_satuan: number }) => void;
  /** Keluar ke jalur balasan — dipakai saat pembeli masih menawar */
  onBalas: () => void;
  sibuk: boolean;
}) {
  const [pilihan, setPilihan] = useState<PilihanPesanan | null>(null);
  const [galat, setGalat] = useState('');
  const [produkId, setProdukId] = useState<number | null>(null);
  const [jumlah, setJumlah] = useState(1);
  const [harga, setHarga] = useState('');
  const [bukaSemua, setBukaSemua] = useState(false);

  useEffect(() => {
    if (!pesan) return;
    setPilihan(null);
    setGalat('');
    setBukaSemua(false);

    let batal = false;
    void (async () => {
      const j = await pilihanPesan(pesan.pesan_id);
      if (batal) return;
      if (!j.ok) {
        setGalat(j.error.pesan);
        return;
      }
      setPilihan(j.data);
      setJumlah(j.data.jumlah ?? 1);

      // Tebakan AI dipakai sebagai titik awal, bukan sebagai keputusan.
      const awal = pesan.produk_id ?? j.data.kandidat[0]?.id ?? null;
      setProdukId(awal);
      setHarga(
        String(
          j.data.harga_diminta ?? j.data.produk.find((p) => p.id === awal)?.harga_jual ?? '',
        ),
      );
      // Aturan #8: kalau AI tidak yakin, jangan sembunyikan pilihannya.
      if (j.data.perlu_dicek || awal == null) setBukaSemua(true);
    })();

    return () => {
      batal = true;
    };
  }, [pesan]);

  function gantiProduk(id: number) {
    setProdukId(id);
    // Harga tawar pembeli tetap dipertahankan kalau ada — itu yang sedang
    // dirundingkan. Kalau tidak ada, ikuti harga daftar produk yang dipilih.
    if (pilihan?.harga_diminta == null) {
      const p = pilihan?.produk.find((x) => x.id === id);
      if (p) setHarga(String(p.harga_jual));
    }
  }

  const hargaAngka = Number(harga.replace(/\D/g, ''));
  const siap = produkId != null && jumlah > 0 && hargaAngka > 0 && !sibuk;
  const terpilih = pilihan?.produk.find((p) => p.id === produkId) ?? null;

  // Yang selalu terlihat: kandidat dari AI, DITAMBAH produk yang sedang
  // terpilih. Tanpa penambahan itu, pedagang yang tebakannya sudah benar
  // (kandidat kosong karena AI yakin) melihat daftar produk kosong dan tidak
  // tahu apa yang akan diprosesnya.
  const utama = (() => {
    if (!pilihan) return [];
    const dari = pilihan.kandidat
      .map((k) => pilihan.produk.find((p) => p.id === k.id))
      .filter((p): p is RingkasanProduk => p != null);
    if (terpilih && !dari.some((p) => p.id === terpilih.id)) dari.unshift(terpilih);
    return dari;
  })();
  const idUtama = new Set(utama.map((p) => p.id));
  const lainnya = pilihan?.produk.filter((p) => !idUtama.has(p.id)) ?? [];

  return (
    <BottomSheet
      buka={pesan != null}
      onTutup={onTutup}
      judul="Pesanan ini isinya apa?"
      keterangan="Betulkan kalau AI salah baca. Yang Anda pilih di sini yang dipakai."
      aksi={
        <div className="flex flex-col gap-2">
          <Tombol
            varian="utama"
            disabled={!siap}
            onClick={() =>
              produkId != null &&
              onProses({ produk_id: produkId, jumlah, harga_satuan: hargaAngka })
            }
          >
            {sibuk ? 'Membuat pesanan…' : 'Proses pesanan'}
          </Tombol>
          {/* Belum semua chat siap jadi pesanan — sebagian masih tawar-menawar.
              Jalan keluarnya harus ada di sini, bukan setelah pesanan terlanjur
              dibuat lalu harus dibatalkan. */}
          <button
            type="button"
            onClick={onBalas}
            className="min-h-12 text-utama font-semibold text-sedang transition active:scale-95"
          >
            Masih nego — siapkan balasan
          </button>
        </div>
      }
    >
      {pesan && (
        <p className="rounded-kontrol bg-kanvas p-4 text-isi leading-relaxed text-sedang">
          “{pesan.teks}”
        </p>
      )}

      {galat && <p className="mt-3 text-utama text-rugi-tua">{galat}</p>}

      {!pilihan && !galat && (
        <p className="py-8 text-center text-utama text-redup">Membuka pilihan…</p>
      )}

      {pilihan && (
        <>
          {/* Keyakinan AI, dikatakan apa adanya. Kalimatnya berbeda bukan cuma
              warnanya — pedagang yang buru-buru membaca kalimat, bukan warna. */}
          <div
            className={`mt-3 rounded-kontrol p-4 ${
              pilihan.perlu_dicek ? 'bg-tanda' : 'bg-untung-pucat'
            }`}
          >
            {pilihan.perlu_dicek ? (
              <>
                <Lencana nada="tanda">AI TIDAK YAKIN</Lencana>
                <p className="mt-2 text-isi leading-relaxed text-tanda-tinta">
                  Pembeli menulis “{pilihan.nama_produk_mentah ?? '—'}”, dan itu tidak persis
                  cocok dengan produk mana pun. Pilih sendiri yang benar.
                </p>
              </>
            ) : (
              <p className="text-isi leading-relaxed text-untung-tua">
                AI cukup yakin ini{' '}
                <span className="font-bold">{terpilih?.nama ?? pilihan.nama_produk_mentah}</span>.
                Tetap boleh diganti.
              </p>
            )}
          </div>

          <p className="label-bagian mt-5">PRODUK</p>
          <div className="mt-2 flex flex-col gap-2">
            {utama.map((p) => (
              <BarisProduk
                key={p.id}
                nama={p.nama}
                harga={p.harga_jual}
                merugi={p.merugi}
                terpilih={produkId === p.id}
                onPilih={() => gantiProduk(p.id)}
              />
            ))}

            {lainnya.length > 0 && !bukaSemua && (
              <button
                type="button"
                onClick={() => setBukaSemua(true)}
                className="flex min-h-14 items-center justify-center gap-2 rounded-kontrol border-[1.5px] border-dashed border-garis-tua text-utama font-semibold text-sedang transition active:scale-[0.98]"
              >
                Produk lain ({lainnya.length})
                <ChevronDown size={18} aria-hidden="true" />
              </button>
            )}

            {bukaSemua &&
              lainnya.map((p) => (
                <BarisProduk
                  key={p.id}
                  nama={p.nama}
                  harga={p.harga_jual}
                  merugi={p.merugi}
                  terpilih={produkId === p.id}
                  onPilih={() => gantiProduk(p.id)}
                />
              ))}
          </div>

          <div className="mt-5 flex gap-3">
            <div className="w-32 shrink-0">
              <p className="label-bagian">JUMLAH</p>
              <div className="mt-2 flex items-center gap-1">
                <BtnAngka label="Kurangi" onClick={() => setJumlah((n) => Math.max(1, n - 1))}>
                  −
                </BtnAngka>
                <input
                  inputMode="numeric"
                  value={jumlah}
                  onChange={(e) => setJumlah(Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1))}
                  className="angka h-14 w-full min-w-0 rounded-kontrol border-[1.5px] border-garis-tua bg-kartu text-center text-sub font-bold text-tinta outline-none focus:border-hero"
                />
                <BtnAngka label="Tambah" onClick={() => setJumlah((n) => n + 1)}>
                  +
                </BtnAngka>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <p className="label-bagian">HARGA SATUAN</p>
              <div className="mt-2 flex h-14 items-center rounded-kontrol border-[1.5px] border-garis-tua bg-kartu px-3 focus-within:border-hero">
                <span className="text-utama text-redup">Rp</span>
                <input
                  inputMode="numeric"
                  value={harga ? Number(harga.replace(/\D/g, '')).toLocaleString('id-ID') : ''}
                  onChange={(e) => setHarga(e.target.value.replace(/\D/g, ''))}
                  className="angka ml-2 w-full min-w-0 bg-transparent text-sub font-bold text-tinta outline-none"
                />
              </div>
            </div>
          </div>

          {pilihan.harga_diminta != null && (
            <p className="mt-2 text-isi leading-relaxed text-sedang">
              Pembeli menawar {formatRupiah(pilihan.harga_diminta)}. Untung atau ruginya
              ditunjukkan di layar berikutnya, sebelum apa pun tercatat.
            </p>
          )}
        </>
      )}
    </BottomSheet>
  );
}

function BarisProduk({
  nama,
  harga,
  merugi,
  terpilih,
  onPilih,
}: {
  nama: string;
  harga: number | null;
  merugi: boolean | null;
  terpilih: boolean;
  onPilih: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPilih}
      aria-pressed={terpilih}
      className={`flex min-h-16 w-full items-center gap-3 rounded-kontrol border-[1.5px] px-4 text-left transition active:scale-[0.98] ${
        terpilih ? 'border-hero bg-kanvas' : 'border-garis-tua bg-kartu'
      }`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] ${
          terpilih ? 'border-hero bg-hero text-white' : 'border-garis-tua'
        }`}
        aria-hidden="true"
      >
        {terpilih && <Check size={14} strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-utama font-bold text-tinta">{nama}</span>
        {harga != null && (
          <span className="angka block text-isi text-redup">{formatRupiah(harga)}</span>
        )}
      </span>
      {merugi && <Lencana nada="rugi">RUGI</Lencana>}
    </button>
  );
}

function BtnAngka({
  children,
  label,
  onClick,
}: {
  children: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="h-14 w-11 shrink-0 rounded-kontrol border-[1.5px] border-garis-tua bg-kartu text-sub font-bold text-tinta transition active:scale-95"
    >
      {children}
    </button>
  );
}
