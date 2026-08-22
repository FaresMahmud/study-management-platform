# Glossário — Domínio

> Glossário técnico e de domínio do **Study Management Platform**.
> Use este documento para encontrar o significado preciso de termos, entidades, status e conceitos usados pelo sistema.

## Entidades principais (persistidas)

| Termo | Significado |
|---|---|
| `User` | Conta registrada do usuário. Implementa `UserDetails` (Spring Security). Campos principais: `id`, `nameUser`, `email` (único, usado como username), `passwordUser` (hash BCrypt), `creationDate`, `premium` (Boolean). Arquivo: `backend/.../user/User.java`. |
| `Subject` | Matéria/disciplina do usuário. Campos: `subjectName`, `subjectDescription`, `color` (Value Object hex embutido), `examPrep` (opcional), `createdAt`, `updatedAt`. Arquivo: `backend/.../subject/Subject.java`. |
| `ExamPrep` | Plano de preparação para uma prova real. Campos: `title`, `examDate` (LocalDate), `targetScore` (0–100), `status` (`ExamPrepStatus`), `isPublic`, `shareToken` (único), `createdAt`, `updatedAt`. Arquivo: `backend/.../examprep/ExamPrep.java`. |
| `Goal` | Meta de estudo. Campos: `title`, `targetMastery` e `currentMastery` (0–100), `startDateGoal`, `endDateGoal`, `subject` (opcional), `examPrep` (opcional). Arquivo: `backend/.../goal/Goal.java`. |
| `StudySession` | Sessão registrada de estudo. Campos: `startedAt`, `duration`, `subject` (ManyToOne), `user`, observações. Arquivo: `backend/.../session/StudySession.java`. |
| `PomodoroSession` | Sessão de foco cronometrada. Campos: `startedAt`, `durationMinutes`, `completed`, `contentConsumed`, `examPrep`, `user`. Arquivo: `backend/.../pomodoro/PomodoroSession.java`. |
| `Summary` | Resumo textual associado a uma `Subject`. Campos: `title`, `content` (LONGTEXT para HTML), `creationDate`, `lastModifiedDate`. Arquivo: `backend/.../summary/Summary.java`. |
| `Flashcard` | Cartão Leitner com frente/verso. Campos: `front`, `back`, `nextReviewDate`, `box` (1–5 embutido), `creationDate`, `subject`, `summary` (opcional). Arquivo: `backend/.../flashcard/Flashcard.java`. |
| `UploadedFile` | PDF enviado pelo usuário. Campos: `fileName`, `filePath`, `contentType`, `fileSize`, `uploadDate`, `subject`, `user`. Arquivo: `backend/.../file/UploadedFile.java`. |
| `FileAnnotation` | Anotação/destaque dentro de um PDF. Campos: `pageNumber`, `type` (ex.: `"highlight"`, `"note"`), `content` (texto), `lastModified`, `uploadedFile`. Arquivo: `backend/.../file/FileAnnotation.java`. |
| `PdfChunk` | Fragmento de texto extraído de um PDF, indexado vetorialmente. Campos: `chunkText`, `chunkIndex`, `embedding`, `uploadedFile`, `subject`, `examPrep`. Arquivo: `backend/.../file/PdfChunk.java`. |
| `AiGeneratedContent` | Conteúdo gerado por IA (resumo, quiz, etc.) persistido. Campos: `contentType`, `prompt`, `response`, `user`, `examPrep`/`subject`. Arquivo: `backend/.../ai/AiGeneratedContent.java`. |
| `QuizAttempt` | Registro de uma tentativa de quiz. Campos: `correctAnswers`, `totalQuestions`, `score` (0–100), `contentJson`, `attemptTime`, `examPrep`, `user`. Arquivo: `backend/.../examprep/QuizAttempt.java`. |
| `ExamSimulation` | Simulado cronometrado de prova. Campos: `startTime`, `endTime`, `score`, `questionsTotal`, `questionsCorrect`, `examPrep`, `user`. Arquivo: `backend/.../examprep/ExamSimulation.java`. |

## Value Objects / Embedded Types

