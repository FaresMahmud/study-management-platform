# Configuração — Setup Local e Ambiente

> Este documento cobre **como rodar o projeto localmente**, variáveis de ambiente, dependências externas e diferenças entre dev/prod.
>
> Nunca comite credenciais reais. Use `.env` localmente (ignorado pelo git) ou o cofre da plataforma em produção.

## Pré-requisitos

| Item | Versão observada | Onde verificar |
|---|---|---|
| **Java JDK** | 21 | `pom.xml` → `<java.version>21</java.version>` |
| **Maven** | 3.8+ | `mvn --version` |
| **Node.js** | 20+ recomendado | `package.json` usa Vite 8, React 19 |
| **npm** | 10+ | acompanha Node |
| **MySQL** (dev) | 8.x | `application-dev.properties` aponta para `jdbc:mysql://localhost:3306/studyplatform` |
| **ChromaDB** | última | porta 8000 |
| **Docker** (opcional) | 24+ | para ChromaDB/Redis local |

## Estrutura de configuração

O backend usa **Spring Profiles** (`spring.profiles.active`). Perfis existentes:

- `dev` (default)
- `prod`
- `test` (config em `src/test/resources/application-test.properties`)

Default configurado em `application.properties`:

```properties
spring.profiles.active=${SPRING_PROFILES_ACTIVE:dev}
```

## Variáveis de ambiente

### Backend (obrigatórias / opcionais)

| Variável | Default | Usado por | Observação |
|---|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `dev` | perfil Spring | `dev`, `prod`, `test` |
| `SERVER_PORT` | `8080` | servidor embutido | livre escolha |
| `JWT_SECRET` | **vazio** (falha) | `JwtService.getSigningKey()` | Aceita HEX (par, ≥64 chars), Base64 ou UTF-8. **Obrigatório.** |
| `JWT_EXPIRATION` | `86400000` ms (24h) | expiração do token | ms |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:5174` | SecurityConfig | lista CSV |
| `DB_URL` | `jdbc:mysql://localhost:3306/studyplatform?createDatabaseIfNotExist=true&serverTimezone=UTC` | `application-dev.properties` | jdbc URL |
| `DB_USERNAME` | **vazio** | dev | obrigatório em runtime |
| `DB_PASSWORD` | **vazio** | dev | obrigatório em runtime |
| `DB_DRIVER` | `com.mysql.cj.jdbc.Driver` | dev | pode ser trocado |
| `DB_DIALECT` | `org.hibernate.dialect.MySQLDialect` | dev | muda com DB |
| `SPRING_DATASOURCE_URL` / `DATABASE_URL` | vazio | `application-prod.properties` | URL do Neon/Postgres |
| `SPRING_DATASOURCE_USERNAME` / `DB_USERNAME` | vazio | prod | obrigatório |
| `SPRING_DATASOURCE_PASSWORD` / `DB_PASSWORD` | vazio | prod | obrigatório |
| `DDL_AUTO` | `update` | prod | controla Hibernate |
| `HIKARI_MAX_POOL_SIZE` | `10` | prod | tamanho máximo do pool |
| `HIKARI_MIN_IDLE` | `2` | prod | conexões mínimas ociosas |
| `GEMINI_API_KEY` | vazio | `GeminiService.isConfigured()` | se vazio, cai em mock fallback |
| `CHROMA_URL` | `http://localhost:8000` | `VectorStoreService` | URL do ChromaDB |
| `GOOGLE_CLIENT_ID` | `google-mock-id` | OAuth2 | valor real em prod |
| `GOOGLE_CLIENT_SECRET` | `google-mock-secret` | OAuth2 | valor real em prod |
| `GITHUB_CLIENT_ID` | `github-mock-id` | OAuth2 | valor real em prod |
| `GITHUB_CLIENT_SECRET` | `github-mock-secret` | OAuth2 | valor real em prod |

> **Importante**: `JWT_SECRET` precisa estar configurado ou o backend falha ao iniciar com `IllegalStateException("JWT_SECRET não configurado (vazio). Configure no ambiente.")`.

### Carregamento do `.env`

A dependência `me.paulschwarz:spring-dotenv:4.0.0` no `pom.xml` carrega automaticamente o arquivo `.env` na raiz do backend em desenvolvimento. Exemplo mínimo de `.env`:

