# AGENTS.md — Contexto e Guia do Projeto

> **Documento de entrada para agentes de IA.**
>
> Leia este arquivo antes de analisar, modificar ou criar código neste projeto. Ele fornece o contexto arquitetural, funcional e técnico mínimo necessário para trabalhar no sistema sem tomar decisões baseadas em suposições.

---

## 1. Visão geral

Este projeto é uma **plataforma de estudos inteligente**, construída em arquitetura cliente-servidor e integrada a serviços de Inteligência Artificial.

O sistema combina:

- gerenciamento de estudos;
- matérias e sessões de estudo;
- cronograma e metas;
- Pomodoro;
- resumos e flashcards (sistema Leitner);
- preparação para exames (com quizzes e simulados);
- visualização e anotação de PDFs;
- tutor inteligente baseado em RAG (Retrieval-Augmented Generation);
- geração de conteúdo com IA (Google Gemini);
- geração de podcasts/áudios de estudo por TTS (Google Translate TTS);
- gamificação e analytics (streaks, zona de aprendizado, tópicos fortes/frágeis);
- recursos Premium (usuários com flag `premium` têm acesso estendido a funcionalidades de IA).

A aplicação possui dois grandes componentes:

```text
Projeto
├── frontend/   # Aplicação web
└── backend/    # API e serviços
```

---

## Documentação Técnica Complementar (docs/)

A seguir, tabela de referência rápida para os 5 documentos de arquitetura e padrões criados como contexto persistente para agentes:

| Arquivo | Descrição | Principais tópicos |
|---|---|---|
| [`docs/GLOSSARY.md`](docs/GLOSSARY.md) | Glossário unificado de domínio e técnico | Entities, Value Objects, enums, conceitos RAG/IA, auth, frontend, ops, fluxos de negócio, endpoints-chave |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Arquitetura real implementada (camadas, dependências, pastas) | Vertical slices, camadas controller/service/repository, persistence (MySQL/Postgres, Flyway, Redis, ChromaDB), auth flow, background processing, testes, deploy, estrutura de pastas |
| [`docs/configuration.md`](docs/configuration.md) | Setup local completo: prereqs, env vars, run, Flyway, ChromaDB, Gemini, TTS | Java 21, Node 20, MySQL/Postgres, `JWT_SECRET`, `GEMINI_API_KEY`, `CHROMA_URL`, OAuth2 mock, ports, Docker, dev vs prod, pitfalls |
| [`docs/patterns.md`](docs/patterns.md) | Padrões de código reais com exemplos (backend + frontend) | Controller→Service→Repository→Entity, DTOs/Mapper, GlobalExceptionHandler, SecurityService, Events, Cache, RAG pipeline, AI interfaces, React Query, Zustand, apiClient, modais, wizards |
| [`docs/project-overview.md`](docs/project-overview.md) | Visão de produto: negócio, atores, conceitos centrais, subsistemas | Fluxos (onboarding, material, estudo, metas, learning zone, examprep, RAG, podcast, analytics), atores (Estudante, Sistema), conceitos (Mastery, Leitner, Zone, Streak, RAG, Socratic, Premium), links cruzados |
| [`docs/structure.md`](docs/structure.md) | Estrutura do projeto (vertical slice) | Backend por feature (controller/service/repository/dto/entity), shared cross-cutting, Frontend por tipo+domínio, stores, React Query, apiClient, Flyway |


> **Nota**: Estes documentos foram gerados a partir da análise do código real (source of truth). Em caso de divergência entre AGENTS.md e a implementação, **o código prevalece**. Consulte `docs/` para detalhes arquiteturais, de configuração e padrões antes de implementar alterações.

---

# 2. Arquitetura

## 2.1 Frontend

O frontend está localizado em `frontend/`.

- Documentação detalhada: [`frontend/README.md`](frontend/README.md)

### Stack principal

- React 18+
- Vite
- TypeScript
- Zustand (estado global — autenticação, preferências)
- TanStack React Query (requisições API, cache, sincronização, invalidação)
- CSS personalizado com modules + variáveis CSS

### Responsabilidades

O frontend é responsável por:

- interface do usuário;
- navegação via React Router;
- gerenciamento de estado global (Zustand) e local (React Query cache);
- autenticação no cliente (JWT storage, token renewal);
- comunicação com a API REST (apiClient);
- cache e sincronização de dados (React Query);
- visualização de PDFs (pdfjs-dist ou viewer integrado);
- cronômetros e timers;
- dashboards e cards de estatísticas;
- editores de conteúdo (sumários, flashcards);
- chat com o tutor RAG (modo normal e socrático);
- reprodução de áudio (componente Audio player);
- controles de recursos Premium (verificação de `user.premium` no backend).

### Gerenciamento de estado

Existem três mecanismos principais, usados conforme a criticidade dos dados:

**Zustand**

Utilizado para estado global e estado de aplicação, incluindo:
- informações de autenticação (token, usuário logado);
- preferências de usuário;
- estado de modais e navegação temporária.

**TanStack React Query**

Utilizado para:
- requisições à API;
- cache server-state;
- estados de loading/error;
- invalidação e atualização de dados;
- sincronização em background.

**Estado local**

Utilizado para:
- componentes de formulário temporários;
- timers e estado de UI transitório;
- cache de dados que não precisam ser persistentes globalmente.

> Ao alterar funcionalidades que dependem de dados do backend, verificar se o fluxo existente utiliza React Query, Zustand ou estado local antes de introduzir um novo mecanismo.

---

# 3. Backend

O backend está localizado em `backend/`.

- Documentação detalhada: [`backend/README.md`](backend/README.md)

### Stack principal