| Termo | Significado |
|---|---|
| `Color` | Value Object embeddable representando cor hexadecimal da matéria (`Subject.color`). Arquivo: `backend/.../subject/Color.java`. |
| `LeitnerBox` | Record Java embeddable com `value` (int 1–5). Define intervalo de revisão em dias e progressão. Arquivo: `backend/.../flashcard/LeitnerBox.java`. |
| `DifficultyLevel` | Enum usado na geração de conteúdo de IA/podcasts: `EASY`, `MEDIUM`, `HARD`. Arquivo: `backend/.../ai/DifficultyLevel.java`. |
| `ContentType` | Enum usado em `AiGeneratedContent`: tipos como `SUMMARY`, `QUIZ`, `FLASHCARD`, `SCRIPT`, `EXPLANATION`. Arquivo: `backend/.../ai/ContentType.java`. |
| `ExamPrepStatus` | Enum do ciclo de vida da preparação: `ACTIVE`, `COMPLETED`, `CANCELLED`. Arquivo: `backend/.../examprep/ExamPrepStatus.java`. |
| `SimulationStatus` | Enum do ciclo do simulado: `IN_PROGRESS`, `FINISHED`, `ABANDONED`. Arquivo: `backend/.../examprep/SimulationStatus.java`. |

## Conceitos de domínio

| Termo | Significado |
|---|---|
| **Preparação de exame (ExamPrep)** | Plano estruturado de estudos para uma prova específica. Pode ter várias `Subject`s, `Goal`s, `QuizAttempt`s e `ExamSimulation`s. |
| **Simulado** | Tentativa completa de prova cronometrada (`ExamSimulation`). Possui score e intervalo de tempo. |
| **Quiz / Tentativa** | Conjunto de perguntas para testar conhecimento. Registro persistido em `QuizAttempt`. |
| **Meta (Goal)** | Objetivo mensurável com nível de domínio alvo (`targetMastery`). O `currentMastery` é alimentado por sessões, quizzes e simulados. |
| **Maestria (Mastery)** | Percentual (0–100) que indica domínio de uma meta/matéria. Calculado por `Goal.getCompletionPercentage()` e atualizado por `updateMastery(int)`. |
| **Sessão de estudo** | Intervalo cronometrado de estudo. Pode ser registrado livremente (`StudySession`) ou gerado pelo Pomodoro (`PomodoroSession`). |
| **Pomodoro** | Técnica de cronômetro de foco. A duração padrão é 25 minutos. O histórico é ligado a um `ExamPrep`. |
| **Foco (Focus Mode)** | Interface imersiva do frontend com timer Pomodoro e ferramentas (flashcards, resumos, tutor) ativas. Arquivo: `frontend/.../pages/FocusMode.tsx`. |
| **Resumo (Summary)** | Texto de estudo rico (HTML) vinculado a uma matéria. Pode servir como fonte para flashcards via IA. |
| **Flashcard** | Cartão de memorização com frente/verso seguindo Leitner. |
| **Sistema Leitner** | Caixas de revisão espaçada (1→5). `LeitnerBox.getIntervalDays()` retorna: 1=1d, 2=3d, 3=7d, 4=14d, 5=30d. Avança com `"easy"`/`"good"`, reinicia com `"hard"`. |
| **Anotação de PDF** | Destaque ou nota atrelada a uma página específica de um `UploadedFile`. |
| **Material / Fonte de estudo** | PDFs e resumos indexados que alimentam o RAG. |
| **Zona de Aprendizado (Learning Zone)** | Classificação gamificada calculada por `LearningZoneService`: `COMFORT` (accuracy ≥ 85), `PANIC` (accuracy < 60 com tentativas), `LEARNING` (caso contrário). |
| **Streak** | Sequência de dias consecutivos com atividade (sessões, quizzes ou simulados). Calculado em `LearningZoneService.calculateStreak()`. |
| **Compartilhamento público** | Recurso do `ExamPrep` controlado por `isPublic` + `shareToken`. Endpoint público: `GET /api/v1/exam-preps/public/share/{shareToken}`. |

## Conceitos de IA / RAG

| Termo | Significado |
|---|---|
| **RAG (Retrieval-Augmented Generation)** | Pipeline que recupera trechos relevantes do material do usuário e os injeta no prompt do Gemini. Arquivo principal: `backend/.../ai/RAGChatService.java`. |
| **Embedding** | Vetor numérico que representa semanticamente um texto. Gerado via Gemini `text-embedding-004`. Arquivo: `backend/.../ai/vector/EmbeddingService.java`. |
| **VectorStore / ChromaDB** | Banco vetorial onde `PdfChunk` são indexados. URL padrão `http://localhost:8000`. Arquivo: `backend/.../ai/vector/VectorStoreService.java`. |
| **Chunk** | Fragmento de texto de um PDF usado tanto para embedding quanto para o contexto do tutor. |
| **Similaridade (cosine)** | Métrica usada pela busca vetorial. `VectorStoreService.searchSimilar(examPrepId, query, 5)` retorna os top-N mais próximos. |
| **Tutor** | Endpoint `POST /api/v1/chat/ask` que orquestra retrieval + Gemini. Implementado em `RAGChatService.askQuestion`. |
| **Modo Socrático** | Flag `socratic: true` na requisição ao tutor. Altera o prompt para conduzir em vez de entregar a resposta. |
| **Modo Multimodal** | Envio de `imageMimeType` + `imageBase64` para análise visual via `GeminiService.generateMultimodalContent`. |
| **"Sem contexto"** | Quando a busca no ChromaDB retorna vazia. O sistema responde com mensagem fixa, **não** cai em chat livre. |
| **Mock Fallback** | Quando `GEMINI_API_KEY` está vazia. O `RAGChatService` retorna resposta simulada para fins de demo. |
| **Podcast / TTS** | Geração de áudio a partir de roteiro via Google Translate TTS. Arquivo: `backend/.../ai/TtsService.java`. |
| **QuestionGenerator** | Interface implementada por `GeminiService` para geração de questões. |
| **EmbeddingGenerator** | Interface implementada por `GeminiService` para geração de embeddings. |
| **Roteiro** | Texto gerado por IA usado como entrada do TTS. |

