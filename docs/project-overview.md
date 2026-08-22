# Visão Geral do Projeto

> Documento com visão geral do produto, fluxo de negócio, atores/papéis e conceitos centrais.

## Produto

**Study Management Platform** — Uma aplicação full-stack de gerenciamento de estudos que ajuda estudantes a organizar matérias, preparar-se para exames, criar flashcards, acompanhar metas de estudo e gerar conteúdo por IA (resumos, quizzes, simulados, podcasts).

### Funcionalidades Principais

| Categoria | Funcionalidades |
|---|---|
| **Matérias (Subjects)** | Cadastro de matérias, cores, associação com provas e metas |
| **Metas de Estudo (Goals)** | Metas com níveis de domínio alvo (0–100), rastreamento de progresso |
| **Flashcards** | Sistema Leitner de revisão espaçada, agenda de revisão |
| **Pomodoro** | Cronômetro de foco sempre ligado a um `ExamPrep` |
| **Exam Prep (Preparação para Prova)** | Plano de estudos com data da prova, pontuação alvo, compartilhamento público |
| **Quizzes** | Tentativas de quiz com correção automática e scoring |
| **Simulados** | Provas cronometradas com score final |
| **Resumos** | Textos ricos (HTML) associados a matérias |
| **PDFs e Anotações** | Upload, indexação via Tika/RAG, anotações por página |
| **Tutor RAG** | Perguntas ao material estudado via Gemini + ChromaDB |
| **Podcasts** | Geração de áudio a partir de roteiros via Google Translate TTS |
| **Analytics** | Zona de aprendizado (Comfort/Panic/Learning), streak, tópicos fracos/fortes |
| **Premium** | Recursos avançados de IA liberados por flag `User.premium` |

## Fluxo de Negócio

### 1. Onboarding e Autenticação
- Usuário cadastra-se ou faz login (local ou OAuth2 Google/GitHub)
- JWT emitido e armazenado no `localStorage` via `useAuthStore`
- Verificação de `premium` flag para recursos avançados

### 2. Criação de Material de Estudo
1. Upload de PDF → salva como `UploadedFile` + associa a `Subject`
2. Pipeline RAC: Apache Tika extrai texto → `PdfChunk` com embeddings Gemini → indexado no ChromaDB (`examprep_{examPrepId}`)
3. Opcional: IA gera resumo (`AiGeneratedContent`) ou quiz (`AiGeneratedContent` tipo QUIZ)

### 3. Estudo e Revisão
- **Sessão de estudo** manual: `POST /api/v1/sessions` → contribui para streak
- **Pomodoro**: `POST /api/v1/pomodoro/start` (exame + duração) → `complete/{id}` → registra `contentConsumed`
- **Flashcard review**: `POST /api/v1/flashcards/{id}/review` com `quality` (easy/good/hard) → avança caixa Leitner
- **Quiz attempt**: `POST /api/v1/quiz/attempt` → registra acertos/total → score 0–100

### 4. Metas e Domínio
- `Goal` tem `targetMastery` (0–100) e `currentMastery`
- `Goal.getCompletionPercentage()` = `(currentMastery / targetMastery) * 100`
- `updateMastery(int delta)` — ajusta `currentMastery` (clamp 0–100)
- Mastery é atualizada por: sessões de estudo, resultados de quizzes, resultados de simulados
- Recalculation dispara via `ExamPrepActivityEvent` → `ExamPrepActivityListener @Async` → `GoalService.recalculateGoalMastery`

### 5. Zona de Aprendizado (Learning Zone)
- Calculado por `LearningZoneService`:
  - **COMFORT**: accuracy ≥ 85%
  - **PANIC**: accuracy < 60% com tentativas
  - **LEARNING**: caso contrário
- Streak: sequência consecutiva de dias com atividade (sessões + quizzes + simulados)
- Topics fracos/fortes: calculados hardcoded se repositórios vazios; otherwise a partir de `StudySession`, `QuizAttempt`, `ExamSimulation`

### 6. Preparação de Prova (ExamPrep)
- `ExamPrep`: título, data da prova (`LocalDate`), `targetScore` (0–100), `status` (ACTIVE/COMPLETED/CANCELLED), `isPublic`, `shareToken`
- `isPublic=true` + token gera endpoint público: `GET /api/v1/exam-preps/public/share/{shareToken}`
- Compartilhar: `POST /api/v1/exam-preps/{id}/share` gera token; `DELETE /api/v1/exam-preps/{id}/share` revoga
- Rota pública sem auth: `GET /api/v1/exam-preps/public/share/{shareToken}`

### 7. Tutor RAG (Perguntas ao Material)
- `POST /api/v1/chat/ask` com: `examPrepId`, `question`, `socratic` (opcional), `imageMimeType` + `imageBase64` (opcional)
- Pipeline:
  1. Busca vetorial `VectorStoreService.searchSimilar(examPrepId, query, 5)` → top-5 chunks
  2. Se vazia → mensagem fixa "Não encontrei material relevante..." (NÃO chat livre)
  3. Prompt construído com chunks + instrução `socratic` se ativado
  4. Gemini `gemini-2.5-flash` grounded retorna resposta
