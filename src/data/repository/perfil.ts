import { supabase } from '../../lib/supabase';
import { MedicoResponsavel } from '../types';

export async function getEmailDoPaciente(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.email ?? null;
}

export async function getMedicoResponsavel(pacienteId: string): Promise<MedicoResponsavel | null> {
  const { data, error } = await supabase
    .from('paciente_medico')
    .select(`
      medico:utilizadores!paciente_medico_medico_id_fkey (
        id,
        nome_completo,
        especialidade
      )
    `)
    .eq('paciente_id', pacienteId)
    .eq('responsavel_principal', true)
    .is('data_fim', null)
    .maybeSingle();

  if (error) throw error;
  if (!data?.medico) return null;

  const medico = Array.isArray(data.medico) ? data.medico[0] : data.medico;
  return medico as MedicoResponsavel;
}

export interface ConsentimentoTreino {
  id: string;
  data_consentimento: string;
  data_revogacao: string | null;
  versao_termos: string;
}

export async function getConsentimentoTreino(pacienteId: string): Promise<ConsentimentoTreino | null> {
  const { data, error } = await supabase
    .from('consentimento_treino')
    .select('id, data_consentimento, data_revogacao, versao_termos')
    .eq('paciente_id', pacienteId)
    .order('data_consentimento', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as ConsentimentoTreino | null;
}

export async function darConsentimentoTreino(pacienteId: string): Promise<void> {
  const { error } = await supabase
    .from('consentimento_treino')
    .insert({
      paciente_id: pacienteId,
      versao_termos: '1.0',
      metodo_consentimento: 'APP',
    });

  if (error) throw error;
}

export async function revogarConsentimentoTreino(consentimentoId: string): Promise<void> {
  const { error } = await supabase
    .from('consentimento_treino')
    .update({ data_revogacao: new Date().toISOString() })
    .eq('id', consentimentoId);

  if (error) throw error;
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

export async function atualizarFotoPerfil(
  pacienteId: string,
  imageUri: string,
): Promise<string> {
  const ext = imageUri.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg';
  const path = `${pacienteId}/avatar_${Date.now()}.${ext}`;

  const response = await fetch(imageUri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from('profile-image')
    .upload(path, blob, { contentType: `image/${ext}`, upsert: false });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('profile-image').getPublicUrl(path);

  const { error: updateError } = await supabase
    .from('utilizadores')
    .update({ foto_url: data.publicUrl })
    .eq('id', pacienteId);

  if (updateError) throw updateError;

  return data.publicUrl;
}