- Java 17+
- Spring Boot 3.x
- PostgreSQL (desenvolvimento) / H2 (tests)
- Flyway (versionamento de schema)
- ChromaDB (banco vetorial para RAG)
- Google Gemini (modelos: gemini-2.5-flash para texto, text-embedding-004 para embeddings)
- Google Translate TTS (serviço de áudio)
- JJWT 0.12.x (gerenciamento de tokens)

O backend concentra:

- regras de negócio;
- autenticação (JWT com BCrypt, stateless via Spring Security);
- autorização (controle de premium por user flag);
- persistência (JPA/Hibernate com Auditing);
- processamento de PDFs (extração, chunking);
- geração de embeddings (Google Gemini text-embedding-004);
- consultas semânticas (ChromaDB busca vetorial);
- integração com IA (Gemini text e multimodal);
- geração de podcasts (TTS via Google Translate API);
- geração de áudio (MP3, streaming);
- APIs consumidas pelo frontend (REST endpoints versionados em /api/v1/);
- exceções de negócio (BusinessException, ResourceNotFoundException);
- rate limiting (RateLimitingFilter);
- CORS configurado para origens do frontend.

---

# 4. Bancos de dados

## 4.1 Banco relacional

O sistema utiliza banco relacional, com suporte a:

- PostgreSQL (produção/desenvolvimento);
- H2 (tests - perfil configured no application.properties);

O esquema é versionado com **Flyway** — migrations versionadas seguem convenção `V<NN>__<description>.sql` e ficam em:

```text
backend/src/main/resources/db/migration/
```

Existem migrations já aplicadas (V1 through V9 no código atual). **Regra crítica**: Nunca alterar uma migration já aplicada como forma de corrigir o banco em produção/desenvolvimento compartilhado. Para alterações estruturais, criar uma nova migration seguinte a convenção já existente no projeto.

Antes de criar uma migration:

1. verificar as migrations existentes (pastas `backend/src/main/resources/db/migration/` e `backend/target/classes/db/migration/`);
2. entender o modelo atual de entidades;
3. verificar entidades/repositórios/serviços relacionados;
4. verificar se existe migration equivalente que já resolva o problema;
5. seguir a convenção de nomenclatura já utilizada (V9__ seguida de V10__, V11__, etc.).

## 4.2 Banco vetorial

O sistema utiliza **ChromaDB** para armazenamento e recuperação semântica.

Configuração esperada:

```text
chroma.url=http://localhost:8000
```

O ambiente local normalmente utiliza a porta 8000.

O ChromaDB é utilizado principalmente no pipeline de RAG (Retrieval-Augmented Generation), integrado ao serviço `ai.RAGChatService` e `ai.GeminiService` (embeddings via `text-embedding-004`).

---

## 4.2 Banco vetorial

O sistema utiliza **ChromaDB** para armazenamento e recuperação semântica.

Configuração esperada:

```text
chroma.url
```

O ambiente local normalmente utiliza a porta:

```text
8000
```

O ChromaDB é utilizado principalmente no pipeline de RAG.

---

# 5. Inteligência Artificial

A integração principal é feita com o **Google Gemini**.

## Modelos

### Geração de texto

```text
gemini-2.5-flash
```

Utilizado para geração de conteúdo, explicações, quizzes, flashcards, roteiros etc.

### Embeddings

```text
text-embedding-004
```

Utilizado para gerar vetores que permitem busca semântica.

### Multimodal (Vision)

Suporta análise de imagens enviadas em base64, processadas conjuntamente com texto pelo modelo Gemini. Usado no tutor RAG quando o usuário anexa imagens a perguntas.

> Antes de alterar modelos, parâmetros ou integrações de IA, verificar as configurações existentes no backend (`backend/src/main/resources/application.properties` para as chaves `gemini.api.key`, `gemini.text.model`). Não assumir que uma chamada ao Gemini pode ser substituída diretamente por outra API sem analisar o fluxo completo.

### Configuração

As chaves de API são lidas via Spring `@Value` a partir de variáveis de ambiente:

- `gemini.api.key` — chave da API Google Generative Language
- `gemini.text.model` — modelo de texto (padrão: `gemini-2.5-flash`)

> Chaves nunca devem ser hardcodadas — permanecer em variáveis de ambiente/.env.

---

# 6. Módulos de negócio

O backend é organizado por domínios/módulos. Cada módulo segue o padrão Entity → Repository → Service → Controller → DTO → Frontend.

Principais módulos:

```text
auth       → JWT auth, registro, login, controle de sessão, usuários Premium
user       → Entidade User com campo premium, integração SecurityClient
subject    → Matérias com cores (Value Object Color), CRUD, associadas a ExamPrep
session    → Sessões de estudo, duração, observações, vinculadas a matérias
goal       → Metas de estudo com targetMastery/currentMastery, associáveis a Subject ou ExamPrep
analytics  → Learning Zone (mastery, accuracy, streak, zona definição, tópicos fortes/frágeis, progresso semanal)
pomodoro   → Timer Pomodoro ligado a ExamPrep, histórico de sessões, contribui para streak
summary    → Resumos com título e conteúdo HTML, associados a Subject
flashcard  → Cartões Leitner (caixas 1→2→3→4→5), gravação de revisão (easy/good/hard), geração IA a partir de resumos/PDFs
examprep   → Preparação para prova com data, nota alvo, matérias, quizzes, simulados, attempts
file       → Upload e gestão de arquivos (PDFs), associados a Subject
annotation → Anotações de PDF por página (type, conteúdo texto)
podcast    → Geração de áudio TTS a partir de roteiro de preparação de exame
tts        → Text-to-Speech (Google Translate API, chunking em 150 chars, fallback silencioso)
ai         → Gemini API (texto, embeddings, multimodal/imagem), RAG pipeline, QuestionGenerator e EmbeddingGenerator interfaces
```

Cada módulo deve ser analisado dentro do padrão arquitetural já utilizado pelo projeto antes de novas implementações.

---

# 7. Usuários e autenticação

## `auth`

