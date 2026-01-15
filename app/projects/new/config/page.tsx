"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  clearProjectDraft,
  loadProjectDraft,
  updateProjectDraft,
  type ProjectDraft,
  type RoofType,
  type BottomType,
  type AnchorageType,
  type DesignCasesDraft,
  type DesignCaseKey,
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

function OptionButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        "px-4 py-2 rounded-2xl text-sm font-semibold border transition",
        "border-black/10",
        active ? "bg-white shadow-sm text-[rgb(var(--re-blue))]" : "bg-white/60 hover:bg-white/80 re-muted",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function CaseRow({
  title,
  desc,
  checked,
  disabled,
  onToggle,
  tag,
}: {
  title: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
  tag?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-black/10 bg-white/60 px-4 py-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-semibold text-[rgb(var(--re-ink))]">{title}</div>
          {tag ? (
            <span className="px-2.5 py-1 rounded-2xl text-xs font-semibold border border-black/10 bg-white/80 re-muted">
              {tag}
            </span>
          ) : null}
        </div>
        <div className="mt-1 text-sm re-muted leading-relaxed">{desc}</div>
      </div>

      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={[
          "shrink-0 px-4 py-2 rounded-2xl text-sm font-semibold border transition",
          "border-black/10",
          disabled ? "bg-black/10 text-black/40 cursor-not-allowed" : checked ? "bg-white shadow-sm text-[rgb(var(--re-blue))]" : "bg-white/70 hover:bg-white/90 re-muted",
        ].join(" ")}
      >
        {checked ? "Aktif" : "Nonaktif"}
      </button>
    </div>
  );
}

const DEFAULT_CASES: DesignCasesDraft = {
  operating: true,
  hydrotest: true,
  empty_wind: true,
  empty_seismic: true,
  vacuum: false,
  steamout: false,
};

