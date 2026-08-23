# StudyFlow - Backend

Backend da plataforma **StudyFlow** construído com **Spring Boot 3**, **Java 21**, **MySQL/PostgreSQL**, **JWT** e integração com **IA (Gemini + RAG)**.

---

## Visão Geral

API REST para gerenciamento completo de estudos, oferecendo:
- **Autenticação & Autorização**: JWT stateless + OAuth2 (Google/GitHub) + BCrypt
- **Gestão de Matérias**: CRUD de subjects com cores e descrições
- **Sessões de Estudo**: Registro, listagem, filtros e estatísticas
- **Metas de Estudo**: Criação, acompanhamento de progresso e mastery
- **Flashcards**: Sistema Leitner (repetição espaçada) com agendamento de revisão
- **Preparação de Exames**: Simulados, geração de questões por IA, tentativas de quiz
- **Upload de Arquivos**: PDFs com extração de texto (Apache Tika) + anotações
- **IA & RAG**: Chat com contexto de arquivos, geração de resumos/quizzes, TTS (podcasts)
- **Analytics**: Zona de aprendizado, heatmap, estatísticas de foco
- **Pomodoro**: Sessões de foco com tipos personalizáveis
- **Observabilidade**: Actuator + Prometheus + Logs JSON (Logstash)

---

## Tech Stack

| Camada | Tecnologia |
|--------|------------|
| **Framework** | Spring Boot 3.2.4 |
| **Linguagem** | Java 21 |
| **Build** | Maven |
| **Banco (Dev)** | MySQL 8.0 |
| **Banco (Prod)** | PostgreSQL (Neon-ready, SCRAM) |
| **ORM** | Spring Data JPA / Hibernate |
| **Segurança** | Spring Security 6 + JWT (JJWT 0.12.5) + OAuth2 Client |
| **Validação** | Bean Validation (Hibernate Validator) |
| **Cache** | Spring Data Redis |
| **Vector Store** | ChromaDB (embeddings para RAG) |
| **IA** | Google Gemini API (chat, embeddings, TTS) |
| **PDF** | Apache Tika 2.9.1 (extração + parsing) |
| **HTML Sanitizer** | Jsoup 1.17.2 (anti-XSS) |
| **Docs API** | SpringDoc OpenAPI 2.3 (Swagger UI) |
| **Monitoramento** | Spring Boot Actuator + Micrometer + Prometheus |
| **Testes** | JUnit 5 + Mockito + Testcontainers (MySQL) + H2 (unitários) |
| **Logs** | Logback + Logstash JSON Encoder |
| **Config** | spring-dotenv (arquivo `.env` em dev) |

---

## Estrutura do Projeto

