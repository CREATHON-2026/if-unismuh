import { useNavigate } from 'react-router-dom';
import { Layar } from '../components/Layar';
import { Tombol } from '../components/Tombol';

// Pengganti "Integrasi WhatsApp": edukasi alur tempel manual (aturan #4 —
// sistem tidak pernah terhubung/mengirim ke WhatsApp).
export function InfoWhatsApp() {
  const nav = useNavigate();

  return (
    <Layar
      atas
      kembali={() => nav(-1)}
      aksi={
        <Tombol onClick={() => nav('/onboarding/usaha')}>
          <span className="flex items-center justify-center gap-3">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M8.5 12.5l2.5 2.5 4.5-5" />
            </svg>
            Mengerti, Lanjut
          </span>
        </Tombol>
      }
    >
      <h1 className="text-center font-logo text-[28px] font-bold text-[#1A1714]">
        Pesanan Lewat WhatsApp?
      </h1>
      <p className="text-center text-[17px] leading-relaxed text-[#6B635A]">
        lapakAi membaca chat pesanan yang Anda tempel — tanpa perlu menghubungkan akun WhatsApp
        Anda.
      </p>

      <div className="mt-4 rounded-[28px] bg-white p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#EAF1ED]">
            <svg
              width="42"
              height="42"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1E6F4C"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 1 1-4.6-7.9L21 3l-1.1 4.4A9 9 0 0 1 21 12Z" />
              <path d="M8.5 10.5h7" />
              <path d="M8.5 14h4.5" />
            </svg>
          </div>
          <p className="text-[17px] leading-relaxed text-[#4A443D]">
            Salin chat pembeli, tempel di <span className="font-bold">Pesanan Masuk</span> —
            lapakAi mengecek untung dan stoknya, lalu menyiapkan balasan untuk Anda salin.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-[24px] bg-[#E8E3DA] p-6 text-[17px] leading-relaxed text-[#1A1714]">
        <p>1. Buka WhatsApp di HP Anda</p>
        <p className="mt-3">
          2. Tekan lama pesan pembeli, lalu ketuk <span className="font-bold">Salin</span>
        </p>
        <p className="mt-3">
          3. Buka menu <span className="font-bold">Pesanan Masuk</span> di lapakAi
        </p>
        <p className="mt-3">
          4. Tempel chat-nya — analisis untung, stok, dan balasan siap dalam hitungan detik
        </p>
      </div>

      <p className="mt-5 text-center text-[15px] text-[#6B635A]">
        lapakAi tidak pernah mengirim pesan ke pembeli Anda — balasan selalu Anda kirim sendiri.
      </p>
    </Layar>
  );
}
