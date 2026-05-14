import { supabase } from '../../lib/supabase';
import { WellnessLogEntry } from '../types';

export interface NovoWellnessEntry {
  paciente_id: string;
  data_registo: string; // YYYY-MM-DD
  nivel_dor: number;   // 0–9 (schema)
  desconforto: 'none' | 'mild' | 'moderate' | 'intense' | null;
  notas: string | null;
}

export async function addWellnessEntry(entry: NovoWellnessEntry): Promise<void> {
  const { error } = await supabase
    .from('wellness_log')
    .upsert(entry, { onConflict: 'paciente_id,data_registo' });
  if (error) throw error;
}

export async function getWellnessLogDoPaciente(pacienteId: string): Promise<WellnessLogEntry[]> {
  const { data, error } = await supabase
    .from('wellness_log')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('data_registo', { ascending: false });
  if (error) throw error;
  return (data ?? []) as WellnessLogEntry[];
}