Responsável pelos fluxos relacionados à autenticação.

O sistema utiliza **JWT (JSON Web Token)** com Spring Security — arquitetura stateless, sem sessões no servidor.

```text
JWT (HS256) — token assinado com BCrypt-encoded secret
```

O segredo (`JWT_SECRET`) e expiração (`JWT_EXPIRATION`) vêm de variáveis de ambiente (`backend/src/main/resources/application.properties`).

### Fluxos principais

- **Registro**: POST `/api/v1/auth/register` — cria usuário, salva com senha BCrypt, retorna token JWT automaticamente (inclui flag `premium: false` por padrão);
- **Login**: POST `/api/v1/auth/login` — autentica via `AuthenticationManager` (BCrypt compare), retorna token JWT;
- **Autenticação em requisições**: O filtro `JwtAuthenticationFilter` valida o token a cada requisição; o email do token deve corresponder ao usuário da requisição;
- **Controle de sessão**: Stateless — cada requisição carrega o token; não há cookies de sessão;
- **Autorização**: Cada endpoint protege com `@PreAuthorize` ou `authenticated()` no SecurityConfig; usuários `premium=false` têm acesso restrito a certas funcionalidades de IA.

### Premium

Usuarios têm um campo `premium` no entity `User` (boolean, default `false`). Recursos de IA podem verificar `user.isPremium()` no backend para liberar funcionalidades avançadas. A validação **não deve** ser movida exclusivamente para o frontend — regras de autorização devem ser respeitadas no backend para evitar duplicação desnecessária.

Ao alterar funcionalidades de IA:

- verificar as regras de acesso existentes no `User.premium` e no `AuthService`;
- não mover a validação exclusivamente para o frontend;
- considerar que regras de autorização devem ser respeitadas no backend;
- evitar duplicar regras de negócio sem necessidade.

---

# 8. Matérias e sessões de estudo

## `subject`

Representa as matérias/disciplines do usuário.

As matérias podem possuir características personalizáveis, incluindo cores. O entity `Subject` possui um objeto de valor `Color` (hexadecimal) embutido.

- Campos: `subjectName` (String, obrigatório), `subjectDescription` (TEXT), `color` (Value Object hex color), `createdAt`, `updatedAt`;
- Relacionamento: `ManyToOne` com `User` (um usuário tem muitas matérias);
- Relacionamento opcional: `ManyToOne` com `ExamPrep` (uma preparação pode ter muitas matérias);
- Validacao: `existsBySubjectNameAndUserId` no repository para evitar nomes duplicados por usuário;
- Endpoints: CRUD em `POST /api/v1/subjects`, `GET /api/v1/subjects`, `GET /api/v1/subjects/{id}`, `PUT /api/v1/subjects/{id}`, `DELETE /api/v1/subjects/{id}`.

## `session`

Representa sessões de estudo.

Uma sessão registra informações como:

- `id`, `startedAt`, `duration` (minutos), `completed`, `contentConsumed` (texto opcional);
- Relacionamento: `ManyToOne` com `User` e `ManyToOne` com `ExamPrep`;
- Pode estar associada a uma `Subject` via `ExamPrep.getSubjects()`;
- Endpoints: `POST /api/v1/pomodoro/start` (inicia sessão), `POST /api/v1/pomodoro/complete/{id}` (finaliza), `GET /api/v1/pomodoro/list` (histórico).

Esses dados alimentam outras funcionalidades, como:

- metas (via ExamPrep goals);
- analytics (LearningZoneService calcula streak e tempo total a partir das sessões);
- streaks (calculateStreak baseado em datas de sessões);
- histórico (listagem de sessões por exame ou matéria);
- preparação para exames (sessões contribuem para o domínio da meta).

---

# 9. Metas e gamificação

## `goal`

Permite definir objetivos de estudo.

As metas podem ser:

- **gerais** (sem vínculo a matéria): ex: "Estudar 20h no mês";
- **associadas a uma matéria**: ex: "Dominar Cálculo Integral — 80% de maestria";
- **associadas a uma preparação para exame**: vinculadas a `ExamPrep`.

### Atributos da meta

- `title` (String, obrigatório): nome da meta;
- `targetMastery` (Integer, obrigatório): nível alvo (0 a 100);
- `currentMastery` (Integer, obrigatório): nível atual (0 a 100), iniciando em 0;
- `startDateGoal` (LocalDate, obrigatório): data de início;
- `endDateGoal` (LocalDate, obrigatório): data de conclusão;
- `subject` (opcional): vínculo a uma `Subject`;
- `examPrep` (opcional): vínculo a uma `ExamPrep`.

### Cálculo de conclusão

O method `Goal.getCompletionPercentage()` calcula:
`(currentMastery / targetMastery) * 100`, limitado a 100%.

O método `Goal.updateMastery(int currentMastery)` atualiza o domínio com `Math.clamp(currentMastery, 0, 100)`.

### Endpoints

- `GET /api/v1/goals` — listar todas as metas do usuário autenticado (paginado);
- `GET /api/v1/goals/{id}` — buscar meta por ID;
- `POST /api/v1/goals` — criar nova meta;
- `PUT /api/v1/goals/{id}` — atualizar meta;
- `DELETE /api/v1/goals/{id}` — deletar meta.

## `analytics`

Responsável por métricas e indicadores relacionados ao desempenho do usuário, incluindo a **Learning Zone** (zona de aprendizado).

O sistema possui gamificação baseada em:

- **streaks** (sequências de dias de estudo consecutivos);
- **mastery** (nível de domínio por meta/exame);
- **accuracy** (acurácia em quizzes e simulados);
- **zone** (definição: COMFORT ≥ 85%, PANIC < 60%, Learning entre 60-84%);
- **weekly progress** (progresso nos últimos 7 dias por tipo de atividade);
- **weak/strong topics** (matérias com maior ou menor desempenho).

