# Preparação para Produção

Checklist completo e decisões de arquitetura para deploy em produção.

---

## Resumo Executivo

| Área | Status | Observações |
|---|---|---|
| Arquitetura | ✅ | Vertical slice, stateless, escalável horizontalmente |
| APIs | ✅ | RESTful, versionadas (`/api/v1`), OpenAPI/Swagger |
| Autenticação | ✅ | JWT HS256 stateless, BCrypt, rate limiting |
| CORS | ✅ | Configurável via `APP_CORS_ALLOWED_ORIGINS` |
| Uploads/PDFs | ✅ | Multipart, validação, RAG via ChromaDB |
| Streaming Áudio | ✅ | Range requests, Google Translate TTS |
| Banco de Dados | ✅ | PostgreSQL/Neon prod, Flyway migrations |
| ChromaDB | ✅ | Vector store isolado, healthcheck |
| Gemini/TTS | ✅ | API keys via env, fallback graceful |
| Variáveis de Ambiente | ✅ | Documentadas, sem hardcoded, secrets no CI |
| Docker | ✅ | Multi-stage, resource limits, healthchecks |
| CI/CD | ✅ | GitHub Actions, test → build → deploy |
| URLs Hardcoded | ✅ | Removidas, `VITE_API_URL` obrigatória |
| Infraestrutura | ✅ | Docker Compose prod, pronto para K8s |

---

## Arquitetura

### Backend: Vertical Slice por Feature

```
src/main/java/com/studyplatform/
├── auth/           # Autenticação, JWT, OAuth2
├── subject/        # Matérias, cores, metas
├── flashcard/      # Leitner, revisão espaçada
├── exam/           # Exam prep, compartilhamento
├── quiz/           # Quizzes, simulados, scoring
├── summary/        # Resumos HTML
├── pdf/            # Upload, RAG, anotações
├── podcast/        # Geração TTS, roteiros
├── analytics/      # Métricas, learning zone
├── premium/        # Feature flags
└── shared/         # Security, config, exceptions
```

**Benefícios para produção:**
- Deploy independente por feature (futuro: microservices)
- Baixo acoplamento, alta coesão
- Fácil isolamento de falhas

### Frontend: Componentes por Tipo + Domínio

```
src/
├── components/
│   ├── layout/       # Sidebar, Header, DashboardLayout
│   ├── ui/           # Button, Card, Input, Select, Modal
│   ├── subject/      # SubjectCard, SubjectForm
│   ├── flashcard/    # FlashcardViewer, ReviewSession
│   └── ...
├── pages/            # Rotas (Subjects, Analytics, etc.)
├── hooks/            # useAuth, useApi, useDebounce
├── stores/           # Zustand (auth, podcast)
├── api/              # Axios client, endpoints
└── styles/           # Design system (index.css)
```

---

## APIs

### Versionamento

Todas as rotas versionadas em `/api/v1/`:
- `/api/v1/auth/*`
- `/api/v1/subjects/*`
- `/api/v1/flashcards/*`
- etc.

### Axios Interceptors (Frontend)

```typescript
// client.ts
- Adiciona JWT do authStore
- Reescreve `/api` → `/api/v1`
- Desenvelopa paginação Spring Data (`{content, totalElements, ...}`)
- Trata 401 → logout automático
- Trata erros de rede
```

### OpenAPI/Swagger

- Disponível em `/swagger-ui.html`
- Gerado via SpringDoc OpenAPI
- DTOs anotados com `@Schema`

---

## Autenticação & Segurança

### JWT Stateless

```java
// JwtService
- Algoritmo: HS256
- Expiração: 24h (configurável via JWT_EXPIRATION)
- Secret: ≥ 256 bits (32 chars) — validado no startup
- Claims: sub (email), roles, iat, exp
```

### BCrypt

- Strength: 12 (padrão Spring Security)
- Aplicado em `UserDetailsServiceImpl`

### Rate Limiting

```java
// RateLimitingFilter
- Bucket por IP + endpoint
- Configurável via properties
- Retorna 429 com Retry-After
```

### Rotas Públicas Explícitas

```java
// SecurityConfig
.requestMatchers(
  "/api/v1/auth/**",
  "/api/v1/public/**",
  "/swagger-ui/**",
  "/v3/api-docs/**",
  "/actuator/health"
).permitAll()
```

### CORS

```properties
# application.properties
app.cors.allowed-origins=https://app.dominio.com,https://www.dominio.com
app.cors.allowed-methods=GET,POST,PUT,PATCH,DELETE,OPTIONS
app.cors.allowed-headers=*
app.cors.allow-credentials=true
app.cors.max-age=3600
```

