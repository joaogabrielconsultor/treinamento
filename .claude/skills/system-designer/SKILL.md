---
name: system-designer
description: Padrão visual e regras de trabalho do GS CRED (este projeto). Use SEMPRE antes de criar, redesenhar ou ajustar qualquer tela, componente, tabela, formulário, modal, cor, fonte ou animação em src/ — mesmo em ajustes pequenos — para manter tudo no mesmo sistema visual e não quebrar lógica de negócio.
---

# GS CRED — designer de produto + frontend

Você trabalha como designer de produto e dev frontend deste sistema: uma plataforma de
crédito consignado (propostas, produção/ranking, simulador, conta corrente, treinamentos,
admin multi-tenant). Usuários: corretores e gestores que olham números o dia todo.
Prioridade: leitura rápida de valores, densidade confortável, zero enfeite que atrapalhe.

Para direção estética geral use também a skill `frontend-design`. Esta skill manda
quando as duas divergirem: o sistema visual abaixo já está decidido.

## Regras que nunca quebram

1. **Só visual.** Não mude lógica de negócio, chamadas de API, cálculos nem o backend
   (`api/`). `src/lib/` é intocável — em especial `src/lib/futuro.ts`.
   Confira no fim: `git diff --stat -- src/lib api` deve vir vazio.
2. **Propostas nunca são excluídas, só editadas.** Usuários são **arquivados**, nunca
   excluídos. Não crie botão de excluir para esses dois.
3. **Não troque dados reais por fictícios.** Para testar sem banco, use uma API falsa
   fora do repositório (scratchpad), nunca dados fixos no código.
4. Não apague funcionalidade para simplificar a tela.
5. `PlanosPage.tsx` (landing de vendas) e `PropostaPDF.tsx` têm identidade própria
   (Anton / Space Mono): não aplique o sistema neles sem pedido explícito.
6. Trabalhe em branch própria. Commit só do que você mudou. Push/merge na `main` só
   quando o usuário pedir (o repositório é da conta `joaogabrielconsultor`).

## Sistema visual (fonte da verdade: `src/index.css` e `tailwind.config.js`)

**Tema:** escuro fixo. Grafite em camadas + volt `#C6FF00` usado com parcimônia —
só na ação primária, no item ativo e no número que mais importa da tela.
Nunca volt em fundo grande, texto corrido ou decoração.

**Camadas (fundo → frente):** `--bg-deep` (sidebar) → `--bg-base` (página) →
`--bg-card` (cartões/tabelas) → `--bg-surface` (inputs, chips dentro de cartões).
Hierarquia vem das camadas e das bordas (`--border-1`, `--border-2`), não de sombra/brilho.

**Texto:** `--text-1` principal, `--text-2` secundário, `--text-3` rótulos, `--text-4` desabilitado.
No Tailwind: `text-ink-1..4`, `border-line`, `border-line-strong`, `bg-surface-*`.

**Semântica:** `--pos` (pago/positivo), `--neg` (cancelado/negativo), `--warn`
(análise/pendente), `--info`. Fundos suaves: `--pos-soft` etc. Não invente cores novas.

**Tipografia:** Geist (UI, algarismos tabulares) e Geist Mono (códigos, CPF, nº de contrato).
Títulos em sentence case, peso 600 — nada de CAIXA ALTA, `//` ou fonte display.
Rótulos: `text-xs font-medium text-ink-3`.

**Forma:** raios `--r-sm 6` / `--r-md 9` / `--r-lg 12` / `--r-xl 16`.

## Classes prontas — use antes de escrever estilo inline

| Para | Classe |
|---|---|
| Página | `page` (ou `page-narrow`), `page-header`, `page-title`, `page-subtitle` |
| Seções | `section-title`, `eyebrow` |
| Cartões | `card`, `card-pad`, `card-header`, `card-interactive` |
| Botões | `btn` + `btn-primary` / `btn-secondary`, `btn-sm`, `btn-icon` |
| Formulário | `field-label`, `field-hint`, `input-cyber` |
| Tabelas | `data-table`; números: `th-num` / `td-num` (alinha à direita) |
| Indicadores | `kpi-strip` > `kpi-cell` (`kpi-cell-primary` p/ o principal), `kpi-label`, `kpi-value` |
| Filtro segmentado | `seg` |
| Vazio | `empty-state` (ícone + frase + ação) |
| Navegação | `sidebar`, `nav-item`, `nav-active`, `nav-group-label` |
| Status | `badge-*` |

Componentes em `src/components/ui/`: `Modal`, `ConfirmDialog`, `Toast`, `Pagination`.
Reaproveite-os; não crie outro modal/toast.

Classes legadas (`btn-cyber`, `glass-card`, `stat-card`, `table-row-cyber`…) continuam
funcionando com o visual novo; ao mexer numa tela, prefira migrar para as classes novas.

## Tabelas financeiras

- Valores, comissão, pontos e percentuais: `th-num`/`td-num`, algarismos tabulares, à direita.
- Texto, datas e status: à esquerda.
- Moeda sempre `R$ 1.234,56` (formatadores existentes — não reescreva).
- Cabeçalho gerado por lista (`['Valor', ...].map(h => <th>)`): marque a tabela com `data-num="5 6"` (posições, contando de 1) em vez de mexer em cada célula.
- Cabeçalho fixo já vem do `data-table`. Linha selecionada: `var(--accent-soft)`.
- Toda tabela/lista precisa de estado vazio e de carregamento.

## Movimento

- Tokens: `--ease-out`, `--dur-1` 120ms (hover), `--dur-2` 200ms (clique), `--dur-3` 320ms (entrada).
- Anime só `opacity` e `transform`. Nada de animar largura/altura/padding (exceto barra de progresso).
- Sem cascata com `animationDelay`; sem animação infinita decorativa (pulse, float, glow).
- Animações de entrada com `fill-mode: backwards`, nunca `both`/`forwards` em quem
  contém modal `position: fixed` (o transform que sobra desalinha o modal).
- A troca de tela já anima em `App.tsx` (`.view-enter`); não anime a página de novo.
- Respeite `prefers-reduced-motion` (já tratado no CSS global).

## Responsivo

- Sidebar vira gaveta abaixo de `lg` (estado `navOpen` em `App.tsx`).
- Tabelas largas: contêiner com `overflow-x-auto`, nunca espremer colunas.
- Cabeçalho de página e grupos de ação com `flex-wrap`. Teste em 375px e 1440px.

## Processo

1. Leia a tela e o que ela chama (props, API, estados) antes de editar.
2. Planeje: o que é o número/ação principal da tela? Ele recebe o destaque; o resto recua.
3. Implemente com as classes acima; estilo inline só para valor dinâmico.
4. Verifique:
   - `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit` — sem erros novos
     (existem 14 antigos; não aumente esse número).
   - `node node_modules/vite/bin/vite.js build` passa.
   - Abra no navegador (preview `edutrain-frontend`, porta 5173): desktop e celular,
     estado vazio, carregando e com dados; console sem erros.
   - `git diff --stat -- src/lib api` vazio.
5. Só diga que terminou depois de verificar. Resuma em português: telas mexidas,
   o que mudou, o que foi testado e o que ficou pendente.

## Pendências conhecidas do redesign

- Nenhuma grande. Telas ainda com cores fixas (hex) soltas podem ser migradas para os tokens quando forem tocadas.
