import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, MessageCircle } from 'lucide-react';
import { formatRupiah } from '@shared/format/rupiah';
import type { AnalisisPesanan, BalasanReq, BalasanRes, PesanMasukItem } from '@shared/types';
import { analisisPesanan, buatBalasan, daftarPesanan } from '../api/client';
import { Layar } from '../components/Layar';
import { KepalaAplikasi } from '../components/KepalaAplikasi';
import { KartuHero } from '../components/KartuHero';
import { Lencana } from '../components/Lencana';
import { NavBawah } from '../components/NavBawah';
import { Tombol } from '../components/Tombol';

/**
 * Pesanan Masuk — fitur 9, puncak skrip demo.
 *
 * ★ SISTEM TIDAK PERNAH MENGIRIM APA PUN KE PEMBELI (aturan #4). Tidak ada
 * tombol kirim di layar ini, dan tidak boleh ditambahkan. Balasan disalin, lalu
 * pedagang sendiri yang menempelkannya di WhatsApp-nya. Reputasi pedagang ada di
 * chat itu; sistem yang bisa mengirim atas namanya adalah sistem yang bisa
 * mempermalukannya.
 *
 * Peringatan muncul SEBELUM tombol maksud, bukan sesudah — supaya pedagang tahu
 * pesanan ini merugikan sebelum ia memutuskan, bukan setelah.
 *
 * Semua angka (nilai pesanan, untung, kecukupan stok) dihitung SQL.
 */
const MAKSUD: { nilai: BalasanReq['maksud']; label: string }[] = [
  { nilai: 'tawar_harga', label: 'Tawar harga' },
  { nilai: 'terima', label: 'Terima' },
  { nilai: 'tolak', label: 'Tolak halus' },
  { nilai: 'jawab_harga', label: 'Jawab harga' },
];

const CONTOH =
  'bu saya mau pesan 20 bungkus kripik pisang buat hari sabtu, bisa 18rb ga bu?';

