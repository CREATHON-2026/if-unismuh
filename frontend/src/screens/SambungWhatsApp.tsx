import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { StatusWhatsappRes } from '@shared/types';
import { hubungkanWhatsapp, statusWhatsapp } from '../api/client';
import { Layar } from '../components/Layar';
import { NavBawah } from '../components/NavBawah';
import { Tombol } from '../components/Tombol';
import { InputTeks } from '../components/InputTeks';

/**
 * Sambungkan WhatsApp — jalur OPSIONAL untuk Pesanan Masuk.
 *
 * ★ HANYA MEMBACA. Sistem tidak punya jalur mengirim, dan itu bukan pengaturan
 * yang bisa dinyalakan — modul WhatsApp di backend tidak mengekspor apa pun
 * yang bisa mengirim, socket-nya privat. Aturan #4.
 *
 * Kalau tidak pernah disambungkan, atau sesinya putus, Pesanan Masuk tetap
 * berfungsi penuh lewat tempel manual. Itu sebabnya layar ini dicapai dari
 * dalam Pesanan Masuk, bukan dari navigasi utama — menyambungkan adalah bonus,
 * bukan syarat.
 *
 * Kode pairing dipilih sebagai cara utama, bukan QR: pengguna 35–60 tahun tidak
 * perlu memindai apa pun, cukup mengetik 8 digit di HP sendiri.
 */
const LABEL: Record<StatusWhatsappRes['status'], string> = {
  terputus: 'Belum tersambung',
  menyambung: 'Sedang menyambungkan…',
  menunggu_qr: 'Menunggu ditautkan',
  tersambung: 'Tersambung',
};

