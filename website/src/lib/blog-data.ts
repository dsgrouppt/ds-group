export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  publishedAt: string; // ISO date
  body: { heading?: string; paragraphs: string[]; list?: string[] }[];
}

/**
 * Conteúdo de blog — intenção de topo/meio de funil, alinhado com
 * docs/auditoria-concorrencia-seo.md secção 6 ("captar pesquisas
 * informacionais com qualidade de resposta"). Regras de marca aplicadas:
 * nunca lidera com preço, nunca diz "fazemos tudo", tom direto e técnico.
 */
export const blogPosts: BlogPost[] = [
  {
    slug: "quanto-tempo-demora-uma-remodelacao",
    title: "Quanto tempo demora uma remodelação? Um guia realista por tipo de projeto",
    excerpt:
      "Prazos genéricos de \"6 a 8 semanas\" raramente sobrevivem ao contacto com a realidade. Como calcular um calendário credível antes de começar.",
    category: "Planeamento",
    readTime: "6 min",
    publishedAt: "2026-02-10",
    body: [
      {
        paragraphs: [
          "É a primeira pergunta em quase todas as conversas iniciais: quanto tempo vai demorar? A resposta honesta é 'depende', mas depende de fatores concretos e mensuráveis — não de sorte.",
        ],
      },
      {
        heading: "Os quatro fatores que determinam o prazo",
        paragraphs: [
          "Escala do imóvel é o mais óbvio, mas não o único. A idade do edifício pesa tanto ou mais: um apartamento anterior a 1960 quase sempre esconde surpresas em canalização e eletricidade que só aparecem depois da demolição. Terceiro fator: o número de especialidades técnicas envolvidas em simultâneo (elétrica, canalização, AVAC, carpintaria) — quanto mais dependências entre equipas, maior o risco de atraso em cascata se uma falhar. Quarto: a disponibilidade de materiais, sobretudo se houver peças por encomenda ou importadas.",
        ],
      },
      {
        heading: "Uma referência realista, não uma promessa",
        paragraphs: [
          "Para um apartamento de tamanho médio, um calendário de 8 a 12 semanas é uma referência razoável quando não há surpresas estruturais graves. Para uma moradia ou um projeto premium com curadoria de materiais, o intervalo alarga — e deve alargar, porque o objetivo não é a promessa mais curta, é a promessa que se cumpre.",
          "É exatamente por isto que o método da DS Projects começa sempre por um levantamento técnico completo antes de qualquer data ser comunicada ao cliente — um calendário só é útil se for cumprido.",
        ],
      },
      {
        heading: "O que perguntar a qualquer empresa antes de fechar",
        paragraphs: ["Três perguntas separam uma proposta séria de uma otimista:"],
        list: [
          "O calendário inclui contingência para imprevistos estruturais, ou é o cenário mais otimista possível?",
          "Existe penalização contratual por atraso, ou o prazo é apenas indicativo?",
          "Vou receber reporte de progresso regular, ou só saberei se há atraso quando a obra já estiver parada?",
        ],
      },
    ],
  },
  {
    slug: "o-que-significa-remodelacao-chave-na-mao",
    title: "O que significa \"remodelação chave na mão\" — e quando vale a pena",
    excerpt:
      "O termo aparece em quase todos os sites do setor, mas nem sempre quer dizer a mesma coisa. Como identificar um serviço chave na mão real.",
    category: "Processo",
    readTime: "5 min",
    publishedAt: "2026-02-24",
    body: [
      {
        paragraphs: [
          "\"Chave na mão\" é provavelmente a expressão mais usada — e mais vaga — do setor da remodelação em Portugal. Na teoria, significa que o cliente entrega as chaves no início e recebe o projeto pronto a habitar no fim, sem gerir nada pelo meio. Na prática, a experiência varia muito entre empresas.",
        ],
      },
      {
        heading: "O que um serviço chave na mão deveria incluir",
        paragraphs: ["Um serviço genuinamente chave na mão remove do cliente, e não apenas em teoria, as seguintes responsabilidades:"],
        list: [
          "Contratação e coordenação de todas as especialidades técnicas (eletricista, canalizador, pedreiro, carpinteiro)",
          "Gestão de licenciamentos ou comunicações prévias quando aplicável",
          "Aquisição e receção de materiais",
          "Resolução de imprevistos técnicos sem exigir decisões constantes do cliente",
          "Um único ponto de contacto responsável pelo resultado final",
        ],
      },
      {
        heading: "O sinal de alerta mais comum",
        paragraphs: [
          "Se, depois de assinar, o cliente continua a receber contactos diretos de vários subempreiteiros a pedir decisões ou pagamentos em separado, o serviço não é chave na mão — é uma gestão de obra distribuída pelo cliente, apenas com um nome de marca por cima.",
          "Na DS Projects, cada projeto tem um único gestor responsável por toda a coordenação técnica e por manter o cliente informado — não o inverso.",
        ],
      },
    ],
  },
  {
    slug: "como-escolher-empresa-de-remodelacao",
    title: "Como escolher uma empresa de remodelação: 7 perguntas antes de assinar",
    excerpt:
      "Antes de comparar preços, compare processo. Estas são as perguntas que revelam se uma empresa tem, de facto, um método.",
    category: "Decisão",
    readTime: "7 min",
    publishedAt: "2026-03-09",
    body: [
      {
        paragraphs: [
          "A maior parte das pessoas compara empresas de remodelação pelo valor do orçamento. É um erro compreensível, mas é o critério errado a usar primeiro — o preço mais baixo raramente é o custo final mais baixo, quando se somam atrasos, retrabalho e stress de gestão.",
        ],
      },
      {
        heading: "As 7 perguntas",
        paragraphs: [],
        list: [
          "Quem é o meu ponto de contacto único durante a obra, e com que frequência vou ter reporte de progresso?",
          "O que acontece, contratualmente, se o prazo não for cumprido?",
          "A equipa técnica é própria ou subcontratada projeto a projeto?",
          "Existe um levantamento técnico prévio, ou o orçamento é feito só com base em fotos e descrição?",
          "Como é gerida uma alteração pedida a meio da obra — em termos de prazo e custo?",
          "Existe um dossier de garantia entregue no final, com o que foi feito e os materiais usados?",
          "Consigo falar com um cliente anterior com um projeto de escala semelhante ao meu?",
        ],
      },
      {
        heading: "Porque isto importa mais do que o preço",
        paragraphs: [
          "Um orçamento sem estas respostas claras é, na prática, uma estimativa — não um compromisso. A diferença entre as duas coisas só se sente a meio da obra, quando já é tarde para mudar de fornecedor sem custo adicional.",
        ],
      },
    ],
  },
  {
    slug: "remodelar-para-investimento-o-que-avaliar",
    title: "Remodelar para investimento: o que muda quando o objetivo é rentabilizar, não habitar",
    excerpt:
      "Um investidor imobiliário tem critérios diferentes de um proprietário. Como pensar uma remodelação orientada a retorno.",
    category: "Investimento",
    readTime: "6 min",
    publishedAt: "2026-03-23",
    body: [
      {
        paragraphs: [
          "Quando o objetivo de uma remodelação é arrendar ou revender, e não habitar, os critérios de decisão mudam — e uma empresa que só está habituada a projetos residenciais para uso próprio nem sempre se adapta bem a essa mudança de prioridades.",
        ],
      },
      {
        heading: "Três diferenças práticas",
        paragraphs: [],
        list: [
          "Durabilidade acima de personalização — acabamentos pensados para resistir à rotatividade de inquilinos, não ao gosto pessoal de quem vai morar lá.",
          "Calendário ligado a rendimento perdido — cada semana de atraso é, literalmente, renda não recebida ou juro de financiamento a correr sem retorno.",
          "Decisões orientadas a dados de mercado — que tipologia, que acabamento e que layout maximizam o valor de arrendamento ou de revenda na zona específica do imóvel, não necessariamente o que o investidor pessoalmente prefere.",
        ],
      },
      {
        heading: "Onde isto se cruza com a gestão de obra",
        paragraphs: [
          "Um investidor com vários imóveis em simultâneo, ou a gerir a obra à distância, tem uma necessidade adicional: reporte estruturado que substitua a presença física. É por isto que projetos de investimento entram, na DS Projects, com o mesmo nível de rigor de reporte semanal usado em qualquer outro projeto — só que orientado a decisões de retorno, não de gosto pessoal.",
        ],
      },
    ],
  },
  {
    slug: "erros-comuns-remodelacao-cozinha",
    title: "5 erros comuns em remodelações de cozinha (e como evitá-los)",
    excerpt:
      "A cozinha é o espaço mais técnico de uma casa. Estes são os erros que mais frequentemente obrigam a retrabalho.",
    category: "Cozinhas",
    readTime: "5 min",
    publishedAt: "2026-04-06",
    body: [
      {
        paragraphs: [
          "A cozinha cruza mais especialidades técnicas do que qualquer outro espaço da casa — canalização, eletricidade, ventilação e mobiliário à medida, tudo num único compartimento. É também, por isso, o espaço onde os erros de planeamento são mais caros de corrigir depois de a obra avançar.",
        ],
      },
      {
        heading: "Os 5 erros",
        paragraphs: [],
        list: [
          "Escolher os eletrodomésticos depois do mobiliário estar desenhado, em vez de antes — obriga a ajustes de última hora nas medidas do móvel.",
          "Subestimar a ventilação — uma exaustão mal dimensionada é irreversível sem obra nova depois de os acabamentos estarem prontos.",
          "Não prever pontos elétricos suficientes desde o início — mudar isto depois dos acabamentos é sempre mais caro do que prever no projeto.",
          "Ignorar o fluxo de trabalho (triângulo entre lava-loiça, fogão e frigorífico) em nome apenas da estética.",
          "Escolher bancada e revestimentos sem testar amostra física em casa, sob a luz real do espaço — a cor muda significativamente entre o showroom e a cozinha.",
        ],
      },
    ],
  },
  {
    slug: "checklist-antes-de-remodelar-casa-de-banho",
    title: "Checklist antes de remodelar uma casa de banho",
    excerpt:
      "Impermeabilização mal feita é o erro mais caro de corrigir depois de a obra terminar. O que verificar antes de avançar.",
    category: "Casas de Banho",
    readTime: "4 min",
    publishedAt: "2026-04-20",
    body: [
      {
        paragraphs: [
          "Uma casa de banho tem uma particularidade que a distingue de qualquer outro espaço da casa: um erro técnico só se torna visível meses depois, quando a humidade já danificou o que está por trás do revestimento. Por isso, a fase técnica tem de estar garantida antes de qualquer decisão estética.",
        ],
      },
      {
        heading: "Checklist técnico",
        paragraphs: [],
        list: [
          "A impermeabilização é certificada e aplicada por profissional qualificado, com tempos de cura respeitados?",
          "A rede de água é avaliada e, se necessário, substituída — não apenas 'tapada' por trás do novo revestimento?",
          "A ventilação (natural ou mecânica) é suficiente para o novo layout?",
          "Os declives de escoamento estão corretos antes do revestimento final ser aplicado?",
        ],
      },
      {
        heading: "Só depois: a parte estética",
        paragraphs: [
          "Só quando estes quatro pontos estão garantidos é que faz sentido escolher revestimentos, loiças e iluminação. Inverter esta ordem — decidir a estética antes da parte técnica estar validada — é a causa mais comum de casas de banho que voltam a dar problemas dentro de 2 a 3 anos.",
        ],
      },
    ],
  },
];

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}
