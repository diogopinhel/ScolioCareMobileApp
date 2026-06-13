// Severity helpers — single source of truth for Cobb-angle classification.
//
// The effective angle is the doctor-corrected value when present, otherwise the
// raw ML value. Severity must be DERIVED from this effective angle: the stored
// `grau_curvatura` field reflects the original ML angle and is NOT recomputed
// when the doctor corrects the measurement, so it goes stale after validation.
//
// Thresholds mirror the web project (CobbAngleGauge.tsx):
//   < 10° Normal · < 25° Leve · < 40° Moderada · ≥ 40° Grave

export type GrauSeveridade = 'NORMAL' | 'LEVE' | 'MODERADA' | 'GRAVE';

/** Minimal shape required to read the effective angle off a `resultados` row. */
interface ResultadoAngulo {
  angulo_cobb: number;
  angulo_cobb_corrigido?: number | null;
}

/** Doctor-corrected angle when available, otherwise the raw ML angle. */
export function anguloEfetivo(resultado: ResultadoAngulo | null | undefined): number | null {
  if (!resultado) return null;
  return resultado.angulo_cobb_corrigido ?? resultado.angulo_cobb ?? null;
}

/** Clinical severity grade derived from a Cobb angle. */
export function grauPorAngulo(angulo: number): GrauSeveridade {
  if (angulo < 10) return 'NORMAL';
  if (angulo < 25) return 'LEVE';
  if (angulo < 40) return 'MODERADA';
  return 'GRAVE';
}
