/**
 * Kontrol segmen — penyaring daftar (Semua / Merugi / Untung).
 *
 * Dipilih daripada tab atau dropdown karena semua pilihan terlihat sekaligus:
 * pengguna tidak perlu tahu ada apa di balik menu. Maksimal tiga segmen; lebih
 * dari itu tulisannya menyusut sampai tidak terbaca di layar 360px.
 */
export function Segmented<T extends string>({
  pilihan,
  nilai,
  onPilih,
  label,
}: {
  pilihan: readonly { nilai: T; label: string }[];
  nilai: T;
  onPilih: (n: T) => void;
  /** Untuk pembaca layar — menjelaskan grup ini menyaring apa */
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 rounded-full bg-permukaan p-1">
      {pilihan.map((p) => {
        const aktif = p.nilai === nilai;
        return (
          <button
            key={p.nilai}
            type="button"
            role="tab"
            aria-selected={aktif}
            onClick={() => onPilih(p.nilai)}
            className={`min-h-11 flex-1 rounded-full px-2 text-isi font-semibold transition ${
              aktif ? 'bg-kartu text-merek shadow-sm' : 'text-sedang active:scale-95'
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
