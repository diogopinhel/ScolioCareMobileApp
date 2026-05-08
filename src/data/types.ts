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

export interface ResultadoEstudo {
  id: string;
  estudo_id: string;
  angulo_cobb: number;
  grau_curvatura: string;
  localizacao_curva: string | null;
  nivel_vertebras: string | null;
  confianca_modelo: number;
  data_processamento: string;
  decisao: DecisaoResultado | null;
  angulo_cobb_corrigido: number | null;
  concluido: boolean;
}

export interface EstudoComResultado {
  id: string;
  paciente_id: string;
  data_estudo: string;
  tipo_estudo: string;
  estado: EstadoEstudo;
  notas_clinicas: string | null;
  data_submissao: string;
  arquivado: boolean;
  ficheiro_pdf: string | null;
  resultado: ResultadoEstudo | null;
}

export interface WellnessLogEntry {
  id: string;
  paciente_id: string;
  data_registo: string;
  nivel_dor: number;
  desconforto: 'none' | 'mild' | 'moderate' | 'intense' | null;
  notas: string | null;
  criado_em: string;
}

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
