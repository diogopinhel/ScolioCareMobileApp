export type PerfilUtilizador = 'ADMIN' | 'MEDICO' | 'TECNICO' | 'PACIENTE';

export type EstadoEstudo =
  | 'UPLOADED'
  | 'PROCESSING'
  | 'PENDING_VALIDATION'
  | 'VALIDATED'
  | 'DIAGNOSED'
  | 'SENT'
  | 'ARCHIVED';

export type DecisaoResultado = 'ACEITE' | 'CORRIGIDO' | 'REJEITADO';

// ─── Utilizador base ────────────────────────────────────────────────────────

export interface Utilizador {
  id: string;
  nome_completo: string;
  perfil: PerfilUtilizador;
  ativo: boolean;
  idioma: string;
  conta_bloqueada: boolean;
  contacto: string | null;
  data_criacao: string;
  ultimo_login: string | null;
  two_factor_ativo: boolean;
}

// ─── Paciente ────────────────────────────────────────────────────────────────

export interface Paciente extends Utilizador {
  perfil: 'PACIENTE';
  data_nascimento: string | null;
  genero: string | null;
  numero_utente: string | null;
  morada: string | null;
  peso: number | null;
  altura: number | null;
  representante_legal: string | null;
  contacto_representante: string | null;
  conta_ativada: boolean;
}

// ─── Médico responsável (perfil do paciente) ─────────────────────────────────
// Subset de utilizadores necessário para mostrar no ecrã de Perfil e ExameView.

export interface MedicoResponsavel {
  id: string;
  nome_completo: string;
  especialidade: string | null;
}

// ─── Resultado do estudo ──────────────────────────────────────────────────────
// Mapeia as colunas da tabela `resultados` usadas nas telas de exame.

export interface ResultadoEstudo {
  id: string;
  estudo_id: string;
  medico_validador_id: string | null;

  // Métricas ML
  angulo_cobb: number;
  grau_curvatura: string;
  localizacao_curva: string | null;
  nivel_vertebras: string | null;
  classificacao_risser: number | null;
  tendencia_evolucao: string | null;
  confianca_modelo: number;
  data_processamento: string;

  // Validação médica
  decisao: DecisaoResultado | null;
  angulo_cobb_corrigido: number | null;
  data_validacao: string | null;

  // Diagnóstico e notas
  descricao_clinica: string | null;
  observacoes_medico: string | null;
  data_diagnostico: string | null;

  concluido: boolean;
}

// ─── Estudo com resultado (lista de exames) ───────────────────────────────────

export interface EstudoComResultado {
  id: string;
  paciente_id: string;
  medico_responsavel_id: string;
  data_estudo: string;
  tipo_estudo: string;
  lateralidade_curva: string | null;
  estado: EstadoEstudo;
  notas_clinicas: string | null;
  data_submissao: string;
  arquivado: boolean;
  ficheiro_pdf: string | null;
  resultado: ResultadoEstudo | null;
}

// ─── Estudo com detalhe completo (ecrã de detalhe do exame) ──────────────────
// Inclui nome do médico validador já resolvido pelo repositório via join.

export interface EstudoDetalhe extends EstudoComResultado {
  medico_validador_nome: string | null;
}

// ─── Wellness log ─────────────────────────────────────────────────────────────

export interface WellnessLogEntry {
  id: string;
  paciente_id: string;
  data_registo: string;
  nivel_dor: number;
  desconforto: 'none' | 'mild' | 'moderate' | 'intense' | null;
  notas: string | null;
  criado_em: string;
}

// ─── Histórico de estado ──────────────────────────────────────────────────────

export interface HistoricoEstadoEntry {
  id: string;
  estudo_id: string;
  utilizador_nome: string;
  utilizador_perfil: PerfilUtilizador;
  estado_anterior: string | null;
  estado_novo: string;
  data_transicao: string;
  observacao: string | null;
}
