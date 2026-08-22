# Padrões de Código

> Documenta os padrões utilizados no projeto. Para cada padrão: o que é, onde aparece, como seguir ao criar uma nova feature, e exemplos reais.

---

## Backend

### 1. Controller → Service → Repository → Entity (por feature)

**O que é:** Separação em camadas dentro de cada domínio (vertical slice). Controllers expõem endpoints, Services contêm regras de negócio, Repositories acessam dados, Entities são o modelo persistente.

**Onde aparece:** Todo pacote `com.studyplatform.<feature>` (ex.: `auth`, `subject`, `examprep`, `flashcard`, `ai`).

**Como seguir para nova feature:**
1. Crie pacote `com.studyplatform.<nova-feature>`
2. `entity/` — `@Entity` com campos + relacionamentos JPA
3. `repository/` — `interface XxxRepository extends JpaRepository<Xxx, Long>` com métodos derivados (`findByUserId`, `findByIdAndUserId`)
4. `dto/` — Records para Request/Response + anotações Jakarta Validation (`@NotBlank`, `@Size`, `@Min`, `@Max`)
5. `mapper/` — `@Component` com métodos `toEntity`, `toResponseDTO`, `updateEntityFromDTO`
6. `service/` — `@Service` + `@RequiredArgsConstructor`, `@Transactional` nos métodos de escrita; injete `SecurityService` para obter usuário atual
7. `controller/` — `@RestController` + `@RequestMapping("/api/v1/<feature>")`, `@Valid @RequestBody`, delegue ao service

**Exemplo real — Subject:**
- `Subject.java` — Entity com `@Embedded Color color`, `@OneToMany` para `ExamPrep`, `Goal`, `Flashcard`, `UploadedFile`
- `SubjectRepository.java` — `List<Subject> findByUserId(Long userId)`, `Optional<Subject> findByIdAndUserId(Long id, Long userId)`
- `SubjectMapper.java` — `toEntity(SubjectRequestDTO)`, `toResponseDTO(Subject)`, `updateEntityFromDTO(Subject, SubjectRequestDTO)`
- `SubjectService.java` — injeta `SubjectRepository`, `SubjectMapper`, `ExamPrepRepository`, `SecurityService`, `ApplicationEventPublisher`; `delete()` publica `SubjectDeletedEvent`
- `SubjectController.java` — `@Tag(name = "Subjects")`, endpoints CRUD padrão

---

### 2. DTOs separados por direção (Request vs Response)

**O que é:** DTOs de entrada (`*RequestDTO`) e saída (`*ResponseDTO`) são tipos distintos. Não reutiliza Entity como DTO.

**Onde aparece:** `com.studyplatform.<feature>.dto`

**Como seguir:**
- Request: campos que o cliente envia + validação (`@NotBlank`, `@Email`, `@Size(min=8)`, `@Min(0)`, `@Max(100)`)
- Response: campos que o cliente recebe (inclui `id`, `createdAt`, `updatedAt` quando aplicável)
- Mapper faz a conversão bidirecional

**Exemplo real — Auth:**
```java
// AuthRequestDTO.java
record AuthRequestDTO(@Email @NotBlank String email, @Size(min = 8) @NotBlank String password) {}

// AuthResponseDTO.java
record AuthResponseDTO(String token, String name, String email, boolean premium) {}
```

---

### 3. Mapper como `@Component` (sem lógica de negócio)

**O que é:** Conversão Entity ↔ DTO isolada em classe `@Component`. Não acessa banco, não tem `@Transactional`.

**Onde aparece:** `SubjectMapper`, `GoalMapper`, `FlashcardMapper`, `ExamPrepMapper`, `SummaryMapper`, `QuizAttemptMapper`, `SimulationMapper`, `FileAnnotationMapper`, `AiGeneratedContentMapper`.

**Como seguir:**
```java
@Component
@RequiredArgsConstructor
public class XxxMapper {
    public Xxx toEntity(XxxRequestDTO dto) { ... }
    public XxxResponseDTO toResponseDTO(Xxx entity) { ... }
    public void updateEntityFromDTO(Xxx entity, XxxRequestDTO dto) { ... }
}
```
Injete no Service via construtor.

---

### 4. Service com injeção por construtor + `@RequiredArgsConstructor`

**O que é:** Lombok gera construtor com todos os `final` fields. `@Service` + `@Transactional` no nível da classe (leitura) ou método (escrita).

