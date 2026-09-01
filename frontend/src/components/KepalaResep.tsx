import { KepalaAplikasi } from './KepalaAplikasi';

// Header wawancara resep: header aplikasi + bar 3 langkah.
export function KepalaResep({ langkah, label }: { langkah: number; label: string }) {
  return (
    <>
      <KepalaAplikasi />

      <div className="mt-8 flex items-center justify-between">
        <span className="text-[17px] font-bold text-[#3E2A1A]">Langkah {langkah} dari 3</span>
        <span className="text-[17px] font-bold text-[#C2570E]">{label}</span>
      </div>
      <div className="mt-3 flex gap-1.5" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-2.5 flex-1 rounded-full ${i <= langkah ? 'bg-[#8B3A0E]' : 'bg-[#D9E1F0]'}`}
          />
        ))}
      </div>
    </>
  );
}