```
src/main/java/com/studyplatform/
├── StudyPlatformApplication.java      # Entry point (@EnableAsync)
├── ai/                                # Inteligência Artificial & RAG
│   ├── AiController.java              # Endpoints: chat, summary, quiz, podcast
│   ├── ChatController.java            # Chat RAG com contexto de arquivos
│   ├── AiService.java                 # Orquestração Gemini + Vector Store
│   ├── GeminiService.java             # Cliente Gemini (chat/embeddings/TTS)
│   ├── RAGChatService.java            # Busca semântica + geração de resposta
│   ├── vector/                        # Embeddings & Vector Store (ChromaDB)
│   │   ├── EmbeddingGenerator.java
│   │   ├── EmbeddingService.java
│   │   ├── VectorStoreService.java
│   │   └── PdfChunkSimilarity.java
│   ├── dto/                           # Requests/Responses de IA
│   └── AiGeneratedContent.java        # Entity: conteúdo gerado por IA
├── analytics/                         # Analytics & Learning Zone
│   ├── AnalyticsController.java
│   ├── LearningZoneService.java
│   └── LearningZoneResponseDTO.java
├── auth/                              # Autenticação & Autorização
│   ├── AuthController.java            # Login, Register, Refresh, Me
│   ├── AuthService.java               # Lógica de auth + JWT generation
│   └── dto/                           # LoginRequest, RegisterRequest, AuthResponse
├── examprep/                          # Preparação de Exames & Simulados
│   ├── ExamPrepController.java        # CRUD ExamPrep + share público
│   ├── ExamPrepService.java           # Business logic + events
│   ├── ExamSimulationService.java     # Geração e execução de simulações
│   ├── QuestionGenerator.java         # Geração de questões via IA
│   ├── QuizAttemptService.java        # Submissão e correção de tentativas
│   ├── QuizController.java            # Endpoints de quiz
│   ├── SimulationController.java      # Endpoints de simulação
│   ├── StudyContextService.java       # Contexto de estudo para IA
│   └── dto/                           # ExamPrepRequest/Response, QuizAttemptRequest
├── file/                              # Upload & Processamento de Arquivos
│   ├── UploadedFileController.java    # Upload, list, download, delete
│   ├── UploadedFileService.java       # Storage + metadados
│   ├── PdfProcessingService.java      # Extração texto + chunking (Tika)
│   ├── VectorIndexer.java             # Indexação de chunks no ChromaDB
│   ├── StudyContextServiceImpl.java   # Implementação do contexto de estudo
│   └── dto/                           # UploadedFileResponse, FileAnnotationDTO
├── flashcard/                         # Flashcards & Leitner System
│   ├── FlashcardController.java
│   ├── FlashcardService.java          # CRUD + algoritmo Leitner (boxes 1-5)
│   ├── FlashcardMapper.java           # Entity ↔ DTO
│   ├── LeitnerBox.java                # Enum: boxes + intervalos de revisão
│   └── dto/                           # FlashcardRequest/Response
├── goal/                              # Metas de Estudo
│   ├── GoalController.java
│   ├── GoalService.java               # CRUD + cálculo progresso/mastery
│   ├── GoalMapper.java
│   └── dto/                           # GoalRequest/Response
├── pomodoro/                          # Pomodoro & Foco
│   ├── PomodoroController.java
│   ├── PomodoroSessionService.java
│   └── PomodoroSession.java           # Entity: sessões de foco
├── session/                           # Sessões de Estudo
│   ├── StudySessionController.java
│   ├── StudySessionService.java
│   ├── StudySessionMapper.java
│   ├── StudySessionChangedEvent.java  # Evento para listeners (analytics)
│   └── dto/                           # StudySessionRequest/Response
├── subject/                           # Matérias (Subjects)
│   ├── SubjectController.java
│   ├── SubjectService.java
│   ├── SubjectRepository.java
│   └── Subject.java                   # Entity
├── user/                              # Usuário & Perfil
│   ├── User.java                      # Entity + UserDetails
│   ├── UserRepository.java
│   └── UserService.java
└── shared/                            # Configurações & Utilitários Compartilhados
    ├── config/
    │   ├── SecurityConfig.java        # Spring Security + JWT + CORS + RateLimit
    │   ├── OpenApiConfig.java         # Swagger UI + Bearer Auth
    │   ├── CacheConfig.java           # Redis CacheManager
    │   ├── JpaConfig.java             # Auditoria JPA (CreatedAt/UpdatedAt)
    │   ├── DatabaseSchemaFixer.java   # Correções de schema em dev
    │   └── RateLimitingFilter.java    # Rate limiting por IP/usuário
    ├── exception/
    │   ├── BusinessException.java     # Exceções de negócio (4xx)
    │   ├── ErrorResponseDTO.java      # Padronização de erros
    │   └── GlobalExceptionHandler.java # @ControllerAdvice
    └── security/
        ├── JwtAuthenticationFilter.java   # Filtro JWT (valida + seta Authentication)
        ├── JwtUtil.java                   # Geração/validação/parsing de tokens
        ├── UserDetailsServiceImpl.java    # Carrega UserDetails do banco
        └── OAuth2AuthenticationSuccessHandler.java # Handler login social
```

---

## Principais Entidades (JPA)

