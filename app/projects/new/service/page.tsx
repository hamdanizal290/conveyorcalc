"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  loadProjectDraft,
  updateProjectDraft,
  type ProjectDraft,
  type DesignCaseKey,
  type ServiceDraft,
  type GeometryDraft,
  type GeometryInputMode,
} from "../../../../lib/storage/projectDraft";

import {
  API650_DIAMETERS,
  getPresetsByUnits,
  getPresetByKey,
  inferPresetKeyFromCourses,
  type CoursePresetKey,
} from "../../../../lib/api650/typicalGeometry";

import {
  calcNominalCapacity,
  capacityUnitFor,
  formatCapacity,
} from "../../../../lib/api650/nominalCapacity";

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
    <span
      className={`px-3 py-1.5 rounded-2xl text-xs font-semibold border border-black/10 ${cls}`}
    >
      {label}
    </span>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-5xl rounded-3xl re-card p-4 md:p-6 border border-black/10 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="text-lg font-semibold text-[rgb(var(--re-blue))]">
            {title}
          </div>
          <button
            type="button"
            className="px-3 py-2 rounded-2xl text-sm font-semibold border border-black/10 bg-white/85 hover:bg-white transition"
            onClick={onClose}
          >
            Tutup
          </button>
        </div>

        <div className="mt-4 max-h-[75vh] overflow-auto rounded-2xl border border-black/10 bg-white/70 p-3">
          {children}
        </div>

        <div className="mt-3 text-xs re-muted leading-relaxed">
          Catatan: gambar tabel ini hanya referensi internal untuk pemilihan
          dimensi tipikal. Verifikasi desain tetap mengacu pada dokumen API
          650/620 edisi yang dipakai.
        </div>
      </div>
    </div>
  );
}

const toNumberOrNaN = (s: string) => {
  if (s.trim() === "") return NaN;
  // izinkan koma sebagai desimal
  const normalized = s.replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
};

// helper input decimal yang ramah UX (boleh kosong, boleh koma)
const sanitizeDecimalText = (raw: string) => {
  // izinkan angka, koma, titik, minus (kalau suatu saat butuh)
  const cleaned = raw.replace(/[^0-9.,-]/g, "");
  return cleaned;
};

const CASE_LABEL: Record<DesignCaseKey, { title: string; hint: string }> = {
  operating: { title: "Operating", hint: "Kondisi operasi normal." },
  hydrotest: {
    title: "Hydrotest",
    hint: "Uji hidrostatik (umumnya lebih tinggi dari operating).",
  },
  empty_wind: {
    title: "Empty + Wind",
    hint: "Empty/minimum level terhadap angin (stabilitas).",
  },
  empty_seismic: {
    title: "Empty + Seismic",
    hint: "Empty/minimum level terhadap gempa (uplift/overturning).",
  },
  vacuum: {
    title: "Vacuum / External",
    hint: "Case khusus vacuum/external pressure (stability check).",
  },
  steamout: {
    title: "Steam-out / Cleaning",
    hint: "Case khusus operasi abnormal/pembersihan.",
  },
};

function getActiveCases(draft: ProjectDraft): DesignCaseKey[] {
  const dc = draft.designCases;
  if (!dc) return ["operating"];
  return (Object.keys(dc) as DesignCaseKey[]).filter((k) => dc[k]);
}

type Recommendation = {
  diameter: number;
  courses: number;
  shellHeight: number;
  capacity: number;
  hit: "CEIL" | "MAX";
};

