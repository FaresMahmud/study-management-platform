# Histórico de Mudanças — Study Management Platform

Registro organizado de todas as alterações feitas no projeto desde a configuração inicial.
Cada seção descreve o que foi alterado, os arquivos afetados e o motivo da mudança.

---

## Sessão 1 — Configuração inicial e Docker

### 1.1 Configuração do Docker Compose
- **O que foi feito:** Ajuste das configurações do Docker Compose para rodar backend Spring Boot e banco MySQL em containers. Correção de conflitos de porta e variáveis de ambiente.
- **Arquivos afetados:** `docker-compose.yml`
- **Motivo:** O Docker Desktop estava reiniciando em loop; ajuste necessário para estabilizar os containers de desenvolvimento.

### 1.2 Porta do backend ajustada para 8081
- **O que foi feito:** Backend Spring Boot configurado para expor a porta 8081 (em vez de 8080, que é a padrão mas estava em conflito).
- **Arquivos afetados:** `docker-compose.yml`, `frontend/.env`
- **Motivo:** Evitar conflito com outras aplicações que usam 8080 na máquina de desenvolvimento.

---

## Sessão 2 — Funcionalidade: Progresso automático das metas

### 2.1 Remoção do campo `progress` do input do usuário
- **O que foi feito:** O campo `progress` foi removido do DTO de requisição de metas e do formulário do frontend. O progresso agora é calculado automaticamente pelo sistema a partir das sessões de estudo.
- **Arquivos afetados:**
  - `backend/src/main/java/com/studyplatform/dto/request/GoalRequestDTO.java`
  - `backend/src/main/java/com/studyplatform/mapper/GoalMapper.java`
  - `frontend/src/pages/Goals.tsx`
- **Motivo:** Eliminar inconsistência onde o usuário precisava informar o progresso manualmente, o que era propenso a erros.

### 2.2 Recálculo automático do progresso ao criar/editar/excluir sessões
- **O que foi feito:** O `StudySessionService` passou a disparar recálculo das metas afetadas sempre que uma sessão é criada, atualizada ou excluída. O `GoalService` ganhou o método `recalcularProgresso` que soma as durações de sessões dentro do período da meta.
- **Arquivos afetados:**
  - `backend/src/main/java/com/studyplatform/service/StudySessionService.java`
  - `backend/src/main/java/com/studyplatform/service/GoalService.java`
  - `backend/src/main/java/com/studyplatform/repository/StudySessionRepository.java`
  - `backend/src/main/java/com/studyplatform/repository/GoalRepository.java`
- **Motivo:** Garantir que o progresso das metas seja sempre consistente com as sessões registradas, sem intervenção manual do usuário.

### 2.3 Testes unitários para o novo comportamento
- **O que foi feito:** Adição de testes para `GoalService` cobrindo os cenários de recálculo (meta por matéria, meta geral, sem sessões). Novo arquivo de testes para `StudySessionService` verificando que as metas são recalculadas nas operações CRUD.
- **Arquivos afetados:**
  - `backend/src/test/java/com/studyplatform/service/GoalServiceTest.java`
  - `backend/src/test/java/com/studyplatform/service/StudySessionServiceTest.java` *(novo)*
- **Motivo:** Garantir que a lógica de recálculo automático funcione corretamente e não regresse em futuras alterações.

---

## Sessão 2 — Funcionalidade: Streak de estudo no Dashboard

### 2.4 Card de sequência de estudo (streak)
- **O que foi feito:** Adição de um card no grid de estatísticas do Dashboard mostrando quantos dias consecutivos o usuário estudou. A função `calcularStreak` verifica se hoje ou ontem têm sessão e conta para trás.
- **Arquivos afetados:**
  - `frontend/src/pages/Dashboard.tsx`
- **Motivo:** Incentivar o hábito de estudo diário com feedback visual de consistência.

---

## Sessão 3 — Correções de bugs

### 3.1 Correção: crash em `StudySessions.tsx` ao acessar `session.subject.color`
- **O que foi feito:** Aplicação de optional chaining (`?.`) nos acessos a `session.subject` em `StudySessions.tsx`.
- **Arquivos afetados:**
  - `frontend/src/pages/StudySessions.tsx`
- **Motivo:** `session.subject` poderia ser `undefined` quando o DTO do backend retornava campos planos em vez de objeto aninhado, causando TypeError fatal.

### 3.2 Correção crítica: `StudySessionResponseDTO` com subject aninhado
- **O que foi feito:** O DTO de resposta das sessões foi reestruturado para retornar `subject` como objeto aninhado (`{ id, subjectName, color, ... }`) em vez de campos planos (`subjectId`, `subjectName`, `subjectColor`). O mapper foi atualizado para construir o `SubjectResponseDTO` aninhado.
- **Arquivos afetados:**
  - `backend/src/main/java/com/studyplatform/dto/response/StudySessionResponseDTO.java`
  - `backend/src/main/java/com/studyplatform/mapper/StudySessionMapper.java`
- **Motivo:** O frontend sempre esperou `session.subject` como objeto aninhado (conforme `types/index.ts`). O mismatch causava quebra completa do Dashboard e da página de Sessões.

### 3.3 Correção: `.env` apontava para porta errada
- **O que foi feito:** `VITE_API_URL` corrigido de `http://localhost:8080` para `http://localhost:8081`.
- **Arquivos afetados:**
  - `frontend/.env`
- **Motivo:** Backend exposto na porta 8081; com 8080 todas as requisições do dev server retornavam 401/conexão recusada.

### 3.4 Logging de erros 500 no backend
- **O que foi feito:** Adição de `@Slf4j` ao `GlobalExceptionHandler` e log do stack trace completo no handler de exceções genéricas.
- **Arquivos afetados:**
  - `backend/src/main/java/com/studyplatform/exception/GlobalExceptionHandler.java`
