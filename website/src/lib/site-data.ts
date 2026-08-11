import type {
  Service,
  Project,
  TimelineStep,
  VideoItem,
} from "@/types";

/**
 * FONTE ÚNICA DE CONTEÚDO DO SITE.
 * Este ficheiro concentra tudo o que é dado "de negócio" (serviços, projetos,
 * equipa, estatísticas, vídeos). Atualizar aqui propaga automaticamente a
 * todas as páginas — não há conteúdo duplicado nos componentes.
 *
 * Estatísticas, projetos, equipa e vídeos estão deliberadamente com `null`
 * ou `[Nome]` / `image` omitido onde ainda não existe dado real da DS
 * Projects. Os componentes sabem renderizar esse estado como placeholder
 * identificado — nunca como número ou fotografia inventada.
 */

export const siteConfig = {
  name: "DS Projects",
  tagline: "Gestão de Projeto. Uma empresa DS Group.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://www.dsprojects.pt",
  email: "geral@dsprojects.pt",
  // Contactos reais da DS Projects (confirmados pelo proprietário do produto, ago/2026).
  phone: "+351933356479",
  phoneDisplay: "+351 933 356 479",
  phoneAlt: "+351928241691",
  phoneAltDisplay: "+351 928 241 691",
  locations: ["Lisboa", "Porto", "Cascais", "Oeiras", "Sintra", "Vila Nova de Gaia", "Matosinhos", "Almada"],
};

export const services: Service[] = [
  {
    slug: "remodelacoes-residenciais",
    num: "01",
    category: "residencial",
    title: "Remodelações Residenciais",
    subtitle:
      "Renovação completa de apartamentos e casas, do primeiro esboço à entrega final.",
    description: [
      "A remodelação residencial é o núcleo do trabalho da DS Projects — apartamentos e casas que deixaram de servir a rotina de quem lá vive e precisam de ser repensados, do zero ou por fases.",
      "Cada projeto tem um gestor único como interlocutor, responsável por coordenar todas as equipas técnicas, cumprir o calendário acordado e manter o cliente informado semana a semana.",
    ],
    includes: [
      "Levantamento e validação de plantas",
      "Coordenação de todas as especialidades técnicas",
      "Reporte semanal estruturado",
      "Vistoria final e dossier de garantia",
    ],
  },
  {
    slug: "remodelacoes-premium",
    num: "02",
    category: "premium",
    title: "Remodelações Premium",
    subtitle:
      "Projetos de alto padrão, com curadoria de materiais e acompanhamento próximo do cliente.",
    description: [
      "Para projetos onde o nível de acabamento e a exclusividade dos materiais são decisivos, a DS Projects assume um acompanhamento mais próximo — com maior frequência de reporte e curadoria conjunta de fornecedores e materiais de referência.",
      "O processo mantém-se o mesmo — rigor, transparência, prazo contratual — elevado ao nível de exigência que este tipo de projeto pede.",
    ],
    includes: [
      "Curadoria de materiais e fornecedores de referência",
      "Reporte reforçado (bissemanal)",
      "Gestor de projeto sénior dedicado",
      "Acompanhamento de design de interiores, quando aplicável",
    ],
  },
  {
    slug: "cozinhas",
    num: "03",
    category: "cozinhas",
    title: "Cozinhas",
    subtitle:
      "Desenho e execução de cozinhas funcionais e duráveis, integradas no projeto global da casa.",
    description: [
      "A cozinha é, tipicamente, o espaço mais técnico de uma casa — cruza canalização, eletricidade, ventilação e mobiliário à medida num só compartimento.",
      "A DS Projects trata a cozinha como um projeto de engenharia doméstica, não apenas de estética — o resultado é um espaço que continua a funcionar bem daqui a dez anos.",
    ],
    includes: [
      "Redesenho de layout e fluxo de trabalho",
      "Coordenação de canalização, eletricidade e ventilação",
      "Mobiliário e bancada à medida",
      "Instalação de eletrodomésticos integrados",
    ],
  },
  {
    slug: "casas-de-banho",
    num: "04",
    category: "casas-de-banho",
    title: "Casas de Banho",
    subtitle:
      "Renovação de casas de banho com foco em impermeabilização, conforto e acabamento de longa duração.",
    description: [
      "Uma casa de banho mal impermeabilizada é o erro mais caro de corrigir depois da obra terminada. É por isso que a DS Projects trata esta fase com o mesmo rigor técnico de uma estrutura, antes de qualquer decisão estética.",
      "Depois da parte técnica garantida, o foco passa para o conforto do dia a dia — e para acabamentos que resistem ao tempo, não só à primeira fotografia.",
    ],
    includes: [
      "Impermeabilização certificada",
      "Substituição de redes de água quando necessário",
      "Escolha de revestimentos duráveis",
      "Ventilação adequada contra humidade",
    ],
  },
  {
    slug: "moradias",
    num: "05",
    category: "moradias",
    title: "Moradias",
    subtitle:
      "Gestão de projetos de maior escala, com coordenação de múltiplas equipas técnicas em simultâneo.",
    description: [
      "Moradias exigem uma escala de coordenação diferente de um apartamento — mais equipas em simultâneo, mais fases dependentes umas das outras, maior exposição a imprevistos externos.",
      "É exatamente para este nível de complexidade que a estrutura de gestão da DS Projects foi desenhada: um único responsável a orquestrar tudo.",
    ],
    includes: [
      "Coordenação de múltiplas equipas em simultâneo",
      "Gestão de interiores e exteriores",
      "Planeamento de fases dependentes",
      "Reporte semanal consolidado",
    ],
  },
  {
    slug: "espacos-comerciais",
    num: "06",
    category: "comercial",
    title: "Espaços Comerciais",
    subtitle:
      "Renovação de escritórios, lojas e clínicas com minimização do impacto na atividade em curso.",
    description: [
      "Um espaço comercial em obras é, quase sempre, um espaço a perder receita. O maior valor que a DS Projects entrega neste segmento é a gestão de calendário.",
      "Trabalhamos com prazos especialmente rígidos e reporte adaptado às necessidades de gestão do próprio negócio do cliente.",
    ],
    includes: [
      "Faseamento para minimizar paragem de atividade",
      "Trabalho fora de horário quando necessário",
      "Prazos com penalização contratual reforçada",
      "Reporte adaptado à gestão do negócio do cliente",
    ],
  },
];

