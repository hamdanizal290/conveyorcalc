"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { MaterialDatabase } from "../../lib/conveyor/materials";
import { calculateConveyor, type ConveyorInput, type ConveyorResult } from "../../lib/conveyor/calculations";

// --------------------------------------------------------
// TYPES
// --------------------------------------------------------
interface ProjectInfo { projectName: string; clientName: string; projectNumber: string; date: string; engineer: string; }
interface DesignTargets { driveConfig: "Head" | "Tail" | "Dual Head" | "Dual Tail"; conveyorDirection: "Incline" | "Decline" | "Horizontal" | "Reversible"; designCapacity: number; beltSpeed: number; wrapAngle: number; }
interface MaterialData { name: string; condition: "Dry" | "Wet" | "Sticky" | "Frozen"; lumpSize: number; density: number; surchargeAngle: number; reposeAngle: number; }
interface ConveyorGeometry { horizontalLength: number; liftHeight: number; slopeAngle: number; carrierPitch: number; returnPitch: number; troughAngle: number; }
interface BeltData { width: number; sagging: number; massBelt: number; massIdlers: number; frictionCoeff: number; driveEfficiency: number; }

// --------------------------------------------------------
// STEP DEFINITIONS
// --------------------------------------------------------
const STEPS = [
    { id: 1, name: "Project Init", short: "Project" },
    { id: 2, name: "Design Targets", short: "Targets" },
    { id: 3, name: "Material Data", short: "Material" },
    { id: 4, name: "Geometry", short: "Geometry" },
    { id: 5, name: "Belt & Components", short: "Belt" },
    { id: 6, name: "Accessories", short: "Accessories" },
    { id: 7, name: "Results", short: "Results" },
];

