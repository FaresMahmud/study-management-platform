# Arquitetura

> Documento descreve a arquitetura **efetivamente implementada** no código. Não descreve um design ideal — apenas o que existe.
>
> Referências: [`GLOSSARY.md`](GLOSSARY.md) para termos, [`configuration.md`](configuration.md) para setup, [`patterns.md`](patterns.md) para padrões detalhados.

## Visão geral

Sistema cliente-servidor:

- **`backend/`** — Spring Boot 3.2.4 + Java 21, exposição REST versionada em `/api/v1`.
- **`frontend/`** — React 19 + Vite 8 + TypeScript, SPA que consome a API via Axios.

Não há gateway/BFF intermediário. O frontend fala direto com o backend. O backend conversa com:

- Banco relacional (MySQL em dev, PostgreSQL/Neon em prod)
- ChromaDB (banco vetorial) — externo, porta 8000
- Google Gemini API — externa (texto, embeddings, multimodal)
- Google Translate TTS — externa (áudio de podcast)
- Redis (opcional) — cache, com fallback in-memory
- OAuth2 providers (Google, GitHub) — login social

## Camadas e dependências

O backend é organizado em **pacotes por domínio** (vertical slice por feature) e dentro de cada feature há uma separação em camadas clássica.

### Camadas (por feature)

```text
controller     → endpoints REST (anotados com @RestController, @RequestMapping("/api/v1/<domínio>"))
service        → regras de negócio (anotados com @Service, @Transactional)
repository     → acesso a dados (Spring Data JPA, interface)
dto            → objetos de request/response (Java records ou classes Lombok)
entity         → modelo persistente (JPA @Entity)
```

### Pacotes observados (vertical slice)

```text
com.studyplatform
├── StudyPlatformApplication         (entrypoint)
├── auth                              (feature completa: controller, service, dto, ...)
├── user
├── subject
├── session
├── goal
├── analytics
├── pomodoro
├── summary
├── flashcard
├── examprep                          (inclui quiz, simulation)
├── file                              (inclui annotation, pdf chunks)
├── podcast
├── ai                                (tutor RAG, Gemini, TTS, vector store)
└── shared                            (cross-cutting)
    ├── config                        (SecurityConfig, CacheConfig, JpaConfig, OpenApi, RateLimiting)
    ├── exception                     (GlobalExceptionHandler, BusinessException, ResourceNotFoundException, ErrorResponseDTO)
    └── security                      (JwtService, JwtAuthenticationFilter, UserDetailsServiceImpl, OAuth2AuthenticationSuccessHandler, SecurityService)
```

### Regras de dependência observadas

| Camada | Pode depender de | Não pode depender de |
|---|---|---|
| `controller` | service, dto, exception, security (anotações) | repository diretamente (regra implícita) |
| `service` | repository, dto, entity, security (SecurityService), shared.exception, outros services do mesmo domínio | controller |
| `repository` | entity, Spring Data | service, controller |
| `entity` | outras entities via relacionamento JPA | service, controller |
| `dto` | Jakarta Validation (`@NotBlank`, `@Email`, `@Size`) | entity, service |

> Observação: o código atual mistura algumas vezes service→service e entity→entity (ex.: `Subject` referencia `ExamPrep`, `Goal` referencia `ExamPrep`), o que é esperado por ser o próprio modelo de domínio JPA.

### Comunicação entre features

Features se comunicam principalmente via:

- **Entities compartilhadas** (ex.: `Subject` é referenciado por `Goal`, `ExamPrep`, `Flashcard`, `PomodoroSession`).
- **Chamadas diretas entre Services** (ex.: `SubjectService` chama `ExamPrepRepository` para validar ownership).
- **Eventos de domínio** via `ApplicationEventPublisher` (ver `SubjectDeletedEvent` publicado em `SubjectService.delete()` e consumido por `ExamPrepActivityListener`).

Exemplo concreto — `SubjectService.java`:

```java
private final SubjectRepository subjectRepository;
private final SubjectMapper subjectMapper;
private final com.studyplatform.examprep.ExamPrepRepository examPrepRepository;
private final com.studyplatform.shared.security.SecurityService securityService;
private final ApplicationEventPublisher eventPublisher;
```

## Padrões estruturais

### Backend