---

## Uploads & PDFs

### Configuração

```properties
# application.properties
spring.servlet.multipart.max-file-size=50MB
spring.servlet.multipart.max-request-size=50MB
```

### Validação

- Content-Type: `application/pdf`
- Tamanho máx: 50MB
- Sanitização de nome de arquivo
- Armazenamento: sistema de arquivos / S3 (futuro)

### RAG (Retrieval-Augmented Generation)

1. PDF → extração de texto (Apache PDFBox)
2. Chunking semântico (~500 tokens)
3. Embeddings via `text-embedding-004` (Gemini)
4. Armazenamento no ChromaDB
5. Query → embedding → similarity search → contexto → Gemini

---

## Streaming de Áudio (Podcasts)

### Geração

- Roteiro → Google Translate TTS (gratuito, sem API key formal)
- MP3 gerado em chunks
- Armazenado temporariamente / CDN (futuro)

### Entrega

```java
// PodcastController
@GetMapping("/api/v1/podcasts/{id}/audio")
public ResponseEntity<Resource> streamAudio(
    @PathVariable Long id,
    @RequestHeader(value = "Range", required = false) String range
) {
    // Suporte a Range Requests (206 Partial Content)
    // Content-Type: audio/mpeg
    // Accept-Ranges: bytes
}
```

**Frontend:** `<audio>` nativo com `preload="metadata"`

---

## Banco de Dados

### Desenvolvimento: MySQL 8.0

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/study_platform
spring.datasource.username=study_user
spring.datasource.password=study_pass
spring.jpa.hibernate.ddl-auto=update
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQLDialect
```

### Produção: PostgreSQL / Neon

```properties
spring.datasource.url=jdbc:postgresql://host/db?sslmode=require
spring.datasource.username=study_user
spring.datasource.password=${DB_PASSWORD}
spring.jpa.hibernate.ddl-auto=validate  # ou update
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
```

### Flyway Migrations

| Versão | Descrição |
|---|---|
| V1 | Create users table |
| V2 | Create subjects, goals |
| V3 | Create flashcards, Leitner boxes |
| V4 | Create exams, exam_prep |
| V5 | Create quizzes, attempts |
| V6 | Create summaries |
| V7 | Create PDFs, annotations |
| V8 | Create podcasts, scripts |
| V9 | Create analytics tables |
| V10 | Premium flags |
| V11 | OAuth2 tables |
| V12 | Indexes, constraints |

**Produção:** `DDL_AUTO=validate` — Flyway gerencia schema

### HikariCP Tuning

```properties
spring.datasource.hikari.maximum-pool-size=10
spring.datasource.hikari.minimum-idle=2
spring.datasource.hikari.idle-timeout=300000
spring.datasource.hikari.max-lifetime=1200000
spring.datasource.hikari.connection-timeout=20000
spring.datasource.hikari.leak-detection-threshold=60000
```

---

## ChromaDB (Vector Store)

### Configuração

```properties
chromadb.host=chroma  # docker network
chromadb.port=8000
```

### Collections

| Collection | Descrição | Embedding Model |
|---|---|---|
| `pdf_chunks` | Chunks de PDFs indexados | text-embedding-004 |
| `flashcard_vectors` | Flashcards para busca semântica | text-embedding-004 |

### Healthcheck

```bash
curl -f http://chroma:8000/api/v1/heartbeat
```

---

## Gemini AI & TTS

### Modelos Utilizados

| Tarefa | Modelo | Configuração |
|---|---|---|
| Chat/Resumos/Quizzes | `gemini-2.5-flash` | temperature=0.7, topP=0.9 |
| Embeddings | `text-embedding-004` | 768 dims |
| Multimodal (PDF vision) | `gemini-2.5-flash` | image + text |

### TTS (Text-to-Speech)

- **Provedor:** Google Translate TTS (não oficial, gratuito)
- **Limitações:** ~200 chars/request, rate limited
- **Produção:** Migrar para **Google Cloud TTS** ou **ElevenLabs**
- **Fallback:** Graceful degradation — erro não quebra fluxo

### Variáveis de Ambiente

```env
GEMINI_API_KEY=AIza...          # Obrigatório para IA
# GOOGLE_TTS_API_KEY=...        # Futuro: Cloud TTS oficial
```

---

## Variáveis de Ambiente

### Backend (`backend/.env.example`)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | Sim | `dev` \| `prod` \| `test` |
| `JWT_SECRET` | Sim | ≥ 32 chars, HS256 |
| `SPRING_DATASOURCE_URL` | Sim | JDBC URL |
| `SPRING_DATASOURCE_USERNAME` | Sim | DB user |
| `SPRING_DATASOURCE_PASSWORD` | Sim | DB password |
| `APP_CORS_ALLOWED_ORIGINS` | Sim | CSV de origens |
| `GEMINI_API_KEY` | Sim* | Para features IA (*opcional se desabilitado) |
| `SPRING_DATA_REDIS_HOST` | Não | Default: localhost |
| `SPRING_DATA_REDIS_PORT` | Não | Default: 6379 |
| `CHROMADB_HOST` | Não | Default: localhost |
| `CHROMADB_PORT` | Não | Default: 8000 |
| `HIKARI_MAX_POOL_SIZE` | Não | Default: 10 |
| `HIKARI_MIN_IDLE` | Não | Default: 2 |

### Frontend (`frontend/.env.example`)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `VITE_API_URL` | **Sim** | URL da API (sem fallback!) |

### Produção (`.env.production.example`)

Usado pelo `docker-compose.prod.yml` — mesmas variáveis com valores de produção.

---

## Docker & Infrastructure

Ver [`docker.md`](docker.md) para detalhes completos.

### Resumo Produção

```yaml
# docker-compose.prod.yml
services:
  postgres:    # PostgreSQL 16, healthcheck, volumes
  redis:       # Redis 7, healthcheck
  chroma:      # ChromaDB 0.4.24, healthcheck, volumes
  backend:     # JRE 21, resource limits, healthcheck
  frontend:    # Nginx, CSP, envsubst, healthcheck
