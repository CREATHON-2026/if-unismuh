import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatRupiah } from '@shared/format/rupiah';
import type { BarisUsulan, UsulanTransaksi } from '@shared/types';
import { catatTransaksi, usulanDariTeks } from '../api/client';
import { Layar } from '../components/Layar';
import { KepalaAplikasi } from '../components/KepalaAplikasi';
import { NavBawah } from '../components/NavBawah';
import { Tombol } from '../components/Tombol';

/**
 * Catat penjualan dengan suara — fitur 2 dan 4.
 *
 * ★ Yang diucapkan TIDAK langsung tersimpan (aturan #2). Kalimatnya jadi usulan
 * lebih dulu, ditampilkan di layar konfirmasi, dan baru masuk database setelah
 * pedagang menekan simpan.
 *
 * Transkripsi terjadi di BROWSER lewat Web Speech, bukan di server: tidak ada
 * rekaman suara yang dikirim ke mana pun. Yang berangkat ke backend hanya
 * teksnya.
 *
 * Tidak ada satu pun angka yang dihitung di sini — subtotal dan untung datang
 * dari SQL setelah tersimpan.
 */

type PengenalSuara = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: {
    resultIndex: number;
    results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } };
  }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function buatPengenal(): PengenalSuara | null {
  const w = window as unknown as { SpeechRecognition?: new () => PengenalSuara; webkitSpeechRecognition?: new () => PengenalSuara };
  const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return SR ? new SR() : null;
}