| Padrão | Onde aparece | Como seguir |
|---|---|---|
| **Repository (Spring Data)** | `com.studyplatform.<feature>.repository` | Criar `interface XxxRepository extends JpaRepository<Xxx, Long>` com métodos derivados (`findByUserId`, `findByIdAndUserId`). |
| **Service com injeção por construtor** | Todos os `*Service.java` | Usar `@Service` + `@RequiredArgsConstructor` (Lombok). Sem `@Autowired` em campo. |
| **DTO + Mapper** | `dto/` + `<X>Mapper.java` | Request/Response DTOs são separados. Mappers convertem entity ↔ DTO. |
| **Global Exception Handler** | `shared.exception.GlobalExceptionHandler` | Não capturar `Exception` localmente — lançar `BusinessException` ou `ResourceNotFoundException`. |
| **API versionada** | `@RequestMapping("/api/v1/<domínio>")` | Novos endpoints entram sob `/api/v1`. Nunca criar `/api/v2` sem plano de migração. |
| **OpenAPI/Swagger** | `@Operation`, `@ApiResponse`, `@Tag` em controllers | Documentar todo controller com `@Tag` e cada endpoint com `@Operation`. |
| **Auditoria JPA** | `@EnableJpaAuditing` em `JpaConfig` + `@CreatedDate`/`@LastModifiedDate` nas entities | Novos campos de timestamp usam anotações de auditoria. |
| **Eventos Spring** | `SubjectDeletedEvent`, `ExamPrepActivityEvent`, `ExamPrepActivityListener` | Para side-effects cross-feature, publicar evento e consumir com `@EventListener`. |
| **Value Object embeddable** | `Color`, `LeitnerBox` | Encapsular invariantes em records/classes `@Embeddable`. |
| **Cache Spring** | `@Cacheable(value = "leaderboard", key = "#examPrepId")` em `LearningZoneService` | Usar `@Cacheable` em métodos de leitura pesada. Configurar TTL em `CacheConfig`. |

### Frontend

| Padrão | Onde aparece | Como seguir |
|---|---|---|
| **API client com Axios** | `frontend/src/api/client.ts` | Importar `apiClient` e usar `.get`, `.post`, `.put`, `.delete`. |
| **Injeção de JWT automática** | `apiClient.interceptors.request.use(...)` | Não setar token manualmente — o interceptor lê de `useAuthStore.getState().token`. |
| **Reescrita de URL v1** | mesmo arquivo | Chamar `/api/...` em código, o cliente reescreve para `/api/v1/...`. |
| **Paginação Spring → array** | response interceptor | Backend retorna `Page<T>`; o cliente transforma `content` em array e mantém compatibilidade. |
| **Logout automático em 401/403** | response interceptor `error` | Qualquer 401/3 desloga via `useAuthStore.logout()`. |
| **Stores Zustand** | `frontend/src/store/authStore.ts`, `podcastStore.ts` | Usar `useAuthStore` para identidade, `usePodcastStore` para player global. |
| **Persistência de auth** | `authStore` lê/grava em `localStorage` | Tokens persistem entre reloads. Para logout, chame `useAuthStore.getState().logout()`. |
| **React Query** | `pages/FocusMode.tsx`, `pages/Flashcards.tsx` | Para dados server-side, preferir `useQuery`/`useMutation` com chaves estáveis. |
| **Hook `useApi` legado** | `frontend/src/hooks/useApi.ts` | Algumas páginas legadas usam. Ao refatorar, migrar para React Query. |
| **Componentes reutilizáveis** | `components/ui/*`, `components/study/*` | Antes de criar componente, verificar `components/ui/` e `components/study/`. |
| **Modais** | `PaywallModal`, `OnboardingModal`, `FlashcardCreatorModal`, `SummaryEditor` | Encapsular fluxos em modal quando apropriado. |
| **Wizard multi-etapas** | `components/wizard/ExamWizard.tsx` | Usar `WizardStepIndicator` para etapas. |
| **Mock fixtures** | `components/dashboard/mocks.tsx`, `mocks/studyMocks.ts` | Em demo mode, dados mock ficam isolados em `mocks/`. |

## Persistência

### Banco relacional

- **Driver**: MySQL em dev, PostgreSQL em prod. Ambos configurados em `pom.xml` e perfis separados.
- **ORM**: Spring Data JPA + Hibernate. `ddl-auto=update` em ambos os perfis (sem `validate`).
- **Auditoria**: `@EnableJpaAuditing` em `JpaConfig`. Entities com `createdAt`/`updatedAt` usam `@CreatedDate`/`@LastModifiedDate`.
- **Open-in-view**: `spring.jpa.open-in-view=false` em ambos os perfis (evita lazy loading fora de transação).

### Migrations (Flyway)

- **Diretório**: `backend/src/main/resources/db/migration/`.
- **Convenção**: `V<n>__<descrição>.sql` (underscore duplo).
- **Versões aplicadas observadas**: V1 a V12 (com V8/V9/V10/V11/V12 refletindo adições como pomodoro, share token, auditoria).
- **Regra crítica** (codificada no código e documentada): nunca alterar uma migration já aplicada; criar nova.

Exemplos (resumo das tabelas por migration):

