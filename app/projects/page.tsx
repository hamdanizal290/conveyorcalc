"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  listSavedProjects,
  loadSavedProjectIntoDraft,
  deleteSavedProject,
  type SavedProjectMeta,
} from "../../lib/storage/savedProjects";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<SavedProjectMeta[]>([]);

  const refresh = () => {
    setProjects(listSavedProjects());
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleOpen = (id: string) => {
    const d = loadSavedProjectIntoDraft(id);
    if (!d) {
      alert("Project tidak ditemukan.");
      return;
    }
    // arahkan ke results (atau step terakhir yang lo mau)
    router.push("/projects/new/results");
  };

  const handleDelete = (id: string) => {
    const ok = confirm("Yakin mau hapus saved project ini?");
    if (!ok) return;
    deleteSavedProject(id);
    refresh();
  };

  return (
    <main className="min-h-screen re-geo">
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10 md:py-14">
        {/* HEADER */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
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

            <div>
              <div className="text-xs re-muted">TankCalc</div>
              <div className="text-lg font-semibold text-[rgb(var(--re-blue))]">
                Saved Projects
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/projects/new"
              className="px-4 py-2 rounded-2xl text-sm font-semibold text-white bg-[rgb(var(--re-blue))] hover:opacity-95 transition"
            >
              Start New Project
            </Link>

            <Link
              href="/"
              className="px-4 py-2 rounded-2xl text-sm font-semibold border border-black/10 bg-white/70 hover:bg-white/90 transition"
            >
              Home
            </Link>
          </div>
        </div>

        {/* LIST */}
        <div className="mt-8 re-card rounded-[2rem] p-7 md:p-9">
          {projects.length === 0 ? (
            <div className="text-sm re-muted">
              Belum ada project yang disimpan. Simpan project dari halaman Results.
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-black/10 bg-white/70 px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[rgb(var(--re-ink))] truncate">
                      {p.name}
                    </div>
                    <div className="mt-1 text-sm re-muted">
                      {p.standard} • {p.units} • saved{" "}
                      {new Date(p.savedAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpen(p.id)}
                      className="px-4 py-2 rounded-2xl text-sm font-semibold text-white bg-[rgb(var(--re-blue))] hover:opacity-95 transition"
                    >
                      Buka
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="px-4 py-2 rounded-2xl text-sm font-semibold border border-black/10 bg-white/80 hover:bg-white transition text-red-600"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 text-xs re-muted">
            Catatan: Saved Projects disimpan di localStorage browser (per device + per browser).
          </div>
        </div>
      </div>
    </main>
  );
}
