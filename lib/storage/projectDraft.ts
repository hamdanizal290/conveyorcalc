// lib/storage/projectDraft.ts

import type {
  EnvelopeInput,
  StandardDecision,
  UnitKey,
  StandardKey,
} from "../domain/standardSelector";

export type RoofType = "fixed_cone" | "fixed_dome" | "open_top" | "floating_roof";
export type BottomType = "flat" | "annular";
export type AnchorageType = "anchored" | "unanchored";

export interface TankConfigurationDraft {
  tankForm: "vertical_cylindrical";
  roofType: RoofType;
  bottomType: BottomType;
  anchorage: AnchorageType;
  notes?: string;
}

export type DesignCaseKey =
  | "operating"
  | "hydrotest"
  | "empty_wind"
  | "empty_seismic"
  | "vacuum"
  | "steamout";

export type DesignCasesDraft = Record<DesignCaseKey, boolean>;

export interface ServiceDraft {
  storedProduct?: string;
  /** Specific gravity (dimensionless) */
  specificGravity: number;

  /** Corrosion allowance:
   *  - SI: mm
   *  - US: in
   */
  corrosionAllowance: number;

  /** Liquid height per case:
   *  - SI: m
   *  - US: ft
   */
  liquidHeights: Partial<Record<DesignCaseKey, number>>;
}

export type GeometryInputMode = "capacity" | "manual";
export type TargetCapacityUnit = "m3" | "bbl";

export interface GeometryDraft {
  /** Diameter:
   *  - SI: m
   *  - US: ft
   */
  diameter: number;

  /** Total shell height:
   *  - SI: m
   *  - US: ft
   */
  shellHeight: number;

  /** Course heights bottom→top:
   *  - SI: m
   *  - US: ft
   */
  courses: number[];

  /** Traceability (opsional) */
  inputMode?: GeometryInputMode;
  presetKey?: string; // ex: SI_1800 / SI_2400 / US_72 / US_96
  targetCapacity?: number;
  targetCapacityUnit?: TargetCapacityUnit;
}

export interface MaterialsDraft {
  /** Allowable stress for design condition:
   *  - SI: MPa
   *  - US: psi
   */
  allowableStressDesign: number;

  /** Allowable stress for hydrotest:
   *  - SI: MPa
   *  - US: psi
   */
  allowableStressTest: number;

  /** Joint efficiency E (0–1) */
  jointEfficiency: number;

  /** Minimum nominal thickness excluding CA:
   *  - SI: mm
   *  - US: in
   */
  minNominalThickness: number;

  /** Adopted/nominal plate thickness per course (including CA assumed):
   *  - SI: mm
   *  - US: in
   */
  courseNominalThickness: number[];
}

export interface ProjectDraft {
  id: string;
  createdAt: string;
  updatedAt?: string;

  // kalau sudah disimpan sebagai “Saved Project”, taruh ID-nya di sini
  savedProjectId?: string;

  projectName: string;
  location?: string;

  units: UnitKey;

  envelope: EnvelopeInput;
  decision: StandardDecision;
  recommendedStandard: StandardKey;

  // Step 1
  tankConfig?: TankConfigurationDraft;
  designCases?: DesignCasesDraft;

  // Step 2
  service?: ServiceDraft;
  geometry?: GeometryDraft;

  // Step 3
  materials?: MaterialsDraft;
}

const STORAGE_KEY = "tankcalc:projectDraft";

const sanitizeNumber = (x: unknown, fallback = 0) => {
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? n : fallback;
};

const CASE_KEYS: DesignCaseKey[] = [
  "operating",
  "hydrotest",
  "empty_wind",
  "empty_seismic",
  "vacuum",
  "steamout",
];