| Migration | Conteúdo |
|---|---|
| V1 | Tabelas base (`users`, `subjects`, `goals`, `summaries`, `flashcards`, etc.) |
| V2 | Índices |
| V3 | `exam_preps` |
| V4 | `pdf_chunks` |
| V5 | `ai_generated_content` |
| V6 | `exam_simulations` |
| V7 | `quiz_attempts` |
| V8/V8 alt | `embedding` em `pdf_chunks`; `pomodoro_sessions` |
| V9 | `share_token` em `exam_preps` (segundo nome duplicado — ver migration V10) |
| V10 | `share_token` (arquivo duplicado, prevalece versão posterior) |
| V11 | Campos de auditoria (`created_at`, `updated_at`) |
| V12 | Fix em `goals.objective_hours` |

### Cache (Redis opcional)

`CacheConfig` tenta conectar ao Redis; em falha, usa `ConcurrentMapCacheManager` em memória. Namespaces:

| Cache | TTL | Uso |
|---|---|---|
| `studySessions` | 1h | Lista paginada de sessões |
| `leaderboard` | 5min | Resultado de `LearningZoneService.getLearningZone` |
| `aiContent` | 24h | Conteúdo gerado por IA (resumos, quizzes) |

### Banco vetorial (ChromaDB)

- **URL padrão**: `http://localhost:8000` (`chroma.url` em `application.properties`).
- **Cliente**: `com.studyplatform.ai.vector.VectorStoreService`.
- **Fluxo**: `UploadedFile` → `PdfChunk` (entidade local) + embedding no ChromaDB. Metadata inclui `examPrepId`, `subjectId`, `fileName`.
- **Busca**: `VectorStoreService.searchSimilar(examPrepId, query, 5)` retorna top-5 por similaridade cosseno.

## Autenticação & autorização

### Stack

- **Spring Security 6** + **JJWT 0.12.5**.
- **Stateless**: `SessionCreationPolicy.STATELESS`.
- **CSRF**: desabilitado (não há sessão/cookies).
- **CORS**: origens configuradas por `CORS_ALLOWED_ORIGINS`.

### Fluxo

```text
HTTP request
  → RateLimitingFilter (limite por janela)
  → JwtAuthenticationFilter (extrai Authorization: Bearer <token>)
  → UserDetailsServiceImpl.loadUserByUsername(email)
  → JwtService.isTokenValid(token, userDetails)
  → SecurityContextHolder.setAuthentication(authToken)
  → Controller (rotas autenticadas exigem SecurityContext populado)
```

### Rotas públicas (observadas em SecurityConfig)

- `/api/v1/auth/**`
- `/api/v1/exam-preps/public/share/**`
- `/api/v1/ai/podcast/stream/**`
- `/v3/api-docs/**`, `/swagger-ui/**`, `/swagger-ui.html`
- `/login/oauth2/**`, `/oauth2/**`
- `/actuator/**`

### Service de segurança

`com.studyplatform.shared.security.SecurityService.getAuthenticatedUser()` é o método único usado pelos services para obter o usuário atual. Retorna `userRepository.getReferenceById(user.getId())` (proxy lazy).

### OAuth2

`OAuth2AuthenticationSuccessHandler` (em `shared.security`) trata sucesso de login com Google/GitHub. Configuração em `application.properties` (cliente ID/secret). Em dev, valores mock padrão.

## Background processing

- `@EnableAsync` em `StudyPlatformApplication.java` — habilita execução assíncrona.
- **Eventos de domínio**: `SubjectDeletedEvent` publicado por `SubjectService.delete()`. `ExamPrepActivityListener` em `examprep` escuta esses eventos para side-effects (ex.: limpeza de cache).
- **Listeners `@EventListener`**: método simples, síncrono (sem `@Async`), processa evento in-process.
- **Não há workers/quartz/scheduled tasks explícitos** além do que está descrito.

## Validação e tratamento de erros

### Validação de entrada

- DTOs anotados com Jakarta Validation: `@NotBlank`, `@Email`, `@Size`, `@Min`, `@Max`.
- Controllers anotados com `@Valid @RequestBody`.
- Resposta de erro unificada via `GlobalExceptionHandler.handleValidationException` (`MethodArgumentNotValidException` → HTTP 400 com mensagem consolidada).

### Hierarquia de exceções

```text
RuntimeException
├── BusinessException        → 400 (regra de negócio)
├── ResourceNotFoundException → 404
└── BadCredentialsException  → 401 (tratado pelo Spring Security, mensagem genérica)
```

Erros não mapeados caem em `handleGenericException` → HTTP 500 com mensagem genérica e log.

### Sanitização

- **Jsoup 1.17.2** está disponível para sanitização de HTML em resumos/anotações (combate XSS). Aplicar ao persistir conteúdo rico.

## Integrações externas