### Learning Zone Service

O `LearningZoneService.getLearningZone(examPrepId)` compila:

1. **Mastery** — média das metas vinculadas ao exame ou cálculo padrão;
2. **Acurácia média** — média de scores de quiz attempts e exam simulations;
3. **Tempo total de estudo** (minutos) — soma das durações das study sessions vinculadas aos subjects do exame;
4. **Streak de dias** — dias consecutivos com atividade (sessions + quizzes + simulations);
5. **Zona de aprendizado** — definida pela acurácia: COMFORT (>=85%), Learning (60-84%), PANIC (<60% com attempts);
6. **Progresso semanal** — atividade dos últimos 7 dias (quizzes + simulations por dia);
7. **Tópicos fortes e fracos** — matéria por média de acurácia (forte >= 80%, fraca < 60%); caso não haja dados, fallback com "Análise Combinatória", "Termodinâmica" (weak) e "Geometria Espacial", "Cinemática" (strong).

> Ao alterar a forma de cálculo de métricas, verificar primeiro onde os valores são calculados, persistidos e consumidos (LearningZoneService → repository → entity). Evitar duplicar cálculos entre frontend e backend. As fórmulas de streak, zona e progresso semanal estão centralizadas no serviço `com.studyplatform.analytics.LearningZoneService`.

### DTO de resposta

`LearningZoneResponseDTO` contém: mastery (int), accuracy (int), totalTime (int), streak (int), zone (String), weeklyProgress (List<Map<String, Object>>), weakTopics (List<String>), strongTopics (List<String>).

---

# 10. Pomodoro

## `pomodoro`

Implementa o cronômetro Pomodoro com forte integração ao backend.

### Funcionamento

- `POST /api/v1/pomodoro/start` — inicia nova sessão. Requer `examPrepId` e duração opcional (padrão 25 min).
- `POST /api/v1/pomodoro/complete/{id}` — marca sessão como concluída, recebendo `contentConsumed` (texto opcional — o que foi estudado).
- `GET /api/v1/pomodoro/list` — lista todas as sessões concluídas para um `examPrepId`.

### Integração com outros módulos

- **Sessão → ExamPrep**: Cada `PomodoroSession` está ligada a um `ExamPrep` (via `examPrep_id`).
- **Sessão → Analytics**: Sessões completadas contribuem para:
  - `LearningZoneService.totalTime` — soma de `durationMinutes` de todas as sessions do exame;
  - `LearningZoneService.calculateStreak()` — usa as datas `sessionDate` das sessions;
- **Sessão → Flashcards**: Pode registrar `contentConsumed` para futuras gerações de flashcards;
- **Sessão → Metas**: Progresso indireto via acumulação de tempo de estudo.

### Estrutura da sessão

- `id` (Long, PK, auto-increment);
- `examPrep` (ManyToOne — `ExamPrep`);
- `user` (ManyToOne — `User`);
- `startedAt` (LocalDateTime — quando iniciou);
- `durationMinutes` (Integer — tempo definido, padrão 25);
- `completed` (Boolean — se foi finalizada);
- `contentConsumed` (TEXT — o que foi estudado/consumido durante a sessão).

### Impacto ao modificar

Qualquer mudança no Pomodoro deve considerar o impacto em:

```text
Pomodoro Session → ExamPrep → LearningZoneService (streak, totalTime, accuracy)
                      ↓
                    User Goals (currentMastery update)
                      ↓
                    Analytics Dashboard (zone, topics)
```

---

# 11. Resumos e Flashcards

## `summary`

Permite criar e editar resumos relacionados ao estudo.

- Entity `Summary` contém: `id`, `title` (String), `content` (LONGTEXT para HTML rico), `creationDate`, `lastModifiedDate`;
- Relacionamento: `ManyToOne` com `User` e `ManyToOne` com `Subject`;
- Um subject pode ter vários resumos;
- Endpoints: `GET /api/summaries`, `POST /api/summaries`, `GET /api/summaries/{id}`, etc.

## `flashcard`

Implementa flashcards com base no **Método Leitner** (sistema de caixas de revisão espaçada).

### Caixas Leitner

O sistema utiliza caixas numeradas de 1 a 5, representando a frequência de revisão:

```text
1 → 2 → 3 → 4 → 5
```

- **Caixa 1**: revisão mais frequente (a cada 1 dia);
- **Caixa 2**: a cada 3 dias;
- **Caixa 3**: a cada 7 dias;
- **Caixa 4**: a cada 14 dias;
- **Caixa 5**: a cada 30 dias (revisão de longo prazo).

### Lógica de progressão

A method `Flashcard.recordReview(String quality)` atualiza a caixa base na qualidade reportada:

- `"easy"` ou `"good"` → caixa avança (+1, máximo 5);
- `"hard"` → caixa reinicia (volta para 1);

A próxima data de revisão é calculada como `now.plusDays(box.getIntervalDays())`.

### Geração por IA

A IA pode gerar flashcards automaticamente a partir de:

- **Resumos** (`Summary` entity content);
- **PDFs** — extração de texto, chunking, embeddings (Gemini `text-embedding-004`), armazenamento no ChromaDB;
- **Conteúdos relevantes** do material estudado (qualquer texto associado ao `ExamPrep`).

O fluxo é: `PDF/Resumo → Processamento (chunking) → Embeddings (Gemini) → ChromaDB busca → Flashcard entity creation`.

### Revisão do usuário

Quando o usuário avalia um cartão com `quality` ("easy", "good", "hard"), o sistema:

1. Atualiza o nível da caixa Leitner;
2. Reagenda a próxima revisão (`nextReviewDate`);
3. Persiste no banco;

### Endpoints

