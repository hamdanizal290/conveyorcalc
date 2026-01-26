"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAllProjects, clearAllProjects, type SavedProject } from "../../lib/conveyor/storage";

export default function InternalDashboard() {
    const [projects, setProjects] = useState<SavedProject[]>([]);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setProjects(getAllProjects());
        setIsMounted(true);
    }, []);

    const totalProjects = projects.length;
    const projectsThisMonth = projects.filter(p => {
        const date = new Date(p.createdAt);
        const now = new Date();
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;

    const handleClearAll = () => {
        if (confirm("Apakah Anda yakin ingin menghapus SEMUA proyek? Tindakan ini tidak dapat dibatalkan.")) {
            clearAllProjects();
            setProjects([]);
            alert("Semua data proyek telah dihapus.");
        }
    };

    const handleExportData = () => {
        const dataStr = JSON.stringify(projects, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `conveyorcalc_export_${new Date().toISOString().split('T')[0]}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    if (!isMounted) return null;

    return (
        <main className="min-h-screen re-geo p-6 md:p-10">
            <div className="mx-auto max-w-4xl">
                <header className="mb-10">
                    <Link href="/" className="text-sm font-semibold text-[rgb(var(--re-blue))] hover:underline mb-4 inline-block">&larr; Back to Home</Link>
                    <h1 className="text-4xl font-extrabold text-[rgb(var(--re-ink))]">Internal RE</h1>
                    <p className="text-lg re-muted">Dashboard internal untuk administrator dan developer</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    <div className="re-card p-6 rounded-3xl">
                        <div className="text-sm re-muted mb-1">Total Proyek</div>
                        <div className="text-3xl font-bold text-[rgb(var(--re-blue))]">{totalProjects}</div>
                        <div className="text-xs re-muted mt-2">Di browser ini</div>
                    </div>
                    <div className="re-card p-6 rounded-3xl">
                        <div className="text-sm re-muted mb-1">Proyek Bulan Ini</div>
                        <div className="text-3xl font-bold text-[rgb(var(--re-green))]">{projectsThisMonth}</div>
                        <div className="text-xs re-muted mt-2">Aktif</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="re-card p-5 rounded-3xl md:col-span-1">
                        <div className="space-y-4">
                            <div>
                                <div className="text-sm font-bold">CEMA 7th Ed</div>
                                <div className="text-xs re-muted">Most Used Standard</div>
                            </div>
                            <div>
                                <div className="text-sm font-bold">Belt Conveyor</div>
                                <div className="text-xs re-muted">Update Terbaru</div>
                            </div>
                        </div>
                    </div>

                    <div className="re-card p-5 rounded-3xl md:col-span-2">
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="text-xs font-bold whitespace-nowrap pt-1">Jan 2025</div>
                                <div>
                                    <div className="text-sm font-bold">Selection Engine</div>
                                    <div className="text-xs re-muted">Assisted belt & idler selection with scoring model</div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="text-xs font-bold whitespace-nowrap pt-1">Jan 2025</div>
                                <div>
                                    <div className="text-sm font-bold">PDF Report Export</div>
                                    <div className="text-xs re-muted">Export laporan lengkap (CEMA Standard)</div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="text-xs font-bold whitespace-nowrap pt-1">Jan 2025</div>
                                <div>
                                    <div className="text-sm font-bold">Power & Tension Analysis</div>
                                    <div className="text-xs re-muted">Detailed tension map & drive power</div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="text-xs font-bold whitespace-nowrap pt-1">Dec 2024</div>
                                <div>
                                    <div className="text-sm font-bold">Initial Release</div>
                                    <div className="text-xs re-muted">Wizard dasar, Capacity, Speed, Power, Tension</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="re-card p-6 rounded-3xl mb-10 border-l-4 border-[rgb(var(--re-orange))]">
                    <div className="text-sm font-bold text-[rgb(var(--re-orange))] mb-4 flex items-center gap-2">
                        Developer Notes
                    </div>
                    <ul className="space-y-3 text-sm re-muted">
                        <li className="flex gap-2"><span>⚠</span> Data proyek disimpan di localStorage browser (client-side)</li>
                        <li className="flex gap-2"><span>⚠</span> Untuk backup, selalu ekspor proyek penting ke JSON/PDF</li>
                        <li className="flex gap-2"><span>⚠</span> Clear browser data = hapus semua proyek tersimpan</li>
                        <li className="flex gap-2"><span>⚠</span> Kriteria (Tension safety factor, motor safety factor) menggunakan placeholder</li>
                        <li className="flex gap-2"><span>⚠</span> Konstanta perhitungan dapat disesuaikan di `lib/conveyor/calculations.ts`</li>
                    </ul>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    <div className="re-card p-6 rounded-3xl">
                        <div className="text-sm font-bold mb-4">Admin Actions</div>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={handleClearAll}
                                className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100 hover:bg-red-100 transition"
                            >
                                🗑 Hapus Semua Proyek
                            </button>
                            <button
                                onClick={handleExportData}
                                className="px-4 py-2 bg-slate-50 text-slate-700 rounded-xl text-sm font-bold border border-black/5 hover:bg-slate-100 transition"
                            >
                                📥 Export All Data (JSON)
                            </button>
                        </div>
                    </div>

                    <div className="re-card p-6 rounded-3xl">
                        <div className="text-sm font-bold mb-4">Technical Info</div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="re-muted">Framework</span><span className="font-mono text-xs">Next.js 14.2.11</span></div>
                            <div className="flex justify-between"><span className="re-muted">React</span><span className="font-mono text-xs">18.3.1</span></div>
                            <div className="flex justify-between"><span className="re-muted">Storage</span><span className="font-mono text-xs">localStorage</span></div>
                            <div className="flex justify-between"><span className="re-muted">Criteria Version</span><span className="font-mono text-xs">1.0.0-placeholder</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
