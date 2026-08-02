# Brand — DS Group / DS Projects

Identidade de marca do grupo. Ver o Brand Book completo antes de criar
qualquer peça nova de comunicação, interna ou externa.

| Ficheiro | Conteúdo |
|---|---|
| [`brand-book.md`](./brand-book.md) | ADN, missão, valores, posicionamento, paleta, tipografia, regras de aplicação |
| [`logo-concepts.md`](./logo-concepts.md) | 20 conceitos estratégicos de logótipo + recomendação final |
| [`ds-projects-identity.md`](./ds-projects-identity.md) | Identidade específica da DS Projects (primeira empresa operacional) |
| [`design-tokens.json`](./design-tokens.json) | Cor, tipografia, espaçamento e movimento em formato consumível por código — espelha `website/tailwind.config.ts` |
| [`logo/`](./logo) | Ativos de logótipo. Contém apenas uma marca provisória (favicon) até o logótipo final ser produzido a partir do conceito recomendado em `logo-concepts.md` |

## Regra de sincronização

`design-tokens.json` é a fonte de verdade para cor e tipografia. Se a marca
mudar, atualizar primeiro este ficheiro e só depois propagar a alteração a
`website/tailwind.config.ts` e `website/src/app/globals.css`. Nunca o
inverso — evita que o código e a documentação de marca divirjam.