// --------------------------------------------------------
// MAIN PAGE
// --------------------------------------------------------
export default function ProjectPage() {
    const [step, setStep] = useState(1);

    // State
    const [projectInfo, setProjectInfo] = useState<ProjectInfo>({
        projectName: "", clientName: "", projectNumber: "", date: new Date().toISOString().split('T')[0], engineer: ""
    });
    const [targets, setTargets] = useState<DesignTargets>({
        driveConfig: "Head", conveyorDirection: "Incline", designCapacity: 225, beltSpeed: 1.5, wrapAngle: 210
    });
    const [material, setMaterial] = useState<MaterialData>({
        name: "Coal", condition: "Dry", lumpSize: 75, density: 0.8, surchargeAngle: 30, reposeAngle: 35
    });
    const [geometry, setGeometry] = useState<ConveyorGeometry>({
        horizontalLength: 25, liftHeight: 5, slopeAngle: 0, carrierPitch: 1.2, returnPitch: 2.4, troughAngle: 35
    });
    const [useSlopeInput, setUseSlopeInput] = useState(false);
    const [belt, setBelt] = useState<BeltData>({
        width: 600, sagging: 2.0, massBelt: 15, massIdlers: 25, frictionCoeff: 0.02, driveEfficiency: 0.9
    });
    const [accessories, setAccessories] = useState({
        hopperHeight: 0, hopperWidth: 0, hopperLength: 0,
        skirtLength: 0, skirtWidth: 0,
        scraperCount: 1, ploughCount: 0, tripperCount: 0
    });
    const [result, setResult] = useState<ConveyorResult | null>(null);

    // Derived
    const calculatedSlopeDeg = useSlopeInput ? geometry.slopeAngle : (Math.atan(Math.abs(geometry.liftHeight) / geometry.horizontalLength) * (180 / Math.PI));
    const effectiveLift = useSlopeInput ? geometry.horizontalLength * Math.tan(geometry.slopeAngle * Math.PI / 180) : geometry.liftHeight;
    const conveyorLength = Math.sqrt(geometry.horizontalLength ** 2 + effectiveLift ** 2);

    // Validation
    const validationErrors: string[] = [];
    if (step >= 2 && targets.designCapacity <= 0) validationErrors.push("Design Capacity must be > 0");
    if (step >= 2 && targets.beltSpeed <= 0) validationErrors.push("Belt Speed must be > 0");
    if (step >= 4 && geometry.horizontalLength <= 0) validationErrors.push("Horizontal Length must be > 0");
    if (step >= 5 && belt.width < 300) validationErrors.push("Belt Width should be >= 300mm");

    // Handlers
    const handleCalculate = () => {
        const input: ConveyorInput = {
            driveConfig: targets.driveConfig, conveyorDirection: targets.conveyorDirection, designCapacity: targets.designCapacity, beltSpeed: targets.beltSpeed, wrapAngle: targets.wrapAngle,
            materialName: material.name, materialCondition: material.condition, materialDensity: material.density * 1000, lumpSize: material.lumpSize, surchargeAngle: material.surchargeAngle, reposeAngle: material.reposeAngle,
            horizontalLength: geometry.horizontalLength, liftHeight: useSlopeInput ? effectiveLift : geometry.liftHeight, carrierPitch: geometry.carrierPitch, returnPitch: geometry.returnPitch, troughAngle: geometry.troughAngle,
            beltWidth: belt.width, beltMass: belt.massBelt, idlerMass: belt.massIdlers, beltSag: belt.sagging, frictionIdlers: belt.frictionCoeff, driveEfficiency: belt.driveEfficiency,
            hopperHeight: accessories.hopperHeight, hopperBottomLength: accessories.hopperLength, hopperBottomWidth: accessories.hopperWidth, skirtLength: accessories.skirtLength, skirtWidth: accessories.skirtWidth, scraperCount: accessories.scraperCount, ploughCount: accessories.ploughCount, tripperCount: accessories.tripperCount
        };
        const res = calculateConveyor(input);
        setResult(res);
        setStep(7);
    };

    const handleExportPDF = () => {
        if (!result) return;
        const doc = new jsPDF();
        doc.setFillColor(41, 128, 185); doc.rect(0, 0, 210, 35, "F");
        doc.setTextColor(255); doc.setFontSize(20); doc.text("ConveyorCalc - CEMA Report", 14, 18);
        doc.setFontSize(10); doc.text(`Project: ${projectInfo.projectName} | Client: ${projectInfo.clientName}`, 14, 28);
        doc.setTextColor(0);
        autoTable(doc, {
            startY: 40, head: [['Parameter', 'Value', 'Unit']], body: [
                ['Design Capacity', `${targets.designCapacity}`, 'tph'], ['Belt Speed', `${targets.beltSpeed}`, 'm/s'], ['Material', material.name, '-'],
                ['Horiz. Length', `${geometry.horizontalLength}`, 'm'], ['Lift Height', `${effectiveLift.toFixed(2)}`, 'm'], ['Belt Width', `${belt.width}`, 'mm'],
                ['Motor Power', `${result.powerAnalysis.p_motor_installed.toFixed(2)}`, 'kW'], ['Max Tension (T1)', `${result.tensionAnalysis.t1.toFixed(0)}`, 'N'],
            ]
        });
        doc.save(`${projectInfo.projectName || 'Conveyor'}_Report.pdf`);
    };

    return (
        <main className="min-h-screen bg-slate-50">
            {/* TOP BAR */}
            <header className="bg-white border-b border-black/10 px-4 py-2 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <Link href="/" className="shrink-0">
                        <div className="h-10 w-32 md:h-12 md:w-40 rounded-lg bg-white border border-black/5 flex items-center justify-center px-2">
                            <Image
                                src="/re-logo.png"
                                alt="Rekayasa Engineering"
                                width={160}
                                height={48}
                                className="w-full h-full object-contain"
                                priority
                            />
                        </div>
                    </Link>
                    <div className="hidden sm:flex items-center gap-2 text-sm">
                        <span className="font-medium text-[rgb(var(--re-ink))]">ConveyorCalc</span>
                        <span className="re-muted">•</span>
                        <span className="re-muted">{projectInfo.projectName || "mb"}</span>
                    </div>
                    <div className="hidden md:block text-xs re-muted">
                        Step {step} — {STEPS.find(s => s.id === step)?.name}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/" className="px-3 py-1.5 rounded-lg text-sm font-medium border border-black/10 hover:bg-slate-50 transition">← Kembali</Link>
                    <span className="text-xs px-2.5 py-1 bg-blue-600 text-white rounded-md font-semibold">CEMA</span>
                </div>
            </header>

            <div className="flex">
                {/* LEFT SIDEBAR - Steps */}
                <aside className="w-56 bg-white px-3 py-4 min-h-[calc(100vh-52px)] sticky top-[52px]">
                    <div className="text-xs font-medium re-muted mb-3">Workflow Progress</div>
                    <nav className="space-y-1.5">
                        {STEPS.map((s) => {
                            const isActive = s.id === step;
                            const isDone = s.id < step;
                            return (
                                <button
                                    key={s.id}
                                    onClick={() => s.id < step && setStep(s.id)}
                                    disabled={s.id > step}
                                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all ${isActive ? "bg-blue-50 border border-[rgb(var(--re-blue))]" :
                                        isDone ? "bg-green-50/50 border border-green-100 hover:bg-green-50" :
                                            "bg-slate-50/50 border border-transparent opacity-50"
                                        }`}
                                >
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isActive ? "bg-[rgb(var(--re-blue))] text-white" :
                                        isDone ? "bg-green-500 text-white" :
                                            "bg-black/10 text-black/40"
                                        }`}>
                                        {isDone ? "✓" : s.id}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-xs font-semibold truncate ${isActive ? "text-[rgb(var(--re-blue))]" : isDone ? "text-green-700" : "text-black/40"}`}>{s.name}</div>
                                        <div className="text-[10px] re-muted">Step {s.id}</div>
                                    </div>
                                    {isActive && <span className="text-[10px] px-1.5 py-0.5 bg-[rgb(var(--re-blue))] text-white rounded font-semibold shrink-0">Active</span>}
                                    {isDone && <span className="text-[10px] px-1.5 py-0.5 bg-green-500 text-white rounded font-semibold shrink-0">Done</span>}
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                {/* CENTER - Form Content */}
                <section className="flex-1 p-6">
                    <div className="max-w-2xl">

                        {/* STEP 1: Project Init */}
                        {step === 1 && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <StepBadge label="Project Data" />
                                <h2 className="text-xl font-bold text-[rgb(var(--re-ink))]">Project Information</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FieldText label="Project Name *" value={projectInfo.projectName} onChange={v => setProjectInfo(s => ({ ...s, projectName: v }))} placeholder="e.g. Coal Handling System" />
                                    <FieldText label="Client Name" value={projectInfo.clientName} onChange={v => setProjectInfo(s => ({ ...s, clientName: v }))} placeholder="e.g. PT Example" />
                                    <FieldText label="Project Number" value={projectInfo.projectNumber} onChange={v => setProjectInfo(s => ({ ...s, projectNumber: v }))} placeholder="e.g. PRJ-001" />
                                    <FieldText label="Date" value={projectInfo.date} type="date" onChange={v => setProjectInfo(s => ({ ...s, date: v }))} />
                                    <FieldText label="Engineer" value={projectInfo.engineer} onChange={v => setProjectInfo(s => ({ ...s, engineer: v }))} placeholder="e.g. John Doe" />
                                </div>
                            </div>
                        )}

                        {/* STEP 2: Design Targets */}
                        {step === 2 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <StepBadge label="Design Targets" />
                                <h2 className="text-2xl font-bold text-[rgb(var(--re-ink))]">Design Parameters</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <FieldSelect label="Type of Drive" value={targets.driveConfig} onChange={v => setTargets(s => ({ ...s, driveConfig: v as any }))}>
                                        <option>Head</option><option>Tail</option><option>Dual Head</option>
                                    </FieldSelect>
                                    <FieldSelect label="Conveyor Direction" value={targets.conveyorDirection} onChange={v => setTargets(s => ({ ...s, conveyorDirection: v as any }))}>
                                        <option>Incline</option><option>Decline</option><option>Horizontal</option>
                                    </FieldSelect>
                                    <FieldNumber label="Design Capacity (tph) *" value={targets.designCapacity} onChange={v => setTargets(s => ({ ...s, designCapacity: v }))} />
                                    <FieldNumber label="Belt Speed (m/s) *" value={targets.beltSpeed} step="0.1" onChange={v => setTargets(s => ({ ...s, beltSpeed: v }))} />
                                    <FieldNumber label="Wrap Angle (°)" value={targets.wrapAngle} onChange={v => setTargets(s => ({ ...s, wrapAngle: v }))} />
                                </div>
                            </div>
                        )}

                        {/* STEP 3: Material */}
                        {step === 3 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <StepBadge label="Material Data" />
                                <h2 className="text-2xl font-bold text-[rgb(var(--re-ink))]">Transported Material</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <FieldSelect label="Material" value={material.name} onChange={v => {
                                        const m = MaterialDatabase.find(x => x.name === v);
                                        if (m) setMaterial(s => ({ ...s, name: m.name, density: m.densityMin / 1000, surchargeAngle: m.angleSurcharge, reposeAngle: m.angleRepose }));
                                    }}>
                                        {MaterialDatabase.map(m => <option key={m.name}>{m.name}</option>)}
                                    </FieldSelect>
                                    <FieldSelect label="Condition" value={material.condition} onChange={v => setMaterial(s => ({ ...s, condition: v as any }))}>
                                        <option>Dry</option><option>Wet</option><option>Sticky</option>
                                    </FieldSelect>
                                    <FieldNumber label="Lump Size (mm)" value={material.lumpSize} onChange={v => setMaterial(s => ({ ...s, lumpSize: v }))} />
                                    <FieldNumber label="Density (ton/m³)" value={material.density} step="0.01" onChange={v => setMaterial(s => ({ ...s, density: v }))} />
                                    <FieldNumber label="Surcharge Angle (°)" value={material.surchargeAngle} onChange={v => setMaterial(s => ({ ...s, surchargeAngle: v }))} />
                                    <FieldNumber label="Repose Angle (°)" value={material.reposeAngle} onChange={v => setMaterial(s => ({ ...s, reposeAngle: v }))} />
                                </div>
                            </div>
                        )}

                        {/* STEP 4: Geometry */}
                        {step === 4 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <StepBadge label="Geometry" />
                                <h2 className="text-2xl font-bold text-[rgb(var(--re-ink))]">Conveyor Geometry</h2>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-black/5 mb-4">
                                    <span className="text-sm font-medium re-muted">Mode Input:</span>
                                    <button onClick={() => setUseSlopeInput(false)} className={`px-3 py-1 rounded-lg text-sm font-semibold transition ${!useSlopeInput ? 'bg-[rgb(var(--re-blue))] text-white' : 'bg-white border border-black/10'}`}>Lift Height</button>
                                    <button onClick={() => setUseSlopeInput(true)} className={`px-3 py-1 rounded-lg text-sm font-semibold transition ${useSlopeInput ? 'bg-[rgb(var(--re-blue))] text-white' : 'bg-white border border-black/10'}`}>Slope Angle</button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <FieldNumber label="Horizontal Length (m) *" value={geometry.horizontalLength} onChange={v => setGeometry(s => ({ ...s, horizontalLength: v }))} />
                                    {!useSlopeInput ? (
                                        <FieldNumber label="Lift Height (m)" value={geometry.liftHeight} onChange={v => setGeometry(s => ({ ...s, liftHeight: v }))} />
                                    ) : (
                                        <FieldNumber label="Slope Angle (°)" step="0.1" value={geometry.slopeAngle} onChange={v => setGeometry(s => ({ ...s, slopeAngle: v }))} />
                                    )}
                                    <FieldNumber label="Carrier Pitch (m)" step="0.1" value={geometry.carrierPitch} onChange={v => setGeometry(s => ({ ...s, carrierPitch: v }))} />
                                    <FieldNumber label="Return Pitch (m)" step="0.1" value={geometry.returnPitch} onChange={v => setGeometry(s => ({ ...s, returnPitch: v }))} />
                                    <FieldNumber label="Trough Angle (°)" value={geometry.troughAngle} onChange={v => setGeometry(s => ({ ...s, troughAngle: v }))} />
                                </div>
                            </div>
                        )}

                        {/* STEP 5: Belt */}
                        {step === 5 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <StepBadge label="Belt & Components" />
                                <h2 className="text-2xl font-bold text-[rgb(var(--re-ink))]">Belt & Component Data</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <FieldNumber label="Belt Width (mm) *" value={belt.width} onChange={v => setBelt(s => ({ ...s, width: v }))} />
                                    <FieldNumber label="Belt Mass (kg/m)" value={belt.massBelt} onChange={v => setBelt(s => ({ ...s, massBelt: v }))} />
                                    <FieldNumber label="Idler Mass (kg/m)" value={belt.massIdlers} onChange={v => setBelt(s => ({ ...s, massIdlers: v }))} />
                                    <FieldNumber label="Friction Coeff. (f)" step="0.001" value={belt.frictionCoeff} onChange={v => setBelt(s => ({ ...s, frictionCoeff: v }))} />
                                    <FieldNumber label="Belt Sagging (%)" step="0.1" value={belt.sagging} onChange={v => setBelt(s => ({ ...s, sagging: v }))} />
                                    <FieldNumber label="Drive Efficiency" step="0.01" value={belt.driveEfficiency} onChange={v => setBelt(s => ({ ...s, driveEfficiency: v }))} />
                                </div>
                            </div>
                        )}

                        {/* STEP 6: Accessories */}
                        {step === 6 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <StepBadge label="Accessories" />
                                <h2 className="text-2xl font-bold text-[rgb(var(--re-ink))]">Power Accessories</h2>
                                <h3 className="font-semibold text-[rgb(var(--re-blue))] border-b pb-2">Hopper Pullout</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    <FieldNumber label="Height (m)" value={accessories.hopperHeight} onChange={v => setAccessories(s => ({ ...s, hopperHeight: v }))} />
                                    <FieldNumber label="Bottom Width (m)" value={accessories.hopperWidth} onChange={v => setAccessories(s => ({ ...s, hopperWidth: v }))} />
                                    <FieldNumber label="Bottom Length (m)" value={accessories.hopperLength} onChange={v => setAccessories(s => ({ ...s, hopperLength: v }))} />
                                </div>
                                <h3 className="font-semibold text-[rgb(var(--re-blue))] border-b pb-2 mt-6">Skirtboard</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <FieldNumber label="Skirt Length (m)" value={accessories.skirtLength} onChange={v => setAccessories(s => ({ ...s, skirtLength: v }))} />
                                    <FieldNumber label="Skirt Width (m)" value={accessories.skirtWidth} onChange={v => setAccessories(s => ({ ...s, skirtWidth: v }))} />
                                </div>
                                <h3 className="font-semibold text-[rgb(var(--re-blue))] border-b pb-2 mt-6">Cleaners</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <FieldNumber label="Scrapers" value={accessories.scraperCount} onChange={v => setAccessories(s => ({ ...s, scraperCount: v }))} />
                                    <FieldNumber label="Ploughs" value={accessories.ploughCount} onChange={v => setAccessories(s => ({ ...s, ploughCount: v }))} />
                                </div>
                            </div>
                        )}

                        {/* STEP 7: Results */}
                        {step === 7 && result && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="flex items-center justify-between">
                                    <div><StepBadge label="Results" /><h2 className="text-2xl font-bold text-[rgb(var(--re-ink))] mt-2">Analysis Results</h2></div>
                                    <span className={`px-4 py-2 rounded-xl text-sm font-bold ${result.capacityStatus === "OK" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>Capacity {result.capacityStatus}</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <ResultCard label="Vol. Capacity" value={`${result.capacityVol.toFixed(0)} m³/h`} />
                                    <ResultCard label="Mass Capacity" value={`${result.capacityMass.toFixed(0)} tph`} />
                                    <ResultCard label="Motor Power" value={`${result.powerAnalysis.p_motor_installed.toFixed(2)} kW`} highlight />
                                    <ResultCard label="Max Tension" value={`${result.tensionAnalysis.t1.toFixed(0)} N`} />
                                </div>
                                <div className="bg-slate-50 rounded-xl p-4 border">
                                    <h3 className="font-bold mb-3">Power Breakdown</h3>
                                    <table className="w-full text-sm"><tbody>
                                        <tr className="border-b"><td className="py-2 re-muted">Friction Resistance</td><td className="py-2 font-medium">{result.powerAnalysis.f_idlers.toFixed(0)} N</td></tr>
                                        <tr className="border-b"><td className="py-2 re-muted">Lift Resistance</td><td className="py-2 font-medium">{result.powerAnalysis.f_lift.toFixed(0)} N</td></tr>
                                        <tr className="border-b"><td className="py-2 re-muted">Effective Tension (Te)</td><td className="py-2 font-medium">{result.powerAnalysis.te.toFixed(0)} N</td></tr>
                                        <tr className="border-b"><td className="py-2 re-muted">Shaft Power</td><td className="py-2 font-medium">{result.powerAnalysis.p_total_shaft.toFixed(2)} kW</td></tr>
                                    </tbody></table>
                                </div>
                                <div className="flex gap-4 justify-center pt-4">
                                    <button onClick={handleExportPDF} className="px-6 py-3 bg-[rgb(var(--re-blue))] text-white rounded-xl font-semibold hover:opacity-90 transition">Export PDF</button>
                                    <button onClick={() => setStep(1)} className="px-6 py-3 bg-white border rounded-xl font-semibold hover:bg-slate-50 transition">New Project</button>
                                </div>
                            </div>
                        )}

                        {/* Navigation */}
                        {step < 7 && (
                            <div className="flex justify-between pt-6 mt-6 border-t">
                                {step > 1 ? <button onClick={() => setStep(step - 1)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-slate-50 transition">← Back</button> : <div />}
                                {step < 6 && <button onClick={() => setStep(step + 1)} className="px-5 py-2 rounded-lg bg-[rgb(var(--re-blue))] text-white text-sm font-semibold hover:opacity-90 transition">Lanjut ke Step {step + 1} →</button>}
                                {step === 6 && <button onClick={handleCalculate} className="px-6 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition">Calculate →</button>}
                            </div>
                        )}
                    </div>
                </section>

                {/* RIGHT SIDEBAR - Preview */}
                <aside className="w-64 bg-white px-4 py-5 min-h-[calc(100vh-52px)] sticky top-[52px]">
                    <h3 className="text-sm font-bold text-[rgb(var(--re-blue))] mb-3">Preview</h3>
                    <div className="text-xs space-y-2">
                        <div className="p-2.5 bg-slate-50 rounded-lg border">
                            <div className="text-[10px] re-muted uppercase">Project</div>
                            <div className="font-semibold">{projectInfo.projectName || "-"}</div>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-lg border">
                            <div className="text-[10px] re-muted uppercase">Capacity</div>
                            <div className="font-semibold">{targets.designCapacity} tph</div>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-lg border">
                            <div className="text-[10px] re-muted uppercase">Belt Speed</div>
                            <div className="font-semibold">{targets.beltSpeed} m/s</div>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-lg border">
                            <div className="text-[10px] re-muted uppercase">Conveyor Length</div>
                            <div className="font-semibold">{conveyorLength.toFixed(2)} m</div>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-lg border">
                            <div className="text-[10px] re-muted uppercase">Slope</div>
                            <div className="font-semibold">{calculatedSlopeDeg.toFixed(1)}°</div>
                        </div>
                        <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-100 text-[10px]">
                            <div className="font-semibold text-[rgb(var(--re-blue))]">Catatan:</div>
                            <div className="re-muted mt-1">Preliminary sizing. Final dimensions mengikuti datasheet/vendor + code checks.</div>
                        </div>
                    </div>

                    {/* Validation Errors */}
                    {validationErrors.length > 0 && (
                        <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl">
                            <div className="text-sm font-semibold text-red-600 mb-2">Periksa Input</div>
                            <ul className="text-xs text-red-500 space-y-1 list-disc pl-4">
                                {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
                            </ul>
                        </div>
                    )}
                </aside>
            </div >
        </main >
    );
}

// --------------------------------------------------------
// FIELD COMPONENTS
// --------------------------------------------------------
function StepBadge({ label }: { label: string }) {
    return <span className="px-3 py-1 bg-blue-100 text-[rgb(var(--re-blue))] rounded-lg text-xs font-semibold">{label}</span>;
}

function FieldText(props: { label: string, value: string, onChange: (v: string) => void, placeholder?: string, type?: string }) {
    return (
        <label className="block space-y-1">
            <span className="text-sm font-medium re-muted">{props.label}</span>
            <input type={props.type || "text"} className="w-full rounded-xl border border-black/10 bg-white p-3 outline-none focus:ring-2 focus:ring-blue-100 transition" value={props.value} onChange={e => props.onChange(e.target.value)} placeholder={props.placeholder} />
        </label>
    );
}

function FieldNumber(props: { label: string, value: number, onChange: (v: number) => void, step?: string }) {
    return (
        <label className="block space-y-1">
            <span className="text-sm font-medium re-muted">{props.label}</span>
            <input type="number" step={props.step || "1"} className="w-full rounded-xl border border-black/10 bg-white p-3 outline-none focus:ring-2 focus:ring-blue-100 transition" value={props.value} onChange={e => props.onChange(parseFloat(e.target.value))} />
        </label>
    );
}

function FieldSelect(props: { label: string, value: string, onChange: (v: string) => void, children: React.ReactNode }) {
    return (
        <label className="block space-y-1">
            <span className="text-sm font-medium re-muted">{props.label}</span>
            <select className="w-full rounded-xl border border-black/10 bg-white p-3 outline-none focus:ring-2 focus:ring-blue-100 transition" value={props.value} onChange={e => props.onChange(e.target.value)}>{props.children}</select>
        </label>
    );
}

function ResultCard({ label, value, highlight }: { label: string, value: string, highlight?: boolean }) {
    return (
        <div className={`p-4 rounded-xl border ${highlight ? "bg-blue-50 border-blue-100" : "bg-white border-black/5"}`}>
            <div className="text-xs re-muted uppercase tracking-wider">{label}</div>
            <div className={`text-xl font-bold mt-1 ${highlight ? "text-[rgb(var(--re-blue))]" : ""}`}>{value}</div>
        </div>
    );
}
