# Dados de Registo do Paciente — O que a App Guarda e o que Falta no Dashboard

Este documento descreve o que está implementado na **app mobile (ScolioCareAPP)** após o registo de um novo paciente, e o que o **técnico na dashboard web (ScolioCare)** precisa de implementar para visualizar esses dados corretamente.

---

## 1. O que a app guarda no Supabase

### `auth.users` (gerido pelo Supabase Auth)
| Campo | Valor |
|---|---|
| `email` | Email do paciente |
| `password` | Hash da password |
| `raw_user_meta_data` | `{ nome_completo, data_nascimento, genero, cartao_cidadao, numero_utente, contacto, morada, perfil: 'PACIENTE' }` |

### `utilizadores` (tabela pública)

O trigger `handle_new_user` cria a row ao registar. A app faz depois um UPDATE com os campos demográficos:

| Campo DB | Tipo | Obrigatório | Valor de registo |
|---|---|---|---|
| `id` | uuid | ✅ | ID do `auth.users` |
| `nome_completo` | text | ✅ | Nome completo |
| `perfil` | text | ✅ | `'PACIENTE'` |
| `ativo` | boolean | ✅ | `true` |
| `conta_ativada` | boolean | ✅ | `false` (bloqueado até técnico atribuir médico) |
| `conta_bloqueada` | boolean | ✅ | `false` |
| `two_factor_ativo` | boolean | ✅ | `false` |
| `idioma` | text | ✅ | `'pt-PT'` |
| `data_nascimento` | date | ✅ | ISO `YYYY-MM-DD` |
| `genero` | text | ✅ | `'M'`, `'F'` ou `'O'` |
| `contacto` | text | ✅ | Nº de telemóvel |
| `morada` | text | ✅ | Morada completa |
| `cartao_cidadao` | text | ✅ | Nº CC |
| `numero_utente` | text | ❌ (opcional) | Nº de Utente SNS |

> **Nota:** O `email` **não está** na tabela `utilizadores`. Está apenas em `auth.users`. Ver secção 3.

---

## 2. O que está a funcionar vs. o que falta na dashboard web

### `getPacientesTecnico()` — query atual em `src/data/repository/tecnico.ts`

```typescript
.select('id, nome_completo, numero_utente, data_nascimento, genero, conta_ativada')
```

| Campo | Está no SELECT? | Está em `PacienteTecnico`? | Mostrado na tabela? |
|---|---|---|---|
| `nome_completo` | ✅ | ✅ | ✅ |
| `numero_utente` | ✅ | ✅ | ✅ |
| `data_nascimento` | ✅ | ✅ | ✅ (calculado como idade) |
| `genero` | ✅ | ✅ | ✅ |
| `conta_ativada` | ✅ | ✅ | ✅ (separador Todos/Pendentes) |
| `contacto` | ❌ | ❌ | ❌ |
| `morada` | ❌ | ❌ | ❌ |
| `cartao_cidadao` | ❌ | ❌ | ❌ |
| `email` | ❌ (não está em `utilizadores`) | ❌ | ❌ |

---

## 3. O que o técnico precisa de implementar

### 3.1 — Adicionar coluna `email` à tabela `utilizadores`

O email está em `auth.users` e não está acessível via query client ao técnico. A solução é adicioná-lo à tabela `utilizadores` e copiá-lo no trigger.

**SQL a executar no Supabase SQL Editor:**

```sql
-- 1. Adicionar coluna email
ALTER TABLE public.utilizadores
ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Actualizar o trigger handle_new_user para copiar o email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.utilizadores (id, nome_completo, email, perfil)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'perfil', 'PACIENTE')
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

> Se já existirem registos sem email (pacientes registados antes da migração), podes fazer um backfill via Edge Function ou deixar `null`.

---

### 3.2 — Atualizar `getPacientesTecnico()` em `tecnico.ts`

Alterar o SELECT para incluir os campos em falta:

```typescript
// ANTES
.select('id, nome_completo, numero_utente, data_nascimento, genero, conta_ativada')