/** Format tampilan waktu, mis. "2 Sep 03.05". Murni tampilan, bukan hitungan. */
function waktuSingkat(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export function PesananMasuk() {
  const nav = useNavigate();
  const [teks, setTeks] = useState('');
  const [hasil, setHasil] = useState<AnalisisPesanan | null>(null);
  const [balasan, setBalasan] = useState<BalasanRes | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState('');
  const [tersalin, setTersalin] = useState(false);
  const [daftar, setDaftar] = useState<PesanMasukItem[]>([]);

  async function muatDaftar() {
    const j = await daftarPesanan();
    if (j.ok) setDaftar(j.data);
  }

  // Pesan dari sambungan WhatsApp masuk sendiri di latar. Daftarnya dijemput
  // berkala supaya pesan baru muncul tanpa pedagang me-refresh halaman.
  useEffect(() => {
    void muatDaftar();
    const jeda = window.setInterval(() => void muatDaftar(), 12_000);
    return () => window.clearInterval(jeda);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function periksaTeks(t: string) {
    if (!t.trim()) return;
    setSibuk(true);
    setGalat('');
    setBalasan(null);
    const j = await analisisPesanan(t.trim());
    if (j.ok) {
      setHasil(j.data);
      void muatDaftar();   // hasil analisis ikut tersimpan — segarkan daftarnya
    } else setGalat(j.error.pesan);
    setSibuk(false);
  }

  function periksa() {
    void periksaTeks(teks);
  }

  /** Buka lagi pesan tersimpan lewat pipeline analisis yang sama persis. */
  function tinjau(p: PesanMasukItem) {
    setTeks(p.teks);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    void periksaTeks(p.teks);
  }

  async function susunBalasan(maksud: BalasanReq['maksud']) {
    if (!hasil?.produk) return;
    setSibuk(true);
    setGalat('');
    const j = await buatBalasan({
      maksud,
      produk_id: hasil.produk.id,
      ...(hasil.jumlah != null ? { jumlah: hasil.jumlah } : {}),
      ...(hasil.harga_diminta != null ? { harga_diminta: hasil.harga_diminta } : {}),
    });
    if (j.ok) {
      setBalasan(j.data);
      setTersalin(false);
    } else setGalat(j.error.pesan);
    setSibuk(false);
  }

  async function salin() {
    if (!balasan) return;
    try {
      await navigator.clipboard.writeText(balasan.teks);
      setTersalin(true);
    } catch {
      setGalat('Belum bisa menyalin otomatis. Tekan lama teksnya lalu salin.');
    }
  }

  return (
    <Layar tanpaLogo atas>
      <KepalaAplikasi />
      <h1 className="mt-7 text-[26px] font-bold tracking-[-0.02em] text-tinta">Pesanan Masuk</h1>
      <p className="mt-1 text-[16px] leading-relaxed text-sedang">
        Salin chat pembeli dari WhatsApp, tempel di sini.
      </p>

      <button
        type="button"
        onClick={() => nav('/pesanan/whatsapp')}
        className="kartu mt-4 flex w-full items-center gap-3.5 px-4 py-4 text-left transition active:scale-[0.99]"
      >
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-kanvas text-tinta"
          aria-hidden="true"
        >
          <MessageCircle size={20} strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1 text-[14.5px] leading-relaxed text-sedang">
          Atau sambungkan WhatsApp supaya pesanan terbaca sendiri.{' '}
          <span className="font-semibold text-tinta">Hanya membaca, tidak pernah mengirim.</span>
        </span>
        <ChevronRight size={20} className="shrink-0 text-redup" aria-hidden="true" />
      </button>

      <textarea
        value={teks}
        onChange={(e) => setTeks(e.target.value)}
        placeholder={CONTOH}
        rows={4}
        className="mt-3 w-full rounded-kartu border-[1.5px] border-garis-tua bg-kartu p-4 text-[16.5px] leading-relaxed text-tinta outline-none transition placeholder:text-redup focus:border-hero"
      />
      <div className="mt-3">
        <Tombol varian="gelap" disabled={!teks.trim() || sibuk} onClick={periksa}>
          {sibuk ? 'Memeriksa…' : 'Periksa pesanan ini'}
        </Tombol>
      </div>

      {galat && (
        <p className="mt-3 rounded-kartu bg-rugi-muda p-4 text-[16.5px] text-rugi-tua">{galat}</p>
      )}

      {hasil && hasil.jenis === 'bukan_pesanan' && (
        <p className="kartu mt-4 p-5 text-[16.5px] leading-relaxed text-sedang">
          Ini sepertinya bukan pesanan, jadi tidak kami simpan.
        </p>
      )}

      {hasil && hasil.jenis !== 'bukan_pesanan' && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="kartu px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 text-[18px] font-bold text-tinta">
                {hasil.produk?.nama ?? hasil.nama_produk_mentah ?? 'Produk belum dikenali'}
              </p>
              {hasil.jumlah != null && (
                <span className="angka shrink-0 text-[16.5px] font-semibold text-sedang">
                  {hasil.jumlah} pcs
                </span>
              )}
            </div>

            {/* Aturan #8: kalau nama produknya tidak yakin, tanya — jangan
                diam-diam memilih yang paling mirip. */}
            {hasil.perlu_dicek && hasil.kandidat.length > 0 && (
              <div className="mt-3 rounded-kontrol bg-tanda p-4">
                <Lencana nada="tanda">PERLU DICEK</Lencana>
                <p className="mt-2 text-[14.5px] leading-relaxed text-tanda-tinta">
                  Maksudnya produk yang mana? {hasil.kandidat.map((k) => k.nama).join(', ')}
                </p>
              </div>
            )}
          </div>

          {/* Angka terpenting di layar ini: pesanan ini menambah untung atau
              justru menggerusnya. Nilai pesanan ikut di bawah garis karena
              nilai besar tanpa untung adalah jebakan yang persis mau kami
              tunjukkan. */}
          {hasil.untung_pesanan != null && (
            <KartuHero
              label="Untung pesanan ini"
              nilai={`${hasil.merugi ? '\u2212' : '+'} ${formatRupiah(Math.abs(hasil.untung_pesanan))}`}
              nada={hasil.merugi ? 'rugi' : 'untung'}
              bawah={
                hasil.nilai_pesanan != null ? (
                  <div className="flex items-center justify-between text-[15px]">
                    <span className="text-white/55">Nilai pesanan</span>
                    <span className="angka font-semibold text-white">
                      {formatRupiah(hasil.nilai_pesanan)}
                    </span>
                  </div>
                ) : undefined
              }
            />
          )}

          {/* ★ Peringatan SEBELUM tombol maksud. Kalimatnya sudah berisi angka
              hasil SQL — ditampilkan apa adanya. */}
          {hasil.peringatan.map((p) => (
            <p
              key={p}
              className="rounded-kartu border border-rugi/15 bg-rugi-muda p-4 text-[16px] leading-relaxed text-rugi-tua"
            >
              {p}
            </p>
          ))}

          {hasil.produk && (
            <div className="kartu px-5 py-5">
              <p className="label-bagian">SIAPKAN BALASAN</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {MAKSUD.map((m) => (
                  <button
                    key={m.nilai}
                    type="button"
                    disabled={sibuk}
                    onClick={() => void susunBalasan(m.nilai)}
                    className="min-h-14 rounded-kontrol border-[1.5px] border-garis-tua bg-kartu px-3 text-[16px] font-semibold text-tinta transition active:scale-95 disabled:opacity-40"
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {balasan && (
        <div className="kartu mt-3 px-5 py-5">
          <p className="label-bagian">BALASAN SIAP DISALIN</p>
          <p className="mt-3 rounded-kontrol bg-kanvas p-4 text-[16.5px] leading-relaxed text-tinta">
            {balasan.teks}
          </p>
          <div className="mt-4">
            <Tombol varian="utama" onClick={() => void salin()}>
              {tersalin ? 'Tersalin ✓' : 'Salin balasan'}
            </Tombol>
          </div>
          {/* Bukan basa-basi: ini yang membedakan kami dari sistem yang
              mengirim atas nama pedagang. */}
          <p className="mt-3 text-center text-[14.5px] leading-relaxed text-redup">
            Tempel sendiri di WhatsApp Anda. lapakAi tidak pernah mengirim pesan ke pembeli.
          </p>
        </div>
      )}

      {/* Pesan tersimpan — dari WhatsApp (terbaca sendiri) dan tempel manual.
          Semua angkanya sudah dihitung SQL; di sini hanya ditampilkan. */}
      {daftar.length > 0 && (
        <div className="kartu mt-4 px-5 py-5">
          <p className="label-bagian">MASUK TERBARU</p>
          <div className="mt-1 flex flex-col divide-y divide-garis">
            {daftar.map((p) => (
              <button
                key={p.pesan_id}
                type="button"
                onClick={() => tinjau(p)}
                disabled={sibuk}
                className="py-3.5 text-left transition active:scale-[0.99] disabled:opacity-60"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-[16.5px] font-bold text-tinta">
                    {p.nama_produk ?? p.nama_produk_mentah ?? 'Belum dikenali'}
                  </p>
                  {p.jumlah != null && (
                    <span className="angka shrink-0 text-[15px] font-semibold text-sedang">
                      {p.jumlah} pcs
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-[14.5px] leading-relaxed text-redup">
                  {p.teks}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px]">
                  <span className="text-redup">
                    {p.sumber === 'whatsapp'
                      ? `WhatsApp ${p.pengirim_samar ?? ''}`.trim()
                      : 'Tempel'}
                    {' · '}
                    {waktuSingkat(p.diterima_pada)}
                  </span>
                  {p.untung_pesanan != null && (
                    <span
                      className={`angka font-semibold ${p.merugi ? 'text-rugi' : 'text-untung'}`}
                    >
                      {p.merugi ? '\u2212' : '+'} {formatRupiah(Math.abs(p.untung_pesanan))}
                    </span>
                  )}
                  {p.perlu_dicek && <Lencana nada="tanda">PERLU DICEK</Lencana>}
                </div>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[13.5px] leading-relaxed text-redup">
            Ketuk pesan untuk meninjau ulang margin dan stok, lalu menyiapkan balasan.
          </p>
        </div>
      )}

      <NavBawah />
    </Layar>
  );
}
