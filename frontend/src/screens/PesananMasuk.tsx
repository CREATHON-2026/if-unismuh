import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatRupiah } from '@shared/format/rupiah';
import type { AnalisisPesanan, BalasanReq, BalasanRes } from '@shared/types';
import { analisisPesanan, buatBalasan } from '../api/client';
import { Layar } from '../components/Layar';
import { KepalaAplikasi } from '../components/KepalaAplikasi';
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

export function PesananMasuk() {
  const nav = useNavigate();
  const [teks, setTeks] = useState('');
  const [hasil, setHasil] = useState<AnalisisPesanan | null>(null);
  const [balasan, setBalasan] = useState<BalasanRes | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState('');
  const [tersalin, setTersalin] = useState(false);

  async function periksa() {
    if (!teks.trim()) return;
    setSibuk(true);
    setGalat('');
    setBalasan(null);
    const j = await analisisPesanan(teks.trim());
    if (j.ok) setHasil(j.data);
    else setGalat(j.error.pesan);
    setSibuk(false);
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
      <h1 className="mt-8 font-logo text-[26px] font-bold text-[#1A1714]">Pesanan Masuk</h1>
      <p className="mt-1 text-[17px] leading-relaxed text-[#6B635A]">
        Salin chat pembeli dari WhatsApp, tempel di sini.
      </p>

      <button
        type="button"
        onClick={() => nav('/pesanan/whatsapp')}
        className="mt-3 flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-[#D6CFC4] bg-white px-4 py-4 text-left transition active:scale-[0.99]"
      >
        <span className="text-[15px] leading-relaxed text-[#4A443D]">
          Atau sambungkan WhatsApp supaya pesanan terbaca sendiri.{' '}
          <span className="font-bold text-[#1E6F4C]">Hanya membaca, tidak pernah mengirim.</span>
        </span>
        <span aria-hidden className="text-2xl leading-none text-[#1A1714]">→</span>
      </button>

      <textarea
        value={teks}
        onChange={(e) => setTeks(e.target.value)}
        placeholder={CONTOH}
        rows={4}
        className="mt-4 w-full rounded-2xl border-2 border-[#D6CFC4] bg-white p-4 text-[17px] leading-relaxed outline-none placeholder:text-[#6B635A] focus:border-[#1A1714]"
      />
      <div className="mt-3">
        <Tombol varian="gelap" disabled={!teks.trim() || sibuk} onClick={periksa}>
          {sibuk ? 'Memeriksa…' : 'Periksa pesanan ini'}
        </Tombol>
      </div>

      {galat && (
        <p className="mt-3 rounded-2xl bg-[#FDEDEE] p-4 text-[17px] text-[#7A2A2F]">{galat}</p>
      )}

      {hasil && hasil.jenis === 'bukan_pesanan' && (
        <p className="mt-4 rounded-2xl bg-white p-5 text-[17px] leading-relaxed text-[#4A443D]">
          Ini sepertinya bukan pesanan, jadi tidak kami simpan.
        </p>
      )}

      {hasil && hasil.jenis !== 'bukan_pesanan' && (
        <div className="mt-4 rounded-[28px] bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[19px] font-bold text-[#1A1714]">
              {hasil.produk?.nama ?? hasil.nama_produk_mentah ?? 'Produk belum dikenali'}
            </p>
            {hasil.jumlah != null && (
              <span className="text-[17px] font-bold text-[#4A443D]">{hasil.jumlah} pcs</span>
            )}
          </div>

          {hasil.perlu_dicek && hasil.kandidat.length > 0 && (
            <p className="mt-3 rounded-2xl bg-[#FBF3E2] p-4 text-[15px] leading-relaxed text-[#4A443D]">
              Maksudnya produk yang mana? {hasil.kandidat.map((k) => k.nama).join(', ')}
            </p>
          )}

          {hasil.nilai_pesanan != null && (
            <div className="mt-4 flex items-center justify-between text-[17px]">
              <span className="text-[#6B635A]">Nilai pesanan</span>
              <span className="font-bold text-[#1A1714]">{formatRupiah(hasil.nilai_pesanan)}</span>
            </div>
          )}
          {hasil.untung_pesanan != null && (
            <div className="mt-2 flex items-center justify-between text-[17px]">
              <span className="text-[#6B635A]">Untung pesanan</span>
              <span
                className={`font-bold ${hasil.merugi ? 'text-[#B0111F]' : 'text-[#1E6F4C]'}`}
              >
                {hasil.merugi ? '−' : '+'} {formatRupiah(Math.abs(hasil.untung_pesanan))}
              </span>
            </div>
          )}

          {/* ★ Peringatan SEBELUM tombol maksud. Kalimatnya sudah berisi angka
              hasil SQL — ditampilkan apa adanya. */}
          {hasil.peringatan.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {hasil.peringatan.map((p) => (
                <p
                  key={p}
                  className="rounded-2xl bg-[#FDEDEE] p-4 text-[17px] leading-relaxed text-[#7A2A2F]"
                >
                  {p}
                </p>
              ))}
            </div>
          )}

          {hasil.produk && (
            <>
              <div className="my-5 h-px bg-[#E8E3DA]" aria-hidden />
              <p className="text-[15px] font-medium text-[#6B635A]">Siapkan balasan</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {MAKSUD.map((m) => (
                  <button
                    key={m.nilai}
                    type="button"
                    disabled={sibuk}
                    onClick={() => void susunBalasan(m.nilai)}
                    className="min-h-14 rounded-2xl border-2 border-[#D6CFC4] bg-white px-3 text-[17px] font-bold text-[#1A1714] transition active:scale-95 disabled:opacity-40"
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {balasan && (
        <div className="mt-3 rounded-[28px] bg-white p-6">
          <p className="text-[17px] font-bold text-[#1A1714]">Balasan siap disalin</p>
          <p className="mt-3 rounded-2xl bg-[#F5F1EA] p-4 text-[17px] leading-relaxed text-[#1A1714]">
            {balasan.teks}
          </p>
          <div className="mt-4">
            <Tombol varian="utama" onClick={() => void salin()}>
              {tersalin ? 'Tersalin ✓' : 'Salin balasan'}
            </Tombol>
          </div>
          {/* Bukan basa-basi: ini yang membedakan kami dari sistem yang
              mengirim atas nama pedagang. */}
          <p className="mt-3 text-center text-[15px] leading-relaxed text-[#6B635A]">
            Tempel sendiri di WhatsApp Anda. lapakAi tidak pernah mengirim pesan ke pembeli.
          </p>
        </div>
      )}

      <NavBawah />
    </Layar>
  );
}