```dotenv
JWT_SECRET=<hex ou base64 com pelo menos 64 caracteres>
JWT_EXPIRATION=86400000
DB_USERNAME=root
DB_PASSWORD=<senha local>
GEMINI_API_KEY=<chave opcional>
CHROMA_URL=http://localhost:8000
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

> **Nunca** commitar `.env` real — manter fora do controle de versão.

### Frontend

| Variável | Default | Usado por |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8080` | `frontend/src/api/client.ts` |

O cliente adiciona o prefixo `/api` ao montar requests. Arquivo de referência: `frontend/.env.example`:

```dotenv
VITE_API_URL=http://localhost:8080/api
```

> Variáveis `VITE_*` são lidas em build-time. Alterações exigem rebuild (`npm run build`).

## Arquivos de configuração

| Arquivo | Função |
|---|---|
| `backend/pom.xml` | Dependências e versão Java/Spring |
| `backend/src/main/resources/application.properties` | Configuração base + defaults de env |
| `backend/src/main/resources/application-dev.properties` | Perfil dev (MySQL local, logs DEBUG, `ddl-auto=update`) |
| `backend/src/main/resources/application-prod.properties` | Perfil prod (Postgres/Neon, HikariCP, logs INFO) |
| `backend/src/main/resources/logback-spring.xml` | Logs (inclui encoder JSON para prod) |
| `frontend/package.json` | Dependências + scripts npm |
| `frontend/vite.config.ts` | Build Vite |
| `frontend/.env.example` | Template das variáveis de ambiente do frontend |
| `frontend/tsconfig.json` | TypeScript config |
| `frontend/eslint.config.js` | ESLint |
| `frontend/Dockerfile` | Build container do frontend |
| `backend/Dockerfile` | Build container do backend |

## Portas e serviços externos

| Serviço | Porta | Observação |
|---|---|---|
| Backend Spring | `8080` | `SERVER_PORT` |
| Frontend Vite dev | `5173` (default Vite) | hot reload |
| Frontend Vite preview | `4173` | preview pós-build |
| MySQL (dev) | `3306` | default |
| PostgreSQL (Neon, prod) | 5432 | remoto |
| ChromaDB | `8000` | `CHROMA_URL` |
| Redis | 6379 (default) | opcional |

## Instalação

### Clonar e preparar

```bash
git clone <repo>
cd study-management-platform
```

### Backend

```bash
cd backend
# Criar .env (não versionado) com base no .env.example / na tabela acima
# Instalar dependências (Maven baixa ao primeiro build)
mvn clean install
```

### Frontend

```bash
cd frontend
npm install
```

## Execução local

### Subir dependências externas

```bash
# ChromaDB (Docker)
docker run -d --name chroma -p 8000:8000 chromadb/chroma

# MySQL (Docker, opcional)
docker run -d --name mysql-study -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=studyplatform \
  mysql:8

# Redis (opcional)
docker run -d --name redis-study -p 6379:6379 redis:7-alpine
```

### Iniciar backend

```bash
cd backend
mvn spring-boot:run
# ou
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

Roda em `http://localhost:8080`. Swagger disponível em `http://localhost:8080/swagger-ui.html`.

### Iniciar frontend

```bash
cd frontend
npm run dev
```

Roda em `http://localhost:5173`. Apontando para `http://localhost:8080/api` por padrão.

### Outros comandos úteis

| Comando | Efeito |
|---|---|
| `mvn test` | Roda testes JUnit + Testcontainers |
| `mvn clean package` | Build do jar |
| `npm run build` | Build do frontend (`dist/`) |
| `npm run lint` | ESLint |
| `npm run preview` | Serve build local em `:4173` |

## Flyway

- **Versionamento**: arquivos `V<n>__<desc>.sql` em `backend/src/main/resources/db/migration/`.
- **Estado atual**: migrations V1 a V12 já presentes.
- **Regra**: nunca editar uma migration já aplicada. Para correção/alteração estrutural, criar nova migration com versão incremental.
- **Execução**: automática no startup do Spring Boot, antes do Hibernate validar entidades (`spring.jpa.hibernate.ddl-auto=update`).

## ChromaDB

- **Endpoint**: `http://localhost:8000` (configurável por `CHROMA_URL`).
- **Cliente usado**: HTTP direto via `VectorStoreService`.
- **Coleção**: indexada por `examPrepId`. Metadata inclui `subjectId`, `fileName`.
- **Subir local**: `docker run -d -p 8000:8000 chromadb/chroma`.
- **Persistência**: volume Docker recomendado (`-v chroma-data:/chroma/.chroma`).

