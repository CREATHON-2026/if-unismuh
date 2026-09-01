import { RefreshCw, WifiOff } from 'lucide-react';

/**
 * Layar gagal memuat — dengan jalan keluar.
 *
 * Sebelum komponen ini ada, setiap layar menampilkan pesan galat sebagai teks
 * merah dan berhenti di situ. `api/client.ts` bahkan menjanjikan "Coba lagi ya"
 * tanpa menyediakan cara mencoba lagi — pengguna harus tahu cara me-refresh
 * browser, dan pengguna kita justru yang paling tidak tahu caranya.
 *
 * `onCoba` wajib, bukan opsional. Kalau sebuah layar tidak punya cara memulihkan
 * diri, itu tanda pengambilan datanya yang perlu dibetulkan — bukan alasan untuk
 * menampilkan jalan buntu.
 *
 * Pesannya datang dari API dan sudah berbahasa manusia (lihat aturan bentuk
 * galat di docs/06-kontrak-api.md). Komponen ini tidak menambah jargon apa pun.
 */
export function KeadaanGalat({
  pesan,
  onCoba,
  sedangMencoba = false,
}: {
  pesan: string;
  onCoba: () => void;
  sedangMencoba?: boolean;
}) {
  return (
    <div className="kartu mt-6 flex flex-col items-center px-5 py-8 text-center">
      <span
        className="flex h-14 w-14 items-center justify-center rounded-full bg-rugi-muda text-rugi"
        aria-hidden="true"
      >
        <WifiOff size={26} strokeWidth={1.8} />
      </span>

      <p className="mt-4 text-utama font-semibold text-tinta">Belum bisa dimuat</p>
      <p className="mt-1.5 max-w-[30ch] text-isi leading-relaxed text-sedang">{pesan}</p>

      <button
        type="button"
        onClick={onCoba}
        disabled={sedangMencoba}
        className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-kontrol border-[1.5px] border-garis-tua px-5 text-utama font-semibold text-tinta transition active:scale-95 disabled:opacity-40"
      >
        <RefreshCw
          size={18}
          strokeWidth={2}
          className={sedangMencoba ? 'animate-spin' : ''}
          aria-hidden="true"
        />
        {sedangMencoba ? 'Mencoba…' : 'Coba lagi'}
      </button>
    </div>
  );
}