- **Motivo:** Erros 500 eram completamente silenciosos nos logs, impossibilitando o debug.

### 3.5 Log de erros de API no frontend
- **O que foi feito:** O interceptor de resposta do Axios passou a logar no console o status, método HTTP e URL de erros não-401.
- **Arquivos afetados:**
  - `frontend/src/api/client.ts`
- **Motivo:** Facilitar identificação de erros de rede e API durante o desenvolvimento.

---

## Sessão 4 — Funcionalidade: Gráfico empilhado e Timer de sessão

### 4.1 Gráfico "Tempo Estudado por Matéria" com subdivisões por sessão
- **O que foi feito:** O gráfico de barras simples do Dashboard foi transformado em um gráfico de barras empilhadas. Cada coluna representa uma matéria; cada segmento da pilha representa uma sessão individual (ordenadas da mais antiga para a mais recente). Cores com opacidade alternada diferenciam os segmentos.
- **Arquivos afetados:**
  - `frontend/src/pages/Dashboard.tsx`
- **Motivo:** Dar mais contexto visual — o usuário pode ver não só o total por matéria mas também como as sessões se distribuem ao longo do tempo.

### 4.2 Timer de sessão ativa no Dashboard
- **O que foi feito:** Adição de um card de cronômetro no Dashboard com: seletor de matéria, visor HH:MM:SS, e controles Iniciar / Pausar / Retomar / Finalizar / Cancelar. Ao finalizar, um modal pré-preenchido permite salvar a sessão com duração calculada automaticamente. O estado do timer é persistido no `localStorage` para sobreviver a reloads.
- **Arquivos afetados:**
  - `frontend/src/pages/Dashboard.tsx`
- **Motivo:** Permitir que o usuário cronometre sessões em tempo real, eliminando a necessidade de calcular e digitar a duração manualmente.

---

## Sessão 5 — Melhorias visuais e Heatmap (sessão atual)

### 5.1 Hover com destaque no gráfico empilhado
- **O que foi feito:** Ao passar o mouse sobre um segmento específico do gráfico, ele recebe um contorno branco mais espesso (`stroke`). O tooltip foi atualizado para destacar visualmente (fundo colorido) a sessão correspondente ao segmento sob o cursor. O formato de duração no tooltip foi padronizado para "Xh Ymin" (mais legível que "1.5h").
- **Arquivos afetados:**
  - `frontend/src/pages/Dashboard.tsx`
- **Motivo:** Facilitar a leitura de gráficos com muitos segmentos, tornando claro qual sessão específica está sendo analisada.

### 5.2 Heatmap de calendário mensal
- **O que foi feito:** Adição de um card de calendário mensal no Dashboard (coluna direita). Cada dia do mês exibe uma célula cuja intensidade de cor (escala de 4 níveis usando `rgba(99, 102, 241, ...)`) reflete o total de minutos estudados naquele dia. O dia atual tem borda destacada. Tooltip com posição fixa (`position: fixed`) mostra data, total de horas e lista de matérias estudadas ao passar o mouse. Dias fora do mês ficam invisíveis.
- **Arquivos afetados:**
  - `frontend/src/pages/Dashboard.tsx`
  - `frontend/src/index.css`
- **Motivo:** Visão rápida do padrão de consistência mensal — complementa o streak (sequência) com contexto espacial de quais dias foram mais produtivos.

### 5.3 Polimento visual do Dashboard
- **O que foi feito:** O Dashboard foi envolvido em `.dashboard-root` com `display: flex; flex-direction: column; gap: 1.5rem`, eliminando margens manuais inconsistentes. Tamanhos de fonte dos títulos de card padronizados em `1.05rem`. Itens de sessão recente receberam estilo próprio (`.sessao-recente-item`) com hover. Timer card com layout flexível e responsivo.
- **Arquivos afetados:**
  - `frontend/src/pages/Dashboard.tsx`
  - `frontend/src/index.css`
- **Motivo:** Consistência visual — eliminar `marginTop: '2rem'` espalhados pelo componente e padronizar o espaçamento entre todos os cards do painel.

### 5.4 Estilos responsivos adicionais
- **O que foi feito:** Media queries adicionadas para telas menores que 640px ajustando o timer (visor menor, select full-width) e o heatmap (células menores). Grid de estatísticas com min-width reduzido para `160px`.
- **Arquivos afetados:**
  - `frontend/src/index.css`
- **Motivo:** Garantir usabilidade em telas de tablet/mobile sem quebrar o layout.

### 5.5 Este arquivo de changelog
- **O que foi feito:** Criação do `MUDANCAS.md` documentando todas as sessões de desenvolvimento. Organizado do mais antigo ao mais recente, com seção, descrição do que foi feito, arquivos afetados e motivação para cada alteração.
- **Arquivos afetados:**
  - `MUDANCAS.md` *(este arquivo)*
- **Motivo:** Facilitar a orientação de colaboradores que precisem entender rapidamente o que foi alterado e onde encontrar cada funcionalidade no código.

---

## Sessão 6 — Documentação: Estrutura atual do projeto

### 6.1 Revisão/atualização do diagrama da estrutura
- **O que foi feito:** Atualizado/revisado o desenho da estrutura do projeto em `docs/estrutura.md` para refletir com mais fidelidade a organização real do backend (incluindo `config/` e `dto/request` + `dto/response`) e do frontend (incluindo `App.tsx`, `main.tsx`, `assets/`, `utils/`).
- **Arquivos afetados:**
  - `docs/estrutura.md`
- **Motivo:** Garantir que a documentação visual do layout do repositório esteja alinhada com o código existente, facilitando onboarding e manutenção.


