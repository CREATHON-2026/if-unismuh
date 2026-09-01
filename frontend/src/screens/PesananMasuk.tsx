import { useState } from 'react';
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
      <h1 className="mt-8 font-logo text-[26px] font-bold text-[#1C1917]">Pesanan Masuk</h1>
      <p className="mt-1 text-[17px] leading-relaxed text-[#57534E]">
        Salin chat pembeli dari WhatsApp, tempel di sini.
      </p>

      <textarea
        value={teks}
        onChange={(e) => setTeks(e.target.value)}
        placeholder={CONTOH}
        rows={4}
        className="mt-4 w-full rounded-2xl border-2 border-[#E4C7AC] bg-white p-4 text-[17px] leading-relaxed outline-none placeholder:text-[#D8B49A] focus:border-[#A8500B]"
      />
      <div className="mt-3">
        <Tombol varian="gelap" disabled={!teks.trim() || sibuk} onClick={periksa}>
          {sibuk ? 'Memeriksa…' : 'Periksa pesanan ini'}
        </Tombol>
      </div>

      {galat && (
        <p className="mt-3 rounded-2xl bg-[#FBD5D5] p-4 text-[17px] text-[#B91C1C]">{galat}</p>
      )}

      {hasil && hasil.jenis === 'bukan_pesanan' && (
        <p className="mt-4 rounded-2xl bg-white p-5 text-[17px] leading-relaxed text-[#44403C] shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
          Ini sepertinya bukan pesanan, jadi tidak kami simpan.
        </p>
      )}

      {hasil && hasil.jenis !== 'bukan_pesanan' && (
        <div className="mt-4 rounded-[28px] bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[19px] font-bold text-[#1C1917]">
              {hasil.produk?.nama ?? hasil.nama_produk_mentah ?? 'Produk belum dikenali'}
            </p>
            {hasil.jumlah != null && (
              <span className="text-[17px] font-bold text-[#44403C]">{hasil.jumlah} pcs</span>
            )}
          </div>

          {hasil.perlu_dicek && hasil.kandidat.length > 0 && (
            <p className="mt-3 rounded-2xl bg-[#FDF3D8] p-4 text-[15px] leading-relaxed text-[#8A6100]">
              Maksudnya produk yang mana? {hasil.kandidat.map((k) => k.nama).join(', ')}
            </p>
          )}

          {hasil.nilai_pesanan != null && (
            <div className="mt-4 flex items-center justify-between text-[17px]">
              <span className="text-[#57534E]">Nilai pesanan</span>
              <span className="font-bold text-[#1C1917]">{formatRupiah(hasil.nilai_pesanan)}</span>
            </div>
          )}
          {hasil.untung_pesanan != null && (
            <div className="mt-2 flex items-center justify-between text-[17px]">
              <span className="text-[#57534E]">Untung pesanan</span>
              <span
                className={`font-bold ${hasil.merugi ? 'text-[#DC2626]' : 'text-[#15803D]'}`}
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
                  className="rounded-2xl bg-[#FBD5D5] p-4 text-[17px] leading-relaxed text-[#B91C1C]"
                >
                  {p}
                </p>
              ))}
            </div>
          )}

          {hasil.produk && (
            <>
              <div className="my-5 h-px bg-[#E7E5E4]" aria-hidden />
              <p className="text-[15px] font-medium text-[#8A7C70]">Siapkan balasan</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {MAKSUD.map((m) => (
                  <button
                    key={m.nilai}
                    type="button"
                    disabled={sibuk}
                    onClick={() => void susunBalasan(m.nilai)}
                    className="min-h-14 rounded-2xl border-2 border-[#E4C7AC] bg-white px-3 text-[17px] font-bold text-[#7C2D12] transition active:scale-95 disabled:opacity-40"
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
        <div className="mt-3 rounded-[28px] bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
          <p className="text-[17px] font-bold text-[#1C1917]">Balasan siap disalin</p>
          <p className="mt-3 rounded-2xl bg-[#F7F4F1] p-4 text-[17px] leading-relaxed text-[#1C1917]">
            {balasan.teks}
          </p>
          <div className="mt-4">
            <Tombol varian="utama" onClick={() => void salin()}>
              {tersalin ? 'Tersalin ✓' : 'Salin balasan'}
            </Tombol>
          </div>
          {/* Bukan basa-basi: ini yang membedakan kami dari sistem yang
              mengirim atas nama pedagang. */}
          <p className="mt-3 text-center text-[15px] leading-relaxed text-[#8A7C70]">
            Tempel sendiri di WhatsApp Anda. lapakAi tidak pernah mengirim pesan ke pembeli.
          </p>
        </div>
      )}

      <NavBawah />
    </Layar>
  );
}