**Onde aparece:** Todos os `*Service.java`.

**Como seguir:**
```java
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class XxxService {
    private final XxxRepository repository;
    private final XxxMapper mapper;
    private final SecurityService securityService; // para obter usuário atual
    // outros repositories de features relacionadas se necessário

    @Transactional
    public XxxResponseDTO create(XxxRequestDTO dto) { ... }
}
```

**Regra:** Use `SecurityService.getAuthenticatedUser()` para obter o `User` logado (retorna proxy lazy via `getReferenceById`).

---

### 5. Global Exception Handler (não capturar `Exception` localmente)

**O que é:** `GlobalExceptionHandler` centraliza tratamento. Services lançam exceções de domínio.

**Onde aparece:** `com.studyplatform.shared.exception.GlobalExceptionHandler`

**Hierarquia:**
```
RuntimeException
├── BusinessException           → HTTP 400 (regra de negócio)
├── ResourceNotFoundException  → HTTP 404
└── BadCredentialsException    → HTTP 401 (Spring Security)
```

**Como seguir:** No service, lance `throw new BusinessException("Mensagem")` ou `throw new ResourceNotFoundException("Entidade", id)`. Não faça `try/catch` genérico no controller.

**Exemplo real:**
```java
// SubjectService.delete()
if (!subject.getUser().getId().equals(currentUser.getId())) {
    throw new BusinessException("Acesso negado a esta matéria");
}
```

---

### 6. Validação Jakarta em DTOs + `@Valid` no Controller

**O que é:** Anotações no DTO de request; `@Valid @RequestBody` no endpoint; `GlobalExceptionHandler.handleValidationException` consolida erros em HTTP 400.

**Onde aparece:** Todos os `*RequestDTO` e Controllers.

**Anotações comuns:** `@NotBlank`, `@NotNull`, `@Email`, `@Size(min, max)`, `@Min`, `@Max`, `@Pattern`, `@Future`, `@Past`.

---

### 7. SecurityService como ponto único de acesso ao usuário autenticado

**O que é:** `SecurityService.getAuthenticatedUser()` extrai o `User` do `SecurityContextHolder`. Usado em **todos** os services que precisam do usuário atual.

**Onde aparece:** `com.studyplatform.shared.security.SecurityService`

**Como seguir:** Injete `SecurityService` no service; chame `securityService.getAuthenticatedUser()`; use o ID para filtrar queries (`repository.findByUserId(user.getId())`).

---

### 8. Eventos de domínio via `ApplicationEventPublisher`

**O que é:** Side-effects cross-feature usam eventos Spring. Publisher no service de origem; Listener com `@EventListener` (síncrono) ou `@Async @EventListener` (assíncrono).

**Onde aparece:**
- `SubjectDeletedEvent` (record) publicado em `SubjectService.delete()`
- `ExamPrepActivityListener` consome e recalcula mastery de goals

**Como seguir:**
```java
// Evento (record imutável)
public record SubjectDeletedEvent(Long subjectId) {}

// No service de origem
@Autowired ApplicationEventPublisher eventPublisher;
public void delete(Long id) {
    // ... validações ...
    eventPublisher.publishEvent(new SubjectDeletedEvent(id));
}

// Listener (em outra feature)
@Component
@RequiredArgsConstructor
public class ExamPrepActivityListener {
    private final GoalService goalService;
    @Async @EventListener
    public void handleExamPrepActivity(ExamPrepActivityEvent event) {
        goalService.recalculateGoalMastery(event.getExamPrepId());
    }
}
```

> Habilite `@EnableAsync` na application principal (`StudyPlatformApplication`).

---

### 9. Value Objects como `@Embeddable` / `record`

**O que é:** Tipos de domínio imutáveis encapsulados na entity.

**Onde aparece:**
- `Color` — `@Embeddable` class com `value` (hex), validação no setter
- `LeitnerBox` — `record LeitnerBox(int value)` com `next(String quality)` e `getIntervalDays()`

**Como seguir:** Prefira `record` para VOs simples; `@Embeddable` class se precisar de lógica de validação no construtor.

---

### 10. Cache Spring (`@Cacheable`) com TTL configurado

**O que é:** Métodos de leitura pesada anotados com `@Cacheable`. `CacheConfig` usa Redis se disponível, senão `ConcurrentMapCacheManager`.

**Onde aparece:** `LearningZoneService.getLearningZone` → `@Cacheable(value = "leaderboard", key = "#examPrepId")`

