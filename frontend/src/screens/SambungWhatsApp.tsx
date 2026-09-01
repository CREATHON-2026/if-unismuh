import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { Lock } from 'lucide-react';
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
 * QR adalah cara utama menautkan: kodenya dirender langsung di layar ini dan
 * tinggal dipindai dari HP yang memegang akun WhatsApp. Kode pairing 8 digit
 * tetap tersedia sebagai jalur kedua — untuk kasus aplikasi dibuka di HP yang
 * sama dengan akun WhatsApp-nya, karena layar sendiri tidak bisa dipindai.
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

  // Kode QR / pairing tidak langsung ada — socket butuh beberapa detik untuk
  // siap, jadi statusnya dijemput berkala sampai kodenya muncul atau
  // tersambung. Penjemputan ini juga yang membuat QR di layar ikut segar
  // saat WhatsApp menerbitkan string QR baru.
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

  /**
   * @param pakaiNomor true -> kode pairing 8 digit (butuh nomor);
   *                   false -> QR yang dirender di layar ini.
   */
  async function sambungkan(pakaiNomor: boolean) {
    if (pakaiNomor && !nomor.trim()) {
      setGalat('Isi dulu nomor WhatsApp Anda untuk minta kode 8 digit.');
      return;
    }
    setSibuk(true);
    setGalat('');
    const j = await hubungkanWhatsapp(pakaiNomor ? { nomor_hp: nomor.trim() } : {});
    if (j.ok) setData(j.data);
    else setGalat(j.error.pesan);
    setSibuk(false);
  }

  const tersambung = data?.status === 'tersambung';
  const menyiapkan = data?.status === 'menyambung' || sibuk;

  return (
    <Layar kembali={() => nav('/pesanan')} atas>
      <h1 className="text-[26px] font-bold tracking-[-0.02em] text-tinta">Sambungkan WhatsApp</h1>
      <p className="mt-1 text-[16px] leading-relaxed text-sedang">
        Supaya pesanan yang masuk terbaca sendiri, tanpa Anda salin satu-satu.
      </p>

      {/* Ini bukan basa-basi. Inilah yang membedakan kami dari sistem yang
          mengirim atas nama pedagang, dan pertanyaan pertama juri.
          Sengaja TIDAK hijau: hijau di aplikasi ini hanya berarti untung. */}
      <div className="mt-4 flex gap-3 rounded-kartu border border-garis bg-kartu p-4">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-kanvas text-tinta">
          <Lock size={20} strokeWidth={2} aria-hidden="true" />
        </span>
        <div>
          <p className="text-[16.5px] font-bold text-tinta">Hanya membaca</p>
          <p className="mt-1 text-[15px] leading-relaxed text-sedang">
            lapakAi <span className="font-bold text-tinta">tidak pernah</span> mengirim pesan dari
            nomor Anda. Balasan tetap Anda salin dan kirim sendiri. Grup, status, dan media tidak
            dibaca sama sekali.
          </p>
        </div>
      </div>

      <div className="kartu mt-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[16.5px] text-sedang">Status</span>
          <span
            className={`rounded-full px-3.5 py-1.5 text-[14px] font-semibold ${
              tersambung ? 'bg-hero text-white' : 'bg-kanvas text-sedang'
            }`}
          >
            {data ? LABEL[data.status] : 'Memuat…'}
          </span>
        </div>

        {data?.alasan && (
          <p className="mt-3 rounded-kontrol bg-tanda p-4 text-[15px] leading-relaxed text-tanda-tinta">
            {data.alasan}
          </p>
        )}

        {/* ★ QR — cara utama. Dirender di sini, dipindai dari HP yang
            memegang akun WhatsApp. String-nya diperbarui otomatis lewat
            penjemputan status berkala di atas. */}
        {data?.qr && !tersambung && (
          <div className="mt-5 text-center">
            <p className="text-[15px] font-medium text-sedang">Pindai kode QR ini</p>
            <div className="mx-auto mt-3 w-fit rounded-kontrol border-[1.5px] border-garis bg-white p-4">
              <QRCode value={data.qr} size={216} />
            </div>
            <div className="mt-4 rounded-kontrol bg-kanvas p-4 text-left text-[15px] leading-relaxed text-sedang">
              <p>1. Buka WhatsApp di HP yang nomornya mau disambungkan</p>
              <p>2. Menu titik tiga → <span className="font-bold">Perangkat Tertaut</span></p>
              <p>3. <span className="font-bold">Tautkan perangkat</span></p>
              <p>4. Arahkan kamera HP ke kode di atas</p>
            </div>
            <p className="mt-3 text-[15px] leading-relaxed text-sedang">
              Kode ini diperbarui sendiri — biarkan layar ini tetap terbuka.
            </p>
          </div>
        )}

        {/* Kode pairing — jalur kedua: pengguna mengetik 8 digit ini di
            HP-nya sendiri. Berguna saat aplikasi dibuka di HP yang sama
            dengan akun WhatsApp-nya, karena layar sendiri tidak bisa
            dipindai. */}
        {data?.kode_pairing && !tersambung && (
          <div className="mt-5 text-center">
            <p className="text-[15px] font-medium text-sedang">Kode tautan Anda</p>
            <p className="angka mt-1 text-[38px] font-extrabold leading-tight !tracking-[0.15em] text-tinta">
              {data.kode_pairing}
            </p>
            <div className="mt-4 rounded-kontrol bg-kanvas p-4 text-left text-[15px] leading-relaxed text-sedang">
              <p>1. Buka WhatsApp di HP Anda</p>
              <p>2. Menu titik tiga → <span className="font-bold">Perangkat Tertaut</span></p>
              <p>3. <span className="font-bold">Tautkan perangkat</span> → Tautkan dengan nomor telepon</p>
              <p>4. Masukkan kode di atas</p>
            </div>
            <div className="mt-4">
              <Tombol varian="garis" disabled={menyiapkan} onClick={() => void sambungkan(false)}>
                Pakai kode QR saja
              </Tombol>
            </div>
          </div>
        )}

        {tersambung ? (
          <p className="mt-5 text-[17px] leading-relaxed text-sedang">
            Pesanan yang masuk sekarang terbaca sendiri. Buka Pesanan Masuk untuk melihatnya.
          </p>
        ) : (
          <>
            {/* Tombol utama hanya saat belum ada kode sama sekali. Begitu QR
                atau kode 8 digit tampil, dialah pusat perhatian layar. */}
            {!data?.qr && !data?.kode_pairing && (
              <>
                <div className="mt-5">
                  <Tombol
                    varian="gelap"
                    disabled={menyiapkan}
                    onClick={() => void sambungkan(false)}
                  >
                    {menyiapkan ? 'Menyiapkan kode…' : 'Tampilkan kode QR'}
                  </Tombol>
                </div>
                <p className="mt-2 text-center text-[15px] leading-relaxed text-sedang">
                  Kode QR muncul di layar ini, lalu dipindai dari HP yang memegang akun WhatsApp.
                </p>
              </>
            )}

            {/* Jalur kedua: kode 8 digit. Satu-satunya cara kalau aplikasi
                dibuka di HP yang sama — layar sendiri tidak bisa dipindai. */}
            {!data?.kode_pairing && (
              <>
                <p className="mt-6 text-[15px] leading-relaxed text-sedang">
                  Aplikasi ini dibuka di HP yang sama dengan WhatsApp Anda? Layar sendiri tidak
                  bisa dipindai — pakai kode 8 digit:
                </p>
                <label className="mt-3 block text-[17px] font-bold text-tinta" htmlFor="wa-nomor">
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
                <div className="mt-3">
                  <Tombol varian="garis" disabled={menyiapkan} onClick={() => void sambungkan(true)}>
                    Minta kode 8 digit
                  </Tombol>
                </div>
              </>
            )}
          </>
        )}

        {galat && (
          <p className="mt-3 rounded-2xl bg-rugi-muda p-4 text-[17px] text-rugi-tua">{galat}</p>
        )}
      </div>

      <p className="mt-4 text-center text-[15px] leading-relaxed text-sedang">
        Tidak wajib disambungkan. Tanpa ini pun Pesanan Masuk tetap jalan penuh — cukup salin chat
        pembeli lalu tempel.
      </p>

      <NavBawah />
    </Layar>
  );
}
