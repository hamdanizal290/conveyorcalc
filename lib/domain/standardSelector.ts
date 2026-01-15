// lib/domain/standardSelector.ts

export type UnitKey = "SI" | "US";
export type StandardKey = "API_650" | "API_620" | "OUT_OF_SCOPE";
export type ConfidenceKey = "Tinggi" | "Sedang" | "Rendah";

export interface EnvelopeInput {
  units: UnitKey;

  /** Tekanan desain internal (gauge):
   *  - Jika SI: kPa(g)
   *  - Jika US: psi(g)
   */
  designPressure: number;

  /** Vakum desain (magnitudo, nilai positif):
   *  - Jika SI: kPa
   *  - Jika US: psi
   */
  designVacuum: number;

  /** Temperatur desain:
   *  - Jika SI: °C
   *  - Jika US: °F
   */
  tMin: number;
  tMax: number;
}

export interface StandardDecision {
  recommended: StandardKey;
  confidence: ConfidenceKey;
  reasons: string[];
  warnings: string[];
  // nilai yang sudah dinormalisasi (untuk ditampilkan/di-log)
  normalized: {
    designPressure_kPa: number;
    designVacuum_kPa: number;
    tMin_C: number;
    tMax_C: number;
  };
}

const PSI_TO_KPA = 6.894757;

function psiToKpa(x: number) {
  return x * PSI_TO_KPA;
}

function fToC(f: number) {
  return (f - 32) * (5 / 9);
}

/**
 * Seleksi standard otomatis (indikasi awal).
 * Catatan:
 * - Ambang batas ini dipakai sebagai “gate” praktis untuk workflow.
 * - Engineer tetap wajib verifikasi terhadap edisi standard & spesifikasi project.
 */
export function selectStandard(envelope: EnvelopeInput): StandardDecision {
  const reasons: string[] = [];
  const warnings: string[] = [];

  // Normalisasi ke kPa dan °C agar rule konsisten
  const p_kPa = envelope.units === "SI" ? envelope.designPressure : psiToKpa(envelope.designPressure);
  const v_kPa = envelope.units === "SI" ? envelope.designVacuum : psiToKpa(envelope.designVacuum);

  const tMin_C = envelope.units === "SI" ? envelope.tMin : fToC(envelope.tMin);
  const tMax_C = envelope.units === "SI" ? envelope.tMax : fToC(envelope.tMax);

  // Threshold praktis (indikasi umum)
  const API650_P_MAX_KPA = 17.2;  // ~2.5 psig
  const API620_P_MAX_KPA = 103.4; // ~15 psig

  // Skor confidence (3 tinggi → 1 rendah)
  let confScore = 3;
  const downgrade = () => (confScore = Math.max(1, confScore - 1));

  // Validasi ringan
  if (p_kPa < 0) {
    warnings.push("Tekanan desain internal tidak boleh negatif.");
    downgrade();
  }
  if (v_kPa < 0) {
    warnings.push("Vakum desain sebaiknya diisi sebagai magnitudo (nilai positif).");
    downgrade();
  }
  if (tMax_C < tMin_C) {
    warnings.push("Temperatur maksimum lebih kecil dari temperatur minimum. Periksa input temperatur.");
    downgrade();
  }

  // Rule utama: berbasis tekanan internal
  let recommended: StandardKey = "API_650";

  if (p_kPa <= API650_P_MAX_KPA) {
    recommended = "API_650";
    reasons.push("Tekanan desain internal berada pada regime near-atmospheric (indikasi API 650).");
  } else if (p_kPa <= API620_P_MAX_KPA) {
    recommended = "API_620";
    reasons.push("Tekanan desain internal berada pada regime low-pressure tank (indikasi API 620).");
  } else {
    recommended = "OUT_OF_SCOPE";
    reasons.push("Tekanan desain internal melebihi cakupan praktis tank atmospheric/low-pressure.");
    warnings.push("Pertimbangkan evaluasi menggunakan code pressure vessel / skema desain lain sesuai spesifikasi project.");
    confScore = 3; // high confidence out-of-scope untuk mencegah user lanjut salah jalur
  }

  // Warnings tambahan (bukan penentu utama, tapi penting untuk desain tank)
  if (v_kPa > 0) {
    warnings.push("Vakum terdefinisi: pastikan verifikasi external pressure / stabilitas (buckling) termasuk pada design cases.");
    // tidak selalu menurunkan confidence, tetapi bisa menjadi catatan review
  }

  // Temperatur: dibuat sebagai warning konservatif (batas detail tergantung edisi/annex)
  if (tMax_C > 93) {
    warnings.push("Temperatur maksimum relatif tinggi: pastikan material/allowable dan batas cakupan standard sesuai edisi & spesifikasi project.");
    downgrade();
  }
  if (tMin_C < -20) {
    warnings.push("Temperatur minimum relatif rendah: periksa kebutuhan impact test/material toughness sesuai ketentuan standard & spec.");
    downgrade();
  }

  // Near-threshold → confidence turun
  const near = (x: number, ref: number, pct: number) => Math.abs(x - ref) <= ref * pct;
  if (recommended === "API_650" && near(p_kPa, API650_P_MAX_KPA, 0.1)) {
    warnings.push("Tekanan mendekati ambang: pastikan verifikasi pemilihan standard terhadap edisi & spec project.");
    downgrade();
  }
  if (recommended === "API_620" && (near(p_kPa, API650_P_MAX_KPA, 0.1) || near(p_kPa, API620_P_MAX_KPA, 0.1))) {
    warnings.push("Tekanan mendekati ambang: pastikan verifikasi pemilihan standard terhadap edisi & spec project.");
    downgrade();
  }

  const confidence: ConfidenceKey =
    confScore === 3 ? "Tinggi" : confScore === 2 ? "Sedang" : "Rendah";

  return {
    recommended,
    confidence,
    reasons,
    warnings,
    normalized: {
      designPressure_kPa: p_kPa,
      designVacuum_kPa: v_kPa,
      tMin_C,
      tMax_C,
    },
  };
}