## Autenticação & autorização

| Termo | Significado |
|---|---|
| **JWT (JSON Web Token)** | Token assinado (HS256) usado em toda requisição autenticada. Configurado por `JWT_SECRET` e `JWT_EXPIRATION`. Arquivo: `backend/.../shared/security/JwtService.java`. |
| **Bearer Token** | Formato do header: `Authorization: Bearer <token>`. Processado em `JwtAuthenticationFilter`. |
| **Stateless** | API não mantém sessão. Cada requisição precisa do JWT. Configurado em `SecurityConfig`. |
| **Premium** | Flag `User.premium` (default `false`). Define acesso a recursos avançados de IA. |
| **OAuth2** | Suporte configurado para login com Google e GitHub (`OAuth2AuthenticationSuccessHandler`). |
| **RateLimitingFilter** | Filtro que limita número de requisições por janela de tempo. Configurado antes do filtro JWT. |
| **Roles** | Não há sistema de roles hoje — `User.getAuthorities()` retorna lista vazia. Autorização é por endpoint, não por papel. |
| **SecurityService** | Wrapper que retorna o `User` autenticado a partir do `SecurityContextHolder`. Usado em todos os Services. |

## Frontend (UI e estado)

| Termo | Significado |
|---|---|
| **React Query** | Camada de cache server-state. Hooks `useQuery`/`useMutation` com chaves estáveis (ex.: `['examPreps']`, `['focus-flashcards', id]`). |
| **Zustand** | Store global minimalista. Stores atuais: `useAuthStore` (autenticação persistente em localStorage) e `usePodcastStore` (player de áudio global). |
| **apiClient** | Instância Axios configurada com `VITE_API_URL`. Injeta JWT automaticamente. Reescreve `/api/...` para `/api/v1/...`. Arquivo: `frontend/src/api/client.ts`. |
| **VITE_API_URL** | Variável de ambiente do frontend apontando para a base da API. Default: `http://localhost:8080/api`. |
| **useApi (legacy)** | Hook imperativo próprio (`frontend/.../hooks/useApi.ts`). Algumas páginas legadas ainda usam em vez de React Query. |
| **PaywallModal** | Modal exibido quando um usuário não Premium tenta acessar recurso restrito. |
| **EmptyState** | Componente reutilizável para estados vazios. |
| **FadeIn** | Componente utilitário para animação de entrada. |
| **Wizard (ExamWizard)** | Fluxo guiado de criação de ExamPrep em várias etapas (data, matérias, score, materiais). |
| **Dashboard** | Página principal. Mostra streak, zona, hero session, daily goal, ações rápidas e chat do tutor. |
| **HeroSession** | Card grande de destaque no Dashboard com próxima ação recomendada. |
| **ActivityGrid** | Grade de atalhos rápidos no Dashboard. |
| **DailyGoal** | Card de meta diária com checklist. |
| **SubjectProgress** | Visualização de progresso por matéria no Dashboard. |
| **Modo Foco (FocusMode)** | Tela cheia imersiva com timer Pomodoro + tabs (flashcards, resumos, tutor RAG). |
| **globalAudio** | Instância global `new Audio()` controlada por `usePodcastStore` para podcasts. |
| **lucide-react** | Biblioteca de ícones usada pela UI. |
| **pdfjs-dist** | Biblioteca de renderização de PDF no frontend. |

## Operacional

