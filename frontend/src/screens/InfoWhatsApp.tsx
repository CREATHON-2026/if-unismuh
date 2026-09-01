import { useNavigate } from 'react-router-dom';
import { CircleCheck, MessageCircle } from 'lucide-react';
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
          <span className="flex items-center justify-center gap-2.5">
            <CircleCheck size={22} strokeWidth={1.9} aria-hidden="true" />
            Mengerti, Lanjut
          </span>
        </Tombol>
      }
    >
      <h1 className="text-center tracking-[-0.02em] text-judul font-bold text-tinta">
        Pesanan Lewat WhatsApp?
      </h1>
      <p className="text-center text-utama leading-relaxed text-sedang">
        lapakAi membaca chat pesanan yang Anda tempel — tanpa perlu menghubungkan akun WhatsApp
        Anda.
      </p>

      <div className="kartu mt-4 p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-kanvas text-sedang">
            <MessageCircle size={42} strokeWidth={1.8} aria-hidden="true" />
          </div>
          <p className="text-utama leading-relaxed text-sedang">
            Salin chat pembeli, tempel di <span className="font-bold">Pesanan Masuk</span> —
            lapakAi mengecek untung dan stoknya, lalu menyiapkan balasan untuk Anda salin.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-kartu bg-garis p-6 text-utama leading-relaxed text-tinta">
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

      <p className="mt-5 text-center text-isi text-sedang">
        lapakAi tidak pernah mengirim pesan ke pembeli Anda — balasan selalu Anda kirim sendiri.
      </p>
    </Layar>
  );
}