**Namespaces/TTL (em `CacheConfig`):**
| Cache | TTL |
|-------|-----|
| `studySessions` | 1h |
| `leaderboard` | 5min |
| `aiContent` | 24h |

**Como seguir:** Anote método de leitura pura com `@Cacheable(value="nome", key="#param")`. Invalide com `@CacheEvict` nas escritas.

---

### 11. RAG Pipeline (PDF → Chunk → Embedding → ChromaDB → Retrieval → Gemini)

**O que é:** Fluxo completo implementado em múltiplos serviços.

**Onde aparece:**
- `FileService.upload()` → salva `UploadedFile` + chama indexação
- `PdfProcessingService` (implícito) → extrai texto via **Apache Tika** → cria `PdfChunk` entities
- `EmbeddingService` (interface) → `GeminiService.getEmbedding(text)` chama `text-embedding-004`
- `VectorStoreService` → HTTP para ChromaDB: `storeChunks(collection, chunks)`, `searchSimilar(examPrepId, query, 5)`
- `RAGChatService.askQuestion(examPrepId, question, socratic, imageMimeType, imageBase64)` → orquestra retrieval + prompt

**Comportamento "sem contexto":** Se `searchSimilar` retorna vazio → resposta fixa "Não encontrei material relevante..." (NÃO cai em chat livre com Gemini).

**Modo Socrático:** Flag `socratic=true` adiciona instrução 4 ao system prompt: "MODO SOCRÁTICO ATIVO: conduza o usuário..."

**Multimodal:** `imageMimeType` + `imageBase64` → `GeminiService.generateMultimodalContent(prompt, imageMimeType, imageBase64)`.

**Fallback ChromaDB:** `VectorStoreService.fallbackSearch` faz busca por palavra-chave no `PdfChunkRepository` (LIKE em `chunkText`).

---

### 12. AI Generation Interfaces (`QuestionGenerator`, `EmbeddingGenerator`)

**O que é:** Interfaces que desacoplam a implementação (Gemini) dos consumidores.

**Onde aparece:** `com.studyplatform.ai.QuestionGenerator`, `com.studyplatform.ai.EmbeddingGenerator` — ambos implementados por `GeminiService`.

**Como seguir:** Injete a interface no service consumidor (ex.: `QuizGeneratorService` usa `QuestionGenerator`).

---

### 13. TTS via Google Translate (HTTP direto, sem API key)

**O que é:** `TtsService.textToSpeech(text, targetPath)` divide texto em chunks ≤150 chars, baixa MP3s via `https://translate.google.com/translate_tts`, concatena. Em falha, gera MP3 silencioso de 1s.

**Onde aparece:** `com.studyplatform.ai.TtsService` — chamado pelo fluxo de podcast (`PodcastService`).

---

### 14. API Versionada (`/api/v1/...`) + OpenAPI/Swagger

**O que é:** Todos os controllers usam `@RequestMapping("/api/v1/<feature>")`. Documentação com `@Tag`, `@Operation`, `@ApiResponse`.

**Como seguir:** Novo endpoint sempre em `/api/v1`. Não crie `/api/v2` sem plano de migração.

---

### 15. Auditoria JPA (`@CreatedDate`, `@LastModifiedDate`)

**O que é:** `JpaConfig` tem `@EnableJpaAuditing`. Entities usam:
```java
@CreatedDate
@Column(updatable = false)
private LocalDateTime createdAt;

@LastModifiedDate
private LocalDateTime updatedAt;
```
Migration V11 adicionou essas colunas nas tabelas existentes.

---

### 16. Sanitização HTML com Jsoup

**O que é:** `Jsoup.clean(html, Safelist.basic())` aplicado antes de persistir conteúdo rico (resumos, anotações) para prevenir XSS.

**Onde aparece:** `SummaryService`, `FileAnnotationService` (verificar uso real no código).

---

### 17. Testes (Backend only)

**Stack:** JUnit 5 + Mockito + Spring Boot Test + Testcontainers (MySQL).

**Perfil `test`:** `application-test.properties` usa Testcontainers (não H2).

**Padrões observados:**
- `*ServiceTest` — unitário com `@MockBean` repositories
- `*ControllerTest` — `@WebMvcTest` + `MockMvc`
- `*IntegrationTest` — `@SpringBootTest` + Testcontainers
- `StudyPlatformApplicationTests` — smoke test de contexto