export default function NewProjectServicePage() {
  const router = useRouter();

  const [draft, setDraft] = useState<ProjectDraft | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // modal tabel
  const [showTable, setShowTable] = useState(false);

  // ===== Service =====
  const [storedProduct, setStoredProduct] = useState("");
  const [sg, setSg] = useState<string>("1");

  // CA dibuat text supaya nilai "0" bisa dihapus dan tidak mental balik
  const [caText, setCaText] = useState<string>("2");

  const [liquidHeights, setLiquidHeights] = useState<
    Record<DesignCaseKey, string>
  >({
    operating: "",
    hydrotest: "",
    empty_wind: "0",
    empty_seismic: "0",
    vacuum: "0",
    steamout: "0",
  });

  // ===== Geometry =====
  const [geomMode, setGeomMode] = useState<GeometryInputMode>("capacity");
  const [targetCapacity, setTargetCapacity] = useState<string>("");

  const [presetKey, setPresetKey] = useState<CoursePresetKey>("SI_1800");
  const [diameterSel, setDiameterSel] = useState<string>("");
  const [courseCountSel, setCourseCountSel] = useState<string>("");

  useEffect(() => {
    const d = loadProjectDraft();
    setDraft(d);

    if (d) {
      // defaults by units
      if (d.units === "US") {
        setCaText("0.125");
        setPresetKey("US_72");
      } else {
        setCaText("2");
        setPresetKey("SI_1800");
      }

      // hydrate service
      if (d.service) {
        setStoredProduct(d.service.storedProduct ?? "");
        setSg(String(d.service.specificGravity ?? 1));
        setCaText(
          String(
            d.service.corrosionAllowance ?? (d.units === "SI" ? 2 : 0.125)
          )
        );

        setLiquidHeights((prev) => {
          const next = { ...prev };
          const lh = d.service?.liquidHeights ?? {};
          (Object.keys(next) as DesignCaseKey[]).forEach((k) => {
            if (lh[k] !== undefined) next[k] = String(lh[k]);
          });
          return next;
        });
      }

      // hydrate geometry
      if (d.geometry) {
        setGeomMode(d.geometry.inputMode ?? "capacity");
        if (d.geometry.targetCapacity !== undefined)
          setTargetCapacity(String(d.geometry.targetCapacity));
        if (d.geometry.presetKey)
          setPresetKey(d.geometry.presetKey as CoursePresetKey);

        setDiameterSel(String(d.geometry.diameter ?? ""));
        const inferred = inferPresetKeyFromCourses(d.units, d.geometry.courses ?? []);
        if (inferred) setPresetKey(inferred);

        const n = (d.geometry.courses ?? []).length;
        if (n > 0) setCourseCountSel(String(n));
      }
    }

    setHydrated(true);
  }, []);

  const presets = useMemo(() => {
    if (!draft) return [];
    return getPresetsByUnits(draft.units);
  }, [draft]);

  const preset = useMemo(() => getPresetByKey(presetKey), [presetKey]);

  useEffect(() => {
    if (!draft) return;
    const valid = presets.some((p) => p.key === presetKey);
    if (!valid) {
      setPresetKey(draft.units === "US" ? "US_72" : "SI_1800");
      setCourseCountSel("");
      setDiameterSel("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.units]);

  const activeCases = useMemo(() => (draft ? getActiveCases(draft) : []), [draft]);

  const lengthUnit = useMemo(() => (draft?.units === "US" ? "ft" : "m"), [draft]);
  const caUnit = useMemo(() => (draft?.units === "US" ? "in" : "mm"), [draft]);
  const capUnitLabel = useMemo(
    () => (draft?.units === "US" ? "barrels (bbl)" : "m³"),
    [draft]
  );

  const diameters = useMemo(() => {
    if (!draft) return [];
    return API650_DIAMETERS[draft.units];
  }, [draft]);

  const heightOptions = useMemo(() => preset?.heightOptions ?? [], [preset]);

  const selectedCourseCount = useMemo(() => {
    const n = Number.parseInt(courseCountSel, 10);
    return Number.isFinite(n) ? n : NaN;
  }, [courseCountSel]);

  const shellHeight = useMemo(() => {
    if (!preset) return NaN;
    if (!Number.isFinite(selectedCourseCount) || selectedCourseCount <= 0) return NaN;
    return preset.courseHeight * selectedCourseCount;
  }, [preset, selectedCourseCount]);

  const coursesArray = useMemo(() => {
    if (!preset) return [];
    if (!Number.isFinite(selectedCourseCount) || selectedCourseCount <= 0) return [];
    return Array.from({ length: selectedCourseCount }, () => preset.courseHeight);
  }, [preset, selectedCourseCount]);

  const currentCapacity = useMemo(() => {
    if (!draft) return NaN;
    const D = toNumberOrNaN(diameterSel);
    if (!Number.isFinite(D) || !Number.isFinite(shellHeight)) return NaN;
    return calcNominalCapacity(draft.units, D, shellHeight);
  }, [draft, diameterSel, shellHeight]);

  const recommendation = useMemo<Recommendation | null>(() => {
    if (!draft || !preset) return null;
    if (geomMode !== "capacity") return null;

    const target = toNumberOrNaN(targetCapacity);
    if (!Number.isFinite(target) || target <= 0) return null;

    const candidates: Recommendation[] = [];
    for (const D of diameters) {
      for (const opt of heightOptions) {
        const cap = calcNominalCapacity(draft.units, D, opt.shellHeight);
        if (!Number.isFinite(cap)) continue;
        candidates.push({
          diameter: D,
          courses: opt.courses,
          shellHeight: opt.shellHeight,
          capacity: cap,
          hit: "CEIL",
        });
      }
    }

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
      if (a.capacity !== b.capacity) return a.capacity - b.capacity;
      if (a.diameter !== b.diameter) return a.diameter - b.diameter;
      return a.shellHeight - b.shellHeight;
    });

    const ceil = candidates.find((c) => c.capacity >= target);
    if (ceil) return ceil;

    const max = candidates[candidates.length - 1];
    return { ...max, hit: "MAX" };
  }, [draft, preset, geomMode, targetCapacity, diameters, heightOptions]);

  useEffect(() => {
    if (geomMode !== "capacity") return;
    if (!recommendation) return;
    setDiameterSel(String(recommendation.diameter));
    setCourseCountSel(String(recommendation.courses));
  }, [geomMode, recommendation]);

  const fillDefaultsFromShellHeight = () => {
    if (!Number.isFinite(shellHeight) || shellHeight <= 0) return;

    const op = Math.max(0, 0.9 * shellHeight);
    const ht = shellHeight;

    setLiquidHeights((prev) => ({
      ...prev,
      operating: prev.operating.trim() ? prev.operating : String(op.toFixed(3)),
      hydrotest: prev.hydrotest.trim() ? prev.hydrotest : String(ht.toFixed(3)),
      empty_wind: prev.empty_wind.trim() ? prev.empty_wind : "0",
      empty_seismic: prev.empty_seismic.trim() ? prev.empty_seismic : "0",
      vacuum: prev.vacuum.trim() ? prev.vacuum : "0",
      steamout: prev.steamout.trim() ? prev.steamout : "0",
    }));
  };

  const warnings = useMemo(() => {
    const w: string[] = [];

    if (draft?.recommendedStandard === "API_620") {
      w.push(
        "Project terdeteksi API 620. Geometry tipikal di step ini tetap boleh dipakai sebagai starting point, tapi tabel tipikal ini berasal dari API 650 (reference)."
      );
    }

    if (Number.isFinite(shellHeight)) {
      for (const k of activeCases) {
        const lh = toNumberOrNaN(liquidHeights[k] ?? "");
        if (Number.isFinite(lh) && lh > shellHeight + 1e-6) {
          w.push(
            `Liquid height case ${CASE_LABEL[k].title} lebih besar dari shell height. Periksa input.`
          );
        }
      }
    }

    return w;
  }, [draft?.recommendedStandard, shellHeight, activeCases, liquidHeights]);

  const errors = useMemo(() => {
    const e: string[] = [];
    if (!draft) e.push("Draft project tidak ditemukan. Silakan kembali ke Step 0.");

    const sgN = toNumberOrNaN(sg);
    if (!Number.isFinite(sgN) || sgN <= 0) e.push("Specific gravity (SG) wajib diisi dan > 0.");

    const caN = toNumberOrNaN(caText);
    if (!Number.isFinite(caN) || caN < 0) e.push("Corrosion allowance (CA) wajib diisi dan ≥ 0.");

    const D = toNumberOrNaN(diameterSel);
    if (!Number.isFinite(D) || D <= 0) e.push("Diameter belum terpilih/terdefinisi.");

    if (draft && Number.isFinite(D)) {
      const allowed = API650_DIAMETERS[draft.units].includes(D);
      if (!allowed) e.push("Diameter yang dipilih tidak ada di daftar diameter tipikal API 650.");
    }

    if (!preset) e.push("Preset course tidak valid.");
    if (!courseCountSel.trim()) e.push("Tank height / jumlah course wajib dipilih/terdefinisi.");
    if (!Number.isFinite(shellHeight) || shellHeight <= 0) e.push("Shell height tidak valid.");

    if (geomMode === "capacity") {
      const tcap = toNumberOrNaN(targetCapacity);
      if (!Number.isFinite(tcap) || tcap <= 0)
        e.push(`Target capacity wajib diisi (angka > 0, unit: ${capUnitLabel}).`);
    }

    if (draft) {
      const act = getActiveCases(draft);
      if (act.includes("operating")) {
        const op = toNumberOrNaN(liquidHeights.operating);
        if (!Number.isFinite(op) || op < 0)
          e.push("Liquid height untuk Operating wajib diisi (angka ≥ 0).");
      }
      if (act.includes("hydrotest")) {
        const ht = toNumberOrNaN(liquidHeights.hydrotest);
        if (!Number.isFinite(ht) || ht < 0)
          e.push("Liquid height untuk Hydrotest wajib diisi (angka ≥ 0).");
      }
      for (const k of act) {
        const sVal = liquidHeights[k];
        if (sVal.trim() !== "") {
          const nVal = toNumberOrNaN(sVal);
          if (!Number.isFinite(nVal) || nVal < 0)
            e.push(`Liquid height untuk ${CASE_LABEL[k].title} harus angka ≥ 0.`);
        }
      }
    }

    return e;
  }, [
    draft,
    sg,
    caText,
    diameterSel,
    preset,
    courseCountSel,
    shellHeight,
    geomMode,
    targetCapacity,
    capUnitLabel,
    liquidHeights,
  ]);

  const canContinue = hydrated && errors.length === 0;

  const handleSaveContinue = () => {
    if (!draft || !canContinue || !preset) return;

    const sgN = toNumberOrNaN(sg);
    const caN = toNumberOrNaN(caText);
    const D = toNumberOrNaN(diameterSel);

    const act = getActiveCases(draft);
    const lh: Partial<Record<DesignCaseKey, number>> = {};
    for (const k of act) {
      const sVal = liquidHeights[k] ?? "";
      const nVal = toNumberOrNaN(sVal);
      lh[k] = Number.isFinite(nVal) ? nVal : 0;
    }

    const service: ServiceDraft = {
      storedProduct: storedProduct.trim() || undefined,
      specificGravity: sgN,
      corrosionAllowance: caN,
      liquidHeights: lh,
    };

    const capUnit = capacityUnitFor(draft.units);
    const tcapN = toNumberOrNaN(targetCapacity);

    const geometry: GeometryDraft = {
      diameter: D,
      shellHeight: shellHeight,
      courses: coursesArray,

      inputMode: geomMode,
      presetKey: presetKey,
      targetCapacity: geomMode === "capacity" && Number.isFinite(tcapN) ? tcapN : undefined,
      targetCapacityUnit: geomMode === "capacity" ? (capUnit as any) : undefined,
    };

    updateProjectDraft({ service, geometry });
    router.push("/projects/new/materials");
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

  if (!draft) {
    return (
      <main className="min-h-screen re-geo">
        <div className="mx-auto max-w-6xl px-6 py-10 md:px-10 md:py-14">
          <div className="re-card rounded-[2rem] p-7 md:p-9">
            <div className="text-sm text-red-600 font-semibold">
              Draft project tidak ditemukan.
            </div>
            <div className="mt-4">
              <Link
                href="/projects/new"
                className="px-4 py-2 rounded-2xl text-sm font-semibold border border-black/10 bg-white/70 hover:bg-white/90 transition"
              >
                Kembali ke Step 0
              </Link>
            </div>
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
              <div className="mt-1 text-sm re-muted">Step 2 — Service & Geometry</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/projects/new/config"
              className="px-4 py-2 rounded-2xl text-sm font-semibold border border-black/10 bg-white/70 hover:bg-white/90 transition"
            >
              Kembali (Step 1)
            </Link>
          </div>
        </div>

        {/* STEPPER */}
        <div className="mt-6 flex flex-wrap gap-2">
          <StepPill label="Step 0 • Initiation" state="done" />
          <StepPill label="Step 1 • Config & Cases" state="done" />
          <StepPill label="Step 2 • Service & Geometry" state="active" />
          <StepPill label="Step 3 • Materials" state="next" />
          <StepPill label="Step 4 • Results" state="next" />
        </div>

        {/* CONTENT */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* LEFT */}
          <div className="lg:col-span-7 re-card rounded-[2rem] p-7 md:p-9">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[rgb(var(--re-ink))]">
              Service & Geometry
            </h1>

            <p className="mt-2 text-sm md:text-base re-muted leading-relaxed">
              Geometri tank diturunkan dari grid tipikal (diameter + jumlah course).
              Mode <strong>Capacity</strong> akan memilih kombinasi terdekat dengan pendekatan ke atas.
            </p>

            {/* SERVICE */}
            <div className="mt-7 rounded-2xl border border-black/10 bg-white/60 p-5">
              <div className="text-sm font-semibold text-[rgb(var(--re-blue))]">
                Service (Fluida)
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <div className="text-sm font-semibold text-[rgb(var(--re-ink))]">
                    Stored product (opsional)
                  </div>
                  <input
                    value={storedProduct}
                    onChange={(e) => setStoredProduct(e.target.value)}
                    placeholder="Contoh: Diesel / Crude Oil / Water"
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
                  />
                </label>

                <label className="block">
                  <div className="text-sm font-semibold text-[rgb(var(--re-ink))]">
                    Specific gravity (SG) *
                  </div>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={sg}
                    onChange={(e) => setSg(e.target.value)}
                    placeholder="Contoh: 0.85 / 1.00"
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
                  />
                </label>

                <label className="block">
                  <div className="text-sm font-semibold text-[rgb(var(--re-ink))]">
                    Corrosion allowance (CA) * ({caUnit})
                  </div>

                  {/* pakai text + inputMode supaya 0 bisa dihapus */}
                  <input
                    type="text"
                    inputMode="decimal"
                    value={caText}
                    onChange={(e) => setCaText(sanitizeDecimalText(e.target.value))}
                    onBlur={() => {
                      if (caText.trim() === "") setCaText("0");
                    }}
                    placeholder={draft.units === "US" ? "Contoh: 0.125" : "Contoh: 2"}
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
                  />
                </label>
              </div>
            </div>

            {/* GEOMETRY */}
            <div className="mt-6 rounded-2xl border border-black/10 bg-white/60 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[rgb(var(--re-blue))]">
                    Geometry (berdasarkan tabel tipikal)
                  </div>
                  <div className="mt-1 text-sm re-muted">
                    Mode Capacity: input capacity → sistem pilih D/H/courses (ceil).
                    Mode Manual: pilih sendiri dari grid.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowTable(true)}
                  className="px-4 py-2 rounded-2xl text-sm font-semibold border border-black/10 bg-white/70 hover:bg-white/90 transition"
                >
                  Lihat tabel API 650
                </button>
              </div>

              {/* MODE TOGGLE */}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setGeomMode("capacity")}
                  className={[
                    "px-4 py-2 rounded-2xl text-sm font-semibold border transition",
                    "border-black/10",
                    geomMode === "capacity"
                      ? "bg-white shadow-sm text-[rgb(var(--re-blue))]"
                      : "bg-white/60 hover:bg-white/80 re-muted",
                  ].join(" ")}
                >
                  Mode: Capacity
                </button>

                <button
                  type="button"
                  onClick={() => setGeomMode("manual")}
                  className={[
                    "px-4 py-2 rounded-2xl text-sm font-semibold border transition",
                    "border-black/10",
                    geomMode === "manual"
                      ? "bg-white shadow-sm text-[rgb(var(--re-blue))]"
                      : "bg-white/60 hover:bg-white/80 re-muted",
                  ].join(" ")}
                >
                  Mode: Manual
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Preset */}
                <label className="block">
                  <div className="text-sm font-semibold text-[rgb(var(--re-ink))]">
                    Typical course height *
                  </div>
                  <select
                    value={presetKey}
                    onChange={(e) => {
                      setPresetKey(e.target.value as CoursePresetKey);
                      setCourseCountSel("");
                    }}
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
                  >
                    {presets.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>

                {/* CAPACITY INPUT */}
                {geomMode === "capacity" ? (
                  <label className="block">
                    <div className="text-sm font-semibold text-[rgb(var(--re-ink))]">
                      Target capacity * ({capUnitLabel})
                    </div>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      value={targetCapacity}
                      onChange={(e) => setTargetCapacity(e.target.value)}
                      placeholder={draft.units === "US" ? "Contoh: 50000" : "Contoh: 5000"}
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
                    />
                    <div className="mt-2 text-xs re-muted">
                      Nominal capacity dihitung sebagai volume silinder (tanpa roof/bottom): C = π/4 · D² · H.
                    </div>
                  </label>
                ) : (
                  <div className="rounded-2xl border border-black/10 bg-white/70 p-4">
                    <div className="text-sm font-semibold text-[rgb(var(--re-blue))]">Tip</div>
                    <div className="mt-2 text-sm re-muted">
                      Kalau lo mau auto pilih D/H dari target kapasitas, pindah ke{" "}
                      <strong>Mode: Capacity</strong>.
                    </div>
                  </div>
                )}

                {/* Diameter */}
                <label className="block">
                  <div className="text-sm font-semibold text-[rgb(var(--re-ink))]">
                    Diameter tank (D) * ({lengthUnit})
                  </div>
                  <select
                    value={diameterSel}
                    onChange={(e) => setDiameterSel(e.target.value)}
                    disabled={geomMode === "capacity" && Boolean(recommendation)}
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-60"
                  >
                    <option value="">Pilih diameter...</option>
                    {diameters.map((d) => (
                      <option key={d} value={String(d)}>
                        {d} {lengthUnit}
                      </option>
                    ))}
                  </select>
                  {geomMode === "capacity" && recommendation ? (
                    <div className="mt-2 text-xs re-muted">
                      Di mode Capacity, diameter dipilih otomatis dari rekomendasi.
                    </div>
                  ) : null}
                </label>

                {/* Height / courses */}
                <label className="block md:col-span-2">
                  <div className="text-sm font-semibold text-[rgb(var(--re-ink))]">
                    Tank height / jumlah course * ({lengthUnit})
                  </div>
                  <select
                    value={courseCountSel}
                    onChange={(e) => setCourseCountSel(e.target.value)}
                    disabled={geomMode === "capacity" && Boolean(recommendation)}
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-60"
                  >
                    <option value="">Pilih tinggi/jumlah course...</option>
                    {heightOptions.map((o) => (
                      <option key={o.courses} value={String(o.courses)}>
                        H = {o.shellHeight} {lengthUnit} ({o.courses} courses @ {preset?.courseHeight} {lengthUnit})
                      </option>
                    ))}
                  </select>
                  {geomMode === "capacity" && recommendation ? (
                    <div className="mt-2 text-xs re-muted">
                      Di mode Capacity, jumlah course dipilih otomatis dari rekomendasi.
                    </div>
                  ) : null}
                </label>
              </div>

              {/* RECOMMENDATION CARD */}
              {geomMode === "capacity" && recommendation ? (
                <div className="mt-5 rounded-2xl border border-black/10 bg-white/70 p-4">
                  <div className="text-sm font-semibold text-[rgb(var(--re-blue))]">
                    Rekomendasi (ceil)
                  </div>
                  <div className="mt-2 text-sm re-muted leading-relaxed">
                    <div>
                      <strong className="text-[rgb(var(--re-ink))]">Target:</strong>{" "}
                      {formatCapacity(draft.units, toNumberOrNaN(targetCapacity))}
                    </div>
                    <div>
                      <strong className="text-[rgb(var(--re-ink))]">Dipilih:</strong>{" "}
                      D = {recommendation.diameter} {lengthUnit}, H = {recommendation.shellHeight} {lengthUnit}, courses ={" "}
                      {recommendation.courses}
                    </div>
                    <div>
                      <strong className="text-[rgb(var(--re-ink))]">Nominal capacity:</strong>{" "}
                      {formatCapacity(draft.units, recommendation.capacity)}{" "}
                      {recommendation.hit === "MAX" ? (
                        <span className="text-[rgb(var(--re-orange))] font-semibold">(maksimum tersedia)</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 text-xs re-muted">
                    Kalau lo mau override, pindah ke <strong>Mode: Manual</strong>.
                  </div>
                </div>
              ) : null}

              {/* PREVIEW */}
              <div className="mt-5 rounded-2xl border border-black/10 bg-white/70 p-4">
                <div className="text-sm font-semibold text-[rgb(var(--re-blue))]">Preview geometry</div>
                <div className="mt-2 text-sm re-muted leading-relaxed">
                  <div>
                    <strong className="text-[rgb(var(--re-ink))]">D:</strong>{" "}
                    {diameterSel ? `${diameterSel} ${lengthUnit}` : "-"}
                  </div>
                  <div>
                    <strong className="text-[rgb(var(--re-ink))]">Hshell:</strong>{" "}
                    {Number.isFinite(shellHeight) ? `${shellHeight} ${lengthUnit}` : "-"}
                  </div>
                  <div>
                    <strong className="text-[rgb(var(--re-ink))]">Jumlah course:</strong>{" "}
                    {Number.isFinite(selectedCourseCount) ? selectedCourseCount : "-"}
                  </div>
                  <div>
                    <strong className="text-[rgb(var(--re-ink))]">Course height:</strong>{" "}
                    {preset ? `${preset.courseHeight} ${lengthUnit}` : "-"}
                  </div>
                  <div className="mt-2">
                    <strong className="text-[rgb(var(--re-ink))]">Nominal capacity (selected):</strong>{" "}
                    {Number.isFinite(currentCapacity) ? formatCapacity(draft.units, currentCapacity) : "-"}
                  </div>
                </div>

                {coursesArray.length > 0 ? (
                  <div className="mt-3 text-xs re-muted">
                    Course table (bottom→top): [{coursesArray.map((x) => String(x)).join(", ")}]
                  </div>
                ) : null}
              </div>
            </div>

            {/* CASE HEIGHTS */}
            <div className="mt-6 rounded-2xl border border-black/10 bg-white/60 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-semibold text-[rgb(var(--re-blue))]">
                  Liquid height per design case
                </div>
                <button
                  type="button"
                  onClick={fillDefaultsFromShellHeight}
                  className="px-4 py-2 rounded-2xl text-sm font-semibold border border-black/10 bg-white/70 hover:bg-white/90 transition"
                >
                  Isi default dari shell height
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {activeCases.map((k) => (
                  <div
                    key={k}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-2xl border border-black/10 bg-white/70 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[rgb(var(--re-ink))]">
                        {CASE_LABEL[k].title}
                      </div>
                      <div className="text-sm re-muted">{CASE_LABEL[k].hint}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        value={liquidHeights[k] ?? ""}
                        onChange={(e) =>
                          setLiquidHeights((prev) => ({ ...prev, [k]: e.target.value }))
                        }
                        placeholder="0"
                        className="w-44 rounded-2xl border border-black/10 bg-white/90 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                      />
                      <span className="text-sm re-muted">{lengthUnit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ERRORS */}
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

            {/* WARNINGS */}
            {warnings.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-black/10 bg-white/70 p-5">
                <div className="text-sm font-semibold text-[rgb(var(--re-orange))]">Catatan</div>
                <ul className="mt-2 list-disc pl-5 text-sm re-muted">
                  {warnings.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* ACTIONS */}
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
                Simpan & Lanjut (Step 3)
              </button>

              <Link
                href="/projects/new/config"
                className="px-6 py-4 rounded-2xl text-base font-semibold border border-black/10 bg-white/70 hover:bg-white/90 transition"
              >
                Kembali (Step 1)
              </Link>
            </div>
          </div>

          {/* RIGHT SUMMARY */}
          <div className="lg:col-span-5 re-card rounded-[2rem] p-6 md:p-7">
            <div className="text-xs re-muted">Ringkasan</div>
            <div className="mt-1 text-lg font-semibold text-[rgb(var(--re-blue))]">
              Project Summary
            </div>

            <div className="mt-5 rounded-2xl border border-black/10 bg-white/60 p-5 text-sm re-muted leading-relaxed">
              <div>
                <strong className="text-[rgb(var(--re-ink))]">Project:</strong> {draft.projectName}
              </div>
              <div>
                <strong className="text-[rgb(var(--re-ink))]">Units:</strong> {draft.units}
              </div>
              <div className="mt-2">
                <strong className="text-[rgb(var(--re-ink))]">Standard (auto):</strong>{" "}
                {draft.recommendedStandard === "API_650"
                  ? "API 650"
                  : draft.recommendedStandard === "API_620"
                  ? "API 620"
                  : "Out-of-scope"}
              </div>

              <div className="mt-4">
                <strong className="text-[rgb(var(--re-ink))]">Geometry:</strong>
                <ul className="mt-2 list-disc pl-5">
                  <li>Mode: {geomMode === "capacity" ? "Capacity" : "Manual"}</li>
                  <li>D: {diameterSel ? `${diameterSel} ${lengthUnit}` : "-"}</li>
                  <li>Hshell: {Number.isFinite(shellHeight) ? `${shellHeight} ${lengthUnit}` : "-"}</li>
                  <li>Courses: {Number.isFinite(selectedCourseCount) ? selectedCourseCount : "-"}</li>
                  <li>Nominal capacity: {Number.isFinite(currentCapacity) ? formatCapacity(draft.units, currentCapacity) : "-"}</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-black/10 bg-white/60 p-4 text-sm re-muted leading-relaxed">
              Step 3 akan minta: <strong>allowable stress</strong>, <strong>joint efficiency</strong>, dan{" "}
              <strong> adopted thickness</strong> per course untuk verifikasi OK/NOT OK.
            </div>
          </div>
        </div>
      </div>

      {/* MODAL TABLE */}
      {showTable && preset ? (
        <Modal title={preset.tableTitle} onClose={() => setShowTable(false)}>
          <div className="w-full">
            <Image
              src={preset.tableImageSrc}
              alt={preset.tableTitle}
              width={1400}
              height={1000}
              className="w-full h-auto object-contain rounded-2xl"
              priority
            />
          </div>
        </Modal>
      ) : null}
    </main>
  );
}