```

### Resource Limits (Produção)

```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 512M
```

---

## CI/CD Pipeline

Ver [`ci-cd.md`](ci-cd.md) para detalhes completos.

### Stages

1. **Lint & Typecheck** (frontend)
2. **Tests** (frontend + backend com Testcontainers)
3. **Build** (JAR + Vite dist)
4. **Docker Build & Push** (ghcr.io, apenas push em main/developer)
5. **Deploy Staging** (branch developer)
6. **Deploy Production** (branch main)

---

## URLs Hardcoded — Resolvidas

| Arquivo | Problema | Solução |
|---|---|---|
| `frontend/src/api/client.ts` | Fallback `localhost:8080` | Lança erro se `VITE_API_URL` não definido |
| `frontend/src/pages/Podcast.tsx` | Fallback `localhost:8080` para áudio | Usa `VITE_API_URL` obrigatório |
| `frontend/src/pages/PublicShareView.tsx` | Fallback `localhost:8080` | Constante `PUBLIC_API_URL` requer `VITE_API_URL` |
| `frontend/nginx.conf` | CSP com URLs dev | Template `nginx.conf.template` + `envsubst` |

**Resultado:** Build de produção **falha** se `VITE_API_URL` não configurado — segurança por design.

---

## Observabilidade (Futuro/Recomendado)

| Ferramenta | Finalidade |
|---|---|
| **Prometheus** | Métricas (Spring Actuator `/actuator/prometheus`) |
| **Grafana** | Dashboards |
| **Loki** | Logs agregados |
| **Tempo** | Traces distribuídos |
| **Alertmanager** | Alertas |

### Métricas Chave Backend

- `http.server.requests` (latência, erros por endpoint)
- `hikaricp.connections` (pool usage)
- `jvm.memory.used` / `jvm.gc.pause`
- `chromadb.queries` (latência, hit rate)

---

## Checklist Pré-Deploy

- [ ] `.env.production` preenchido com valores reais
- [ ] `JWT_SECRET` ≥ 32 chars, gerado aleatoriamente
- [ ] `GEMINI_API_KEY` válida com quota
- [ ] `APP_CORS_ALLOWED_ORIGINS` apenas domínios de produção
- [ ] `VITE_API_URL` aponta para API de produção (HTTPS)
- [ ] Banco PostgreSQL/Neon acessível, migrations aplicadas
- [ ] Redis acessível (ou desabilitado com fallback)
- [ ] ChromaDB acessível, collections criadas
- [ ] Healthchecks passando (`/actuator/health`, `/api/v1/heartbeat`, nginx)
- [ ] SSL/TLS configurado (reverse proxy / load balancer)
- [ ] Backup strategy definida (PostgreSQL, ChromaDB volumes)
- [ ] Monitoramento/alertas configurados
- [ ] Rollback testado (docker-compose down/up, image tags)