## Gemini (Google Generative AI)

- **Modelos usados**:
  - Texto: `gemini-2.5-flash` (configurável via `gemini.text.model`).
  - Embeddings: `text-embedding-004` (hardcoded em `GeminiService.getEmbedding`).
- **Endpoint base**: `https://generativelanguage.googleapis.com/v1beta/models/...`.
- **Autenticação**: query param `?key=<GEMINI_API_KEY>`.
- **Config**: `gemini.api.key=${GEMINI_API_KEY:}` em `application.properties`.
- **Fallback**: se a chave estiver vazia ou for `SUA_CHAVE_GEMINI_AQUI`, o sistema exibe mock fallback (não falha).
- **Onde aparece**:
  - `GeminiService.generateContent` (texto)
  - `GeminiService.generateMultimodalContent` (texto + imagem)
  - `GeminiService.getEmbedding` (vetores para ChromaDB)

## TTS (Text-to-Speech)

- **Provedor**: Google Translate TTS (chamada HTTP direta, sem API key).
- **Endpoint**: `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=pt-BR&q=<encoded>`.
- **Limitação**: chunks de até ~150 caracteres (configurado em `TtsService`).
- **Fallback**: se falhar, gera MP3 silencioso de 1 segundo.
- **Onde aparece**: `TtsService.textToSpeech(text, targetPath)` chamado pelo fluxo de podcasts.

## CORS

Origens permitidas controladas por `app.cors.allowed-origins` (`CORS_ALLOWED_ORIGINS`):

- Default dev: `http://localhost:5173,http://localhost:5174`.
- Métodos: `GET, POST, PUT, DELETE, OPTIONS, PATCH`.
- Headers: `Authorization, Content-Type, Cache-Control, X-Requested-With, Range`.
- `allowCredentials: true`.

## Arquivos `.env` e `.gitignore`

Boas práticas:

- Backend: `.env` na raiz de `backend/` (lido por `spring-dotenv`).
- Frontend: `.env` em `frontend/` (formato `VITE_*`).
- Ambos devem estar em `.gitignore`. Verifique antes de commitar.

## Diferenças entre desenvolvimento e produção

| Aspecto | dev | prod |
|---|---|---|
| Banco | MySQL local | PostgreSQL (Neon) |
| `spring.jpa.hibernate.ddl-auto` | `update` | `update` (controlável) |
| `spring.jpa.show-sql` | `true` | `false` |
| Logging | DEBUG (`com.studyplatform`, SQL, security) | INFO/WARN |
| OAuth2 | IDs mock | IDs reais via env |
| Gemini | opcional (mock fallback) | esperado configurado |
| Redis | opcional (fallback in-memory) | opcional |
| HikariCP | default | otimizado (max=10, min=2, keepalive=60s) |
| Porta | 8080 | 8080 ou variável |

## Problemas comuns / armadilhas observadas no código

| Problema | Como evitar |
|---|---|
| `JWT_SECRET` vazio | Sempre definir; falha explícita no startup (`JwtService.getSigningKey()`). |
| ChromaDB offline | `VectorStoreService.searchSimilar` pode retornar lista vazia → tutor cai em mensagem "sem material". |
| Gemini sem chave | Mock fallback ativo, **não** falha. Útil para dev sem custo. |
| TTS rate-limit Google | A divisão em chunks de 150 chars ajuda. Em falha total, gera MP3 silencioso. |
| OAuth2 mock em dev | IDs `*-mock-*` não funcionam em produção; sem config real, login social falha. |
| `ddl-auto=update` em prod | Aceita criar/alterar schema automaticamente — risco em prod. Avaliar migrar para `validate`. |
| Migrations V8/V9/V10 com nome duplicado | Existem duas versões de `add_share_token_to_exam_prep.sql` (V9 e V10). Flyway executa ambas sequencialmente. |
| Token expirado | `apiClient` interceptor desloga automaticamente em 401/403. |

## Onde obter ajuda no código

- **Endpoints**: `frontend/src/api/client.ts` e controllers Spring anotados com `@Tag`.
- **Swagger UI**: `http://localhost:8080/swagger-ui.html` quando o backend está rodando.
- **OpenAPI JSON**: `http://localhost:8080/v3/api-docs`.
- **Health**: `http://localhost:8080/actuator/health`.
- **Métricas**: `http://localhost:8080/actuator/prometheus`.