**Frontend:** Sem testes automatizados no projeto (não há `*.test.tsx` em `frontend/src`).

---

## Frontend

### 1. API Client Axios centralizado (`api/client.ts`)

**O que é:** Instância única `apiClient` com interceptors:
- **Request:** injeta `Authorization: Bearer <token>` lido do `useAuthStore.getState().token`
- **Request:** reescreve `/api/...` → `/api/v1/...`
- **Response:** desenvelope `Page<T>` do Spring → retorna `response.data.content` (array) + mantém metadados de paginação
- **Error 401/403:** chama `useAuthStore.getState().logout()` e redireciona para login

**Como seguir:** Sempre importe `apiClient` de `@/api/client`. Não crie instâncias Axios avulsas.

**Exemplo:**
```ts
import { apiClient } from '@/api/client';
const response = await apiClient.get('/exam-preps'); // já vira /api/v1/exam-preps
// response.data é array (já desenvelopado)
```

---

### 2. React Query para server state (preferido sobre `useApi` legacy)

**O que é:** `useQuery`/`useMutation` com chaves estáveis. Cache, dedup, retry, invalidação.

**Onde aparece:** `FocusMode.tsx`, `Flashcards.tsx`, `Quiz.tsx`, `Simulation.tsx`, `Dashboard.tsx`.

**Como seguir:**
```ts
// Chaves estáveis
const keys = {
  examPreps: ['examPreps'] as const,
  focusFlashcards: (examPrepId: string) => ['focus-flashcards', examPrepId] as const,
};

// Hook customizado
export function useExamPreps() {
  return useQuery({
    queryKey: keys.examPreps,
    queryFn: () => apiClient.get('/exam-preps'),
  });
}
```

**Legado:** `useApi.ts` — hook imperativo próprio. Ao refatorar páginas antigas, migre para React Query.

---

### 3. Zustand stores minimalistas (auth + podcast)

**O que é:** Dois stores globais:
- `useAuthStore` — `token`, `name`, `email`, `premium`, `isAuthenticated`, `login()`, `logout()`; persiste em `localStorage` (`study_token`, `study_name`, `study_email`, `study_premium`)
- `usePodcastStore` — `globalAudio` (instância `HTMLAudioElement`), `currentPodcast`, `play()`, `pause()`, `stop()`

**Como seguir:** Novo estado global → novo store em `store/`. Evite props drilling.

---

### 4. Rotas protegidas + layout com `Outlet`

**O que é:** `App.tsx` define `ProtectedLayout` (verifica `isAuthenticated` do `useAuthStore`) e `PublicLayout`. Rotas filhas usam `<Outlet />`.

**Como seguir:** Nova página autenticada → adicione `<Route>` dentro de `<Route element={<ProtectedLayout />}>`. Página pública → dentro de `<PublicLayout>`.

---

### 5. Componentes reutilizáveis em `components/ui/` e `components/study/`

**O que é:** Biblioteca interna de UI. Antes de criar componente, verifique se já existe.

**Principais:**
- `components/ui/` — `Button`, `Card`, `EmptyState`, `FadeIn`, `Modal`, `Input`, `Select`, `Tooltip`, `ProgressRing`, `Avatar`, `Chip`, `Tabs`
- `components/study/` — `FlashcardCard`, `SummaryCard`, `SessionTimer`, `SubjectProgress`, `DailyGoal`, `HeroSession`, `ActivityGrid`, `LearningZoneCard`
- `components/wizard/ExamWizard.tsx` — fluxo multi-etapas com `WizardStepIndicator`
- `components/dashboard/mocks.tsx` — fixtures para modo demo

---

### 6. Modais para fluxos encapsulados

**O que é:** Fluxos complexos ou destrutivos em modal (`PaywallModal`, `OnboardingModal`, `FlashcardCreatorModal`, `SummaryEditor`).

**Como seguir:** Crie componente `XxxModal.tsx` em `components/ui/` ou `components/study/`. Controle via estado no parent ou store.

---

### 7. Global Audio para podcast (`podcastStore.ts`)

**O que é:** Instância única `new Audio()` guardada no store. Permite controle de playback entre navegações.

**Como seguir:** Use `usePodcastStore.getState().play(url)` / `pause()` / `stop()`. Não crie `new Audio()` em componentes.

---

### 8. Tipos compartilhados em `types/index.ts`

**O que é:** Interfaces TypeScript que espelham DTOs do backend.

