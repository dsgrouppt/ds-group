export interface LocalArea {
  slug: string;
  name: string;
  region: "Grande Lisboa" | "Grande Porto" | "Leiria e Região";
  intro: string;
  context: string[];
  profileNote: string;
}

/**
 * Estratégia Local SEO — ver docs/auditoria-concorrencia-seo.md, secção 6.
 * Uma página por concelho/zona de atuação prioritária, com conteúdo
 * genuinamente diferenciado (não é o mesmo texto com o nome trocado) —
 * cada página descreve o tipo de imóvel e desafio técnico típico dessa
 * zona. Evita o problema de "páginas finas" que penaliza SEO a prazo.
 */
export const localAreas: LocalArea[] = [
  {
    slug: "leiria",
    name: "Leiria",
    region: "Leiria e Região",
    intro:
      "Gestão de projeto e remodelação em Leiria — zona prioritária atual da DS Projects, do centro histórico junto ao Castelo aos bairros residenciais mais recentes.",
    context: [
      "O centro de Leiria combina edifícios de traça mais antiga na zona junto ao Castelo e ao rio Lis — com as mesmas condicionantes técnicas típicas de construção pré-1980 (redes elétricas e de água a atualizar, isolamento térmico insuficiente) — com zonas residenciais de construção mais recente nos bairros em expansão do concelho.",
      "Por ser a zona de maior concentração de obras da DS Projects, Leiria é onde a coordenação de equipas técnicas e subempreiteiros locais está mais consolidada, com prazos de resposta mais curtos entre o levantamento inicial e o arranque da obra.",
    ],
    profileNote:
      "Perfil de projeto mais comum em Leiria: remodelação residencial completa de apartamento ou moradia, com foco em atualização de instalações e eficiência energética.",
  },
  {
    slug: "lisboa",
    name: "Lisboa",
    region: "Grande Lisboa",
    intro:
      "Gestão de projeto e remodelação em Lisboa — do apartamento de traça antiga em Campo de Ourique ao piso alto em Alcântara.",
    context: [
      "O parque habitacional do centro de Lisboa é maioritariamente anterior a 1980, com uma percentagem relevante de edifícios anteriores a 1950 (Campo de Ourique, Estrela, Avenidas Novas, Alvalade). Isto significa redes elétricas e de água frequentemente desatualizadas, tetos em estuque a preservar e, em muitos casos, condicionantes de condomínio ou de fachada a respeitar.",
      "A DS Projects trabalha regularmente com estas condicionantes — desde o levantamento técnico inicial até à coordenação com administrações de condomínio, quando aplicável.",
    ],
    profileNote:
      "Perfil de projeto mais comum em Lisboa: remodelação completa de apartamento entre 80 e 200 m², com foco em modernização de instalações preservando o carácter do edifício.",
  },
  {
    slug: "porto",
    name: "Porto",
    region: "Grande Porto",
    intro:
      "Gestão de projeto e remodelação no Porto — de prédios de granito no centro histórico a apartamentos contemporâneos na Boavista.",
    context: [
      "O centro do Porto combina edifícios de fachada protegida (onde a intervenção exterior está condicionada por regras camarárias) com construção mais recente na zona da Boavista e Foz. Cada um destes contextos exige uma abordagem técnica diferente, sobretudo ao nível de isolamento térmico e acústico.",
      "A equipa da DS Projects avalia estas condicionantes no levantamento inicial, antes de qualquer estimativa de calendário ser apresentada ao cliente.",
    ],
    profileNote:
      "Perfil de projeto mais comum no Porto: remodelação de apartamento em prédio de traça antiga com atualização térmica e acústica, e projetos de moradia na zona da Foz e Foz Velha.",
  },
  {
    slug: "cascais",
    name: "Cascais",
    region: "Grande Lisboa",
    intro:
      "Remodelação premium em Cascais — moradias e apartamentos junto à linha, muitas vezes segunda habitação ou investimento.",
    context: [
      "Cascais concentra uma procura elevada por remodelações de padrão premium, frequentemente ligadas a segunda habitação, arrendamento sazonal de curta duração ou preparação de imóvel para revenda. A proximidade ao mar traz também um fator técnico específico: maior exposição a humidade e corrosão em materiais exteriores e caixilharia.",
      "É por isso que os projetos em Cascais entram, por regra, na categoria de Remodelação Premium — com curadoria de materiais resistentes ao ambiente costeiro.",
    ],
    profileNote:
      "Perfil de projeto mais comum em Cascais: moradias e apartamentos de padrão alto, muitas vezes com o cliente a residir fora de Portugal durante a obra — o reporte semanal estruturado da DS Projects foi pensado exatamente para este cenário.",
  },
  {
    slug: "oeiras",
    name: "Oeiras",
    region: "Grande Lisboa",
    intro:
      "Remodelação em Oeiras — de apartamentos familiares em Algés e Linda-a-Velha a moradias em Porto Salvo e Carnaxide.",
    context: [
      "Oeiras tem um perfil habitacional misto — prédios dos anos 70/80 no eixo Algés–Linda-a-Velha e moradias mais recentes nas zonas altas do concelho. A maioria dos projetos aqui é família que continua a residir na zona durante grande parte da obra, o que reforça a importância de faseamento e minimização de incómodo.",
    ],
    profileNote:
      "Perfil de projeto mais comum em Oeiras: remodelação familiar completa, com faseamento pensado para reduzir o impacto no dia a dia de quem continua a habitar o imóvel.",
  },
  {
    slug: "sintra",
    name: "Sintra",
    region: "Grande Lisboa",
    intro:
      "Remodelação de moradias e casas de campo em Sintra — projetos de maior escala, muitas vezes com terreno e exteriores associados.",
    context: [
      "A tipologia dominante em Sintra é a moradia, frequentemente com terreno, o que introduz variáveis adicionais de coordenação — acessos de obra, exteriores, impermeabilizações e, nalguns casos, condicionantes de zona de proteção patrimonial (Sintra-Vila, Colares).",
    ],
    profileNote:
      "Perfil de projeto mais comum em Sintra: remodelação de moradia de média a grande escala, coberta pelo serviço de Moradias da DS Projects.",
  },
  {
    slug: "vila-nova-de-gaia",
    name: "Vila Nova de Gaia",
    region: "Grande Porto",
    intro:
      "Remodelação em Vila Nova de Gaia — apartamentos com vista sobre o Douro e moradias nas zonas altas do concelho.",
    context: [
      "Gaia combina zonas de forte procura turística (Cais de Gaia, Arrábida) com bairros residenciais mais tradicionais. Nos imóveis próximos ao rio, os projetos incluem frequentemente rentabilização por arrendamento de curta duração — o que exige acabamentos mais resistentes ao uso intensivo.",
    ],
    profileNote:
      "Perfil de projeto mais comum em Gaia: apartamentos vocacionados para arrendamento de curta duração, com foco em durabilidade dos acabamentos.",
  },
  {
    slug: "matosinhos",
    name: "Matosinhos",
    region: "Grande Porto",
    intro:
      "Remodelação em Matosinhos — do centro histórico junto ao porto de pesca à Foz do Douro e Leça da Palmeira.",
    context: [
      "Matosinhos tem, à semelhança de Cascais, um fator técnico ligado à proximidade ao mar — corrosão de caixilharia e ferragens, humidade em fachadas viradas a poente. É também uma zona com procura crescente de espaços comerciais (restauração) em remodelação.",
    ],
    profileNote:
      "Perfil de projeto mais comum em Matosinhos: apartamentos residenciais junto à orla e espaços comerciais de restauração, cobertos pelos serviços Residencial e Espaços Comerciais.",
  },
  {
    slug: "almada",
    name: "Almada",
    region: "Grande Lisboa",
    intro:
      "Remodelação na Margem Sul — Almada, Costa da Caparica e Trafaria, com vista sobre o Tejo e Lisboa.",
    context: [
      "A Margem Sul tem vindo a atrair investidores e famílias que procuram mais espaço pelo mesmo orçamento face ao centro de Lisboa. Os prédios da década de 80/90 são o parque habitacional dominante, com boa margem de valorização através de remodelação bem planeada.",
    ],
    profileNote:
      "Perfil de projeto mais comum em Almada: remodelação de apartamento com objetivo de valorização — residencial próprio ou investimento.",
  },
];

export function getLocalAreaBySlug(slug: string): LocalArea | undefined {
  return localAreas.find((a) => a.slug === slug);
}