| Serviço | Configuração | Onde é usado |
|---|---|---|
| **Google Gemini API** | `GEMINI_API_KEY` | `GeminiService.generateContent`, `generateMultimodalContent`, `getEmbedding` |
| **ChromaDB** | `CHROMA_URL` | `VectorStoreService.searchSimilar` (chamada HTTP) |
| **Google Translate TTS** | nenhuma config (chamada HTTP direta) | `TtsService.downloadChunk` |
| **Redis** | (config Hikari não é o caso; padrão Spring Boot Data Redis) | `CacheConfig` |
| **OAuth2 providers** | `GOOGLE_CLIENT_ID`/`SECRET`, `GITHUB_CLIENT_ID`/`SECRET` | `OAuth2AuthenticationSuccessHandler` |

## Testes — estado atual

- **Framework**: JUnit 5 + Mockito + Spring Boot Test.
- **Localização**: `backend/src/test/java/com/studyplatform/...`.
- **Perfil `test`**: `backend/src/test/resources/application-test.properties` (H2 in-memory, `spring.jpa.hibernate.ddl-auto=create-drop`, Flyway desabilitado).
- **Cobertura observada**:
  - `AuthServiceTest`, `AuthControllerTest`
  - `JwtServiceTest`
  - `GoalMapperTest`, `GoalServiceTest`
  - `SubjectServiceTest`, `SubjectDeletedEventIntegrationTest`
  - `StudySessionChangedEventIntegrationTest`
  - `TtsServiceTest`
  - `RAGChatServiceTest`
  - `ExamSimulationServiceTest`, `QuizAttemptServiceTest`
- **Sem testes no frontend** (observado: `frontend/` não tem `__tests__` ou `*.test.tsx` no projeto — somente em `node_modules`).
- **Smoke de boot**: `StudyPlatformApplicationTests` (Spring context loads).

## Deploy

### Backend

- **Build**: `mvn clean package` (jar).
- **Dockerfile**: presente em `backend/Dockerfile` (analisar antes de publicar).
- **Profile padrão em produção**: `prod` (PostgreSQL/Neon, HikariCP otimizado).
- **Actuator**: exposto em `/actuator/health` e `/actuator/prometheus`.
- **Logs**: `logback-spring.xml` com suporte a JSON (logstash-logback-encoder).

### Frontend

- **Build**: `npm run build` (Vite → `frontend/dist/`).
- **Dockerfile**: presente em `frontend/Dockerfile`.
- **SPA estática**: servida por qualquer servidor de arquivos ou CDN.
- **Variável única**: `VITE_API_URL` (injetada em build-time).

### Diferenças dev vs prod

| Aspecto | dev | prod |
|---|---|---|
| Banco | MySQL local | PostgreSQL/Neon |
| `ddl-auto` | `update` | `update` (controlado por `DDL_AUTO`) |
| `show-sql` | true | false |
| Logging | DEBUG | INFO/WARN |
| OAuth2 | IDs mock | IDs reais via env |
| Gemini | key opcional | key obrigatória |
| Redis | opcional (fallback in-memory) | opcional (mesma config) |

## Estrutura de pastas (referência rápida)

### Backend

```text
backend/
├── pom.xml
├── Dockerfile
├── uploads/                                  (arquivos enviados — gitignored)
├── src/main/java/com/studyplatform/
│   ├── StudyPlatformApplication.java
│   ├── auth/
│   ├── user/
│   ├── subject/
│   ├── session/
│   ├── goal/
│   ├── analytics/
│   ├── pomodoro/
│   ├── summary/
│   ├── flashcard/
│   ├── examprep/                             (inclui quiz/simulation)
│   ├── file/                                 (inclui annotation, pdf chunks)
│   ├── podcast/
│   ├── ai/                                   (Gemini, RAG, TTS, vector store)
│   └── shared/{config,exception,security}/
├── src/main/resources/
│   ├── application.properties
│   ├── application-dev.properties
│   ├── application-prod.properties
│   ├── logback-spring.xml
│   └── db/migration/                         (Flyway)
└── src/test/java/com/studyplatform/          (JUnit + Testcontainers)
```

### Frontend

```text
frontend/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── Dockerfile
├── .env.example                              (VITE_API_URL)
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── api/client.ts                         (axios + interceptors)
    ├── components/
    │   ├── dashboard/
    │   ├── layout/
    │   ├── study/
    │   ├── ui/                               (Button, Card, EmptyState, ...)
    │   ├── wizard/                           (ExamWizard)
    │   ├── Navbar.tsx
    │   └── PdfViewer.tsx
    ├── hooks/                                (useApi legacy, useGamification, useTimer)
    ├── mocks/                                (fixtures de demo)
    ├── pages/                                (Dashboard, FocusMode, Flashcards, Quiz, Simulation, StudyWorkspace, ...)
    ├── store/                                (authStore, podcastStore)
    ├── types/index.ts
    └── utils/                                (confetti, streak, format)
```