- Modo multimodal: imagens enviadas via Gemini `generateMultimodalContent`

### 8. Geração de Podcast
- `POST /api/v1/ai/podcast/stream` com `examPrepId` e `difficulty` (EASY/MEDIUM/HARD)
- `GeminiService` gera roteiro (texto) → `TtsService` divide em chunks ≤150 chars → Google Translate TTS → MP3s concatenados
- Endpoint é `permitAll` (sem JWT obrigatório)

### 8. Analytics e Dashboard
- `GET /api/v1/analytics/learning-zone?examPrepId=` → `LearningZoneResponseDTO` (mastery, accuracy, time, streak, zone, topicos fracos/fortes, weekly progress)
- Dashboard exibe: streak, hero session, daily goal, activity grid, zona, progress por matéria

## Atores/Papéis

| Papel | Descrição |
|---|---|
| **Estudante** | Usuário final que cadastra matérias, cria metas, faz pomodoros, responde quizzes, faz simulados, interage com tutor RAG, gera podcasts. Pode ser gratuito (default `premium=false`) ou Premium. |
| **Administrador** | (Não implementado separadamente — todas as features disponíveis ao usuário comum; configurações via env vars/DB). |
| **Sistema** | Orchestração via eventos Spring, agendamentos, caches, pipelines RAG/TTS. |

## Conceitos Centrais

- **Material / Fonte de Estudo** — PDFs e resumos indexados que alimentam o pipeline RAG
- **Mastery (Maestria)** — Percentual (0–100) que indica domínio; calculado por `Goal.getCompletionPercentage()` e atualizado por `updateMastery()`
- **Sistema Leitner** — Caixas de revisão espaçada (1→5). `LeitnerBox.getIntervalDays()`: 1→1d, 2→3d, 3→7d, 4→14d, 5→30d. Avança com "easy"/"good", reinicia com "hard"
- **Zona de Aprendizado (Learning Zone)** — Classificação gamificada: COMFORT (≥85% accuracy), PANIC (<60% com tentativas), LEARNING (outro)
- **Streak** — Sequência consecutiva de dias com atividade (sessões, quizzes ou simulados). Calculado em `LearningZoneService.calculateStreak()`
- **Compartilhamento Público** — `ExamPrep.isPublic` + `shareToken`. Endpoint sem auth: `GET /api/v1/exam-preps/public/share/{shareToken}`
- **RAG (Retrieval-Augmented Generation)** — Pipeline que recupera trechos relevantes do material do usuário e injeta no prompt do Gemini. Não cai em chat livre quando não há contexto
- **Modo Socrático** — Flag `socratic=true` no tutor que instrui o modelo a conduzir em vez de dar a resposta ("MODO SOCRÁTICO ATIVO")
- **Premium** — Flag `User.premium` default `false`. Recursos: geração avançada de conteúdo IA, multimodal, etc. Portão no frontend (`PaywallModal`) + verificação pontual no backend

## Subsistemas (link ARCHITECTURE.md)

O sistema é organizado nos seguintes subsistemas, conforme documentado em `docs/ARCHITECTURE.md`:

- **Backend**: Spring Boot 3.2.4 + Java 21, pacotes por domínio (vertical slice)
- **Frontend**: React 19 + Vite 8 + TypeScript, Axios + React Query + Zustand
- **Banco Relacional**: MySQL (dev), PostgreSQL/Neon (prod), Flyway V1–V12
- **Banco Vetorial**: ChromaDB (coleções `examprep_{id}`)
- **IA / RAG**: Gemini (texto, embeddings, multimodal), TTS Google Translate, vector store HTTP
- **Autenticação**: JWT HS256 stateless, Spring Security 6, OAuth2 (Google/GitHub mock em dev)
- **Cache**: Redis com fallback `ConcurrentMapCacheManager` (TTL: studySessions 1h, leaderboard 5min, aiContent 24h)
- **Eventos**: `ApplicationEventPublisher` com `SubjectDeletedEvent`, `ExamPrepActivityListener @Async`
- **Segurança**: RateLimitingFilter, CORS, rotas públicas explícitas
- **Tests**: JUnit 5 + Mockito + Testcontainers (backend only)

## Links Rápidos

- [`GLOSSARY.md`](GLOSSARY.md) — Glossário completo de termos de domínio e técnicos
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — Camadas, dependências, pastas e padrões estruturais
- [`configuration.md`](configuration.md) — Setup local, env vars, ports, serviços externos
- [`patterns.md`](patterns.md) — Padrões de código com exemplos reais
- [`AGENTS.md`] — Visão de módulos e integrações (audit against code)

---
*Este documento foi gerado como contexto persistente para futuros agentes. Veja docs/ para a série completa.*