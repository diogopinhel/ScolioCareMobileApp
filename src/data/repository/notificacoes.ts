import { supabase } from '../../lib/supabase';
import { i18n } from '../../i18n';

export interface Notificacao {
  id: string;
  destinatario_id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  titulo_en: string | null;
  mensagem_en: string | null;
  data_envio: string;
  data_leitura: string | null;
  referencia_entidade: string | null;
  referencia_id: string | null;
}

export function resolverTextoNotificacao(notificacao: Notificacao): { titulo: string; mensagem: string } {
  const isEn = i18n.language?.startsWith('en');
  return {
    titulo:   (isEn && notificacao.titulo_en)   ? notificacao.titulo_en   : notificacao.titulo,
    mensagem: (isEn && notificacao.mensagem_en) ? notificacao.mensagem_en : notificacao.mensagem,
  };
}

export async function getNotificacoesDoPaciente(pacienteId: string): Promise<Notificacao[]> {
  const { data, error } = await supabase
    .from('notificacoes')
    .select('id, destinatario_id, tipo, titulo, mensagem, titulo_en, mensagem_en, data_envio, data_leitura, referencia_entidade, referencia_id')
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
