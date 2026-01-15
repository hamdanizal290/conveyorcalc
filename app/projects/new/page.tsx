"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { selectStandard, type UnitKey } from "../../../lib/domain/standardSelector";
import { saveProjectDraft, type ProjectDraft } from "../../../lib/storage/projectDraft";

function Chip({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "blue" | "green" | "orange" | "danger";
}) {
  const toneClass =
    tone === "blue"
      ? "text-[rgb(var(--re-blue))]"
      : tone === "green"
        ? "text-[rgb(var(--re-green))]"
        : tone === "orange"
          ? "text-[rgb(var(--re-orange))]"
          : tone === "danger"
            ? "text-red-600"
            : "re-muted";

  return (
    <span
      className={`px-3 py-1.5 rounded-2xl text-xs font-semibold border border-black/10 bg-white/80 ${toneClass}`}
    >
      {children}
    </span>
  );
}

function Toggle({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={[
              "px-4 py-2 rounded-2xl text-sm font-semibold border transition",
              "border-black/10",
              active
                ? "bg-white shadow-sm text-[rgb(var(--re-blue))]"
                : "bg-white/60 hover:bg-white/80 re-muted",
            ].join(" ")}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const toNumberOrNaN = (s: string) => {
  if (s.trim() === "") return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

export default function NewProjectPage() {
  const router = useRouter();

  const [projectName, setProjectName] = useState("");
  const [location, setLocation] = useState("");

  const [units, setUnits] = useState<UnitKey>("SI");

  // Simpan sebagai string supaya user bisa hapus / kosongin input tanpa balik ke 0
  const [designPressure, setDesignPressure] = useState<string>("");
  const [designVacuum, setDesignVacuum] = useState<string>("");
  const [tMin, setTMin] = useState<string>("");
  const [tMax, setTMax] = useState<string>("60");

  const labels = useMemo(() => {
    return units === "SI"
      ? { p: "kPa(g)", v: "kPa", t: "°C" }
      : { p: "psi(g)", v: "psi", t: "°F" };
  }, [units]);

  // Envelope numerik untuk engine seleksi standard.
  // Field kosong => NaN (akan ditangani oleh validasi).
  const envelope = useMemo(
    () => ({
      units,
      designPressure: toNumberOrNaN(designPressure),
      designVacuum: toNumberOrNaN(designVacuum),
      tMin: toNumberOrNaN(tMin),
      tMax: toNumberOrNaN(tMax),
    }),
    [units, designPressure, designVacuum, tMin, tMax]
  );

  const decision = useMemo(() => selectStandard(envelope), [envelope]);

  // Validasi form (berbasis string + NaN)
  const errors = useMemo(() => {
    const e: string[] = [];

    if (!projectName.trim()) e.push("Nama project wajib diisi.");

    const p = toNumberOrNaN(designPressure);
    const v = toNumberOrNaN(designVacuum);
    const tmin = toNumberOrNaN(tMin);
    const tmax = toNumberOrNaN(tMax);

    // Pressure wajib
    if (!Number.isFinite(p)) e.push("Tekanan desain internal wajib diisi (angka).");
    if (Number.isFinite(p) && p < 0) e.push("Tekanan desain internal tidak boleh negatif.");

    // Vacuum opsional, tapi kalau diisi harus valid
    if (designVacuum.trim() !== "" && !Number.isFinite(v)) e.push("Vakum desain harus berupa angka.");
    if (Number.isFinite(v) && v < 0) e.push("Vakum desain diisi sebagai magnitudo (nilai positif).");

    // Tmin opsional, tapi kalau diisi harus valid
    if (tMin.trim() !== "" && !Number.isFinite(tmin)) e.push("Temperatur minimum harus berupa angka.");

    // Tmax wajib
    if (!Number.isFinite(tmax)) e.push("Temperatur maksimum wajib diisi (angka).");

    // Relasi Tmin/Tmax (hanya jika keduanya valid)
    if (Number.isFinite(tmax) && Number.isFinite(tmin) && tmax < tmin) {
      e.push("Temperatur maksimum harus lebih besar atau sama dengan temperatur minimum.");
    }

    return e;
  }, [projectName, designPressure, designVacuum, tMin, tMax]);

  const canContinue = errors.length === 0 && decision.recommended !== "OUT_OF_SCOPE";

  const handleCreate = () => {
    if (!canContinue) return;

    const draft: ProjectDraft = {
      id: `draft-${Date.now()}`,
      createdAt: new Date().toISOString(),
      projectName: projectName.trim(),
      location: location.trim() || undefined,
      units,
      envelope,
      decision,
      recommendedStandard: decision.recommended,
    };

    saveProjectDraft(draft);
    router.push("/projects/new/config");
  };

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
              <div className="text-xs md:text-sm re-muted">TankCalc • Project Initiation</div>
              <div className="mt-1 text-sm re-muted">
                Step 0 — Input awal project & pemilihan standard otomatis
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="px-4 py-2 rounded-2xl text-sm font-semibold border border-black/10 bg-white/70 hover:bg-white/90 transition"
            >
              Kembali ke Beranda
            </Link>
            <Link
              href="/calculator"
              className="px-4 py-2 rounded-2xl text-sm font-semibold border border-black/10 bg-white/70 hover:bg-white/90 transition re-muted"
            >
              Quick Calculator
            </Link>
          </div>
        </div>

        {/* CONTENT */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* LEFT: FORM */}
          <div className="lg:col-span-7 re-card rounded-[2rem] p-7 md:p-9">
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="blue">Project-based workflow</Chip>
              <Chip tone="green">Standard otomatis</Chip>
              <Chip tone="orange">SI / US</Chip>
            </div>

            <h1 className="mt-4 text-2xl md:text-3xl font-extrabold tracking-tight text-[rgb(var(--re-ink))]">
              Buat Project Baru
            </h1>

            <p className="mt-2 text-sm md:text-base re-muted leading-relaxed">
              Isi input minimum di bawah ini. Sistem akan memberikan rekomendasi standard (API 650 / API 620)
              berdasarkan <strong>pressure–temperature envelope</strong> dan menampilkan catatan untuk review.
            </p>

            <div className="mt-7 space-y-6">
              {/* Project meta */}
              <div className="rounded-2xl border border-black/10 bg-white/60 p-5">
                <div className="text-sm font-semibold text-[rgb(var(--re-blue))]">Informasi Project</div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <div className="text-sm font-semibold text-[rgb(var(--re-ink))]">Nama project *</div>
                    <input
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="Contoh: TK-401 Storage Tank"
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
                    />
                  </label>

                  <label className="block">
                    <div className="text-sm font-semibold text-[rgb(var(--re-ink))]">Lokasi (opsional)</div>
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Contoh: Balikpapan"
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
                    />
                  </label>
                </div>
              </div>

              {/* Units */}
              <div className="rounded-2xl border border-black/10 bg-white/60 p-5">
                <div className="text-sm font-semibold text-[rgb(var(--re-blue))]">Sistem Satuan *</div>
                <div className="mt-3">
                  <Toggle
                    value={units}
                    onChange={(v) => setUnits(v as UnitKey)}
                    options={[
                      { label: "SI", value: "SI" },
                      { label: "US", value: "US" },
                    ]}
                  />
                </div>
                <div className="mt-3 text-sm re-muted">
                  Label input mengikuti satuan: tekanan ({labels.p}), vakum ({labels.v}), temperatur ({labels.t}).
                </div>
              </div>

              {/* Envelope */}
              <div className="rounded-2xl border border-black/10 bg-white/60 p-5">
                <div className="text-sm font-semibold text-[rgb(var(--re-blue))]">
                  Pressure–Temperature Envelope
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <div className="text-sm font-semibold text-[rgb(var(--re-ink))]">
                      Tekanan desain internal ({labels.p}) *
                    </div>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      value={designPressure}
                      onChange={(e) => setDesignPressure(e.target.value)}
                      placeholder="Contoh: 0 / 10 / 17.2"
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
                    />
                    <div className="mt-2 text-xs re-muted">
                      Diisi sebagai tekanan gauge. Sistem menggunakan nilai ini sebagai dasar rekomendasi standard.
                    </div>
                  </label>

                  <label className="block">
                    <div className="text-sm font-semibold text-[rgb(var(--re-ink))]">
                      Vakum desain (magnitudo, {labels.v})
                    </div>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      value={designVacuum}
                      onChange={(e) => setDesignVacuum(e.target.value)}
                      placeholder="Contoh: 0 / 5"
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
                    />
                    <div className="mt-2 text-xs re-muted">
                      Masukkan sebagai nilai positif (contoh: 5 kPa vakum → isi 5).
                    </div>
                  </label>

                  <label className="block">
                    <div className="text-sm font-semibold text-[rgb(var(--re-ink))]">
                      Temperatur minimum ({labels.t})
                    </div>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      value={tMin}
                      onChange={(e) => setTMin(e.target.value)}
                      placeholder="Contoh: 0 / -10"
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
                    />
                  </label>

                  <label className="block">
                    <div className="text-sm font-semibold text-[rgb(var(--re-ink))]">
                      Temperatur maksimum ({labels.t}) *
                    </div>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      value={tMax}
                      onChange={(e) => setTMax(e.target.value)}
                      placeholder="Contoh: 60 / 93"
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
                    />
                  </label>
                </div>
              </div>

              {/* Errors */}
              {errors.length > 0 ? (
                <div className="rounded-2xl border border-red-200 bg-white/80 p-5">
                  <div className="text-sm font-semibold text-red-600">Periksa input</div>
                  <ul className="mt-2 list-disc pl-5 text-sm text-red-600">
                    {errors.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!canContinue}
                  className={[
                    "px-8 py-4 rounded-2xl text-base font-semibold text-white shadow transition",
                    canContinue ? "bg-[rgb(var(--re-blue))] hover:opacity-95" : "bg-black/30 cursor-not-allowed",
                  ].join(" ")}
                >
                  Buat Project & Lanjut
                </button>

                <Link
                  href="/"
                  className="px-6 py-4 rounded-2xl text-base font-semibold border border-black/10 bg-white/70 hover:bg-white/90 transition"
                >
                  Batal
                </Link>
              </div>

              {decision.recommended === "OUT_OF_SCOPE" ? (
                <div className="mt-2 text-sm text-red-600">
                  Sistem menilai kondisi ini <strong>di luar cakupan</strong> untuk workflow tank atmospheric/low-pressure.
                  Silakan review spesifikasi project dan gunakan pendekatan desain yang sesuai.
                </div>
              ) : null}
            </div>
          </div>

          {/* RIGHT: SYSTEM DECISION */}
          <div className="lg:col-span-5 re-card rounded-[2rem] p-6 md:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs re-muted">Keputusan sistem</div>
                <div className="mt-1 text-lg font-semibold text-[rgb(var(--re-blue))]">
                  Rekomendasi Standard
                </div>
              </div>

              <Chip
                tone={
                  decision.recommended === "API_650"
                    ? "green"
                    : decision.recommended === "API_620"
                      ? "green"
                      : "danger"
                }
              >
                {decision.recommended === "API_650"
                  ? "API 650"
                  : decision.recommended === "API_620"
                    ? "API 620"
                    : "Out-of-scope"}
              </Chip>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Chip tone="blue">Confidence: {decision.confidence}</Chip>
              <Chip tone="muted">
                Normalisasi P: {decision.normalized.designPressure_kPa.toFixed(2)} kPa
              </Chip>
            </div>

            <div className="mt-5">
              <div className="text-sm font-semibold text-[rgb(var(--re-blue))]">Alasan</div>
              <ul className="mt-2 list-disc pl-5 text-sm re-muted leading-relaxed">
                {decision.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>

            <div className="mt-5">
              <div className="text-sm font-semibold text-[rgb(var(--re-orange))]">Catatan review</div>
              {decision.warnings.length > 0 ? (
                <ul className="mt-2 list-disc pl-5 text-sm re-muted leading-relaxed">
                  {decision.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              ) : (
                <div className="mt-2 text-sm re-muted">Tidak ada catatan tambahan.</div>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-black/10 bg-white/60 p-4 text-sm re-muted leading-relaxed">
              Setelah lanjut, standard akan dipakai sebagai <strong>design basis</strong> untuk step berikutnya
              (tank configuration + design cases).
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
