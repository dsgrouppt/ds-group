import { ROLE, type RoleValue } from "@/lib/enums";

export type ModuleKey =
  | "dashboard"
  | "crm"
  | "obras"
  | "clientes"
  | "financeiro"
  | "agenda"
  | "rh"
  | "marketing"
  | "tarefas"
  | "definicoes";

type Action = "view" | "edit";

/**
 * Matriz de permissões por módulo e ação. Fonte única de verdade — tanto a
 * navegação (o que aparece no sidebar) como as rotas de API (o que pode ser
 * escrito) consultam esta matriz. Alterar aqui é suficiente para mudar
 * acesso em toda a plataforma, sem tocar em cada página individualmente.
 */
const MATRIX: Record<ModuleKey, Record<Action, RoleValue[]>> = {
  dashboard: {
    view: [ROLE.ADMIN, ROLE.DIRECAO, ROLE.COMERCIAL, ROLE.GESTOR_PROJETO, ROLE.FINANCEIRO, ROLE.RH, ROLE.MARKETING],
    edit: [],
  },
  crm: {
    view: [ROLE.ADMIN, ROLE.DIRECAO, ROLE.COMERCIAL, ROLE.MARKETING],
    edit: [ROLE.ADMIN, ROLE.DIRECAO, ROLE.COMERCIAL],
  },
  obras: {
    view: [ROLE.ADMIN, ROLE.DIRECAO, ROLE.GESTOR_PROJETO, ROLE.FINANCEIRO, ROLE.COMERCIAL],
    edit: [ROLE.ADMIN, ROLE.DIRECAO, ROLE.GESTOR_PROJETO],
  },
  clientes: {
    view: [ROLE.ADMIN, ROLE.DIRECAO, ROLE.COMERCIAL, ROLE.GESTOR_PROJETO, ROLE.FINANCEIRO],
    edit: [ROLE.ADMIN, ROLE.DIRECAO, ROLE.COMERCIAL],
  },
  financeiro: {
    view: [ROLE.ADMIN, ROLE.DIRECAO, ROLE.FINANCEIRO],
    edit: [ROLE.ADMIN, ROLE.DIRECAO, ROLE.FINANCEIRO],
  },
  agenda: {
    view: [ROLE.ADMIN, ROLE.DIRECAO, ROLE.GESTOR_PROJETO, ROLE.COMERCIAL],
    edit: [ROLE.ADMIN, ROLE.DIRECAO, ROLE.GESTOR_PROJETO, ROLE.COMERCIAL],
  },
  rh: {
    view: [ROLE.ADMIN, ROLE.DIRECAO, ROLE.RH],
    edit: [ROLE.ADMIN, ROLE.DIRECAO, ROLE.RH],
  },
  marketing: {
    view: [ROLE.ADMIN, ROLE.DIRECAO, ROLE.MARKETING],
    edit: [ROLE.ADMIN, ROLE.DIRECAO, ROLE.MARKETING],
  },
  tarefas: {
    view: [ROLE.ADMIN, ROLE.DIRECAO, ROLE.COMERCIAL, ROLE.GESTOR_PROJETO, ROLE.FINANCEIRO, ROLE.RH, ROLE.MARKETING],
    edit: [ROLE.ADMIN, ROLE.DIRECAO, ROLE.COMERCIAL, ROLE.GESTOR_PROJETO, ROLE.FINANCEIRO, ROLE.RH, ROLE.MARKETING],
  },
  definicoes: {
    view: [ROLE.ADMIN],
    edit: [ROLE.ADMIN],
  },
};

export function can(role: RoleValue | undefined | null, moduleKey: ModuleKey, action: Action = "view"): boolean {
  if (!role) return false;
  return MATRIX[moduleKey][action].includes(role);
}

export function accessibleModules(role: RoleValue | undefined | null): ModuleKey[] {
  return (Object.keys(MATRIX) as ModuleKey[]).filter((m) => can(role, m, "view"));
}
