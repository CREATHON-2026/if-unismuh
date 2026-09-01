import { KepalaAplikasi } from './KepalaAplikasi';

// Header wawancara resep: header aplikasi + bar 3 langkah.
export function KepalaResep({ langkah, label }: { langkah: number; label: string }) {
  return (
    <>
      <KepalaAplikasi />

      <div className="mt-8 flex items-center justify-between">
        <span className="text-utama font-bold text-tinta">Langkah {langkah} dari 3</span>
        <span className="text-utama font-bold text-tinta">{label}</span>
      </div>
      <div className="mt-3 flex gap-1.5" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-2.5 flex-1 rounded-full ${i <= langkah ? 'bg-hero' : 'bg-garis'}`}
          />
        ))}
      </div>
    </>
  );
}
