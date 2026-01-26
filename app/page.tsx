//    
"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";

type ModalKey = "about" | "changelog" | "roadmap" | "internal" | "support" | null;

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg rounded-3xl re-card p-6 md:p-7 border border-black/10 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="text-lg font-semibold text-[rgb(var(--re-blue))]">{title}</div>
          <button
            type="button"
            className="px-3 py-2 rounded-2xl text-sm font-semibold border border-black/10 bg-white/85 hover:bg-white transition"
            onClick={onClose}
          >
            Tutup
          </button>
        </div>

        <div className="mt-3 text-sm re-muted leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

export default function Home() {
  const [modal, setModal] = useState<ModalKey>(null);

  const modalContent = useMemo(() => {
    switch (modal) {
      case "about":
        return {
          title: "Tentang ConveyorCalc",
          body: (
            <>
              <strong className="text-[rgb(var(--re-blue))]">ConveyorCalc</strong> adalah tool internal untuk mendukung{" "}
              <strong className="text-[rgb(var(--re-green))]">desain & verifikasi belt conveyor</strong>.
              Fokusnya workflow perhitungan kapasitas, power, dan tension sesuai standard CEMA/ISO.
            </>
          ),
        };
      case "changelog":
        return {
          title: "Changelog",
          body: (
            <>
              Catatan perubahan versi:
              <ul className="mt-2 list-disc pl-5">
                <li>v1.0 — Full Release (CEMA Analysis, Multi-step Workflow, Project Storage)</li>
                <li>v0.2 — Improved Power calculation with accessory resistance (Skirts, Scrapers)</li>
                <li>v0.1 — Initial Conveyor Calculator (Capacity, Speed, Power, Tension)</li>
              </ul>
            </>
          ),
        };
      case "roadmap":
        return {
          title: "Roadmap",
          body: (
            <>
              Rencana pengembangan modul:
              <ul className="mt-2 list-disc pl-5">
                <li>
                  <strong className="text-[rgb(var(--re-blue))]">Capacity & Power Analysis</strong> (Done)
                </li>
                <li>
                  <strong className="text-[rgb(var(--re-blue))]">Project Management</strong> (Done)
                </li>
                <li>
                  <strong className="text-[rgb(var(--re-blue))]">PDF Report Export</strong> (Done)
                </li>
                <li>Trajectory Calculation (In-Progress)</li>
                <li>Pulley & Shaft Sizing (In-Progress)</li>
                <li>Automated Idler Selection</li>
                <li>Dynamic Tension Analysis (Transient)</li>
              </ul>
            </>
          ),
        };
      case "internal":
        return {
          title: "Internal RE",
          body: (
            <>
              <p>
                Tool ini ditujukan untuk penggunaan internal divisi Mechanical.
                Pastikan input density dan material properties sesuai data project.
              </p>
              <div className="mt-6 flex justify-end">
                <Link
                  href="/internal"
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-[rgb(var(--re-blue))] hover:opacity-90 transition"
                  onClick={() => setModal(null)}
                >
                  Buka Dashboard Internal &rarr;
                </Link>
              </div>
            </>
          ),
        };
      case "support":
        return {
          title: "Bantuan & Dukungan",
          body: (
            <>
              Jika ada kendala perhitungan atau bug:
              <ul className="mt-2 list-disc pl-5">
                <li>Catat input parameter</li>
                <li>Screenshot hasil</li>
                <li>Hubungi tim development internal</li>
              </ul>
            </>
          ),
        };
      default:
        return null;
    }
  }, [modal]);

  return (
    <main className="min-h-screen re-geo">
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10 md:py-14">
        <section className="rounded-[2rem]">
          {/* TOP BAR */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-6">
              <div className="shrink-0">
                <div className="h-16 w-44 md:h-20 md:w-56 rounded-3xl bg-white/90 border border-black/10 shadow-sm flex items-center justify-center px-3">
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
                <div className="text-xs md:text-sm re-muted">Belt Conveyor Design Calculator</div>
                <div className="mt-1 text-sm re-muted">Internal tool • Mechanical Engineering</div>
                <div className="mt-1 text-xs re-muted">Initial build • RE Mechanical</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/projects"
                className="px-4 py-2 rounded-2xl text-sm font-semibold border border-black/10 bg-white/70 hover:bg-white/90 transition"
              >
                Saved Projects
              </Link>

              <button
                type="button"
                className="px-4 py-2 rounded-2xl text-sm font-semibold border border-black/10 bg-white/70 hover:bg-white/90 transition"
                onClick={() => setModal("changelog")}
              >
                Changelog
              </button>

              <button
                type="button"
                className="px-4 py-2 rounded-2xl text-sm font-semibold border border-black/10 bg-white/70 hover:bg-white/90 transition"
                onClick={() => setModal("roadmap")}
              >
                Roadmap
              </button>

              <button
                type="button"
                className="px-4 py-2 rounded-2xl text-sm font-semibold border border-black/10 bg-white/70 hover:bg-white/90 transition"
                onClick={() => setModal("internal")}
              >
                Internal RE
              </button>
            </div>
          </div>

          {/* GRID */}
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
            {/* LEFT */}
            <div className="lg:col-span-7 re-card rounded-[2rem] p-8 md:p-10 relative overflow-hidden">
              <div className="pointer-events-none absolute -top-24 -right-28 h-64 w-64 rounded-full bg-[rgb(var(--re-blue))]/10 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-28 h-64 w-64 rounded-full bg-[rgb(var(--re-green))]/10 blur-2xl" />

              <div className="text-xs md:text-sm re-muted">Desain & verifikasi conveyor</div>

              <h1 className="mt-3 text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.03]">
                <span className="re-animated-gradient">ConveyorCalc</span>{" "}
                <span className="text-[rgb(var(--re-ink))]">Web App</span>
              </h1>

              <p className="mt-6 max-w-2xl text-base md:text-lg re-muted leading-relaxed">
                Platform internal Rekayasa Engineering untuk{" "}
                <strong className="text-[rgb(var(--re-green))]">desain & verifikasi belt conveyor</strong>.
                Mencakup perhitungan kapasitas, kecepatan belt, kebutuhan daya motor, dan tegangan belt sesuai standar engineering.
              </p>

              {/* Workflow cards */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { n: "01", t: "Material & Geometry", d: "Density, angle of surcharge, conveyor profile (L, H)" },
                  { n: "02", t: "Capacity Analysis", d: "Belt speed, volumetric & mass capacity check" },
                  { n: "03", t: "Power Calculation", d: "Drive power, motor selection, efficiency" },
                  { n: "04", t: "Tension & Components", d: "Belt tension, idler spacing, pulley sizing" },
                ].map((x) => (
                  <div
                    key={x.n}
                    className="rounded-2xl border border-black/10 bg-white/60 p-4 hover:bg-white/75 transition"
                  >
                    <div className="flex items-baseline justify-between">
                      <div className="text-sm font-semibold text-[rgb(var(--re-blue))]">{x.t}</div>
                      <div className="text-xs font-bold re-muted">{x.n}</div>
                    </div>
                    <div className="mt-1 text-sm re-muted leading-relaxed">{x.d}</div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/project"
                  className="px-8 py-4 rounded-2xl text-base md:text-lg font-semibold text-white bg-[rgb(var(--re-blue))] hover:opacity-95 transition shadow flex items-center gap-2"
                >
                  Start New Project
                  <span className="opacity-70">&rarr;</span>
                </Link>
                <Link
                  href="/calculator"
                  className="px-8 py-4 rounded-2xl text-base md:text-lg font-semibold text-[rgb(var(--re-blue))] bg-white border border-black/10 hover:bg-slate-50 transition"
                >
                  Quick Calculator
                </Link>
              </div>
            </div>

            {/* RIGHT */}
            <div className="lg:col-span-5 re-card rounded-[2rem] p-6 md:p-7">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs re-muted">Status modul</div>
                  <div className="mt-1 text-lg font-semibold text-[rgb(var(--re-blue))]">Features</div>
                </div>

                <span className="px-3 py-1.5 rounded-2xl text-xs font-semibold border border-black/10 bg-white/80 text-[rgb(var(--re-orange))]">
                  Beta
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {[
                  { name: "Belt Speed & Capacity", status: "Available" },
                  { name: "Material Load Analysis", status: "Available" },
                  { name: "Power Calculation", status: "Available" },
                  { name: "Belt Tension Analysis", status: "Available" },
                  { name: "Idler Spacing", status: "Available" },
                  { name: "Trajectory Analysis", status: "Planned" },
                ].map((m) => (
                  <div
                    key={m.name}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/60 px-4 py-3"
                  >
                    <div className="text-sm font-semibold text-[rgb(var(--re-ink))]">{m.name}</div>
                    <span className="px-3 py-1 rounded-2xl text-xs font-semibold border border-black/10 bg-white/80 text-[rgb(var(--re-blue))]">
                      {m.status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-2xl text-sm font-semibold text-[rgb(var(--re-blue))] border border-black/10 hover:bg-white/70 transition"
                  onClick={() => (window.alert("Documentation coming soon"))}
                >
                  Dokumentasi Teknis
                </button>

                <button
                  type="button"
                  className="px-4 py-2 rounded-2xl text-sm font-semibold text-[rgb(var(--re-green))] border border-black/10 hover:bg-white/70 transition"
                  onClick={() => setModal("support")}
                >
                  Bantuan & Dukungan
                </button>
              </div>

              <div className="mt-6 rounded-2xl border border-black/10 bg-white/60 p-4 text-sm re-muted leading-relaxed">
                Gunakan tool ini untuk estimasi cepat desain conveyor dan verifikasi parameter utama sebelum detail engineering.
              </div>
            </div>
          </div>
        </section>
      </div>

      {modalContent ? (
        <Modal title={modalContent.title} onClose={() => setModal(null)}>
          {modalContent.body}
        </Modal>
      ) : null}
    </main>
  );
}