| Entidade | Descrição |
|----------|-----------|
| `User` | Usuário (email, name, passwordHash, premium, roles, createdAt) |
| `Subject` | Matéria (nome, descrição, cor, userId) |
| `StudySession` | Sessão de estudo (duração, data, observações, subjectId, userId) |
| `Goal` | Meta (título, mastery atual/alvo, datas, subjectId, examPrepId) |
| `Flashcard` | Flashcard (front, back, box 1-5, nextReviewDate, subjectId, summaryId) |
| `ExamPrep` | Preparação de exame (título, data, targetScore, status, shareToken, isPublic) |
| `ExamSimulation` | Simulado gerado (examPrepId, questões JSON, status) |
| `QuizAttempt` | Tentativa de quiz (simulationId, respostas, score, correção) |
| `UploadedFile` | Arquivo PDF (fileName, fileUrl, subjectId, userId, status) |
| `PdfChunk` | Chunk de texto do PDF (content, embedding, pageNumber, fileId) |
| `FileAnnotation` | Anotação em página do PDF (pageNumber, notes, fileId) |
| `PomodoroSession` | Sessão Pomodoro (tipo, duração, completed, userId) |
| `AiGeneratedContent` | Conteúdo gerado por IA (tipo, prompt, resposta, userId) |

---

## Endpoints Principais

### Autenticação (`/api/v1/auth`)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/login` | Login email/senha → retorna JWT |
| POST | `/register` | Registro de novo usuário |
| POST | `/refresh` | Refresh token (se implementado) |
| GET | `/me` | Dados do usuário autenticado |
| GET | `/oauth2/authorization/{provider}` | Inicia login social (Google/GitHub) |

### Matérias (`/api/v1/subjects`)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/` | Lista matérias do usuário |
| POST | `/` | Cria matéria |
| GET | `/{id}` | Detalhes da matéria |
| PUT | `/{id}` | Atualiza matéria |
| DELETE | `/{id}` | Deleta matéria |

### Sessões de Estudo (`/api/v1/study-sessions`)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/` | Lista com filtros (data, subject, paginação) |
| POST | `/` | Cria sessão |
| GET | `/{id}` | Detalhes |
| PUT | `/{id}` | Atualiza |
| DELETE | `/{id}` | Deleta |
| GET | `/stats` | Estatísticas agregadas |

### Metas (`/api/v1/goals`)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/` | Lista metas (filtros: ativas, concluídas) |
| POST | `/` | Cria meta |
| GET | `/{id}` | Detalhes |
| PUT | `/{id}` | Atualiza progresso/mastery |
| DELETE | `/{id}` | Deleta |

### Flashcards (`/api/v1/flashcards`)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/` | Lista (filtros: subject, due, box) |
| POST | `/` | Cria flashcard |
| POST | `/{id}/review` | Registra revisão (atualiza box Leitner) |
| GET | `/due` | Flashcards prontos para revisão |
| DELETE | `/{id}` | Deleta |

### Preparação de Exames (`/api/v1/exam-preps`)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/` | Lista preparações do usuário |
| POST | `/` | Cria preparação |
| GET | `/{id}` | Detalhes |
| PUT | `/{id}` | Atualiza |
| DELETE | `/{id}` | Deleta |
| POST | `/{id}/generate-simulation` | Gera simulado via IA |
| GET | `/public/share/{token}` | Acesso público (compartilhamento) |

### Simulados & Quiz (`/api/v1/simulations`, `/api/v1/quiz`)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/simulations/{examPrepId}` | Lista simulações |
| POST | `/simulations/{id}/start` | Inicia tentativa |
| POST | `/quiz/submit` | Submete respostas → retorna score + correção |

### Arquivos (`/api/v1/files`)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/upload` | Upload PDF (multipart) |
| GET | `/` | Lista arquivos do usuário |
| GET | `/{id}` | Download/visualização |
| DELETE | `/{id}` | Deleta arquivo |
| POST | `/{id}/annotations` | Cria anotação em página |
| GET | `/{id}/annotations` | Lista anotações |

### IA & RAG (`/api/v1/ai`)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/chat` | Chat RAG (contexto: arquivos do usuário) |
| POST | `/summary` | Gera resumo de texto/arquivo |
| POST | `/quiz` | Gera quiz de múltipla escolha |
| POST | `/podcast/generate` | Gera áudio (TTS) em 3 níveis (basic/medium/advanced) |
| GET | `/podcast/stream/{contentId}` | Stream do áudio gerado |