// DEPOIS
.select('id, nome_completo, email, numero_utente, data_nascimento, genero, conta_ativada, contacto, morada, cartao_cidadao')
```

E no `.map()` final, adicionar os novos campos ao objeto retornado:

```typescript
return (pacientes as any[]).map((p) => ({
  id: p.id as string,
  nomeCompleto: p.nome_completo as string,
  email: p.email as string | null,           // NOVO
  numeroUtente: p.numero_utente as string | null,
  dataNascimento: p.data_nascimento as string | null,
  genero: p.genero as string | null,
  contacto: p.contacto as string | null,     // NOVO
  morada: p.morada as string | null,         // NOVO
  cartaoCidadao: p.cartao_cidadao as string | null, // NOVO
  totalExames: resumoPorPaciente.get(p.id)?.total ?? 0,
  ultimoExame: resumoPorPaciente.get(p.id)?.ultimaData ?? null,
  medicoId: medicoPorPaciente.get(p.id)?.medicoId ?? null,
  medicoNome: medicoPorPaciente.get(p.id)?.medicoNome ?? null,
  contaAtivada: (p.conta_ativada as boolean) ?? false,
}));
```

---

### 3.3 — Atualizar o tipo `PacienteTecnico` em `types.ts`

```typescript
// ANTES
export interface PacienteTecnico {
  id: string;
  nomeCompleto: string;
  numeroUtente: string | null;
  dataNascimento: string | null;
  genero: string | null;
  totalExames: number;
  ultimoExame: string | null;
  medicoId: string | null;
  medicoNome: string | null;
  contaAtivada: boolean;
}

// DEPOIS
export interface PacienteTecnico {
  id: string;
  nomeCompleto: string;
  email: string | null;         // NOVO
  numeroUtente: string | null;
  dataNascimento: string | null;
  genero: string | null;
  contacto: string | null;      // NOVO
  morada: string | null;        // NOVO
  cartaoCidadao: string | null; // NOVO
  totalExames: number;
  ultimoExame: string | null;
  medicoId: string | null;
  medicoNome: string | null;
  contaAtivada: boolean;
}
```

---

### 3.4 — Mostrar email e contacto no modal de atribuição de médico

No `TecnicoPatientsScreen.tsx`, dentro do `<Modal>` de atribuição, já existe um bloco de resumo do paciente. Adicionar email e contacto:

```tsx
{modalPaciente && (
  <div className="space-y-4">
    <div className="bg-[var(--scolio-page-surface)] rounded-[var(--radius-component)] p-4 space-y-2">
      <div className="flex justify-between">
        <span ...>Nome</span>
        <span ...>{modalPaciente.nomeCompleto}</span>
      </div>
      {modalPaciente.email && (
        <div className="flex justify-between">
          <span ...>Email</span>
          <span ...>{modalPaciente.email}</span>
        </div>
      )}
      {modalPaciente.numeroUtente && (
        <div className="flex justify-between">
          <span ...>Nº Utente</span>
          <span ...>{modalPaciente.numeroUtente}</span>
        </div>
      )}
      {modalPaciente.contacto && (
        <div className="flex justify-between">
          <span ...>Contacto</span>
          <span ...>{modalPaciente.contacto}</span>
        </div>
      )}
    </div>
    <Select ... />
  </div>
)}
```

---

### 3.5 — Pesquisa (opcional, mas recomendado)

Atualizar a função `correspondePesquisa` para incluir email e contacto:

```typescript
// ANTES
const correspondePesquisa = (p: PacienteTecnico) =>
  p.nomeCompleto.toLowerCase().includes(search.toLowerCase()) ||
  (p.numeroUtente ?? '').toLowerCase().includes(search.toLowerCase());

// DEPOIS
const correspondePesquisa = (p: PacienteTecnico) =>
  p.nomeCompleto.toLowerCase().includes(search.toLowerCase()) ||
  (p.numeroUtente ?? '').toLowerCase().includes(search.toLowerCase()) ||
  (p.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
  (p.contacto ?? '').toLowerCase().includes(search.toLowerCase());
```

---

## 4. Confirmação do nosso lado (app mobile)

A app guarda tudo corretamente. Podes confirmar no Supabase Table Editor em `utilizadores` — ao criar uma conta pela app, os campos `contacto`, `morada`, `cartao_cidadao`, `numero_utente`, `genero`, `data_nascimento` e `conta_ativada = false` ficam preenchidos.

O único campo que **nós não guardamos** em `utilizadores` é o `email` — fica apenas em `auth.users`. Por isso é necessário o passo 3.1 (adicionar coluna + atualizar trigger).

---

## 5. Resumo dos ficheiros a alterar no ScolioCare web

| Ficheiro | Alteração |
|---|---|
| Supabase SQL Editor | Adicionar coluna `email` + atualizar trigger `handle_new_user` |
| `src/data/types.ts` | Adicionar `email`, `contacto`, `morada`, `cartaoCidadao` a `PacienteTecnico` |
| `src/data/repository/tecnico.ts` | Expandir SELECT + map em `getPacientesTecnico()` |
| `src/app/screens/tecnico/TecnicoPatientsScreen.tsx` | Mostrar email/contacto no modal + atualizar pesquisa |
