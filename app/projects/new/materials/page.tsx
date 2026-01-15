"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  loadProjectDraft,
  updateProjectDraft,
  type ProjectDraft,
  type MaterialsDraft,
} from "../../../../lib/storage/projectDraft";

function StepPill({
  label,
  state,
}: {
  label: string;
  state: "done" | "active" | "next";
}) {
  const cls =
    state === "done"
      ? "bg-white/85 text-[rgb(var(--re-green))]"
      : state === "active"
        ? "bg-white shadow-sm text-[rgb(var(--re-blue))]"
        : "bg-white/60 re-muted";

  return (
    <span className={`px-3 py-1.5 rounded-2xl text-xs font-semibold border border-black/10 ${cls}`}>
      {label}
    </span>
  );
}

const toNumberOrNaN = (s: string) => {
  if (s.trim() === "") return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

export default function NewProjectMaterialsPage() {
  const router = useRouter();

  const [draft, setDraft] = useState<ProjectDraft | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [Sd, setSd] = useState<string>(""); // design allowable
  const [St, setSt] = useState<string>(""); // hydrotest allowable
  const [E, setE] = useState<string>("1.0");

  const [minNom, setMinNom] = useState<string>("6");
  const [applyAll, setApplyAll] = useState<string>("");

  const [courseThk, setCourseThk] = useState<string[]>([]);

  useEffect(() => {
    const d = loadProjectDraft();
    setDraft(d);

    if (d?.units === "US") {
      setMinNom("0.25");
      setE("1.0");
    } else {
      setMinNom("6");
      setE("1.0");
    }

    if (d?.materials) {
      setSd(String(d.materials.allowableStressDesign ?? ""));
      setSt(String(d.materials.allowableStressTest ?? ""));
      setE(String(d.materials.jointEfficiency ?? "1.0"));
      setMinNom(String(d.materials.minNominalThickness ?? (d.units === "US" ? 0.25 : 6)));
      setCourseThk((d.materials.courseNominalThickness ?? []).map((x) => String(x)));
    } else if (d?.geometry?.courses?.length) {
      // init thickness array based on number of courses
      setCourseThk(Array.from({ length: d.geometry.courses.length }, () => ""));
    }

    setHydrated(true);
  }, []);

  const stressUnit = useMemo(() => (draft?.units === "US" ? "psi" : "MPa"), [draft]);
  const thkUnit = useMemo(() => (draft?.units === "US" ? "in" : "mm"), [draft]);

  const hydrotestActive = useMemo(() => {
    return Boolean(draft?.designCases?.hydrotest);
  }, [draft]);

  const courseCount = useMemo(() => draft?.geometry?.courses?.length ?? 0, [draft]);

  const errors = useMemo(() => {
    const e: string[] = [];
    if (!draft) e.push("Draft project tidak ditemukan. Silakan kembali ke Step 0.");
    if (!draft?.geometry?.courses?.length) e.push("Geometry/courses belum ada. Lengkapi Step 2 dulu.");

    const sd = toNumberOrNaN(Sd);
    if (!Number.isFinite(sd) || sd <= 0) e.push(`Allowable stress design (Sd) wajib diisi dan > 0 (${stressUnit}).`);

    const ee = toNumberOrNaN(E);
    if (!Number.isFinite(ee) || ee <= 0 || ee > 1) e.push("Joint efficiency (E) harus pada rentang (0, 1].");

    const mn = toNumberOrNaN(minNom);
    if (!Number.isFinite(mn) || mn <= 0) e.push(`Minimum nominal thickness wajib diisi dan > 0 (${thkUnit}).`);

    if (hydrotestActive) {
      const st = toNumberOrNaN(St);
      if (!Number.isFinite(st) || st <= 0) e.push(`Allowable stress hydrotest (St) wajib diisi dan > 0 (${stressUnit}).`);
    }

    if (courseThk.length !== courseCount) e.push("Jumlah thickness input tidak sama dengan jumlah courses.");

    const thkNums = courseThk.map(toNumberOrNaN);
    if (thkNums.some((x) => !Number.isFinite(x) || x <= 0)) {
      e.push(`Adopted thickness per course wajib diisi dan > 0 (${thkUnit}).`);
    }

    return e;
  }, [draft, Sd, St, E, minNom, hydrotestActive, courseThk, courseCount, stressUnit, thkUnit]);

  const canContinue = hydrated && errors.length === 0;

  const applyThicknessAll = () => {
    if (!draft?.geometry?.courses?.length) return;
    const v = toNumberOrNaN(applyAll);
    if (!Number.isFinite(v) || v <= 0) return;

    setCourseThk(Array.from({ length: draft.geometry.courses.length }, () => String(v)));
  };

  const handleSaveContinue = () => {
    if (!draft || !canContinue) return;

    const sd = toNumberOrNaN(Sd);
    const st = hydrotestActive ? toNumberOrNaN(St) : sd; // kalau hydrotest tidak aktif, set sama
    const ee = toNumberOrNaN(E);
    const mn = toNumberOrNaN(minNom);

    const thk = courseThk.map(toNumberOrNaN);

    const materials: MaterialsDraft = {
      allowableStressDesign: sd,
      allowableStressTest: st,
      jointEfficiency: ee,
      minNominalThickness: mn,
      courseNominalThickness: thk,
    };

    updateProjectDraft({ materials });
    router.push("/projects/new/results");
  };

  if (!hydrated) {
    return (
      <main className="min-h-screen re-geo">
        <div className="mx-auto max-w-6xl px-6 py-10 md:px-10 md:py-14">
          <div className="re-card rounded-[2rem] p-7 md:p-9">
            <div className="text-sm re-muted">Memuat draft project...</div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen re-geo">
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10 md:py-14">
        {/* HEADER */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-6">
            <div className="shrink-0">
              <div className="h-14 w-40 md:h-16 md:w-52 rounded-3xl bg-white/90 border border-black/10 shadow-sm flex items-center justify-center px-3">
                <Image
                  src="/re-logo.png"
                  alt="Rekayasa Engineering"
                  width={560}
                  height={200}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
            </div>

            <div className="hidden sm:block">
              <div className="text-xs md:text-sm re-muted">Projects • New</div>
              <div className="mt-1 text-sm re-muted">Step 3 — Materials & Shell Schedule</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/projects/new/service"
              className="px-4 py-2 rounded-2xl text-sm font-semibold border border-black/10 bg-white/70 hover:bg-white/90 transition"
            >
              Kembali (Step 2)
            </Link>
          </div>
        </div>

        {/* STEPPER */}
        <div className="mt-6 flex flex-wrap gap-2">
          <StepPill label="Step 0 • Initiation" state="done" />
          <StepPill label="Step 1 • Config & Cases" state="done" />
          <StepPill label="Step 2 • Service & Geometry" state="done" />
          <StepPill label="Step 3 • Materials" state="active" />
          <StepPill label="Step 4 • Results" state="next" />
        </div>

        {/* CONTENT */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* LEFT */}
          <div className="lg:col-span-7 re-card rounded-[2rem] p-7 md:p-9">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[rgb(var(--re-ink))]">
              Materials & Shell Schedule
            </h1>
            <p className="mt-2 text-sm md:text-base re-muted leading-relaxed">
              Input di step ini dipakai untuk menghitung <strong>required thickness</strong> dan menentukan status
              <strong> OK / NOT OK</strong> per course.
            </p>

            <div className="mt-7 rounded-2xl border border-black/10 bg-white/60 p-5">
              <div className="text-sm font-semibold text-[rgb(var(--re-blue))]">Allowable stress & joint efficiency</div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <div className="text-sm font-semibold text-[rgb(var(--re-ink))]">
                    Allowable stress (Sd) * ({stressUnit})
                  </div>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={Sd}
                    onChange={(e) => setSd(e.target.value)}
                    placeholder={draft?.units === "US" ? "Contoh: 21300" : "Contoh: 160"}
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
                  />
                </label>

                <label className="block">
                  <div className="text-sm font-semibold text-[rgb(var(--re-ink))]">
                    Joint efficiency (E) * (0–1)
                  </div>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={E}
                    onChange={(e) => setE(e.target.value)}
                    placeholder="1.0"
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["1.0", "0.85", "0.7"].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setE(v)}
                        className="px-3 py-2 rounded-2xl text-xs font-semibold border border-black/10 bg-white/70 hover:bg-white/90 transition re-muted"
                      >
                        Set {v}
                      </button>
                    ))}
                  </div>
                </label>

                <label className="block">
                  <div className="text-sm font-semibold text-[rgb(var(--re-ink))]">
                    Minimum nominal thickness (excl. CA) * ({thkUnit})
                  </div>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={minNom}
                    onChange={(e) => setMinNom(e.target.value)}
                    placeholder={draft?.units === "US" ? "0.25" : "6"}
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
                  />
                </label>

                {hydrotestActive ? (
                  <label className="block">
                    <div className="text-sm font-semibold text-[rgb(var(--re-ink))]">
                      Allowable stress hydrotest (St) * ({stressUnit})
                    </div>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      value={St}
                      onChange={(e) => setSt(e.target.value)}
                      placeholder={draft?.units === "US" ? "Contoh: 24900" : "Contoh: 171"}
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
                    />
                  </label>
                ) : null}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-black/10 bg-white/60 p-5">
              <div className="text-sm font-semibold text-[rgb(var(--re-blue))]">Adopted thickness per course</div>
              <p className="mt-2 text-sm re-muted">
                Isi ketebalan nominal per course (diasumsikan sudah termasuk corrosion allowance).
              </p>

              <div className="mt-4 flex flex-col md:flex-row md:items-end gap-3">
                <label className="block flex-1">
                  <div className="text-sm font-semibold text-[rgb(var(--re-ink))]">
                    Isi sama untuk semua course ({thkUnit})
                  </div>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={applyAll}
                    onChange={(e) => setApplyAll(e.target.value)}
                    placeholder={draft?.units === "US" ? "Contoh: 0.375" : "Contoh: 10"}
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
                  />
                </label>

                <button
                  type="button"
                  onClick={applyThicknessAll}
                  className="px-5 py-3 rounded-2xl text-sm font-semibold text-white bg-[rgb(var(--re-blue))] hover:opacity-95 transition shadow"
                >
                  Apply
                </button>
              </div>

              <div className="mt-5 space-y-2">
                {courseThk.map((v, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/70 px-4 py-3"
                  >
                    <div className="text-sm font-semibold text-[rgb(var(--re-blue))]">Course {idx + 1}</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        value={v}
                        onChange={(e) =>
                          setCourseThk((prev) => prev.map((x, i) => (i === idx ? e.target.value : x)))
                        }
                        className="w-40 rounded-2xl border border-black/10 bg-white/90 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                      />
                      <span className="text-sm re-muted">{thkUnit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {errors.length > 0 ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-white/80 p-5">
                <div className="text-sm font-semibold text-red-600">Periksa sebelum lanjut</div>
                <ul className="mt-2 list-disc pl-5 text-sm text-red-600">
                  {errors.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSaveContinue}
                disabled={!canContinue}
                className={[
                  "px-8 py-4 rounded-2xl text-base font-semibold text-white shadow transition",
                  canContinue ? "bg-[rgb(var(--re-blue))] hover:opacity-95" : "bg-black/30 cursor-not-allowed",
                ].join(" ")}
              >
                Simpan & Lihat Results (Step 4)
              </button>

              <Link
                href="/projects/new/service"
                className="px-6 py-4 rounded-2xl text-base font-semibold border border-black/10 bg-white/70 hover:bg-white/90 transition"
              >
                Kembali (Step 2)
              </Link>
            </div>
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-5 re-card rounded-[2rem] p-6 md:p-7">
            <div className="text-xs re-muted">Ringkasan</div>
            <div className="mt-1 text-lg font-semibold text-[rgb(var(--re-blue))]">Project Summary</div>

            <div className="mt-5 rounded-2xl border border-black/10 bg-white/60 p-5 text-sm re-muted leading-relaxed">
              {draft ? (
                <>
                  <div><strong className="text-[rgb(var(--re-ink))]">Project:</strong> {draft.projectName}</div>
                  <div><strong className="text-[rgb(var(--re-ink))]">Standard:</strong> {draft.recommendedStandard}</div>
                  <div><strong className="text-[rgb(var(--re-ink))]">Courses:</strong> {courseCount}</div>
                  <div className="mt-3">
                    <strong className="text-[rgb(var(--re-ink))]">Units:</strong> {draft.units}
                  </div>
                </>
              ) : (
                <div>Draft tidak ditemukan.</div>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-black/10 bg-white/60 p-4 text-sm re-muted leading-relaxed">
              Step 4 akan menampilkan tabel: <strong>t_required</strong>, <strong>t_adopted</strong>, governing case,
              dan status <strong>OK/NOT OK</strong>.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
