import type { ModuleKey } from "@/lib/permissions";

export interface NavItem {
  key: ModuleKey;
  label: string;
  href: string;
}

export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", href: "/" },
  { key: "crm", label: "CRM", href: "/crm" },
  { key: "obras", label: "Obras", href: "/obras" },
  { key: "clientes", label: "Clientes", href: "/clientes" },
  { key: "tarefas", label: "Tarefas", href: "/tarefas" },
  { key: "financeiro", label: "Financeiro", href: "/financeiro" },
  { key: "agenda", label: "Agenda", href: "/agenda" },
  { key: "rh", label: "Recursos Humanos", href: "/rh" },
  { key: "marketing", label: "Marketing", href: "/marketing" },
  { key: "definicoes", label: "Definições", href: "/definicoes" },
];