- `GET /api/v1/flashcards` — listar todos os cartões do usuário (paginado);
- `GET /api/v1/flashcards/due` — listar cartões agendados para revisão hoje;
- `POST /api/v1/flashcards` — criar novo cartão;
- `PUT /api/v1/flashcards/{id}` — atualizar cartão;
- `POST /api/v1/flashcards/{id}/review` — registrar revisão com qualidade;
- `DELETE /api/v1/flashcards/{id}` — deletar cartão.

### DTOs

`FlashcardRequestDTO` (front → back): front, back, subjectId, summaryId, box (opcional);
`FlashcardResponseDTO` (back → front): id, front, back, nextReviewDate, box, creationDate, subjectName, subjectColor.

---

# 12. Preparação para exames

## `examprep`

Permite criar uma preparação específica para uma prova real.

### Atributos do ExamPrep

- `id` (Long, PK);
- `title` (String, obrigatório — nome do edital/curso);
- `examDate` (LocalDate, obrigatório — data da prova);
- `targetScore` (Integer, obrigatório — nota alvo de 0 a 100);
- `status` (ExamPrepStatus enum: `ACTIVE`, `COMPLETED`, `CANCELLED`);
- `isPublic` (Boolean, default `false` — se verdadeiro, disponibiliza link de compartilhamento);
- `shareToken` (String, único — token público para compartilhamento sem autenticação);
- `createdAt` (LocalDateTime);
- `updatedAt` (LocalDateTime);

### Relacionamentos

- `User` (ManyToOne — proprietário);
- `List<Subject>` (OneToMany — matérias associadas a este exame);
- `List<Goal>` (OneToMany — metas vinculadas);
- `List<PomodoroSession>` (OneToMany — sessões de foco);
- `List<QuizAttempt>` (OneToMany — tentativas de quiz);
- `List<ExamSimulation>` (OneToMany — simulações completadas).

### Funcionalidades principais

- **Criar preparação**: `POST /api/v1/exam-preps` — define título, data da prova, nota alvo;
- **Associar matérias**: matérias são adicionadas e vinculadas via `Subject.examPrepId`;
- **Gerar quizzes/simulados**: IA pode gerar quizzes dinamicamente baseados no material estudado;
- **Registrar tentativas**: `POST /api/v1/quiz/attempt` — registra acertos/errados, atualiza `currentMastery` das metas vinculadas;
- **Simulações**: `ExamSimulation` registra uma tentativa completa de simulação com score;
- **Compartilhamento público**: `POST /api/v1/exam-preps/{id}/share` — gera `shareToken`; `GET /api/v1/exam-preps/public/share/{shareToken}` — consulta sem auth;
- **Revogar compartilhamento**: `DELETE /api/v1/exam-preps/{id}/share` — torna privado novamente.

### Diferença entre conceitos-chave

- **Preparação**: O plano de estudos estruturado (título, data, meta, matérias);
- **Simulado**: Execução completa de teste cronometrado com score final;
- **Tentativa**: Registro de uma sessão de quiz/quiz attempt (pode ser parcial);
- **Quiz**: Conjunto de perguntas para testar conhecimento específico;
- **Questão**: Pergunta individual dentro de um quiz;
- **Resultado**: Performance do aluno em uma tentativa/simulado (acertos, erros, tempo).

> **Importante**: Não presumir que esses conceitos sejam equivalentes. Cada um tem seu endpoint, entity e propósito distintos no sistema.

### Endpoints principais

- `GET /api/v1/exam-preps` — listar todas as preparações (paginado);
- `GET /api/v1/exam-preps/{id}` — buscar por ID;
- `POST /api/v1/exam-preps` — criar nova preparação;
- `PUT /api/v1/exam-preps/{id}` — atualizar preparação;
- `DELETE /api/v1/exam-preps/{id}` — deletar preparação;
- `POST /api/v1/exam-preps/{id}/share` — gerar link público;
- `DELETE /api/v1/exam-preps/{id}/share` — revogar link público;
- `GET /api/v1/exam-preps/public/share/{shareToken}` — consultar pública (sem auth);
- `POST /api/v1/quiz/attempt` — registrar tentativa de quiz;

---

# 13. PDFs e área de trabalho

Os módulos:

```text
file
annotation
```

controlam funcionalidades relacionadas aos materiais em PDF.

### Entity structure

- **UploadedFile**: `id`, `fileName`, `filePath`, `contentType`, `fileSize`, `uploadDate`, `user` (ManyToOne), `subject` (ManyToOne);
- **FileAnnotation**: `id`, `pageNumber` (Integer, obrigatório), `type` (String — e.g., "highlight", "note"), `content` (TEXT — texto destacado ou anotação), `lastModified`, `uploadedFile` (ManyToOne);

### Funcionalidades

- **Upload de PDFs**: `POST /api/file/upload` — recebe arquivo, associa a usuário e matéria;
- **Visualização**: Frontend exibe PDF com destaque e navegação por páginas;
- **Destaque de texto**: Usuário seleciona trecho → cria `FileAnnotation` com `type: "highlight"`;
- **Criação de anotações**: Usuário adiciona nota por página → cria `FileAnnotation` com `type: "note"`;
- **Associação a posições**: Anotações sempre têm `pageNumber` explícito;
- **Listagem de anotações**: `GET /api/file/annotations?fileId={id}` — retorna todas anotações de um PDF;
- **Anotações por página**: `GET /api/file/annotations?fileId={id}&pageNumber={n}`;

### Integração com RDF/pipeline

As anotações e textos destacados dos PDFs podem ser laterais para:

- Geração de flashcards (conteúdo extraído + anotações do usuário);
- Enriquecimento do contexto do tutor RAG (trecho de PDF mais relevante + anotações do usuário).

### Área de trabalho do frontend

O frontend possui uma área de trabalho (`StudyWorkspace`) voltada à leitura e estudo desses documentos, com:
- Carregador de PDF;
- Navegação por páginas;
- Ferramentas de destaque e anotação;
- Salvamento automático das anotações no backend via API REST.

