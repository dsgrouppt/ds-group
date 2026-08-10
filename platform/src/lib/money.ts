/**
 * Bug #7 (auditoria de seguranca/dados, ago/2026): os campos monetarios
 * (Invoice.amount, Payment.amount, Deal.amount, Project.budgetAmount/
 * costAmount) eram convertidos com `Number(string)` sem qualquer validacao
 * no servidor -- a unica barreira era o atributo HTML `min="0"` do
 * <input>, trivialmente contornavel com um pedido direto a Server Action
 * (qualquer utilizador autenticado com acesso de edicao ao modulo podia
 * gravar valores negativos, NaN ou astronomicamente grandes). Isto
 * corrompia totais de faturacao e comparacoes como
 * `totalPaid >= invoice.amount`.
 *
 * `parseMoney` valida no servidor: numero finito, nao-negativo, com um
 * limite superior plausivel para uma obra de remodelacao.
 *
 * Bug #20 (auditoria adversarial independente, ago/2026): mesmo depois do
 * Bug #7, `parseMoney` devolvia o numero tal como escrito, sem arredondar
 * a centimos. Combinado com `amount: Float` no schema (IEEE-754 double,
 * tal como o `number` do JavaScript), isto produz erros de representacao
 * classicos de virgula flutuante: por exemplo, uma fatura de 1.74 paga em
 * tres prestacoes iguais de 0.58 soma matematicamente 1.74, mas em ponto
 * flutuante da 1.7399999999999998 -- e `totalPaid >= invoice.amount` em
 * registerPayment (financeiro/actions.ts) falha silenciosamente, deixando
 * uma fatura integralmente paga presa em "EMITIDA" para sempre. Nao e um
 * caso extremo: pagamentos faseados (sinal + reforcos + saldo) sao o fluxo
 * normal de uma obra de remodelacao. Corrigido arredondando sempre a 2
 * casas decimais na origem (aqui) e comparando em centimos (inteiros) em
 * vez de floats no ponto de decisao (registerPayment) -- ver nota la.
 */
const MAX_AMOUNT = 100_000_000;

export function parseMoney(raw: string, fieldLabel = "Valor"): number {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > MAX_AMOUNT) {
          throw new Error(`${fieldLabel} invalido.`);
    }
    return Math.round(n * 100) / 100;
}

/** Converte um valor monetario para centimos inteiros -- usado para comparar
 * totais sem sofrer erros de arredondamento de ponto flutuante (ver Bug #20). */
export function toCents(amount: number): number {
    return Math.round(amount * 100);
}

export function parseOptionalMoney(raw: string | undefined, fieldLabel = "Valor"): number | undefined {
    if (!raw) return undefined;
    return parseMoney(raw, fieldLabel);
}
