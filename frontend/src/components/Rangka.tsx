/**
 * Rangka pemuatan (skeleton).
 *
 * Menggantikan teks "Memuat…" yang polos. Bedanya bukan soal cantik: rangka
 * menunjukkan BENTUK apa yang sedang datang, jadi mata sudah siap di tempat
 * yang benar begitu angkanya muncul. Teks "Memuat…" di tengah layar kosong
 * justru membuat layar terlihat rusak dulu, baru terlihat memuat — dan di
 * jaringan warung yang lambat, jeda itu bisa beberapa detik.
 *
 * Sengaja meniru tinggi dan susunan isi aslinya. Rangka yang bentuknya berbeda
 * dari hasil akhirnya membuat layar melompat saat data tiba.
 */
function Balok({ kelas = '' }: { kelas?: string }) {
  return <div className={`animate-pulse rounded-lg bg-garis ${kelas}`} />;
}

/** Rangka kartu gelap berisi satu angka besar — pasangan `KartuHero`. */
export function RangkaHero() {
  return (
    <div className="hero-gradien rounded-kartu p-6">
      <div className="h-3.5 w-24 animate-pulse rounded bg-white/15" />
      <div className="mt-3 h-10 w-52 animate-pulse rounded-lg bg-white/15" />
      <div className="mt-5 border-t border-white/10 pt-4">
        <div className="h-3.5 w-40 animate-pulse rounded bg-white/10" />
      </div>
    </div>
  );
}

/** Rangka beberapa baris daftar — pasangan `BarisDaftar`. */
export function RangkaDaftar({ baris = 3 }: { baris?: number }) {
  return (
    <div className="kartu divide-y divide-garis">
      {Array.from({ length: baris }, (_, i) => (
        <div key={i} className="flex items-center gap-3.5 px-4 py-4">
          <Balok kelas="h-11 w-11 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <Balok kelas="h-4 w-2/5" />
            <Balok kelas="mt-2 h-3 w-3/5" />
          </div>
          <Balok kelas="h-4 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Rangka kartu isi biasa. `tinggi` dalam kelas Tailwind, mis. "h-40". */
export function RangkaKartu({ tinggi = 'h-32' }: { tinggi?: string }) {
  return <div className={`kartu animate-pulse ${tinggi}`} />;
}