---

# 14. RAG — Tutor Contextual Inteligente

O sistema possui um tutor baseado em **Retrieval-Augmented Generation (RAG)**.

O objetivo é permitir que o aluno faça perguntas utilizando seus próprios materiais (PDFs, resumos) como contexto, em vez de apenas fazer "chat com Gemini" sobre tópicos gerais.

## Pipeline conceitual

```text
PDF / Resumo
      ↓
Extração do texto
      ↓
Chunking (fragmentação em trechos menores)
      ↓
Embeddings (Google Gemini text-embedding-004)
      ↓
ChromaDB (armazenamento vetorial com metadata de subject/examPrep)
      ↓
Busca semântica (vetor da pergunta → closest chunks por similaridade cosseno)
      ↓
Chunks relevantes + metadata (file name, page number, subject)
      ↓
Prompt construído com contexto grounded (NÃO chat livre)
      ↓
Gemini (gemini-2.5-flash) — gera resposta baseada APENAS no contexto fornecido
```

O tutor deve responder **ESTRITAMENTE com base no contexto recuperado** dos materiais do usuário.

## Princípio importante — RAG vs Chat Livre

A diferença fundamental é:

```text
Pergunta do usuário
        ↓
Recuperação dos materiais relevantes   ← ← ← Isso é o que difere do chat comum
        ↓
Contexto recuperado (chunks reais do PDF)
        ↓
Geração da resposta (obrigado a usar apenas o contexto)
```

### Comportamento crítico

> **Se o contexto recuperado não fornecer informação suficiente, o sistema deve ter um comportamento explícito para essa situação, em vez de induzir a IA a fabricar uma resposta.**

No código (`RAGChatService.askQuestion()`):
- Se `similarities.isEmpty()` → retorna mensagem: "Não encontramos nenhum material de estudo em PDF indexado para este exame. Por favor, faça upload de arquivos PDF associados a esta preparação.";
- Se houver chunks → constrói prompt com `systemPrompt` que instrui: "Baseie sua resposta apenas no Contexto de Estudos fornecido. Não invoque fatos ou traga informações externas que contradigam o contexto.";
- Se o contexto for insuficiente → resposta educada: "O material carregado não tem detalhes suficientes sobre esse ponto específico, mas respondo o que for possível com base no contexto."

### Ao modificar esse fluxo, analisar cuidadosamente

- **chunking**: tamanho dos fragmentos, método de divisão (por página, por tópico);
- **embeddings**: modelo `text-embedding-004`, dimensions, similaridade cosseno;
- **armazenamento**: ChromaDB URL (`localhost:8000`), coleção por `examPrepId`, metadata (subject_id, file_name);
- **consulta semântica**: número de resultados (padrão 5), threshold de similaridade;
- **construção do prompt**: `systemPrompt` com instruções rígidas de groundedness;
- **limites de tokens**: truncar contexto se exceder limite do modelo;
- **tratamento de contexto**: quando há múltiplos chunks, ordenar por relevância;
- **comportamento quando não há contexto relevante**: mensagem explícita vs. alucinação livre.

---

# 15. Modo Socrático

O tutor possui um modo **socrático** (toggle no frontend do Dashboard e Modo Foco).

Nesse modo, o objetivo não é simplesmente entregar a resposta. A IA deve conduzir o estudante por meio de:

- **pergunta** → "Qual é o conceito por trás disso?";
- **pistas** → dicas que guiam o raciocínio;
- **raciocínio progressivo** → dividir o problema em etapas;
- **reflexão sobre o problema** → pedir que o estudante explique o passo a passo.

A intenção é estimular aprendizagem ativa em vez de apenas fornecer a resposta.

### Implementação no backend

No `RAGChatService.askQuestion()`, quando `socratic=true` é recebido, o `systemPrompt` é extendido com:

```
4. MODO SOCRÁTICO ATIVO: Não entregue a resposta pronta nem a resolução direta da questão do estudante. Em vez disso, explique teoricamente o conceito por trás da dúvida de forma simplificada e faça uma ou mais perguntas que provoquem a reflexão ou orientem o raciocínio do aluno para que ele consiga deduzir e chegar à resposta correta por conta própria.
```

### No frontend

O `Dashboard.tsx` e `FocusMode.tsx` possuem um toggle "Socrático" que envia `socratic: true` na requisição para `/api/v1/chat/ask`.

### Ao alterar prompts do tutor, preservar essa diferença entre:

```text
Modo normal → explicar/responder
Modo socrático → conduzir/raciocinar
```

### Considerações

- O modo socrático não altera o fluxo de recuperação (RAG continua buscando no ChromaDB);
- A única diferença é no `systemPrompt` que instrui a IA a conduzir em vez de entregar;
- Se não houver contexto relevante, o comportamento de "não tenho material" é mantido;
- No modo demonstração (sem Gemini configurado), o mock fallback também inclui a instrução socrática.

---

# 16. Interação multimodal

O tutor também pode receber imagens para análise visual.

### Funcionamento

As imagens são convertidas para **base64** no frontend (`FileReader.readAsDataURL`) e enviadas no payload da requisição para `/api/v1/chat/ask`:

```json
{
  "examPrepId": 123,
  "question": "Como resolver este problema?",
  "socratic": false,
  "imageMimeType": "image/png",
  "imageBase64": "iVBORw0KGgoAAAANSUhEUg..."
}
```

O backend (`GeminiService.generateMultimodalContent`) envia a imagem em `inlineData` alongside o texto no prompt para o Gemini.

### Frontend

O `Dashboard.tsx` e `FocusMode.tsx` possuem um botão de anexar imagem (📷) que permite selecionar arquivos de imagem via input file. A imagem é convertida para base64 e anexada à pergunta.

### Considerações ao alterar esse fluxo

