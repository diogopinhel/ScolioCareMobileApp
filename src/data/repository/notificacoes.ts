import { supabase } from '../../lib/supabase';

export interface Notificacao {
  id: string;
  destinatario_id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  data_envio: string;
  data_leitura: string | null;
  referencia_entidade: string | null;
  referencia_id: string | null;
}

export async function getNotificacoesDoPaciente(pacienteId: string): Promise<Notificacao[]> {
  const { data, error } = await supabase
    .from('notificacoes')
    .select('*')
    .eq('destinatario_id', pacienteId)
    .order('data_envio', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Notificacao[];
}

export async function marcarComoLida(notificacaoId: string): Promise<void> {
  const { error } = await supabase
    .from('notificacoes')
    .update({ data_leitura: new Date().toISOString() })
    .eq('id', notificacaoId);

  if (error) throw error;
}
