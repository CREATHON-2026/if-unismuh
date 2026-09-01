import { Layar } from '../components/Layar';

// Placeholder — Beranda milik Dev B (omzet vs untung bersih, dari GET /beranda).
export function Beranda() {
  return (
    <Layar pertanyaan="Beranda">
      <p className="text-slate-600">
        Wilayah Dev B — omzet dan untung bersih akan tampil bersebelahan di sini.
      </p>
    </Layar>
  );
}