export function CatatSuara() {
  const nav = useNavigate();
  const [teks, setTeks] = useState('');
  const [usulan, setUsulan] = useState<UsulanTransaksi | null>(null);
  const [mendengar, setMendengar] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState('');
  const pengenal = useRef<PengenalSuara | null>(null);

  const adaSuara = typeof window !== 'undefined' && buatPengenal() !== null;
  const amanUntukMic = typeof window !== 'undefined' && window.isSecureContext;

  function mulaiRekam() {
    const r = buatPengenal();
    if (!r) return;
    pengenal.current = r;
    r.lang = 'id-ID';
    r.continuous = true;
    r.interimResults = true;

    let final = '';
    setMendengar(true);
    setGalat('');

    r.onresult = (e) => {
      let sementara = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const potongan = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += potongan;
        else sementara += potongan;
      }
      setTeks((final + sementara).trim());
    };
    r.onerror = (e) => {
      setGalat(
        e.error === 'not-allowed'
          ? 'Mikrofonnya belum diizinkan. Izinkan dulu di browser, atau ketik saja di bawah.'
          : 'Suaranya belum terbaca. Coba lagi, atau ketik saja di bawah.',
      );
      setMendengar(false);
    };
    r.onend = () => setMendengar(false);
    r.start();
  }

  async function bacaKalimat(kalimat: string) {
    if (!kalimat.trim()) return;
    setSibuk(true);
    setGalat('');
    const j = await usulanDariTeks(kalimat.trim());
    if (j.ok) setUsulan(j.data);
    else setGalat(j.error.pesan);
    setSibuk(false);
  }

  function ubahBaris(i: number, tambahan: Partial<BarisUsulan>) {
    setUsulan((lama) =>
      lama
        ? { ...lama, baris: lama.baris.map((b, j) => (j === i ? { ...b, ...tambahan } : b)) }
        : lama,
    );
  }

  const siap = usulan?.baris.filter((b) => b.produk_id != null && b.jumlah != null) ?? [];

  async function simpan() {
    if (!usulan || siap.length === 0) return;
    setSibuk(true);
    const j = await catatTransaksi({
      tanggal: usulan.tanggal,
      baris: siap.map((b) => ({
        produk_id: b.produk_id as number,
        jumlah: b.jumlah as number,
        ...(b.harga_satuan != null ? { harga_satuan: b.harga_satuan } : {}),
      })),
    });
    setSibuk(false);
    if (j.ok) nav('/beranda');
    else setGalat(j.error.pesan);
  }

  return (
    <Layar tanpaLogo atas>
      <KepalaAplikasi />
      <h1 className="mt-8 font-logo text-[26px] font-bold text-[#1C1917]">Catat penjualan</h1>
      <p className="mt-1 text-[17px] leading-relaxed text-[#57534E]">
        Ucapkan seperti biasa: "hari ini laku 10 kripik pisang sama 5 kacang telur"
      </p>

      {!adaSuara && (
        <p className="mt-3 rounded-2xl bg-[#FDF3D8] p-4 text-[15px] leading-relaxed text-[#8A6100]">
          Browser ini belum mendukung suara. Pakai Chrome, atau ketik saja di bawah — hasilnya sama.
        </p>
      )}
      {adaSuara && !amanUntukMic && (
        <p className="mt-3 rounded-2xl bg-[#FDF3D8] p-4 text-[15px] leading-relaxed text-[#8A6100]">
          Halaman ini dibuka lewat http, jadi browser memblokir mikrofon. Ketik saja di bawah.
        </p>
      )}

      <button
        type="button"
        disabled={!adaSuara || !amanUntukMic || mendengar}
        onClick={mulaiRekam}
        className="mt-4 flex min-h-20 w-full items-center justify-center gap-3 rounded-full bg-[#F5831F] text-[19px] font-bold text-[#7C2D12] transition active:scale-[0.98] disabled:opacity-40"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
          <path d="M12 17.5V21" />
        </svg>
        {mendengar ? 'Mendengarkan…' : 'Mulai bicara'}
      </button>

      <label className="mt-5 block text-[17px] font-bold text-[#1C1917]" htmlFor="kalimat">
        Atau ketik
      </label>
      <textarea
        id="kalimat"
        value={teks}
        onChange={(e) => setTeks(e.target.value)}
        rows={3}
        placeholder="hari ini laku 10 kripik pisang"
        className="mt-2 w-full rounded-2xl border-2 border-[#E4C7AC] bg-white p-4 text-[17px] leading-relaxed outline-none placeholder:text-[#D8B49A] focus:border-[#A8500B]"
      />
      <div className="mt-3">
        <Tombol varian="gelap" disabled={!teks.trim() || sibuk} onClick={() => void bacaKalimat(teks)}>
          {sibuk ? 'Membaca…' : 'Baca kalimat ini'}
        </Tombol>
      </div>

      {galat && (
        <p className="mt-3 rounded-2xl bg-[#FBD5D5] p-4 text-[17px] text-[#B91C1C]">{galat}</p>
      )}

      {usulan && (
        <div className="mt-4 rounded-[28px] bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
          <p className="text-[19px] font-bold text-[#1C1917]">Belum tersimpan</p>
          <p className="mt-1 text-[15px] leading-relaxed text-[#8A7C70]">
            Tanggal {usulan.tanggal}. Periksa dulu, tidak ada yang masuk sebelum Anda menekan
            simpan.
          </p>

          <div className="mt-4 flex flex-col gap-3">
            {usulan.baris.map((b, i) => (
              <div
                key={`${b.nama_mentah}-${i}`}
                className={`rounded-2xl border-2 p-4 ${
                  b.produk_id == null || b.perlu_dicek
                    ? 'border-[#F0B4B4] bg-[#FEF6F6]'
                    : 'border-[#E7E5E4] bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[17px] font-bold text-[#1C1917]">"{b.nama_mentah}"</p>
                  {b.perlu_dicek && (
                    <span className="rounded-lg bg-[#FBD5D5] px-2.5 py-1 text-[13px] font-bold text-[#DC2626]">
                      PERIKSA
                    </span>
                  )}
                </div>

                <p className="mt-1 text-[15px] text-[#57534E]">
                  {b.nama_produk ? `→ ${b.nama_produk}` : 'Produknya belum dikenali'}
                  {b.harga_satuan != null && ` · ${formatRupiah(b.harga_satuan)}`}
                </p>

                {b.kandidat.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {b.kandidat.map((k) => (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() =>
                          ubahBaris(i, {
                            produk_id: k.id,
                            nama_produk: k.nama,
                            perlu_dicek: false,
                          })
                        }
                        className={`min-h-12 rounded-full border-2 px-4 text-[15px] font-medium transition active:scale-95 ${
                          b.produk_id === k.id && !b.perlu_dicek
                            ? 'border-[#A8500B] bg-[#FAD9C0] text-[#7C2D12]'
                            : 'border-[#E4C7AC] bg-white text-[#1C1917]'
                        }`}
                      >
                        {k.nama}
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex items-center gap-3">
                  <label className="text-[15px] text-[#57534E]" htmlFor={`jumlah-${i}`}>
                    Jumlah
                  </label>
                  <input
                    id={`jumlah-${i}`}
                    inputMode="numeric"
                    value={b.jumlah ?? ''}
                    onChange={(e) => {
                      const n = e.target.value.trim();
                      ubahBaris(i, { jumlah: n === '' ? null : Number(n) });
                    }}
                    className="h-14 w-24 rounded-2xl border-2 border-slate-300 px-4 text-lg outline-none focus:border-slate-900"
                  />
                </div>
              </div>
            ))}
          </div>

          {usulan.baris.length === 0 && (
            <p className="mt-3 text-[17px] leading-relaxed text-[#44403C]">
              Tidak ada barang yang bisa dikenali dari kalimat itu. Coba sebutkan lagi.
            </p>
          )}

          <div className="mt-5">
            <Tombol varian="gelap" disabled={siap.length === 0 || sibuk} onClick={() => void simpan()}>
              Simpan {siap.length} penjualan
            </Tombol>
          </div>
        </div>
      )}

      <NavBawah />
    </Layar>
  );
}
