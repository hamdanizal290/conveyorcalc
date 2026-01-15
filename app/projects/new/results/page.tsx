"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  loadProjectDraft,
  updateProjectDraft,
  type ProjectDraft,
  type DesignCaseKey,
} from "../../../../lib/storage/projectDraft";

import { runShellThickness } from "../../../../lib/engine/shellThickness";

function StepPill({ label, active }: { label: string; active?: boolean }) {
  return (
    <span
      className={[
        "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border",
        active
          ? "bg-white border-black/10 text-[rgb(var(--re-blue))]"
          : "bg-white/60 border-black/10 text-black/50",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

const CASE_LABEL: Record<DesignCaseKey, string> = {
  operating: "Operasi",
  hydrotest: "Uji hidrostatik",
  empty_wind: "Kosong (Angin)",
  empty_seismic: "Kosong (Seismik)",
  vacuum: "Vakum",
  steamout: "Steam-out",
};

const CASE_ORDER: DesignCaseKey[] = [
  "operating",
  "hydrotest",
  "empty_wind",
  "empty_seismic",
  "vacuum",
  "steamout",
];

const fmt = (x: number, digits = 2) => {
  if (!Number.isFinite(x)) return "-";
  return x.toFixed(digits);
};

export default function ResultsPage() {
  const [draft, setDraft] = useState<ProjectDraft | null>(null);

  useEffect(() => {
    setDraft(loadProjectDraft());
  }, []);

  const units = draft?.units === "US" ? "US" : "SI";
  const standard = (draft?.recommendedStandard ?? "API_650") as "API_650" | "API_620";

  const calc = useMemo(() => {
    if (!draft?.geometry || !draft?.service || !draft?.materials) return null;

    const adoptedThicknesses = draft.materials.courseNominalThickness ?? [];

    const activeCases = (draft.designCases
      ? (CASE_ORDER.filter((k) => !!draft.designCases?.[k]) as DesignCaseKey[])
      : ["operating"]) as DesignCaseKey[];

    const casesInput = activeCases
      .map((k) => ({
        key: k,
        liquidHeight:
          draft.service?.liquidHeights?.[k] ??
          (k === "hydrotest"
            ? draft.service?.liquidHeights?.operating ?? 0
            : draft.service?.liquidHeights?.operating ?? 0),
      }))
      .filter((c) => Number.isFinite(c.liquidHeight));

    return runShellThickness({
      units,
      standard,
      diameter: draft.geometry.diameter,
      courses: draft.geometry.courses,

      specificGravity: draft.service.specificGravity,
      corrosionAllowance: draft.service.corrosionAllowance,

      designPressure: draft.envelope?.designPressure ?? 0,

      allowableStressDesign: draft.materials.allowableStressDesign,
      allowableStressTest: draft.materials.allowableStressTest,
      jointEfficiency: draft.materials.jointEfficiency,
      minNominalThickness: draft.materials.minNominalThickness,
      adoptedThicknesses,

      activeCases: casesInput,
    });
  }, [draft, units, standard]);

  const projectName = draft?.projectName ?? "-";

  const handleSaveProject = () => {
    if (!draft) return;
    // simpan timestamp update saja (sesuai tipe ProjectDraft)
    updateProjectDraft({ updatedAt: new Date().toISOString() });
    alert("Draft proyek telah diperbarui (tersimpan pada local storage).");
  };

  if (!draft) {
    return (
      <div className="min-h-screen re-geo">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="re-card rounded-2xl border border-black/10 shadow-sm p-6">
            <div className="text-sm text-black/60">Memuat data proyek...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen re-geo">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-xs text-black/50 mb-2">Ringkasan hasil</div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[rgb(var(--re-ink))]">
              Shell Thickness — OK/NOT OK per Course
            </h1>
          </div>

          <div className="w-[280px] shrink-0">
            <div className="text-xs text-black/50 mb-2">Ringkasan proyek</div>
            <div className="re-card rounded-2xl border border-black/10 shadow-sm p-5">
              <div className="text-sm leading-6">
                <div>
                  <span className="font-semibold">Project:</span>{" "}
                  <span className="text-black/70">{projectName}</span>
                </div>
                <div>
                  <span className="font-semibold">Standard:</span>{" "}
                  <span className="text-black/70">{standard}</span>
                </div>
                <div>
                  <span className="font-semibold">Units:</span>{" "}
                  <span className="text-black/70">{units}</span>
                </div>
              </div>
            </div>

            {/* NOTE BOX (dibikin baku) */}
            <div className="mt-4 re-card rounded-2xl border border-black/10 shadow-sm p-5">
              <div className="text-sm font-semibold text-[rgb(var(--re-ink))] mb-2">
                Catatan singkat
              </div>
              <div className="text-sm leading-6 text-black/70">
                <p>
                  Periksa kolom <span className="font-semibold">t_calc</span> dan{" "}
                  <span className="font-semibold">t_required</span>.
                </p>
                <p className="mt-2">
                  Jika banyak baris menampilkan label{" "}
                  <span className="font-semibold">Tebal minimum</span>, artinya{" "}
                  persyaratan <span className="font-semibold">t_min + CA</span>{" "}
                  yang menjadi pengendali (governing) hasil.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pills */}
        <div className="mt-6 flex flex-wrap gap-2">
          <StepPill label="Step 0 • Initiation" />
          <StepPill label="Step 1 • Config & Cases" />
          <StepPill label="Step 2 • Service & Geometry" />
          <StepPill label="Step 3 • Materials" />
          <StepPill label="Step 4 • Results" active />
        </div>

        {/* Actions */}
        <div className="mt-6 re-card rounded-2xl border border-black/10 shadow-sm p-6">
          <div className="text-sm font-semibold text-[rgb(var(--re-ink))] mb-3">Actions</div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSaveProject}
              className="px-4 py-2 rounded-full text-sm font-semibold bg-[rgb(var(--re-blue))] text-white shadow-sm hover:opacity-90"
            >
              Save Project
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-full text-sm font-semibold border border-black/10 bg-white hover:bg-black/5"
            >
              Export PDF
            </button>
            <button
              onClick={() => alert("Export CSV: gunakan fitur yang sudah disediakan di modul export.")}
              className="px-4 py-2 rounded-full text-sm font-semibold border border-black/10 bg-white hover:bg-black/5"
            >
              Export Excel (CSV)
            </button>
          </div>
          <div className="mt-3 text-xs leading-5 text-black/55">
            Ekspor PDF menggunakan dialog cetak browser (Save as PDF). Ekspor Excel menggunakan format CSV.
          </div>
        </div>

        {/* Notes from engine */}
        {calc?.notes?.length ? (
          <div className="mt-6 re-card rounded-2xl border border-black/10 shadow-sm p-6">
            <div className="text-sm font-semibold text-[rgb(var(--re-ink))] mb-2">Metode & catatan</div>
            <div className="text-sm leading-6 text-black/70">
              <div className="font-semibold text-[rgb(var(--re-ink))] mb-1">
                Method: {calc.method}
              </div>
              <ul className="list-disc pl-5 space-y-1">
                {calc.notes.map((n, idx) => (
                  <li key={idx}>{n}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {/* Table */}
        <div className="mt-6 re-card rounded-2xl border border-black/10 shadow-sm p-0 overflow-hidden">
          <div className="overflow-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-white/70 border-b border-black/10">
                <tr className="text-left text-black/60">
                  <th className="px-4 py-3 font-semibold">Course</th>
                  <th className="px-4 py-3 font-semibold">Governing case</th>
                  <th className="px-4 py-3 font-semibold">
                    t_calc{" "}
                    <span className="font-normal">
                      ({units === "SI" ? "mm" : "in"})
                    </span>
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    t_required{" "}
                    <span className="font-normal">
                      ({units === "SI" ? "mm" : "in"})
                    </span>
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    t_adopted{" "}
                    <span className="font-normal">
                      ({units === "SI" ? "mm" : "in"})
                    </span>
                  </th>
                  <th className="px-4 py-3 font-semibold">Utilization</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>

              <tbody>
                {calc?.results?.map((r) => (
                  <tr key={r.courseNo} className="border-b border-black/5">
                    <td className="px-4 py-3 font-semibold text-[rgb(var(--re-ink))]">
                      {r.courseNo}
                    </td>

                    <td className="px-4 py-3 text-black/70">
                      {CASE_LABEL[r.governingCase] ?? r.governingCase}
                    </td>

                    <td className="px-4 py-3 text-[rgb(var(--re-blue))] font-semibold">
                      {fmt(r.tCalc, 2)}
                    </td>

                    <td className="px-4 py-3 text-[rgb(var(--re-blue))] font-semibold">
                      {fmt(r.tRequired, 2)}
                      {r.isMinControlled ? (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border border-black/10 bg-white/80 text-[rgb(var(--re-orange))]">
                          Tebal minimum
                        </span>
                      ) : null}
                    </td>

                    <td className="px-4 py-3 text-black/60">{fmt(r.tAdopted, 2)}</td>

                    <td className="px-4 py-3 text-black/60">{fmt(r.utilization, 3)}</td>

                    <td className="px-4 py-3">
                      <span
                        className={[
                          "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border",
                          r.status === "OK"
                            ? "bg-white border-black/10 text-[rgb(var(--re-green))]"
                            : "bg-white border-black/10 text-red-600",
                        ].join(" ")}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!calc?.results?.length ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-black/60" colSpan={7}>
                      Data belum tersedia. Pastikan Step 1–3 telah terisi dengan benar.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        {/* Explanation card (dibikin baku) */}
        <div className="mt-6 re-card rounded-2xl border border-black/10 shadow-sm p-6">
          <div className="text-sm font-semibold text-[rgb(var(--re-ink))] mb-2">
            Mengapa nilai bisa menjadi konstan (plateau)?
          </div>
          <div className="text-sm leading-6 text-black/70">
            <p>
              Karena perhitungan menerapkan <span className="font-semibold">ketebalan nominal minimum</span>:
              {" "}
              <span className="font-semibold">t_required = max(t_calc, t_min + CA)</span>.
            </p>
            <p className="mt-2">
              Apabila <span className="font-semibold">t_calc</span> lebih kecil (umumnya pada course bagian atas),
              maka <span className="font-semibold">t_required</span> akan mengikuti batas{" "}
              <span className="font-semibold">t_min + CA</span>, sehingga terlihat “rata/konstan”.
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/projects/new/materials"
            className="px-4 py-2 rounded-full text-sm font-semibold border border-black/10 bg-white hover:bg-black/5"
          >
            Edit Materials (Step 3)
          </Link>
          <Link
            href="/projects/new/service-geometry"
            className="px-4 py-2 rounded-full text-sm font-semibold border border-black/10 bg-white hover:bg-black/5"
          >
            Edit Service & Geometry (Step 2)
          </Link>
          <Link
            href="/"
            className="px-4 py-2 rounded-full text-sm font-semibold border border-black/10 bg-white hover:bg-black/5"
          >
            Ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