### Analytics (`/api/v1/analytics`)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/learning-zone` | Zona de aprendizado (dificuldade ideal) |
| GET | `/heatmap` | Dados para calendário heatmap |
| GET | `/focus-stats` | Estatísticas de foco/Pomodoro |
| GET | `/weekly-summary` | Resumo semanal |

### Pomodoro (`/api/v1/pomodoro`)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/sessions` | Inicia sessão Pomodoro |
| PUT | `/{id}/complete` | Marca como concluída |
| GET | `/sessions` | Histórico de sessões |
| GET | `/stats` | Estatísticas de foco |

---

## Configuração & Execução

### Pré-requisitos
- **Java 21** (JDK)
- **Maven 3.9+**
- **MySQL 8.0** (dev) ou **PostgreSQL** (prod)
- **Redis 7+**
- **ChromaDB** (para RAG/vetores)
- **Google Gemini API Key** (para IA)

### Variáveis de Ambiente (arquivo `.env` na raiz do backend)

```bash
# Banco de Dados
DB_URL=jdbc:mysql://localhost:3306/study_platform?createDatabaseIfNotExist=true&serverTimezone=UTC&allowPublicKeyRetrieval=true
DB_USERNAME=seu_usuario
DB_PASSWORD=sua_senha
DB_DRIVER=com.mysql.cj.jdbc.Driver
DB_DIALECT=org.hibernate.dialect.MySQLDialect

# JWT
JWT_SECRET=sua_chave_secreta_muito_longa_e_segura
JWT_EXPIRATION=86400000  # 24h em ms

# Redis
SPRING_DATA_REDIS_HOST=localhost
SPRING_DATA_REDIS_PORT=6379

# ChromaDB (Vector Store)
CHROMADB_HOST=localhost
CHROMADB_PORT=8000

# Google Gemini API
GEMINI_API_KEY=sua_chave_gemini

# OAuth2 (opcional)
SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_ID=...
SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_SECRET=...
SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GITHUB_CLIENT_ID=...
SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GITHUB_CLIENT_SECRET=...

# CORS
APP_CORS_ALLOWED_ORIGINS=http://localhost:5173

# Upload
APP_UPLOAD_DIR=./uploads
APP_MAX_FILE_SIZE=10MB
```

### Executar Localmente (Dev)

```bash
# 1. Subir dependências (MySQL, Redis, ChromaDB)
docker-compose up -d db-dev redis-dev chroma-dev

# 2. Configurar .env com suas credenciais

# 3. Rodar a aplicação
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

A API estará disponível em `http://localhost:8080`

### Documentação da API (Swagger UI)
- **URL**: `http://localhost:8080/swagger-ui.html`
- **OpenAPI JSON**: `http://localhost:8080/v3/api-docs`

Para testar endpoints protegidos:
1. Faça login em `POST /api/v1/auth/login`
2. Copie o token `accessToken` retornado
3. No Swagger, clique em **Authorize** → cole: `Bearer {seu_token}`

---

## Docker (Desenvolvimento Completo)

```bash
# Na raiz do projeto (onde está docker-compose.yml)
docker-compose up --build
```

Serviços:
- **Backend**: `http://localhost:8080`
- **Frontend**: `http://localhost:5173`
- **MySQL**: `localhost:3306` (user: `study_user`, pass: `study_pass`, db: `study_platform`)
- **Redis**: `localhost:6379`
- **ChromaDB**: `http://localhost:8000`

---

## Testes

```bash
# Testes unitários + integração (usam Testcontainers MySQL)
./mvnw test

# Apenas testes unitários (H2 in-memory, mais rápidos)
./mvnw test -Dtest=*UnitTest

# Cobertura de testes (JaCoCo)
./mvnw verify jacoco:report
# Relatório em: target/site/jacoco/index.html
```

---

## Observabilidade

### Actuator Endpoints
- `GET /actuator/health` — Health check (liveness/readiness)
- `GET /actuator/metrics` — Métricas JVM, HTTP, DB, Cache
- `GET /actuator/prometheus` — Métricas no formato Prometheus
- `GET /actuator/info` — Info da aplicação (versão, git commit)

