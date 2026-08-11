# Playbook de Utilização do DS OS

*Guia prático, ecrã a ecrã, para quem usa o DS OS no dia a dia. Para os processos de negócio por trás de cada módulo (quando fazer o quê), ver `manual-operacional.md` — este documento é só "como fazer, no software". Para arquitetura técnica, ver `plataforma-arquitetura.md` e `DS_OS_MASTER_HANDOVER_PART1-3.md`.*

## 1. Acesso

- Entrar em `/login` com email e password da conta de equipa.
- O que cada pessoa vê depende do seu perfil (role) — a barra lateral mostra só os módulos a que tens acesso. Perfis existentes: Administrador, Direção, Comercial, Gestor de Projeto, Financeiro, Recursos Humanos, Marketing.
- Sessão dura até 8h; sai automaticamente por segurança.
- Esqueceste a password? Só um Administrador pode repor — não há (ainda) recuperação automática por email (ver `integracoes-estado.md`, "Email transacional").

## 2. Dashboard

Ecrã inicial — visão geral do que está a acontecer: obras ativas, tarefas pendentes, indicadores comerciais. Ponto de partida do dia, não tem ações próprias.

## 3. CRM

Gestão comercial — contactos (leads) e negócios (deals) em pipeline. Um negócio fechado ("Ganho") gera automaticamente uma Obra em `Obras` — não é preciso criar a obra manualmente à parte.

## 4. Obras

Pipeline de projeto, do handover pós-venda à garantia ativa. Cada obra tem fases (`stage`), orçamento vs. custo real, tarefas, eventos de agenda, anexos e mensagens do cliente. **Nota**: isto é a gestão interna e operacional da obra (dados financeiros, cliente, equipa) — é um registo diferente da "ficha pública" da obra no portefólio do site (ver secção 9). Uma obra pode ligar-se opcionalmente à sua ficha pública, mas nunca partilha dados sensíveis com ela.

## 5. Clientes

Ficha de cada cliente — dados de contacto, obras associadas, mensagens, documentos partilháveis com o Portal do Cliente (ver secção 11).

## 6. Tarefas

Lista de tarefas atribuídas, com prazo e responsável — pode estar ligada a uma obra específica ou ser avulsa.

## 7. Financeiro

Faturação e pagamentos por obra/cliente — acesso restrito (Administrador, Direção, Financeiro).

## 8. Agenda

Calendário de eventos — visitas técnicas, reuniões, marcos de obra.

## 9. Marketing → Site — Portefólio (módulo novo)

É aqui que se gere o conteúdo público do website sem tocar em código. Caminho na barra lateral: **Marketing → Site — Portefólio**.

**Criar uma obra nova:**
1. Preencher o formulário "Nova obra" — slug (parte do URL, ex.: `remodelacao-cascais-01`), título, categoria, localização, resumo. Fica sempre como **Rascunho**.
2. Abrir a obra criada (clicar no título na listagem) para preencher a narrativa completa: Desafio, Planeamento, Execução, Solução, Resultado — não é preciso preencher tudo de uma vez, pode voltar-se mais tarde.
3. Na mesma página, secção "Fotos e vídeos": adicionar cada fotografia (caminho do ficheiro + texto alternativo obrigatório) ou vídeo (link de embed), marcando o papel (Capa / Galeria / Vídeo do processo) e, quando aplicável, a fase (Antes/Durante/Depois).
4. Quando a obra estiver pronta, voltar à listagem e clicar **Publicar**.

**Publicar no website (passo final, fora do DS OS):**
5. Na listagem, botão **"Exportar conteúdo publicado"** — descarrega um ficheiro.
6. No computador onde está o repositório do website, correr `node scripts/import-cms-export.mjs <ficheiro descarregado>`.
7. Rever o que mudou (`git diff content/`) e fazer commit + push — o site atualiza no deploy seguinte.

Detalhe completo do porquê deste fluxo (e não uma publicação automática) em `website-cms-integracao.md`.

**Testemunhos** (Marketing → Site — Portefólio → "Gerir testemunhos"):
1. Registar o testemunho (tipo texto ou vídeo, nome, citação/link, obra relacionada opcional). Fica sempre **"Por autorizar"**.
2. Só depois de confirmares com o cliente que autoriza a publicação, clicar **Autorizar** — é um passo separado e deliberado, nunca automático.
3. Testemunhos autorizados entram na próxima exportação (passo 5-7 acima).

## 10. Recursos Humanos

Ficha de colaboradores — dados administrativos, associação a obras.

## 11. Portal do Cliente (acesso separado, `/portal/login`)

Não é um módulo da barra lateral — é uma área de acesso distinta, para os clientes (não para a equipa), com login próprio. O cliente vê aí o progresso da sua obra, documentos, mensagens. Ainda não está publicamente acessível — depende de base de dados e hosting de produção (ver `checklist-lancamento-v1.md`).

## 12. Definições

Gestão de utilizadores da equipa (criar conta, atribuir perfil/role, desativar acesso) — restrito a Administrador/Direção.

## 13. Regras que se aplicam a todos os módulos

- Cada ação de escrita (criar, editar, publicar, eliminar) fica registada — nada desaparece silenciosamente.
- O que vês na barra lateral é sempre exatamente o que o teu perfil autoriza — não há módulos "escondidos mas acessíveis por URL direto".
