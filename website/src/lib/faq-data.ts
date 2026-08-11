export interface FaqItem {
  question: string;
  answer: string;
  category: "Processo" | "Prazos e Orçamento" | "Investidores" | "Garantia";
}

/**
 * FAQ real, não genérica — respostas escritas para reduzir objeções
 * concretas de um cliente com orçamento de 20.000€–200.000€, sem nunca
 * liderar com número de preço (regra de marca, ver brand/brand-book.md).
 */
export const faqItems: FaqItem[] = [
  {
    category: "Processo",
    question: "Como funciona o primeiro contacto com a DS Projects?",
    answer:
      "Começa com um Estudo de Viabilidade: uma conversa inicial para perceber o espaço, o objetivo do projeto e o contexto (residencial, premium ou investimento). Só depois deste enquadramento é feito o levantamento técnico presencial que dá origem a uma proposta com calendário e âmbito claros.",
  },
  {
    category: "Processo",
    question: "Vou ter um único ponto de contacto durante a obra?",
    answer:
      "Sim. Cada projeto tem um gestor responsável por coordenar todas as equipas técnicas e por ser o único interlocutor do cliente — não é necessário falar diretamente com o eletricista, o canalizador ou o carpinteiro.",
  },
  {
    category: "Processo",
    question: "Com que frequência vou receber informação sobre o progresso da obra?",
    answer:
      "Reporte semanal estruturado em todos os projetos, com frequência reforçada (bissemanal) em projetos da categoria Premium. O objetivo é que nunca seja o cliente a ter de perguntar 'como está a obra' — a informação chega antes da pergunta.",
  },
  {
    category: "Prazos e Orçamento",
    question: "Quanto tempo demora, em média, uma remodelação?",
    answer:
      "Depende da escala e da idade do imóvel — um apartamento de dimensão média sem surpresas estruturais fica, tipicamente, entre 8 a 12 semanas; projetos premium ou moradias alargam esse intervalo. O calendário exato só é comunicado depois do levantamento técnico, nunca antes — para ser um compromisso, não uma estimativa otimista.",
  },
  {
    category: "Prazos e Orçamento",
    question: "O que acontece se a obra ultrapassar o prazo acordado?",
    answer:
      "O prazo contratual inclui penalização — é um compromisso, não uma indicação. Detalhes específicos são discutidos e formalizados na proposta de cada projeto.",
  },
  {
    category: "Prazos e Orçamento",
    question: "Como é feito o orçamento?",
    answer:
      "Sempre a partir de um levantamento técnico real do espaço — nunca só com base em fotografias ou descrição. É este levantamento que permite um orçamento fiável, sem surpresas de custo a meio da obra por falta de informação inicial.",
  },
  {
    category: "Prazos e Orçamento",
    question: "É possível fazer alterações a meio da obra?",
    answer:
      "Sim, mas o impacto em prazo e custo é sempre comunicado antes de a alteração ser executada — nunca depois. É o gestor de projeto que avalia e apresenta essa informação ao cliente antes de qualquer decisão.",
  },
  {
    category: "Investidores",
    question: "A DS Projects trabalha com investidores que gerem a obra à distância?",
    answer:
      "Sim — é um cenário frequente. O reporte semanal estruturado foi pensado exatamente para substituir a presença física, com decisões orientadas a dados (durabilidade, potencial de arrendamento ou revenda) em vez de preferência pessoal.",
  },
  {
    category: "Investidores",
    question: "Conseguem gerir vários projetos em simultâneo para o mesmo cliente?",
    answer:
      "Sim, é uma situação habitual para clientes com mais do que um imóvel em carteira. Cada projeto mantém o seu próprio gestor e calendário, com reporte consolidado quando o cliente tem múltiplos projetos ativos.",
  },
  {
    category: "Garantia",
    question: "O que é entregue no final da obra?",
    answer:
      "Um dossier de garantia com o detalhe do que foi feito, os materiais aplicados e os contactos relevantes — além da vistoria final feita em conjunto com o cliente antes da entrega das chaves.",
  },
  {
    category: "Garantia",
    question: "As equipas técnicas são próprias ou subcontratadas?",
    answer:
      "A DS Projects trabalha com uma rede de especialidades técnicas de confiança, coordenada diretamente pelo gestor de projeto — a responsabilidade pelo resultado final é sempre da DS Projects, independentemente de qual equipa executa cada tarefa.",
  },
];

export function getFaqByCategory() {
  const categories = Array.from(new Set(faqItems.map((f) => f.category)));
  return categories.map((category) => ({
    category,
    items: faqItems.filter((f) => f.category === category),
  }));
}

/**
 * Seleciona as perguntas mais relevantes para um serviço a partir das
 * categorias definidas em `service.relatedFaqCategories` (site-data.ts) —
 * evita mostrar sempre o mesmo bloco fixo de perguntas em todas as páginas
 * de serviço (mau para SEO — conteúdo duplicado — e para o visitante).
 * Usada tanto no render (`ServiceDetail.tsx`) como no JSON-LD
 * (`servicos/[slug]/page.tsx`) — uma só fonte de verdade para os dois.
 */
export function getFaqForService(categories: FaqItem["category"][] | undefined, limit = 4): FaqItem[] {
  const cats = categories && categories.length > 0 ? categories : (["Processo", "Prazos e Orçamento"] as FaqItem["category"][]);
  return faqItems.filter((f) => cats.includes(f.category)).slice(0, limit);
}
