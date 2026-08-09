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
 */
const MAX_AMOUNT = 100_000_000;

export function parseMoney(raw: string, fieldLabel = "Valor"): number {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > MAX_AMOUNT) {
          throw new Error(`${fieldLabel} invalido.`);
    }
    return n;
}

export function parseOptionalMoney(raw: string | undefined, fieldLabel = "Valor"): number | undefined {
    if (!raw) return undefined;
    return parseMoney(raw, fieldLabel);
}
