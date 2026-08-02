# DS PROJECTS — ARQUITETURA DO WEBSITE

*Website institucional da empresa operacional, sob domínio da estrutura DS Group. Versão 1.0.*

---

## 1. Mapa do Site

```
Home
├── A Empresa
│   ├── Quem Somos
│   ├── Método DS (como gerimos um projeto)
│   ├── DS Group (a estrutura por trás da DS Projects)
│   └── Sustentabilidade / Compromisso de Qualidade
├── Serviços
│   ├── Remodelação Completa de Habitação
│   ├── Gestão de Projeto para Investidores
│   ├── Renovação de Espaços Comerciais
│   └── Acompanhamento Técnico para Arquitetos
├── Projetos (Portfólio)
│   ├── Grelha de Projetos (filtro por tipo/localização)
│   └── Página Individual de Projeto (antes/depois, cronologia, testemunho)
├── Método
│   ├── As 5 Fases do Processo
│   └── Perguntas Frequentes
├── Sobre a Equipa
├── Contacto / Pedido de Estudo de Viabilidade
├── Blog / Recursos (para SEO)
└── Área do Cliente (login — clientes com obra em curso acompanham o progresso)
```

## 2. Estrutura de Páginas (Página a Página)

### Home
1. Hero: frase de posicionamento + CTA único ("Pedir Estudo de Viabilidade"), sem carrossel de imagens genéricas.
2. Bloco de credibilidade: número de projetos entregues, anos de experiência, garantia de prazo.
3. As 3 fases resumidas do método (link para página Método completa).
4. Projeto em destaque (case study com antes/depois).
5. Testemunho em vídeo ou citação de cliente.
6. Bloco "Para quem gere investimento" (segmenta o público investidor sem dedicar página própria na navegação principal).
7. CTA final + formulário curto.

### Serviços (página-mãe + 4 subpáginas)
Cada subpágina segue a mesma estrutura: promessa central → o que está incluído (em linguagem de resultado, não de tarefas) → processo resumido → projetos relacionados → CTA.

### Projetos
Grelha com filtro por tipologia (habitação / comercial / investimento) e localização. Cada projeto individual mostra: situação inicial, objetivo do cliente, prazo acordado vs. prazo real, orçamento acordado vs. final, galeria antes/depois, testemunho.

### Método
Página central de conversão para clientes que já pesquisaram concorrência. Explica as 5 fases (ver Manual Operacional) em linguagem simples, com ênfase em pontos de reporte ao cliente — este é o principal argumento de venda contra a concorrência fragmentada.

### Contacto
Formulário curto (nome, contacto, tipo de projeto, orçamento estimado em faixas, prazo desejado) — nunca pedir descrição livre longa como primeiro campo, reduz taxa de conclusão. Opção de agendar chamada diretamente (Calendly ou equivalente).

### Área do Cliente
Login simples ligado ao CRM (ver Tarefa 7) onde o cliente em obra vê: fase atual, próximos marcos, documentos e faturas, canal de mensagem direta com o gestor de projeto. Esta página é, por si, uma vantagem competitiva forte — nenhum concorrente do setor a oferece.

## 3. Call to Actions

CTA único e consistente em todo o site: **"Pedir Estudo de Viabilidade"** (não "orçamento grátis" — reforça posicionamento premium e consultivo).

CTAs secundários por contexto:
- Blog/recursos → "Falar com um gestor de projeto"
- Página de projeto individual → "Quero um projeto assim"
- Página de investidores → "Agendar chamada de avaliação de portfólio"

Regra: nunca mais de um CTA principal por dobra de ecrã. Botão sempre em preto/branco com contraste alto — nunca dourado (o dourado é reservado a detalhe de marca, não a elementos funcionais/clicáveis, para não perder hierarquia visual).

## 4. SEO

**Estrutura de palavras-chave por intenção:**

| Intenção | Exemplos de keywords | Página alvo |
|---|---|---|
| Transacional local | "remodelação de apartamentos Lisboa", "empresa de remodelações Porto" | Home / Serviços |
| Transacional específica | "remodelação chave na mão", "gestão de obra investidores" | Subpáginas de serviço |
| Informacional (topo de funil) | "quanto custa remodelar uma casa em Portugal", "como escolher empresa de remodelação" | Blog |
| Branded (fase de maturidade) | "DS Projects", "DS Group remodelações" | Home |

**Ações técnicas de SEO:**
- Schema markup de LocalBusiness + Project/CreativeWork em páginas de portfólio.
- Google Business Profile ligado com reviews reais, geridos ativamente (ver Tarefa 8).
- Velocidade de carregamento como prioridade de marca — um site premium lento contradiz o posicionamento.
- Blog com cadência mínima de 2 artigos/mês nos primeiros 12 meses, focado em keywords informacionais de topo de funil (tabela de conteúdos cruzada com o plano de 12 meses da Tarefa 8).
- Backlinks prioritários: diretórios de arquitetura/design, parcerias com gabinetes de arquitetos (reforça também o público terciário do Brand Book).

## 5. Estrutura de Conversão

Funil de três camadas, desenhado para nunca pedir compromisso antes de entregar valor:

1. **Descoberta** (SEO orgânico, redes sociais, referência) → aterra em página de serviço ou projeto específico.
2. **Consideração** → visita página Método + página de Projetos → ganha confiança pela transparência do processo, não por promessas.
3. **Conversão** → formulário de Estudo de Viabilidade (baixo compromisso, sem "pedido de orçamento" que soe a transação imediata) → chamada de descoberta com gestor comercial (ver Tarefa 6, Sistema Comercial).

Elementos de conversão presentes em todas as páginas de serviço: prova social específica daquele serviço, CTA único, resposta implícita à objeção mais comum daquele segmento (prazo para investidores, confiança para famílias, fidelidade ao projeto original para arquitetos).

## 6. Fluxo do Utilizador

```
Entrada (orgânico / anúncio / referência)
   ↓
Página de destino relevante (serviço específico ou projeto)
   ↓
Exploração de prova social (Projetos / Testemunhos)
   ↓
Página Método (reduz objeção de confiança)
   ↓
Formulário "Estudo de Viabilidade" (baixo atrito)
   ↓
Confirmação + agendamento automático de chamada
   ↓
[Passa para o Sistema Comercial — Tarefa 6]
   ↓
Cliente fechado → acesso à Área do Cliente (acompanhamento da obra)
   ↓
Pós-obra → pedido de testemunho + entrada no funil de referência
```

Este fluxo garante que o website nunca vende diretamente — qualifica e aquece o lead antes de o entregar à equipa comercial, coerente com o posicionamento consultivo da marca.

---

*Próximo documento: 05_Manual_Operacional.md*