export function getServiceBySlug(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

export function getRelatedServices(slug: string, limit = 3): Service[] {
  return services.filter((s) => s.slug !== slug).slice(0, limit);
}

// image:undefined => PlaceholderMedia mostra o placeholder identificado.
export const projects: Project[] = [
  { id: "p1", title: "Remodelação Residencial — Lisboa", location: "Lisboa", category: "residencial" },
  { id: "p2", title: "Remodelação Premium — Cascais", location: "Cascais", category: "premium" },
  { id: "p3", title: "Remodelação de Cozinha — Porto", location: "Porto", category: "cozinhas" },
  { id: "p4", title: "Remodelação de Casa de Banho — Lisboa", location: "Lisboa", category: "casas-de-banho" },
  { id: "p5", title: "Remodelação de Moradia — Sintra", location: "Sintra", category: "moradias" },
  { id: "p6", title: "Remodelação de Espaço Comercial — Lisboa", location: "Lisboa", category: "comercial" },
  { id: "p7", title: "Remodelação Residencial — Porto", location: "Porto", category: "residencial" },
  { id: "p8", title: "Remodelação Premium — Estoril", location: "Estoril", category: "premium" },
  { id: "p9", title: "Remodelação de Moradia — Cascais", location: "Cascais", category: "moradias" },
  { id: "p10", title: "Remodelação de Casa de Banho — Porto", location: "Porto", category: "casas-de-banho" },
  { id: "p11", title: "Remodelação de Espaço Comercial — Matosinhos", location: "Matosinhos", category: "comercial" },
  { id: "p12", title: "Remodelação de Cozinha — Cascais", location: "Cascais", category: "cozinhas" },
];

export function getProjectsByCategory(category?: string, limit?: number): Project[] {
  const filtered = category && category !== "all"
    ? projects.filter((p) => p.category === category)
    : projects;
  return typeof limit === "number" ? filtered.slice(0, limit) : filtered;
}

export const timelineSteps: TimelineStep[] = [
  { time: "Semana 1", title: "Arranque e Preparação", description: "Kickoff, encomenda de materiais, proteção do espaço." },
  { time: "Semanas 2–3", title: "Demolição e Estrutura", description: "Remoção controlada, ajustes estruturais quando aplicável." },
  { time: "Semanas 4–6", title: "Instalações", description: "Redes elétricas, água e AVAC, com inspeção técnica." },
  { time: "Semanas 7–9", title: "Acabamentos", description: "Pavimentos, revestimentos, pintura e carpintaria." },
  { time: "Semana 10", title: "Controlo e Entrega", description: "Vistoria interna, vistoria com cliente, entrega de dossier." },
];

export const videos: VideoItem[] = [
  { id: "v1", title: "Do Levantamento à Entrega — Ep. 01" },
  { id: "v2", title: "Bastidores da Equipa Técnica" },
  { id: "v3", title: "Como Fazemos um Orçamento" },
];

export const mainNav = [
  { label: "Serviços", href: "/#servicos" },
  { label: "Método", href: "/#metodo" },
  { label: "Portefólio", href: "/portfolio" },
  { label: "Blog", href: "/blog" },
  { label: "FAQ", href: "/faq" },
  { label: "Contacto", href: "/#contacto" },
];

export const filterCategories: { label: string; value: string }[] = [
  { label: "Todos", value: "all" },
  { label: "Residencial", value: "residencial" },
  { label: "Premium", value: "premium" },
  { label: "Cozinhas", value: "cozinhas" },
  { label: "Casas de Banho", value: "casas-de-banho" },
  { label: "Moradias", value: "moradias" },
  { label: "Comercial", value: "comercial" },
];