| Termo | Significado |
|---|---|
| **Flyway** | Ferramenta de migration do schema. Versões em `backend/src/main/resources/db/migration/V<n>__<desc>.sql`. Já aplicadas: V1–V12. |
| **spring-dotenv** | Carrega `.env` em desenvolvimento (dependência no `pom.xml`). |
| **CORS** | Origens configuradas via `CORS_ALLOWED_ORIGINS` (default `http://localhost:5173,http://localhost:5174`). |
| **Actuator** | Endpoints de saúde e métricas expostos em `/actuator/**`. Configurado em `application.properties`. |
| **Prometheus** | Registry de métricas exposto em `/actuator/prometheus` (via Micrometer). |
| **Redis Cache** | Cache opcional (`spring-boot-starter-data-redis`). Se indisponível, cai em `ConcurrentMapCacheManager` em memória. Arquivo: `backend/.../shared/config/CacheConfig.java`. |
| **HikariCP** | Pool de conexões JDBC. Configurações em `application-prod.properties`. |
| **Lombok** | Reduz boilerplate em entities/DTOs (`@Data`, `@Builder`, `@RequiredArgsConstructor`). |
| **SpringDoc OpenAPI** | Documentação Swagger em `/swagger-ui.html` e `/v3/api-docs`. |
| **Jsoup** | Sanitização de HTML contra XSS (resumos, anotações). |
| **Apache Tika** | Extração de texto de PDFs para o pipeline RAG. |
| **Testcontainers** | Sobe MySQL em container Docker para testes de integração. |
| **spring.profiles.active** | Perfil Spring ativo (`dev`, `prod`, `test`). Default: `dev`. |
| **API versionada** | Todos os endpoints vivem sob `/api/v1/...`. O `apiClient` reescreve `/api/...` para `/api/v1/...`. |

## Termos de fluxo de negócio

| Termo | Significado |
|---|---|
| **Onboarding** | Fluxo inicial após cadastro (modal de boas-vindas). |
| **Login social** | Login via Google ou GitHub configurado em OAuth2. |
| **Registro de sessão** | Persistir um intervalo de estudo, manual ou via Pomodoro. |
| **Início de Pomodoro** | `POST /api/v1/pomodoro/start` com `examPrepId` e `duration`. |
| **Conclusão de Pomodoro** | `POST /api/v1/pomodoro/complete/{id}` com `contentConsumed`. |
| **Revisão de Flashcard** | `POST /api/v1/flashcards/{id}/review` com `quality` (`easy`/`good`/`hard`). |
| **Tentativa de Quiz** | `POST /api/v1/quiz/attempt` registra acertos/total e score. |
| **Compartilhar ExamPrep** | `POST /api/v1/exam-preps/{id}/share` gera `shareToken`. |
| **Revogar compartilhamento** | `DELETE /api/v1/exam-preps/{id}/share` torna a preparação privada. |
| **Upload de PDF** | `POST /api/file/upload` envia arquivo vinculado a `Subject`. |
| **Indexação para RAG** | Após upload, conteúdo é chunkado, recebe embedding e vai para o ChromaDB. |
| **Pergunta ao tutor** | `POST /api/v1/chat/ask` com `examPrepId`, `question`, opcionalmente `socratic`, `imageMimeType`, `imageBase64`. |
| **Geração de podcast** | `POST /api/v1/ai/podcast/stream` com `examPrepId` e `difficulty`. |

## Endpoints-chave (referência rápida)

| Endpoint | Função |
|---|---|
| `POST /api/v1/auth/register` | Registro + JWT |
| `POST /api/v1/auth/login` | Login + JWT |
| `GET /api/v1/exam-preps` | Listar preparações |
| `POST /api/v1/exam-preps` | Criar preparação |
| `POST /api/v1/exam-preps/{id}/share` | Gerar token público |
| `GET /api/v1/exam-preps/public/share/{shareToken}` | Acesso público |
| `GET /api/v1/subjects` | Listar matérias |
| `POST /api/v1/goals` | Criar meta |
| `GET /api/v1/goals` | Listar metas |
| `GET /api/v1/flashcards` | Listar flashcards |
| `GET /api/v1/flashcards/due` | Cards agendados para hoje |
| `POST /api/v1/flashcards/{id}/review` | Registrar revisão |
| `POST /api/v1/pomodoro/start` | Iniciar Pomodoro |
| `POST /api/v1/pomodoro/complete/{id}` | Concluir Pomodoro |
| `GET /api/v1/pomodoro/list` | Listar sessões de um exame |
| `POST /api/v1/quiz/attempt` | Registrar tentativa |
| `GET /api/v1/analytics/learning-zone?examPrepId=` | Métricas de zona |
| `POST /api/v1/chat/ask` | Pergunta ao tutor RAG |
| `POST /api/v1/ai/podcast/stream` | Gerar podcast |
| `GET /actuator/health` | Health check |
| `GET /swagger-ui.html` | Documentação Swagger |
