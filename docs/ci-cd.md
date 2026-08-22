# CI/CD Pipeline

Documentação completa do pipeline de integração contínua e deploy contínuo via GitHub Actions.

---

## Visão Geral

O pipeline está definido em `.github/workflows/ci.yml` e executa nas branches `main` e `developer`.

---

## Jobs do Pipeline

### 1. Frontend Lint & Typecheck (`frontend-lint`)

```yaml
runs-on: ubuntu-latest
defaults:
  run:
    working-directory: ./frontend
steps:
  - Checkout code
  - Setup Node.js 18 (com cache npm)
  - Install dependencies (npm ci)
  - Run ESLint (npm run lint)
  - Run TypeScript type check (npx tsc --noEmit)
```

**Falha se:** lint errors, type errors

---

### 2. Frontend Tests (`frontend-test`)

```yaml
runs-on: ubuntu-latest
defaults:
  run:
    working-directory: ./frontend
steps:
  - Checkout code
  - Setup Node.js 18
  - Install dependencies
  - Run tests (npm run test -- --run)
  - Upload coverage (codecov)
```

**Falha se:** testes falham

---

### 3. Frontend Build (`frontend-build`)

```yaml
needs: [frontend-lint, frontend-test]
steps:
  - Checkout code
  - Setup Node.js 18
  - Install dependencies
  - Build (npm run build) com VITE_API_URL via secret
  - Upload build artifacts (frontend/dist, 7 dias)
```

**Falha se:** build falha
**Output:** artifact `frontend-dist`

---

### 4. Backend Tests (`backend-test`)

```yaml
runs-on: ubuntu-latest
services:
  mysql: mysql:8.0 (porta 3306, healthcheck)
  redis: redis:7-alpine (porta 6379, healthcheck)
  chroma: chromadb/chroma:0.4.24 (porta 8000, healthcheck)
steps:
  - Checkout code
  - Setup JDK 21 (Temurin, cache Maven)
  - Cache ~/.m2/repository
  - Run tests (mvn test -B) com profile `test`
  - Upload test reports (surefire-reports, 7 dias)
```

**Variáveis de ambiente de teste:**
```env
SPRING_PROFILES_ACTIVE=test
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/study_platform?useSSL=false&serverTimezone=UTC
SPRING_DATASOURCE_USERNAME=study_user
SPRING_DATASOURCE_PASSWORD=study_pass
SPRING_DATA_REDIS_HOST=localhost
SPRING_DATA_REDIS_PORT=6379
CHROMADB_HOST=localhost
CHROMADB_PORT=8000
JWT_SECRET=test-secret-key-for-ci-only-min-256-bits-length
GEMINI_API_KEY=${{ secrets.GEMINI_API_KEY }}
```

---

### 5. Backend Build (`backend-build`)

```yaml
needs: backend-test
steps:
  - Checkout code
  - Setup JDK 21
  - Cache Maven
  - Build package (mvn clean package -DskipTests -B)
  - Upload JAR artifact (backend/target/study-management-platform-*.jar, 7 dias)
```

**Falha se:** build falha
**Output:** artifact `backend-jar`

---

### 6. Docker Build Frontend (`docker-build-frontend`)

```yaml
needs: frontend-build
if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/developer')
steps:
  - Checkout code
  - Download frontend-dist artifact
  - Setup Docker Buildx
  - Login ghcr.io (GITHUB_TOKEN)
  - Extract metadata (tags: branch, sha, latest)
  - Build & push (cache GHA, build-arg VITE_API_URL)
```

**Imagem:** `ghcr.io/<repo>-frontend`
**Tags:** `developer`, `main`, `sha-<commit>`, `latest` (apenas main)

---

### 7. Docker Build Backend (`docker-build-backend`)

```yaml
needs: backend-build
if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/developer')
steps:
  - Checkout code
  - Download backend-jar artifact
  - Setup Docker Buildx
  - Login ghcr.io
  - Extract metadata
  - Build & push (cache GHA)
```

**Imagem:** `ghcr.io/<repo>-backend`
**Tags:** `developer`, `main`, `sha-<commit>`, `latest` (apenas main)

---

### 8. Deploy Staging (`deploy-staging`)

```yaml
needs: [docker-build-frontend, docker-build-backend]
if: github.ref == 'refs/heads/developer'
environment: staging
steps:
  - Deploy to Staging (placeholder)
```

**Configure:** Adicione comandos reais de deploy (kubectl, docker-compose, etc.)

---

### 9. Deploy Production (`deploy-production`)

```yaml
needs: [docker-build-frontend, docker-build-backend]
if: github.ref == 'refs/heads/main'
environment: production
steps:
  - Deploy to Production (placeholder)
```

**Configure:** Adicione comandos reais de deploy

---

## Secrets Necessários (GitHub Actions)

| Secret | Descrição | Obrigatório |
|---|---|---|
| `VITE_API_URL` | URL da API para build frontend | Sim (prod) |
| `GEMINI_API_KEY` | Chave Google Gemini para testes | Sim |
| `GITHUB_TOKEN` | Fornecido automaticamente | Auto |

**Configure em:** Settings → Secrets and variables → Actions

---

## Dependabot

Arquivo: `.github/dependabot.yml`

- **npm (frontend)**: Segunda 09:00, grupos: dev, react, ui, testing
- **maven (backend)**: Segunda 09:00, grupos: spring-boot, security, database, testing, observability, security
- **github-actions**: Segunda 09:00

**Limite:** 10 PRs abertos por ecossistema

---

## Fluxo de Branches

```
developer (push) → CI completo → Docker build → Deploy Staging
main (push)      → CI completo → Docker build → Deploy Production
PRs              → CI completo (sem Docker build/deploy)
```

---

## Cache Strategy

- **npm**: `cache-dependency-path: frontend/package-lock.json`
- **Maven**: `~/.m2/repository` com key baseada em hash do `pom.xml`
- **Docker**: Buildx cache GHA (`type=gha,mode=max`)

---

## Troubleshooting

### Testes backend falham por conexão
- Verifique se healthchecks dos services (mysql, redis, chroma) passaram
- Aumente `start_period` se necessário

### Build frontend falha por VITE_API_URL
- Verifique se secret `VITE_API_URL` está configurado no repositório
- Em PRs, o build usa valor vazio — configure secret no ambiente do PR se necessário

### Docker push falha
- Verifique permissões do `GITHUB_TOKEN` (precisa `packages: write`)
- Settings → Actions → General → Workflow permissions