export function SambungWhatsApp() {
  const nav = useNavigate();
  const [nomor, setNomor] = useState('');
  const [data, setData] = useState<StatusWhatsappRes | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState('');
  const jeda = useRef<number | null>(null);

  async function muat() {
    const j = await statusWhatsapp();
    if (j.ok) setData(j.data);
  }

  useEffect(() => {
    void muat();
    return () => {
      if (jeda.current) window.clearInterval(jeda.current);
    };
  }, []);

  // Kode pairing tidak langsung ada — socket butuh beberapa detik untuk siap,
  // jadi statusnya dijemput berkala sampai kodenya muncul atau tersambung.
  useEffect(() => {
    const perluTunggu = data?.status === 'menyambung' || data?.status === 'menunggu_qr';
    if (!perluTunggu) {
      if (jeda.current) window.clearInterval(jeda.current);
      return;
    }
    jeda.current = window.setInterval(() => void muat(), 2000);
    return () => {
      if (jeda.current) window.clearInterval(jeda.current);
    };
  }, [data?.status]);

  async function sambungkan() {
    setSibuk(true);
    setGalat('');
    const j = await hubungkanWhatsapp(nomor.trim() ? { nomor_hp: nomor.trim() } : {});
    if (j.ok) setData(j.data);
    else setGalat(j.error.pesan);
    setSibuk(false);
  }

  const tersambung = data?.status === 'tersambung';

  return (
    <Layar kembali={() => nav('/pesanan')} atas>
      <h1 className="font-logo text-[26px] font-bold text-[#1A1714]">Sambungkan WhatsApp</h1>
      <p className="mt-1 text-[17px] leading-relaxed text-[#6B635A]">
        Supaya pesanan yang masuk terbaca sendiri, tanpa Anda salin satu-satu.
      </p>

      {/* Ini bukan basa-basi. Inilah yang membedakan kami dari sistem yang
          mengirim atas nama pedagang, dan pertanyaan pertama juri. */}
      <div className="mt-4 rounded-2xl bg-[#EAF1ED] p-4">
        <p className="text-[17px] font-bold text-[#1E6F4C]">Hanya membaca</p>
        <p className="mt-1 text-[15px] leading-relaxed text-[#145037]">
          lapakAi <span className="font-bold">tidak pernah</span> mengirim pesan dari nomor Anda.
          Balasan tetap Anda salin dan kirim sendiri. Grup, status, dan media tidak dibaca sama
          sekali.
        </p>
      </div>

      <div className="mt-4 rounded-[28px] bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[17px] text-[#6B635A]">Status</span>
          <span
            className={`rounded-xl px-4 py-1.5 text-[15px] font-bold ${
              tersambung ? 'bg-[#EAF1ED] text-[#1E6F4C]' : 'bg-[#F5F1EA] text-[#6B635A]'
            }`}
          >
            {data ? LABEL[data.status] : 'Memuat…'}
          </span>
        </div>

        {data?.alasan && (
          <p className="mt-3 rounded-2xl bg-[#FBF3E2] p-4 text-[15px] leading-relaxed text-[#4A443D]">
            {data.alasan}
          </p>
        )}

        {/* ★ Kode pairing: pengguna mengetik 8 digit ini di HP-nya sendiri. */}
        {data?.kode_pairing && !tersambung && (
          <div className="mt-5 text-center">
            <p className="text-[15px] font-medium text-[#6B635A]">Kode tautan Anda</p>
            <p className="mt-1 font-logo text-[38px] font-extrabold leading-tight tracking-[0.15em] text-[#1A1714]">
              {data.kode_pairing}
            </p>
            <div className="mt-4 rounded-2xl bg-[#F5F1EA] p-4 text-left text-[15px] leading-relaxed text-[#4A443D]">
              <p>1. Buka WhatsApp di HP Anda</p>
              <p>2. Menu titik tiga → <span className="font-bold">Perangkat Tertaut</span></p>
              <p>3. <span className="font-bold">Tautkan perangkat</span> → Tautkan dengan nomor telepon</p>
              <p>4. Masukkan kode di atas</p>
            </div>
          </div>
        )}

        {data?.qr && !data.kode_pairing && !tersambung && (
          <p className="mt-4 rounded-2xl bg-[#F5F1EA] p-4 text-[15px] leading-relaxed text-[#4A443D]">
            QR-nya muncul di terminal server. Untuk pemakaian sehari-hari, pakai kode tautan saja —
            isi nomor HP di bawah, jauh lebih mudah daripada memindai.
          </p>
        )}

        {tersambung ? (
          <p className="mt-5 text-[17px] leading-relaxed text-[#4A443D]">
            Pesanan yang masuk sekarang terbaca sendiri. Buka Pesanan Masuk untuk melihatnya.
          </p>
        ) : (
          <>
            <label className="mt-5 block text-[17px] font-bold text-[#1A1714]" htmlFor="wa-nomor">
              Nomor WhatsApp Anda
            </label>
            <div className="mt-2">
              <InputTeks
                id="wa-nomor"
                inputMode="numeric"
                placeholder="081234567890"
                value={nomor}
                onChange={(e) => setNomor(e.target.value)}
              />
            </div>
            <p className="mt-2 text-[15px] leading-relaxed text-[#6B635A]">
              Kosongkan kalau ingin memakai QR di terminal.
            </p>
            <div className="mt-4">
              <Tombol varian="gelap" disabled={sibuk} onClick={() => void sambungkan()}>
                {sibuk ? 'Menyiapkan…' : 'Minta kode tautan'}
              </Tombol>
            </div>
          </>
        )}

        {galat && (
          <p className="mt-3 rounded-2xl bg-[#FDEDEE] p-4 text-[17px] text-[#7A2A2F]">{galat}</p>
        )}
      </div>

      <p className="mt-4 text-center text-[15px] leading-relaxed text-[#6B635A]">
        Tidak wajib disambungkan. Tanpa ini pun Pesanan Masuk tetap jalan penuh — cukup salin chat
        pembeli lalu tempel.
      </p>

      <NavBawah />
    </Layar>
  );
}
