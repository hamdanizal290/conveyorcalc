"use client";

import { useState } from "react";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { calculateConveyor, type ConveyorInput, type ConveyorResult } from "../../lib/conveyor/calculations";

export default function CalculatorPage() {
  const [view, setView] = useState<"input" | "result">("input");

  // Simplified Inputs for Quick Calc
  const [input, setInput] = useState({
    capacity: 250, // tph
    speed: 1.5, // m/s
    length: 50, // m
    lift: 10, // m
    width: 800, // mm
    density: 0.8, // ton/m3
    trough: 35, // deg
    friction: 0.022,
    wrap: 210 // deg
  });

  const [result, setResult] = useState<ConveyorResult | null>(null);

  const handleCalculate = () => {
    // Map simplified inputs to full CEMA inputs with defaults
    const cemaInput: ConveyorInput = {
      // Targets
      driveConfig: "Head",
      conveyorDirection: input.lift > 0 ? "Incline" : (input.lift < 0 ? "Decline" : "Horizontal"),
      designCapacity: input.capacity,
      beltSpeed: input.speed,
      wrapAngle: input.wrap,

      // Material
      materialName: "Custom",
      materialDensity: input.density * 1000, // kg/m3
      lumpSize: 50, // Default
      surchargeAngle: 25, // Default
      reposeAngle: 35, // Default
      materialCondition: "Analysis",

      // Geometry
      horizontalLength: input.length,
      liftHeight: input.lift,
      carrierPitch: 1.2, // Default
      returnPitch: 3.0, // Default
      troughAngle: input.trough,

      // Belt
      beltWidth: input.width,
      beltMass: 15, // Default approx
      idlerMass: 20, // Default approx
      beltSag: 2.0,
      frictionIdlers: input.friction,
      driveEfficiency: 0.95,

      // Accessories (None for quick calc)
      hopperHeight: 0,
      hopperBottomLength: 0,
      hopperBottomWidth: 0,
      skirtLength: 0,
      skirtWidth: 0,

      scraperCount: 0,
      ploughCount: 0,
      tripperCount: 0
    };

    const res = calculateConveyor(cemaInput);
    setResult(res);
    setView("result");
  };

  const handleExportPDF = () => {
    if (!result) return;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Conveyor Quick Calculation Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

    autoTable(doc, {
      startY: 35,
      head: [['Input Parameter', 'Value', 'Unit']],
      body: [
        ['Design Capacity', `${input.capacity}`, 'tph'],
        ['Belt Speed', `${input.speed}`, 'm/s'],
        ['Length', `${input.length}`, 'm'],
        ['Lift Height', `${input.lift}`, 'm'],
        ['Belt Width', `${input.width}`, 'mm'],
        ['Material Density', `${input.density}`, 't/m3'],
      ]
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    autoTable(doc, {
      startY: finalY,
      head: [['Result Parameter', 'Value', 'Unit']],
      body: [
        ['Volumetric Cap.', `${result.capacityVol.toFixed(1)}`, 'm3/h'],
        ['Mass Capacity', `${result.capacityMass.toFixed(1)}`, 'tph'],
        ['Motor Power', `${result.powerAnalysis.p_motor_installed.toFixed(2)}`, 'kW'],
        ['Absorb Power', `${result.powerAnalysis.p_total_shaft.toFixed(2)}`, 'kW'],
        ['Max Tension (T1)', `${result.tensionAnalysis.t1.toFixed(0)}`, 'N'],
        ['Slack Tension (T2)', `${result.tensionAnalysis.t2.toFixed(0)}`, 'N'],
        ['Drive Pulley D', `${result.pulleyAnalysis.diameter}`, 'mm'],
      ]
    });

    doc.save("QuickCalculation.pdf");
  };

  return (
    <main className="min-h-screen p-6 re-geo">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between mb-8">
          <Link href="/" className="text-sm font-semibold text-[rgb(var(--re-blue))] hover:underline">&larr; Back Home</Link>
          <div className="text-sm font-medium re-muted">Quick Calculation</div>
        </header>

        <div className="re-card rounded-[2rem] p-8 md:p-10">
          {view === "input" ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl font-bold mb-6 text-[rgb(var(--re-ink))]">Input Parameters</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FieldNumber label="Capacity (tph)" value={input.capacity} onChange={v => setInput({ ...input, capacity: v })} />
                <FieldNumber label="Speed (m/s)" value={input.speed} onChange={v => setInput({ ...input, speed: v })} />
                <FieldNumber label="Horizontal Length (m)" value={input.length} onChange={v => setInput({ ...input, length: v })} />
                <FieldNumber label="Lift Height (m)" value={input.lift} onChange={v => setInput({ ...input, lift: v })} />
                <FieldNumber label="Belt Width (mm)" value={input.width} onChange={v => setInput({ ...input, width: v })} />
                <FieldNumber label="Material Density (t/m3)" value={input.density} step="0.01" onChange={v => setInput({ ...input, density: v })} />
                <FieldNumber label="Trough Angle (°)" value={input.trough} onChange={v => setInput({ ...input, trough: v })} />
                <FieldNumber label="Friction (f)" value={input.friction} step="0.001" onChange={v => setInput({ ...input, friction: v })} />
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleCalculate}
                  className="px-8 py-3 bg-[rgb(var(--re-blue))] text-white rounded-xl font-bold shadow-lg shadow-blue-900/10 hover:scale-105 transition"
                >
                  Analyze / Calculate
                </button>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[rgb(var(--re-ink))]">Calculation Results</h2>
                <div className="flex gap-2">
                  <button onClick={handleExportPDF} className="px-4 py-2 bg-slate-100 rounded-lg text-sm font-semibold hover:bg-slate-200 transition">Export PDF</button>
                  <button onClick={() => setView("input")} className="px-4 py-2 bg-[rgb(var(--re-blue))] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition">Back to Input</button>
                </div>
              </div>

              {result && (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <ResultCard label="Volumetric Cap" value={`${result.capacityVol.toFixed(0)} m3/h`} />
                    <ResultCard label="Mass Capacity" value={`${result.capacityMass.toFixed(0)} tph`} />
                    <ResultCard label="Motor Power" value={`${result.powerAnalysis.p_motor_installed.toFixed(2)} kW`} highlight />
                    <ResultCard label="Max Tension" value={`${result.tensionAnalysis.t1.toFixed(0)} N`} />
                  </div>

                  <div className="bg-slate-50 rounded-xl p-6 border border-black/5">
                    <h3 className="font-bold mb-4">Detailed Analysis</h3>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b border-black/5"><td className="py-2 re-muted">Analysis Method</td><td className="py-2 font-medium">CEMA 6th Ed. (Standard)</td></tr>
                        <tr className="border-b border-black/5"><td className="py-2 re-muted">Lift Power</td><td className="py-2 font-medium">{result.powerAnalysis.p_lift.toFixed(2)} kW</td></tr>
                        <tr className="border-b border-black/5"><td className="py-2 re-muted">Friction Power</td><td className="py-2 font-medium">{result.powerAnalysis.p_horizontal.toFixed(2)} kW</td></tr>
                        <tr className="border-b border-black/5"><td className="py-2 re-muted">Shaft Power</td><td className="py-2 font-medium">{result.powerAnalysis.p_total_shaft.toFixed(2)} kW</td></tr>
                        <tr className="border-b border-black/5"><td className="py-2 re-muted">Slip Tension (T2 req)</td><td className="py-2 font-medium">{result.tensionAnalysis.min_tension_drive.toFixed(0)} N</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

function FieldNumber(props: { label: string, value: number, onChange: (v: number) => void, step?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium re-muted">{props.label}</span>
      <input
        type="number"
        step={props.step || "1"}
        className="w-full rounded-xl border border-black/10 bg-white/50 p-3 outline-none focus:ring-2 focus:ring-blue-100 transition"
        value={props.value}
        onChange={e => props.onChange(parseFloat(e.target.value))}
      />
    </label>
  )
}

function ResultCard({ label, value, highlight }: { label: string, value: string, highlight?: boolean }) {
  return (
    <div className={`p-4 rounded-xl border ${highlight ? "bg-blue-50 border-blue-100" : "bg-white border-black/5"}`}>
      <div className="text-xs re-muted uppercase tracking-wider">{label}</div>
      <div className={`text-xl font-bold mt-1 ${highlight ? "text-[rgb(var(--re-blue))]" : "text-[rgb(var(--re-ink))]"}`}>
        {value}
      </div>
    </div>
  )
}