export default function NewProjectConfigPage() {
  const router = useRouter();

  const [draft, setDraft] = useState<ProjectDraft | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Tank configuration state
  const [roofType, setRoofType] = useState<RoofType>("fixed_cone");
  const [bottomType, setBottomType] = useState<BottomType>("flat");
  const [anchorage, setAnchorage] = useState<AnchorageType>("unanchored");
  const [notes, setNotes] = useState("");

  // Design cases state
  const [designCases, setDesignCases] = useState<DesignCasesDraft>(DEFAULT_CASES);

  // Load draft + hydrate state
  useEffect(() => {
    const d = loadProjectDraft();
    setDraft(d);

    if (d?.tankConfig) {
      setRoofType(d.tankConfig.roofType ?? "fixed_cone");
      setBottomType(d.tankConfig.bottomType ?? "flat");
      setAnchorage(d.tankConfig.anchorage ?? "unanchored");
      setNotes(d.tankConfig.notes ?? "");
    }

    if (d?.designCases) {
      setDesignCases({ ...DEFAULT_CASES, ...d.designCases });
    }

    setHydrated(true);
  }, []);

  const standardLabel = useMemo(() => {
    if (!draft) return "-";
    if (draft.recommendedStandard === "API_650") return "API 650";
    if (draft.recommendedStandard === "API_620") return "API 620";
    return "Out-of-scope";
  }, [draft]);

  const toggleCase = (key: DesignCaseKey) => {
    // operating kita bikin wajib aktif supaya workflow stabil
    if (key === "operating") return;

    setDesignCases((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const enabledCaseCount = useMemo(() => {
    return Object.values(designCases).filter(Boolean).length;
  }, [designCases]);

  const errors = useMemo(() => {
    const e: string[] = [];
    if (!draft) e.push("Draft project tidak ditemukan. Silakan buat project dari Step 0.");
    if (draft?.recommendedStandard === "OUT_OF_SCOPE") {
      e.push("Project berada di luar cakupan. Tidak dapat lanjut ke wizard konfigurasi.");
    }
    if (enabledCaseCount < 1) e.push("Minimal pilih 1 design case.");
    return e;
  }, [draft, enabledCaseCount]);

  const canContinue = hydrated && errors.length === 0;

  const handleSaveContinue = () => {
    if (!canContinue || !draft) return;

    const tankConfig = {
      tankForm: "vertical_cylindrical" as const,
      roofType,
      bottomType,
      anchorage,
      notes: notes.trim() || undefined,
    };

    updateProjectDraft({
      tankConfig,
      designCases,
    });

    router.push("/projects/new/service");
  };

  const handleClear = () => {
    clearProjectDraft();
    router.push("/projects/new");
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
              <div className="mt-1 text-sm re-muted">
                Step 1 — Tank Configuration & Design Cases
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/projects/new"
              className="px-4 py-2 rounded-2xl text-sm font-semibold border border-black/10 bg-white/70 hover:bg-white/90 transition"
            >
              Kembali (Step 0)
            </Link>

            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 rounded-2xl text-sm font-semibold border border-black/10 bg-white/70 hover:bg-white/90 transition re-muted"
            >
              Hapus Draft
            </button>
          </div>
        </div>

        {/* STEPPER */}
        <div className="mt-6 flex flex-wrap gap-2">
          <StepPill label="Step 0 • Project Initiation" state="done" />
          <StepPill label="Step 1 • Config & Cases" state="active" />
          <StepPill label="Step 2 • Service & Geometry" state="next" />
        </div>

        {/* CONTENT */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* LEFT: FORM */}
          <div className="lg:col-span-7 re-card rounded-[2rem] p-7 md:p-9">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[rgb(var(--re-ink))]">
              Tank Configuration & Design Cases
            </h1>

            <p className="mt-2 text-sm md:text-base re-muted leading-relaxed">
              Di step ini Anda menetapkan konfigurasi tank dan design cases minimum.
              Standard sudah ditentukan dari Step 0 dan dipakai sebagai <strong>design basis</strong>.
            </p>

            {/* Config */}
            <div className="mt-7 rounded-2xl border border-black/10 bg-white/60 p-5">
              <div className="text-sm font-semibold text-[rgb(var(--re-blue))]">Tank Configuration</div>

              <div className="mt-4 space-y-5">
                <div>
                  <div className="text-sm font-semibold text-[rgb(var(--re-ink))]">Tipe roof</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <OptionButton
                      active={roofType === "fixed_cone"}
                      label="Fixed Cone Roof"
                      onClick={() => setRoofType("fixed_cone")}
                    />
                    <OptionButton
                      active={roofType === "fixed_dome"}
                      label="Fixed Dome Roof"
                      onClick={() => setRoofType("fixed_dome")}
                    />
                    <OptionButton
                      active={roofType === "open_top"}
                      label="Open Top"
                      onClick={() => setRoofType("open_top")}
                    />
                    <OptionButton
                      active={roofType === "floating_roof"}
                      label="Floating Roof"
                      onClick={() => setRoofType("floating_roof")}
                    />
                  </div>
                  <div className="mt-2 text-xs re-muted">
                    Catatan: detail roof design akan dikembangkan pada modul Roof. Di step ini cukup menetapkan tipenya.
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-[rgb(var(--re-ink))]">Tipe bottom</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <OptionButton
                      active={bottomType === "flat"}
                      label="Flat Bottom"
                      onClick={() => setBottomType("flat")}
                    />
                    <OptionButton
                      active={bottomType === "annular"}
                      label="Annular Ring"
                      onClick={() => setBottomType("annular")}
                    />
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-[rgb(var(--re-ink))]">Anchorage</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <OptionButton
                      active={anchorage === "unanchored"}
                      label="Unanchored"
                      onClick={() => setAnchorage("unanchored")}
                    />
                    <OptionButton
                      active={anchorage === "anchored"}
                      label="Anchored"
                      onClick={() => setAnchorage("anchored")}
                    />
                  </div>
                  <div className="mt-2 text-xs re-muted">
                    Ini akan berpengaruh pada check uplift/overturning (wind & seismic) di modul lanjutan.
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-[rgb(var(--re-ink))]">Catatan (opsional)</div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Contoh: Tank untuk diesel storage, fixed roof, lokasi dekat pantai..."
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>
              </div>
            </div>

            {/* Design cases */}
            <div className="mt-6 rounded-2xl border border-black/10 bg-white/60 p-5">
              <div className="text-sm font-semibold text-[rgb(var(--re-blue))]">Design Cases</div>
              <p className="mt-2 text-sm re-muted leading-relaxed">
                Pilih design cases yang akan digunakan sebagai container perhitungan. Untuk workflow yang stabil,
                <strong> Operating </strong> dibuat selalu aktif.
              </p>

              <div className="mt-4 space-y-3">
                <CaseRow
                  title="Operating (Normal)"
                  desc="Case dasar untuk kondisi operasi normal (umumnya liquid level penuh/operating level)."
                  checked={designCases.operating}
                  disabled
                  onToggle={() => {}}
                  tag="Wajib"
                />

                <CaseRow
                  title="Hydrotest"
                  desc="Case untuk uji hidrostatik. Umumnya liquid height bisa lebih tinggi dari operating."
                  checked={designCases.hydrotest}
                  onToggle={() => toggleCase("hydrotest")}
                />

                <CaseRow
                  title="Empty + Wind"
                  desc="Case empty (atau minimum level) terhadap beban angin untuk stabilitas/overturning."
                  checked={designCases.empty_wind}
                  onToggle={() => toggleCase("empty_wind")}
                />

                <CaseRow
                  title="Empty + Seismic"
                  desc="Case empty (atau minimum level) untuk evaluasi uplift/overturning akibat gempa."
                  checked={designCases.empty_seismic}
                  onToggle={() => toggleCase("empty_seismic")}
                />

                <CaseRow
                  title="Vacuum / External Pressure"
                  desc="Tambahkan jika ada vakum signifikan (pump-out, vent issue, steam-out)."
                  checked={designCases.vacuum}
                  onToggle={() => toggleCase("vacuum")}
                />

                <CaseRow
                  title="Steam-out / Cleaning"
                  desc="Opsional untuk scenario khusus pembersihan/operasi yang memicu kondisi abnormal."
                  checked={designCases.steamout}
                  onToggle={() => toggleCase("steamout")}
                />
              </div>
            </div>

            {/* Errors */}
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

            {/* Actions */}
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
                Simpan & Lanjut (Step 2)
              </button>

              <Link
                href="/projects/new"
                className="px-6 py-4 rounded-2xl text-base font-semibold border border-black/10 bg-white/70 hover:bg-white/90 transition"
              >
                Kembali (Step 0)
              </Link>
            </div>
          </div>

          {/* RIGHT: SUMMARY */}
          <div className="lg:col-span-5 re-card rounded-[2rem] p-6 md:p-7">
            <div className="text-xs re-muted">Ringkasan</div>
            <div className="mt-1 text-lg font-semibold text-[rgb(var(--re-blue))]">Project Summary</div>

            <div className="mt-5 rounded-2xl border border-black/10 bg-white/60 p-5 text-sm re-muted leading-relaxed">
              {draft ? (
                <>
                  <div>
                    <strong className="text-[rgb(var(--re-ink))]">Project:</strong>{" "}
                    {draft.projectName}
                  </div>
                  <div>
                    <strong className="text-[rgb(var(--re-ink))]">Lokasi:</strong>{" "}
                    {draft.location ?? "-"}
                  </div>
                  <div>
                    <strong className="text-[rgb(var(--re-ink))]">Units:</strong>{" "}
                    {draft.units}
                  </div>
                  <div className="mt-2">
                    <strong className="text-[rgb(var(--re-ink))]">Standard (auto):</strong>{" "}
                    {standardLabel}
                  </div>

                  <div className="mt-4">
                    <strong className="text-[rgb(var(--re-ink))]">Pilihan konfigurasi:</strong>
                    <ul className="mt-2 list-disc pl-5">
                      <li>Roof: {roofType}</li>
                      <li>Bottom: {bottomType}</li>
                      <li>Anchorage: {anchorage}</li>
                    </ul>
                  </div>

                  <div className="mt-4">
                    <strong className="text-[rgb(var(--re-ink))]">Design cases aktif:</strong>{" "}
                    {enabledCaseCount}
                  </div>
                </>
              ) : (
                <div>
                  Draft project tidak ditemukan. Silakan kembali ke Step 0 untuk membuat project.
                </div>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-black/10 bg-white/60 p-4 text-sm re-muted leading-relaxed">
              Setelah Step 1, Step 2 akan fokus ke <strong>service & geometry</strong> (fluid, SG, CA, diameter, shell height, course).
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
