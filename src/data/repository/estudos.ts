import { supabase } from '../../lib/supabase';
import { EstudoComResultado, EstudoDetalhe, HistoricoEstadoEntry } from '../types';

const RESULTADO_FIELDS = `
  id,
  estudo_id,
  medico_validador_id,
  angulo_cobb,
  grau_curvatura,
  localizacao_curva,
  nivel_vertebras,
  classificacao_risser,
  tendencia_evolucao,
  confianca_modelo,
  data_processamento,
  decisao,
  angulo_cobb_corrigido,
  data_validacao,
  descricao_clinica,
  observacoes_medico,
  data_diagnostico,
  concluido
`;

const ESTUDO_FIELDS = `
  id,
  paciente_id,
  medico_responsavel_id,
  data_estudo,
  tipo_estudo,
  lateralidade_curva,
  estado,
  notas_clinicas,
  data_submissao,
  arquivado,
  ficheiro_pdf
`;

export async function getEstudosDoPaciente(pacienteId: string): Promise<EstudoComResultado[]> {
  const { data, error } = await supabase
    .from('estudos')
    .select(`
      ${ESTUDO_FIELDS},
      resultado:resultados (${RESULTADO_FIELDS})
    `)
    .eq('paciente_id', pacienteId)
    .eq('arquivado', false)
    .order('data_estudo', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    ...row,
    resultado: Array.isArray(row.resultado)
      ? (row.resultado[0] ?? null)
      : (row.resultado ?? null),
  })) as EstudoComResultado[];
}

export async function getEstudoPorId(estudoId: string): Promise<EstudoDetalhe | null> {
  const { data, error } = await supabase
    .from('estudos')
    .select(`
      ${ESTUDO_FIELDS},
      resultado:resultados (
        ${RESULTADO_FIELDS},
        medico_validador:utilizadores!resultados_medico_validador_id_fkey (
          nome_completo
        )
      )
    `)
    .eq('id', estudoId)
    .single();

  if (error) throw error;
  if (!data) return null;

  const resultado = Array.isArray(data.resultado)
    ? (data.resultado[0] ?? null)
    : (data.resultado ?? null);

  // Extrai o nome do médico validador do join e remove o objeto aninhado
  let medicoValidadorNome: string | null = null;
  if (resultado && typeof resultado === 'object' && 'medico_validador' in resultado) {
    const mv = (resultado as Record<string, unknown>).medico_validador;
    if (mv && typeof mv === 'object' && 'nome_completo' in mv) {
      medicoValidadorNome = (mv as { nome_completo: string }).nome_completo;
    }
  }

  const resultadoLimpo = resultado
    ? { ...(resultado as object) } as Record<string, unknown>
    : null;
  if (resultadoLimpo) delete resultadoLimpo['medico_validador'];

  return {
    ...data,
    resultado: resultadoLimpo as EstudoDetalhe['resultado'],
    medico_validador_nome: medicoValidadorNome,
  } as EstudoDetalhe;
}

export async function getHistoricoEstadoDoPaciente(pacienteId: string): Promise<HistoricoEstadoEntry[]> {
  const { data, error } = await supabase
    .from('historico_estado')
    .select(`
      id,
      estudo_id,
      utilizador_nome,
      utilizador_perfil,
      estado_anterior,
      estado_novo,
      data_transicao,
      observacao,
      estudo:estudos!inner (paciente_id)
    `)
    .eq('estudo.paciente_id', pacienteId)
    .order('data_transicao', { ascending: false });

  if (error) throw error;

  return (data ?? []) as unknown as HistoricoEstadoEntry[];
}