// IMPORTANT: diexport supaya bisa dipakai savedProjects storage
export function sanitizeProjectDraft(raw: any): ProjectDraft | null {
  if (!raw || typeof raw !== "object") return null;

  const env = raw.envelope ?? {};
  const decision = raw.decision ?? {};
  const normalized = decision.normalized ?? {};

  const units: UnitKey = raw.units === "US" ? "US" : "SI";

  const draft: ProjectDraft = {
    id: String(raw.id ?? `draft-${Date.now()}`),
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,

    savedProjectId: raw.savedProjectId ? String(raw.savedProjectId) : undefined,

    projectName: String(raw.projectName ?? ""),
    location: raw.location ? String(raw.location) : undefined,

    units,

    envelope: {
      units,
      designPressure: sanitizeNumber(env.designPressure, 0),
      designVacuum: sanitizeNumber(env.designVacuum, 0),
      tMin: sanitizeNumber(env.tMin, 0),
      tMax: sanitizeNumber(env.tMax, 0),
    },

    decision: {
      recommended: decision.recommended ?? raw.recommendedStandard ?? "API_650",
      confidence: decision.confidence ?? "Sedang",
      reasons: Array.isArray(decision.reasons) ? decision.reasons : [],
      warnings: Array.isArray(decision.warnings) ? decision.warnings : [],
      normalized: {
        designPressure_kPa: sanitizeNumber(normalized.designPressure_kPa, 0),
        designVacuum_kPa: sanitizeNumber(normalized.designVacuum_kPa, 0),
        tMin_C: sanitizeNumber(normalized.tMin_C, 0),
        tMax_C: sanitizeNumber(normalized.tMax_C, 0),
      },
    },

    recommendedStandard: raw.recommendedStandard ?? decision.recommended ?? "API_650",

    tankConfig: raw.tankConfig,
    designCases: raw.designCases,
    service: raw.service,
    geometry: raw.geometry,
    materials: raw.materials,
  };

  if (!draft.projectName) return null;

  // sanitize service
  if (raw.service && typeof raw.service === "object") {
    const s = raw.service;
    const liquidHeightsRaw = s.liquidHeights ?? {};
    const liquidHeights: Partial<Record<DesignCaseKey, number>> = {};

    for (const k of CASE_KEYS) {
      if (liquidHeightsRaw[k] !== undefined) {
        liquidHeights[k] = sanitizeNumber(liquidHeightsRaw[k], 0);
      }
    }

    draft.service = {
      storedProduct: s.storedProduct ? String(s.storedProduct) : undefined,
      specificGravity: sanitizeNumber(s.specificGravity, 1),
      corrosionAllowance: sanitizeNumber(s.corrosionAllowance, units === "SI" ? 2 : 0.125),
      liquidHeights,
    };
  }

  // sanitize geometry
  if (raw.geometry && typeof raw.geometry === "object") {
    const g = raw.geometry;
    const coursesRaw = Array.isArray(g.courses) ? g.courses : [];
    const courses = coursesRaw
      .map((x: any) => sanitizeNumber(x, 0))
      .filter((x: number) => x > 0);

    const inputMode =
      g.inputMode === "capacity" || g.inputMode === "manual" ? (g.inputMode as GeometryInputMode) : undefined;

    const unit =
      g.targetCapacityUnit === "m3" || g.targetCapacityUnit === "bbl"
        ? (g.targetCapacityUnit as TargetCapacityUnit)
        : undefined;

    draft.geometry = {
      diameter: sanitizeNumber(g.diameter, 0),
      shellHeight: sanitizeNumber(g.shellHeight, 0),
      courses,
      inputMode,
      presetKey: g.presetKey ? String(g.presetKey) : undefined,
      targetCapacity: g.targetCapacity !== undefined ? sanitizeNumber(g.targetCapacity, 0) : undefined,
      targetCapacityUnit: unit,
    };
  }

  // sanitize materials
  if (raw.materials && typeof raw.materials === "object") {
    const m = raw.materials;
    const thkRaw = Array.isArray(m.courseNominalThickness) ? m.courseNominalThickness : [];
    const courseNominalThickness = thkRaw
      .map((x: any) => sanitizeNumber(x, 0))
      .filter((x: number) => x > 0);

    draft.materials = {
      allowableStressDesign: sanitizeNumber(m.allowableStressDesign, 0),
      allowableStressTest: sanitizeNumber(
        m.allowableStressTest,
        sanitizeNumber(m.allowableStressDesign, 0)
      ),
      jointEfficiency: sanitizeNumber(m.jointEfficiency, 1),
      minNominalThickness: sanitizeNumber(m.minNominalThickness, units === "SI" ? 6 : 0.25),
      courseNominalThickness,
    };
  }

  return draft;
}

export function saveProjectDraft(draft: ProjectDraft) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function loadProjectDraft(): ProjectDraft | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return sanitizeProjectDraft(parsed);
  } catch {
    return null;
  }
}

export function updateProjectDraft(patch: Partial<ProjectDraft>): ProjectDraft | null {
  const existing = loadProjectDraft();
  if (!existing) return null;

  const merged: ProjectDraft = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  saveProjectDraft(merged);
  return merged;
}

export function clearProjectDraft() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
