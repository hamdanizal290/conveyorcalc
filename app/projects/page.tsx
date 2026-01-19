"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { getAllProjects, deleteProject, type SavedProject } from "../../lib/conveyor/storage";

export default function ProjectsPage() {
    const [projects, setProjects] = useState<SavedProject[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setProjects(getAllProjects());
        setLoading(false);
    }, []);

    const handleDelete = (id: string, name: string) => {
        if (confirm(`Hapus project "${name}"?`)) {
            deleteProject(id);
            setProjects(getAllProjects());
        }
    };

    const formatDate = (iso: string) => {
        try {
            return new Date(iso).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        } catch { return iso; }
    };

    return (
        <main className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-black/10 px-4 py-2 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <Link href="/" className="shrink-0">
                        <div className="h-10 w-32 md:h-12 md:w-40 rounded-lg bg-white border border-black/5 flex items-center justify-center px-2">
                            <Image src="/re-logo.png" alt="Rekayasa Engineering" width={160} height={48} className="w-full h-full object-contain" priority />
                        </div>
                    </Link>
                    <div className="hidden sm:flex items-center gap-2 text-sm">
                        <span className="font-medium text-[rgb(var(--re-ink))]">ConveyorCalc</span>
                        <span className="re-muted">•</span>
                        <span className="re-muted">Saved Projects</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/" className="px-3 py-1.5 rounded-lg text-sm font-medium border border-black/10 hover:bg-slate-50 transition">← Kembali</Link>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-6 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-[rgb(var(--re-ink))]">Saved Projects</h1>
                        <p className="text-sm re-muted mt-1">{projects.length} project tersimpan</p>
                    </div>
                    <Link
                        href="/project"
                        className="px-4 py-2 bg-[rgb(var(--re-blue))] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition"
                    >
                        + New Project
                    </Link>
                </div>

                {loading ? (
                    <div className="text-center py-16 re-muted">Loading...</div>
                ) : projects.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-black/10 p-12 text-center">
                        <div className="text-4xl mb-4">📁</div>
                        <h2 className="text-lg font-semibold text-[rgb(var(--re-ink))]">Belum ada project tersimpan</h2>
                        <p className="text-sm re-muted mt-2 mb-6">Mulai project baru dan simpan untuk melihatnya di sini</p>
                        <Link
                            href="/project"
                            className="inline-block px-6 py-3 bg-[rgb(var(--re-blue))] text-white rounded-xl font-semibold hover:opacity-90 transition"
                        >
                            Buat Project Baru
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {projects.map(p => (
                            <div key={p.id} className="bg-white rounded-xl border border-black/10 p-4 flex items-center gap-4 hover:shadow-sm transition">
                                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-[rgb(var(--re-blue))] font-bold text-lg">
                                    {p.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-[rgb(var(--re-ink))] truncate">{p.name}</div>
                                    <div className="text-xs re-muted">{p.client || "No client"} • {formatDate(p.updatedAt)}</div>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="px-2 py-1 bg-slate-100 rounded font-medium">{p.data.targets.designCapacity} tph</span>
                                    <span className="px-2 py-1 bg-slate-100 rounded font-medium">{p.data.belt.width} mm</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Link
                                        href={`/project?id=${p.id}`}
                                        className="px-3 py-1.5 bg-[rgb(var(--re-blue))] text-white rounded-lg text-xs font-semibold hover:opacity-90 transition"
                                    >
                                        Open
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(p.id, p.name)}
                                        className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
