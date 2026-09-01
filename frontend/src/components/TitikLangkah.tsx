// Titik progres onboarding (4 langkah), aktif = indeks 0-based.
export function TitikLangkah({ aktif, total = 4 }: { aktif: number; total?: number }) {
  return (
    <div className="flex gap-1.5" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-2.5 w-2.5 rounded-full ${i === aktif ? 'bg-[#F5831F]' : 'bg-[#D4DCEA]'}`}
        />
      ))}
    </div>
  );
}