**Como seguir:** Mantenha sincronizado com DTOs Java. Use em hooks, components, API responses.

---

### 9. Utilitários em `utils/`

**O que é:** Funções puras reutilizáveis: `confetti.ts`, `streak.ts`, `format.ts` (datas, números).

---

## Padrões Transversais

### 1. Autenticação Stateless JWT (HS256)

- Backend: `JwtService` assina/valida; `JwtAuthenticationFilter` extrai do header; `SecurityConfig` stateless + CSRF disabled
- Frontend: `apiClient` interceptor injeta token; logout automático em 401/403
- Secret: `JWT_SECRET` (HEX/Base64/UTF-8, ≥64 chars). Falha no startup se vazio.

### 2. Premium Gate (`User.premium` boolean)

- Backend: campo `premium` no `User` (default `false`). Não há `@PreAuthorize` em controllers — gating é no frontend (`PaywallModal` + `authStore.premium`) e verificado pontualmente em alguns endpoints de IA.
- Frontend: `PaywallModal` exibido quando `!premium` e tenta acessar feature premium.

### 3. Rate Limiting

- `RateLimitingFilter` (antes do JWT filter) limita requisições por janela. Configuração em `SecurityConfig`.

### 4. CORS

- `CORS_ALLOWED_ORIGINS` (CSV) → `SecurityConfig` + `WebMvcConfigurer`. Métodos: GET, POST, PUT, DELETE, OPTIONS, PATCH. Headers: Authorization, Content-Type, Cache-Control, X-Requested-With, Range. `allowCredentials: true`.

### 5. OAuth2 (Google/GitHub)

- `OAuth2AuthenticationSuccessHandler` trata sucesso; IDs/secrets em env (`GOOGLE_CLIENT_ID`, `GITHUB_CLIENT_ID`, etc.). Em dev, valores mock.

### 6. Flyway Migrations

- Diretório: `backend/src/main/resources/db/migration/`
- Convenção: `V<n>__<desc>.sql` (dois underscores)
- **Regra:** Nunca alterar migration aplicada. Criar nova versão incremental.
- Estado atual: V1–V12 (V9 e V10 têm nomes duplicados `add_share_token_to_exam_prep.sql`)

### 7. Open-in-view = false

- `spring.jpa.open-in-view=false` em ambos perfis. Lazy loading só dentro de transação. Services usam `@Transactional` ou `EntityGraph` para evitar `LazyInitializationException`.

---

## Como adicionar uma nova feature (checklist)

1. **Backend:**
   - [ ] Pacote `com.studyplatform.<feature>`
   - [ ] Entity + JPA annotations + auditoria (`@CreatedDate`/`@LastModifiedDate`)
   - [ ] Repository com métodos derivados (`findByUserId`, `findByIdAndUserId`)
   - [ ] Request/Response DTOs + Jakarta Validation
   - [ ] Mapper `@Component` (toEntity, toResponseDTO, updateEntityFromDTO)
   - [ ] Service `@Service` + `@RequiredArgsConstructor` + `SecurityService` + `@Transactional` onde escreve
   - [ ] Controller `@RestController` + `@RequestMapping("/api/v1/<feature>")` + `@Valid` + `@Tag`/`@Operation`
   - [ ] Migration Flyway `V<n>__<desc>.sql`
   - [ ] Testes: `*ServiceTest`, `*ControllerTest`

2. **Frontend:**
   - [ ] Types em `types/index.ts`
   - [ ] Hooks React Query em `hooks/use<Feature>.ts`
   - [ ] Página em `pages/<Feature>.tsx`
   - [ ] Rotas em `App.tsx` (dentro de `ProtectedLayout` ou `PublicLayout`)
   - [ ] Componentes reutilizáveis em `components/ui/` ou `components/study/`
   - [ ] Se precisar de estado global → novo store em `store/`

3. **Integrações (se aplicável):**
   - [ ] RAG: `VectorStoreService` + `GeminiService` + `RAGChatService`
   - [ ] Eventos: publique `ApplicationEvent` + crie `@EventListener` se cross-feature
   - [ ] Cache: `@Cacheable` em leituras pesadas + TTL em `CacheConfig`

---

## Referências rápidas

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — camadas, dependências, pastas
- [`configuration.md`](configuration.md) — env vars, ports, setup local
- [`GLOSSARY.md`](GLOSSARY.md) — termos de domínio e técnicos
- [`project-overview.md`](project-overview.md) — visão de produto e atores