### Logs
- **Desenvolvimento**: Console colorido, nível DEBUG para `com.studyplatform`
- **Produção**: JSON estruturado (Logstash encoder) → stdout para coleta (ELK/Loki/Datadog)

### Métricas Principais Exportadas
- `http.server.requests` — Latência, contagem, status codes
- `hikaricp.connections.*` — Pool de conexões DB
- `redis.commands.*` — Latência/erros Redis
- `jvm.memory.*`, `jvm.gc.*` — Memória/GC
- Custom: `study.sessions.created`, `flashcards.reviewed`, `ai.requests.*`

---

## Algoritmo Leitner (Flashcards)

O sistema implementa o **método Leitner** com 5 boxes:

| Box | Intervalo de Revisão | Descrição |
|-----|----------------------|-----------|
| 1 | 1 dia | Novos ou errados recentemente |
| 2 | 3 dias | Acertou 1x |
| 3 | 7 dias | Acertou 2x |
| 4 | 14 dias | Acertou 3x |
| 5 | 30 dias | Mastery (longo prazo) |

**Fluxo**: Ao revisar (`POST /api/v1/flashcards/{id}/review`):
- **Acertou** → `box = min(box + 1, 5)`, `nextReviewDate = now + intervalo[box]`
- **Errou** → `box = 1`, `nextReviewDate = now + 1 dia`

---

## RAG (Retrieval-Augmented Generation)

Arquitetura para chat com contexto dos arquivos do usuário:

1. **Upload PDF** → `PdfProcessingService` extrai texto (Apache Tika) → divide em chunks (~500 tokens)
2. **Embedding** → `EmbeddingGenerator` (Gemini `text-embedding-004`) → vetores 768-d
3. **Indexação** → `VectorIndexer` salva chunks + embeddings no **ChromaDB** (collection por usuário)
4. **Chat RAG** → Usuário pergunta → `EmbeddingService` gera embedding da query → `VectorStoreService` busca top-k chunks similares no ChromaDB → `RAGChatService` monta prompt com contexto → `GeminiService` gera resposta

---

## Segurança

- **Stateless JWT**: Access Token (24h), sem refresh token por enquanto
- **BCrypt**: Hash de senha (cost 10 padrão)
- **Rate Limiting**: Filtro customizado por IP/usuário (configurável)
- **CORS**: Configurável via `app.cors.allowed-origins`
- **HTML Sanitization**: Jsoup em campos de texto rico (resumos, observações)
- **Validação**: Bean Validation em todos os DTOs (`@NotBlank`, `@Email`, `@Size`, etc.)
- **OAuth2**: Login social (Google, GitHub) com handler customizado

---

## CI/CD (GitHub Actions)

O workflow (`.github/workflows/ci.yml`) executa:
1. **Build & Test** (Maven + Testcontainers)
2. **Lint** (Checkstyle / SpotBugs se configurado)
3. **Docker Build** (backend + frontend)
4. **Security Scan** (Trivy / Dependency Check)
5. **Deploy** (opcional, para staging/prod)

---

## Estrutura de Banco (Referência)

Script SQL inicial: `backend/study_management.sql`

Principais tabelas:
- `users`, `subjects`, `study_sessions`, `goals`, `flashcards`
- `exam_preps`, `exam_simulations`, `quiz_attempts`
- `uploaded_files`, `pdf_chunks`, `file_annotations`
- `pomodoro_sessions`, `ai_generated_content`

Índices otimizados para:
- Busca por `user_id` + datas (sessions, flashcards due)
- Busca por `subject_id` (filtrar por matéria)
- Full-text search em `pdf_chunks.content` (via ChromaDB, não SQL)

---

## Roadmap

- [ ] Refresh Token rotation + blacklist
- [ ] WebSockets para notificações em tempo real (streak, sessões)
- [ ] Agendamento de revisões via `@Scheduled` (quartz)
- [ ] Exportação de dados (PDF/CSV/Anki)
- [ ] Multi-tenancy (organizações/equipes)
- [ ] GraphQL endpoint opcional
- [ ] Testes de contrato (Pact)
- [ ] Feature flags (LaunchDarkly/Unleash)