- **tamanho do payload**: Gemini tem limite de ~32MB por imagem; imagens grandes devem ser redimensionadas antes do envio;
- **formato da imagem**: suporta PNG, JPEG, WebP via `imageMimeType`;
- **validação**: verificar que o MIME type é suportado;
- **limites da API**: cada chamada multimodal consome mais tokens que texto-only;
- **tratamento de erros**: se a imagem for inválida ou a API falhar, o `RAGChatService` captura a exceção e retorna mensagem de erro;
- **impacto no custo/latência**: imagens aumentam significativamente o custo de cada pergunta;
- **segurança**: imagens são processadas apenas no backend (base64 descriptografado); não há persistência de imagens no banco;
- **fallback**: se o Gemini não estiver configurado, o mock fallback inclui a imagem na resposta.

---

# 17. Podcast de estudos

Os módulos:

```text
podcast
tts
```

implementam geração de conteúdo de áudio (podcast de estudos).

### Fluxo conceitual

```text
Preparação de exame
        ↓
IA cria roteiro (Gemini)
        ↓
Definição de dificuldade (fácil / médio / difícil)
        ↓
TTS (Google Translate API)
        ↓
MP3 (arquivo gerado no backend)
        ↓
Streaming (HTTP Range requests)
        ↓
Player HTML5 no frontend
```

### Níveis de dificuldade

```text
fácil
médio
difícil
```

### Implementação técnica

- **Geração de roteiro**: O Gemini gera o roteiro do podcast baseado no material do `ExamPrep` (matérias, resumos, flashcards);
- **TTS**: `TtsService.textToSpeech(text, targetPath)`:
  - Remove formatação HTML/markdown do roteiro;
  - Divide em trechos menores que 150 caracteres (limite do Google Translate TTS);
  - Faz requisição HTTP GET para `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=pt-BR&q=<encoded text>`;
  - Concatena os áudios gerados em um único MP3;
  - Fallback: se qualquer trecho falhar, gera um MP3 silencioso de 1 segundo (24 bytes);
- **Armazenamento**: MP3 é salvo em `backend/uploads/` ou em storage configurado;
- **Streaming**: O frontend reproduce via HTML5 Audio player com suporte a Range requests (para seek);

### Endpoints

- `POST /api/v1/ai/podcast/stream` — inicia geração de podcast (aceita `examPrepId`, `difficulty`, `script` opcional);
- O endpoint é público (configurado no `SecurityConfig` como `permitAll`).

### Considerações

- O TTS é feito via Google Translate API (gratuito, mas pode ser rate-limited);
- Áudios são gerados no backend e não persistem permanentemente no banco;
- Para melhorar a qualidade do áudio, o roteiro gerado pela IA deve ser formatado em frases curtas e naturais.

---

# 18. Princípios para agentes de IA

Ao trabalhar neste projeto, siga estas regras.

## 18.1 Antes de alterar código

Sempre:

1. localizar o código relevante;
2. entender o fluxo existente;
3. identificar dependências;
4. verificar modelos/DTOs/interfaces relacionados;
5. verificar endpoints utilizados;
6. verificar persistência;
7. verificar impactos no frontend e backend;
8. só então implementar.

Não alterar arquivos simplesmente porque seus nomes parecem relacionados.

---

## 18.2 Não inventar arquitetura

Antes de criar uma nova abstração, procurar se o projeto já possui:

- service;
- repository;
- DTO;
- mapper;
- hook;
- store;
- component;
- util;
- exception;
- configuração equivalente.

**Preferir reutilização à duplicação.**

---

## 18.3 Respeitar os padrões existentes

Novos códigos devem seguir:

- nomenclatura existente;
- organização de pacotes;
- convenções de componentes;
- padrão de DTOs;
- tratamento de exceções;
- padrão de responses;
- estratégia de autenticação;
- padrão de chamadas HTTP;
- convenções de migrations.

Não introduzir uma arquitetura nova apenas por preferência pessoal.

---

# 19. Regras para alterações de banco

Antes de modificar persistência:

```text
Entidade
   ↓
Repository
   ↓
Service
   ↓
Controller
   ↓
Frontend
```

Verificar o impacto em todo o fluxo.

Quando necessário:

```text
Migration
   ↓
Entity/Model
   ↓
Repository
   ↓
Service
   ↓
DTO
   ↓
Controller
   ↓
Frontend
```

Uma alteração de banco raramente deve ser tratada como uma alteração isolada.

---

# 20. Regras para APIs

Antes de alterar um endpoint:

- localizar controller;
- localizar service;
- localizar DTO/request/response;
- localizar repository;
- localizar chamadas no frontend;
- verificar autenticação;
- verificar autorização;
- verificar tratamento de erros;
- verificar compatibilidade com consumidores existentes.

Evitar breaking changes sem necessidade.

---

# 21. Regras para frontend

Antes de criar um componente ou hook:

1. procurar componentes semelhantes;
2. procurar hooks existentes;
3. verificar stores;
4. verificar services/API clients;
5. verificar padrões de loading/error;
6. verificar cache do React Query.

Evitar colocar regra de negócio complexa diretamente no componente visual.

---

# 22. React Query

Ao adicionar ou alterar uma requisição:

- seguir o padrão de hooks existente;
- manter query keys consistentes;
- invalidar queries relacionadas quando necessário;
- evitar chamadas duplicadas;
- respeitar estados de loading/error;
- não duplicar cache manualmente sem motivo.

Ao alterar uma mutation, verificar quais queries precisam ser invalidadas ou atualizadas.

---

# 23. Zustand

Utilizar Zustand para estado global quando o projeto já utiliza esse padrão para o domínio em questão.

Evitar transformar todo estado local em estado global.

Antes de criar uma nova store:

```text
Esse estado realmente precisa ser compartilhado?
```

Se não, preferir estado local ou React Query quando apropriado.

