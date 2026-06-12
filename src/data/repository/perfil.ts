import { supabase } from '../../lib/supabase';
import { MedicoResponsavel } from '../types';

export async function getEmailDoPaciente(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.email ?? null;
}

export async function getMedicoResponsavel(pacienteId: string): Promise<MedicoResponsavel | null> {
  const { data, error } = await supabase.rpc('get_medico_do_paciente', {
    p_paciente_id: pacienteId,
  });

  if (error) throw error;
  if (!data || data.length === 0) return null;

  return data[0] as MedicoResponsavel;
}


export async function atualizarPerfilPaciente(
  pacienteId: string,
  dados: {
    nome_completo: string;
    data_nascimento: string | null;
    genero: string | null;
    contacto: string | null;
    morada: string | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from('utilizadores')
    .update(dados)
    .eq('id', pacienteId);
  if (error) throw error;
}

export async function atualizarIdioma(
  pacienteId: string,
  idioma: 'pt-PT' | 'en',
): Promise<void> {
  const { error } = await supabase
    .from('utilizadores')
    .update({ idioma })
    .eq('id', pacienteId);
  if (error) throw error;
}

