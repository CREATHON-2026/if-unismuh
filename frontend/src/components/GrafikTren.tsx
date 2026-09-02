import type { TitikTren } from '@shared/types';

/**
 * Grafik garis omzet vs untung — fitur 14. SVG polos, tanpa library.
 *
 * Disalin dari rancangan Dev B di `main`, dengan SATU perubahan: token warna
 * lama diganti padanan palet ungu (merek-tua). Branch ini sudah pindah dari
 * palet krem, dan token lamanya tidak ada lagi. Di dalam SVG, warna yang tidak
 * ada berarti garis omzetnya TIDAK TERGAMBAR SAMA SEKALI — tanpa satu pun
 * galat. Jangan dikembalikan saat menyelesaikan konflik merge.
 *
 * Satu library grafik penuh untuk dua garis adalah harga yang salah: bundle
 * membengkak di HP murah demi fitur zoom/tooltip yang pengguna kita tidak
 * butuh. Tiga puluh baris SVG menggambar hal yang sama.
 *
 * Aturan #7 tetap utuh di sini: TIDAK ADA angka finansial baru yang lahir.
 * Yang dihitung hanya posisi piksel — memetakan nilai ke koordinat layar
 * adalah pekerjaan menggambar, sama seperti memilih warna. Kedua deret dan
 * totalnya datang jadi dari API.
 *
 * Sumbu selalu mengikutkan nol. Grafik uang yang sumbunya dipenggal membuat
 * naik-turun kecil tampak dramatis — jenis kebohongan visual yang aplikasi
 * ini ada untuk menghapusnya. Nol juga jadi garis putus saat ada minggu rugi,
 * supaya "di bawah nol" terlihat sebagai batas, bukan sekadar lebih rendah.
 */
const LEBAR = 320;
const TINGGI = 150;
const PAD_X = 8;
const PAD_ATAS = 12;
const PAD_BAWAH = 10;

export function GrafikTren({ titik }: { titik: TitikTren[] }) {
  if (titik.length === 0) return null;

  const semua = titik.flatMap((t) => [t.omzet, t.untung_bersih]);
  const maks = Math.max(0, ...semua);
  const min = Math.min(0, ...semua);
  const rentang = maks - min || 1;

  const x = (i: number) =>
    titik.length === 1
      ? LEBAR / 2
      : PAD_X + (i * (LEBAR - PAD_X * 2)) / (titik.length - 1);
  const y = (nilai: number) =>
    PAD_ATAS + ((maks - nilai) * (TINGGI - PAD_ATAS - PAD_BAWAH)) / rentang;

  const jalur = (ambil: (t: TitikTren) => number) =>
    titik.map((t, i) => `${x(i)},${y(ambil(t))}`).join(' ');

  const adaTitikRugi = titik.some((t) => t.untung_bersih < 0);
  // "Sen".."Min" muat semua; label mingguan panjang cukup ujung-ujungnya.
  const semuaLabelPendek = titik.length <= 7 && titik.every((t) => t.label.length <= 3);

  return (
    <div>
      <svg
        viewBox={`0 0 ${LEBAR} ${TINGGI}`}
        className="h-auto w-full"
        role="img"
        aria-label="Grafik tren: uang masuk dan untung bersih"
      >
        {/* Garis nol — batas antara untung dan rugi */}
        <line
          x1={PAD_X}
          y1={y(0)}
          x2={LEBAR - PAD_X}
          y2={y(0)}
          stroke="var(--color-garis-tua)"
          strokeWidth="1"
          strokeDasharray={adaTitikRugi ? '4 4' : undefined}
        />

        {/* Omzet oranye merek yang digelapkan (kontras terukur), untung hijau —
            hijau/merah tetap eksklusif untuk arti uang. */}
        <polyline
          points={jalur((t) => t.omzet)}
          fill="none"
          stroke="var(--color-merek-tua)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <polyline
          points={jalur((t) => t.untung_bersih)}
          fill="none"
          stroke="var(--color-untung)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {titik.map((t, i) => (
          <g key={t.label}>
            <circle cx={x(i)} cy={y(t.omzet)} r="3" fill="var(--color-merek-tua)" />
            {/* Minggu yang rugi diberi titik merah — satu-satunya arti merah */}
            <circle
              cx={x(i)}
              cy={y(t.untung_bersih)}
              r={i === titik.length - 1 ? 4.5 : 3.5}
              fill={t.untung_bersih < 0 ? 'var(--color-rugi)' : 'var(--color-untung)'}
              stroke="var(--color-kartu)"
              strokeWidth="1.5"
            />
          </g>
        ))}
      </svg>

      {/* Label hari pendek muat semua; label panjang hanya ujung-ujungnya. */}
      <div className="mt-1 flex items-center justify-between text-kecil text-redup">
        {semuaLabelPendek ? (
          titik.map((t) => <span key={t.label}>{t.label}</span>)
        ) : (
          <>
            <span>{titik[0].label}</span>
            {titik.length > 1 && <span>{titik[titik.length - 1].label}</span>}
          </>
        )}
      </div>

      <div className="mt-3 flex items-center gap-5 border-t border-garis pt-3">
        <span className="flex items-center gap-2 text-kecil font-medium text-sedang">
          <span className="h-2.5 w-2.5 rounded-full bg-untung" aria-hidden="true" />
          Untung bersih
        </span>
        <span className="flex items-center gap-2 text-kecil font-medium text-sedang">
          <span className="h-2.5 w-2.5 rounded-full bg-merek-tua" aria-hidden="true" />
          Uang masuk
        </span>
        {adaTitikRugi && (
          <span className="ml-auto flex items-center gap-2 text-kecil font-medium text-sedang">
            <span className="h-2.5 w-2.5 rounded-full bg-rugi" aria-hidden="true" />
            Hari rugi
          </span>
        )}
      </div>
    </div>
  );
}