---

# 24. Segurança

Nunca:

- hardcodar API keys;
- commitar secrets;
- colocar credenciais no frontend;
- confiar apenas em validações do cliente;
- expor tokens desnecessariamente;
- desabilitar autenticação para "facilitar testes".

Credenciais e configurações sensíveis devem permanecer em variáveis de ambiente/configurações apropriadas.

---

# 25. IA e prompts

Ao alterar prompts utilizados pelo sistema:

- entender o objetivo do prompt original;
- preservar restrições importantes;
- preservar contexto;
- verificar se o prompt é utilizado por mais de uma funcionalidade;
- considerar tamanho do contexto;
- considerar comportamento em casos sem informação suficiente;
- evitar instruções que incentivem a IA a inventar informações.

Para o tutor RAG, especialmente:

> Se o contexto recuperado não fornecer informação suficiente, o sistema deve ter um comportamento explícito para essa situação, em vez de induzir a IA a fabricar uma resposta.

---

# 26. Tratamento de erros

Ao implementar uma funcionalidade:

- considerar erros de validação;
- erros de autenticação/autorização;
- recursos inexistentes;
- falhas de banco;
- indisponibilidade de serviços externos;
- timeout;
- falhas do Gemini;
- falhas do ChromaDB;
- falhas do TTS;
- arquivos inválidos.

Não tratar toda exceção simplesmente como "erro 500" se o projeto possuir tratamento específico.

---

# 27. Testes e validação

Após modificar código, validar o máximo possível.

Idealmente:

```text
1. Compilação
2. Testes automatizados
3. Testes da API
4. Verificação do frontend
5. Verificação do fluxo completo
```

Quando não for possível executar algum teste, informar claramente a limitação.

Não afirmar que algo foi testado quando não foi.

---

# 28. Diagnóstico de bugs

Ao corrigir um bug:

```text
Sintoma
  ↓
Reprodução
  ↓
Identificação da causa
  ↓
Correção mínima
  ↓
Teste
  ↓
Verificação de regressão
```

Evitar "corrigir" apenas o sintoma quando a causa estiver em outra camada.

Exemplo:

```text
Frontend apresenta dado incorreto
```

Não assumir imediatamente que o problema está no componente.

Investigar:

```text
Componente
 ↓
Hook
 ↓
React Query
 ↓
API
 ↓
Service
 ↓
Repository
 ↓
Banco
```

---

# 29. Alterações mínimas

Preferir:

> **menor mudança que resolve corretamente o problema**

Evitar:

- refatorações não solicitadas;
- renomeações em massa;
- mudança de arquitetura;
- troca de bibliotecas;
- alterações estéticas sem relação com a tarefa;
- reescrita de módulos funcionando.

Se uma refatoração for realmente necessária, explicar o motivo e o impacto.

---

# 30. Compatibilidade

Antes de remover ou alterar algo, procurar seus consumidores.

Pesquisar por:

- nome da classe;
- método;
- endpoint;
- rota;
- variável;
- query key;
- DTO;
- tabela;
- componente;
- função.

Uma alteração aparentemente pequena pode quebrar outros módulos.

---

# 31. Fluxos críticos

Os seguintes fluxos devem ser tratados como áreas de maior impacto:

### Autenticação

```text
Login
 ↓
JWT
 ↓
Estado do usuário
 ↓
Rotas protegidas
 ↓
API
```

### Estudo

```text
Matéria
 ↓
Sessão
 ↓
Metas
 ↓
Analytics
 ↓
Streak
```

### PDF + RAG

```text
Upload
 ↓
Processamento
 ↓
Chunking
 ↓
Embedding
 ↓
ChromaDB
 ↓
Busca
 ↓
Gemini
 ↓
Tutor
```

### Exame + IA

```text
Preparação
 ↓
Matérias
 ↓
Conteúdo
 ↓
Quiz/Simulado
 ↓
Tentativa
 ↓
Resultado
```

### Podcast

```text
Preparação
 ↓
Roteiro
 ↓
TTS
 ↓
MP3
 ↓
Streaming
 ↓
Player
```

---

# 32. Como investigar o projeto

Ao receber uma tarefa, seguir preferencialmente esta ordem:

```text
1. Entender o requisito
2. Localizar o módulo
3. Buscar implementações semelhantes
4. Mapear frontend ↔ backend
5. Identificar persistência
6. Identificar regras de negócio
7. Implementar
8. Testar
9. Revisar regressões
```

Para tarefas maiores, produzir mentalmente um mapa:

```text
Tela
 ↓
Componente
 ↓
Hook/Store
 ↓
API client
 ↓
Controller
 ↓
Service
 ↓
Repository
 ↓
Database/external service
```

---

# 33. Checklist para agentes

Antes de finalizar uma alteração:

- [ ] Entendi o requisito real?
- [ ] Encontrei a implementação existente relacionada?
- [ ] Evitei duplicar código?
- [ ] Mantive os padrões arquiteturais existentes?
- [ ] Verifiquei impactos em outros módulos?
- [ ] Verifiquei autenticação/autorização?
- [ ] Verifiquei banco/migrations quando necessário?
- [ ] Verifiquei frontend e backend quando a mudança atravessa as duas camadas?
- [ ] Considerei tratamento de erros?
- [ ] Executei os testes/validações disponíveis?
- [ ] Não introduzi secrets?
- [ ] Não fiz alterações não relacionadas?
- [ ] Não afirmei testes que não executei?

---

# 34. Regra

> **Não programe a partir de suposições. Primeiro descubra como o sistema funciona; depois faça a menor alteração necessária, respeitando os padrões existentes e validando o impacto da mudança.**

Este documento é um ponto de entrada. Ele **não substitui a leitura do código**.

Quando houver conflito entre este documento e a implementação real, **investigue o código e as configurações atuais antes de decidir**.
