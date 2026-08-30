# Docker & Docker Compose

Este documento descreve as configurações de Docker para desenvolvimento e produção.

---

## Visão Geral

| Arquivo | Finalidade | Serviços |
|---|---|---|
| `docker-compose.yml` | Desenvolvimento local | MySQL, Redis, ChromaDB, backend-dev, frontend-dev |
| `docker-compose.prod.yml` | Produção | PostgreSQL, Redis, ChromaDB, backend, frontend (Nginx) |
| `backend/Dockerfile` | Build multi-stage backend | Maven build → JRE 21 runtime |
| `frontend/Dockerfile` | Build multi-stage frontend | Vite build → Nginx com CSP + envsubst |
| `frontend/nginx.conf.template` | Template Nginx | CSP dinâmico com substituição de `VITE_API_URL` |

---

## Desenvolvimento (`docker-compose.yml`)

```bash
# Sobe toda a stack
docker-compose up -d

# Logs
docker-compose logs -f backend-dev
docker-compose logs -f frontend-dev

# Para e remove volumes
docker-compose down -v
```

### Serviços

| Serviço | Porta | Imagem | Healthcheck |
|---|---|---|---|
| mysql | 3306 | mysql:8.0 | `mysqladmin ping` |
| redis | 6379 | redis:7-alpine | `redis-cli ping` |
| chroma | 8000 | chromadb/chroma:0.4.24 | `/api/v1/heartbeat` |
| backend-dev | 8080 | Build local | `/actuator/health` |
| frontend-dev | 5173 | Build local | HTTP 200 em `/` |

### Variáveis de Ambiente (Dev)

O arquivo `docker-compose.yml` lê variáveis de:
- `backend/.env` (se existir)
- `frontend/.env` (se existir)
- Variáveis de ambiente do shell

```yaml
# Exemplo de override local
services:
  backend-dev:
    environment:
      - SPRING_PROFILES_ACTIVE=dev
      - JWT_SECRET=dev-secret-key-min-256-bits-length-here
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - NVIDIA_API_KEY=${NVIDIA_API_KEY:-}
      - AI_PROVIDER=${AI_PROVIDER:-gemini}
```

---

## Produção (`docker-compose.prod.yml`)

```bash
# Requer .env.production preenchido
cp .env.production.example .env.production
# Edite .env.production com valores reais

docker-compose -f docker-compose.prod.yml up -d
```

### Serviços

| Serviço | Porta | Recursos | Healthcheck |
|---|---|---|---|
| postgres | 5432 | 512MB-1GB RAM | `pg_isready` |
| redis | 6379 | 256MB RAM | `redis-cli ping` |
| chroma | 8000 | 1GB RAM | `/api/v1/heartbeat` |
| backend | 8080 | 512MB-1GB RAM, 0.5-1 CPU | `/actuator/health` |
| frontend | 80/443 | 128MB RAM, 0.1-0.5 CPU | HTTP 200 em `/` |

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

### Healthchecks

Todos os serviços possuem healthchecks configurados com:
- `interval: 30s`
- `timeout: 10s`
- `retries: 3`
- `start_period: 40s` (backend/frontend)

---

## Dockerfiles

### Backend (`backend/Dockerfile`)

```dockerfile
# Stage 1: Build
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Runtime
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Frontend (`frontend/Dockerfile`)

```dockerfile
# Stage 1: Build
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Stage 2: Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/nginx.conf.template
# envsubst substitui ${VITE_API_URL} no template em runtime
CMD /bin/sh -c "envsubst '\$VITE_API_URL' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"
```

### Nginx Template (`frontend/nginx.conf.template`)

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # CSP com API URL dinâmica
    add_header Content-Security-Policy "
        default-src 'self';
        script-src 'self' 'unsafe-inline';
        style-src 'self' 'unsafe-inline';
        connect-src 'self' ${VITE_API_URL} wss://${VITE_API_URL};
        img-src 'self' data:;
        font-src 'self';
    " always;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy para API (se necessário no mesmo domínio)
    location /api/ {
        proxy_pass ${VITE_API_URL}/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Variáveis de Ambiente Obrigatórias (Produção)

| Variável | Descrição | Exemplo |
|---|---|---|
| `DB_NAME` | Nome do banco PostgreSQL | `study_platform` |
| `DB_USERNAME` | Usuário do banco | `study_user` |
| `DB_PASSWORD` | Senha do banco | `segura123` |
| `SPRING_DATASOURCE_URL` | JDBC URL Neon/PostgreSQL | `jdbc:postgresql://host/db?sslmode=require` |
| `JWT_SECRET` | Chave HS256 (≥32 chars) | `chave-super-secreta-256-bits-minimo` |
| `APP_CORS_ALLOWED_ORIGINS` | Origens CORS permitidas | `https://app.dominio.com,https://api.dominio.com` |
| `GEMINI_API_KEY` | Chave Google Gemini | `AIza...` |
| `NVIDIA_API_KEY` | Chave Nvidia NIM (opcional) | `nvapi-...` |
| `NVIDIA_MODEL` | Modelo Nvidia (opcional) | `meta/llama-3.1-8b-instruct` |
| `AI_PROVIDER` | Provedor de IA ativo | `gemini` ou `nvidia` |
| `VITE_API_URL` | URL pública da API | `https://api.dominio.com` |
| `HIKARI_MAX_POOL_SIZE` | Pool máximo conexões | `10` |
| `HIKARI_MIN_IDLE` | Conexões mínimas idle | `2` |
| `DDL_AUTO` | Flyway/Hibernate DDL | `update` ou `validate` |

---

## Boas Práticas

1. **Nunca commite `.env.production`** — está no `.gitignore`
2. **Use secrets do CI/CD** (GitHub Actions secrets) para valores sensíveis
3. **Healthchecks** — aguarde `healthy` antes de considerar serviço pronto
4. **Resource limits** — evite OOM kills em produção
5. **Network isolation** — serviços internos não expostos externamente
6. **Backup strategy** — PostgreSQL dump automático recomendado

---

## Troubleshooting

### Backend não conecta no banco
```bash
# Verifique healthcheck do postgres
docker-compose -f docker-compose.prod.yml logs postgres

# Teste conexão manual
docker exec -it backend pg_isready -h postgres -U study_user
```

### Frontend não carrega / CSP errors
```bash
# Verifique se VITE_API_URL foi substituído no nginx.conf
docker exec -it frontend cat /etc/nginx/conf.d/default.conf

# Deve conter a URL real, não ${VITE_API_URL}
```

### ChromaDB não inicia
```bash
# Verifique logs
docker-compose -f docker-compose.prod.yml logs chroma

# Chroma precisa de memória — aumente limit se necessário
```