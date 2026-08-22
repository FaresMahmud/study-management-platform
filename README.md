# Study Management Platform

Plataforma completa para gerenciamento de estudos com API REST (Spring Boot) e interface Web (React + Vite).

---

## Visão Geral

O **Study Management Platform** é uma aplicação full-stack que ajuda estudantes a organizar matérias, preparar-se para exames, criar flashcards, acompanhar metas de estudo e gerar conteúdo por IA (resumos, quizzes, simulados, podcasts).

### Funcionalidades Principais

| Categoria | Funcionalidades |
|---|---|
| **Matérias** | Cadastro com cores, associação a provas e metas |
| **Metas de Estudo** | Níveis de domínio alvo (0–100), rastreamento de progresso, checklist diário |
| **Flashcards** | Sistema Leitner de revisão espaçada (caixas 1→5) |
| **Pomodoro** | Cronômetro de foco integrado à preparação de exames |
| **Exam Prep** | Plano de estudos com data da prova, pontuação alvo, compartilhamento público |
| **Quizzes & Simulados** | Correção automática, scoring, tentativas cronometradas |
| **Resumos** | Editor rico (HTML) associado a matérias |
| **PDFs e Anotações** | Upload, indexação via RAG, anotações por página |
| **Tutor RAG** | Perguntas ao material estudado via Gemini + ChromaDB |
| **Podcasts** | Geração de áudio a partir de roteiros via Google Translate TTS |
| **Analytics** | Zona de aprendizado (Comfort/Panic/Learning), streak, tópicos fortes/fracos |
| **Premium** | Recursos avançados de IA liberados por flag de usuário |

---

## Stack Tecnológica

### Backend
- **Java 21** com **Spring Boot 3.2.4**
- **Spring Security** + **JWT** (stateless, HS256)
- **Spring Data JPA** com **MySQL** (dev) e **PostgreSQL/Neon** (prod)
- **Flyway** para migrations (V1–V12)
- **HikariCP** para pool de conexões
- **Redis** (opcional, com fallback in-memory) para cache
- **ChromaDB** para armazenamento vetorial (RAG)
- **Google Gemini** (texto `gemini-2.5-flash`, embeddings `text-embedding-004`, multimodal)
- **Google Translate TTS** para geração de podcasts
- **Swagger/OpenAPI** em `/swagger-ui.html`
- **SpringDoc OpenAPI** + **Testcontainers** para testes de integração

### Frontend
- **React 19** + **TypeScript** + **Vite 8**
- **Vanilla CSS** (Design system customizado com variáveis CSS e escala Fibonacci)
- **Axios** com interceptores (JWT, reescrita `/api` → `/api/v1`, desenvelope de paginação)
- **Zustand** (estado global: autenticação, player de podcast)
- **TanStack React Query** (server state, cache, invalidação)
- **Recharts** (visualização de métricas)
- **pdfjs-dist** (leitor de PDFs com anotações)
- **lucide-react** (ícones)

---

## Estrutura do Projeto

```
study-management-platform/
├── backend/          # Spring Boot 3.2.4 + Java 21 (Vertical Slice por feature)
├── frontend/         # React 19 + Vite 8 + TypeScript
├── docs/             # Documentação técnica (ver abaixo)
├── .github/
│   ├── workflows/ci.yml    # Pipeline CI/CD
│   └── dependabot.yml      # Atualizações automáticas de dependências
├── docker-compose.yml      # Stack de desenvolvimento
└── docker-compose.prod.yml # Stack de produção
```

---

## Documentação

### Para Agentes de IA
- **[`AGENTS.md`](AGENTS.md)** — Ponto de entrada obrigatório. Contexto arquitetural, funcional e técnico mínimo.

### Documentação Técnica [`docs/`](docs/)
| Arquivo | Descrição |
|---|---|
| [`project-overview.md`](docs/project-overview.md) | Visão de produto, fluxos de negócio, atores, conceitos centrais |
| [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Arquitetura real implementada (camadas, dependências, pastas, padrões) |
| [`configuration.md`](docs/configuration.md) | Setup local completo: prerequisites, env vars, serviços externos |
| [`patterns.md`](docs/patterns.md) | Padrões de código reais com exemplos (backend + frontend) |
| [`GLOSSARY.md`](docs/GLOSSARY.md) | Glossário unificado de domínio e técnico |
| [`structure.md`](docs/structure.md) | Estrutura do projeto (vertical slice) |
| [`docker.md`](docs/docker.md) | Docker & Docker Compose (dev/prod, Dockerfiles, Nginx, troubleshooting) |
| [`ci-cd.md`](docs/ci-cd.md) | Pipeline CI/CD completo (GitHub Actions, jobs, secrets, dependabot) |
| [`production-readiness.md`](docs/production-readiness.md) | Checklist produção, arquitetura, APIs, auth, DB, ChromaDB, Gemini, env vars |

---

## Configuração Rápida

### Pré-requisitos
- Java 21 JDK
- Node.js 20+ e npm
- Docker e Docker Compose (recomendado)

### Variáveis de Ambiente
```bash
# Backend
cd backend && cp .env.example .env

# Frontend
cd frontend && cp .env.example .env
# Defina VITE_API_URL (obrigatório no build de produção)

# Produção
cp .env.production.example .env.production
```

**Detalhes:** [`docs/configuration.md`](docs/configuration.md) | [`docs/docker.md`](docs/docker.md#variáveis-de-ambiente-obrigatórias-produção)

---

## Como Executar

### Com Docker (Recomendado)
```bash
# Desenvolvimento
docker-compose up -d

# Produção
docker-compose -f docker-compose.prod.yml up -d
```

### Manual
```bash
# Backend
cd backend && mvn spring-boot:run
# API: http://localhost:8080 | Swagger: http://localhost:8080/swagger-ui.html

# Frontend
cd frontend && npm install && npm run dev
# App: http://localhost:5173
```

---

## Testes

```bash
# Backend
cd backend && mvn test

# Frontend
cd frontend && npm run test
```

---

## Deploy & CI/CD

- **Docker Images**: Multi-stage builds (`backend/Dockerfile`, `frontend/Dockerfile`)
- **Pipeline**: `.github/workflows/ci.yml` — lint, test, build, docker push, deploy staging/prod
- **Infraestrutura**: `docker-compose.yml` (dev) / `docker-compose.prod.yml` (prod)
- **Documentação completa**: [`docs/ci-cd.md`](docs/ci-cd.md) | [`docs/docker.md`](docs/docker.md) | [`docs/production-readiness.md`](docs/production-readiness.md)

---

## Segurança

- Nenhuma credencial commitada (`.env*` no `.gitignore`)
- JWT stateless HS256 + BCrypt (secret ≥ 256 bits)
- Rate limiting, CORS configurável, rotas públicas explícitas
- CSP no Nginx (frontend) com `connect-src` restrito à `VITE_API_URL`
- `VITE_API_URL` **obrigatório** no build de produção (sem fallback localhost)

**Detalhes:** [`docs/production-readiness.md#segurança`](docs/production-readiness.md#autenticação--segurança)

---

## Responsividade & Mobile Ready

- Sidebar colapsível (72px/260px) + mobile drawer com overlay
- Grid fluido `minmax(320px, 1fr)`, formulários `width: 100%` + `max-width` responsivo
- Charts Recharts com `height: 100%` em containers flexíveis
- Touch targets ≥ 44px, hover apenas em `(hover: hover) and (pointer: fine)`
- Design tokens Fibonacci, preparados para Capacitor/React Native

**Detalhes:** [`docs/responsiveness.md`](docs/responsiveness.md)

---

## Roadmap

- [ ] Testes E2E (Playwright/Cypress) no CI
- [ ] Kubernetes manifests (Helm charts)
- [ ] Observabilidade: Grafana + Prometheus + Loki
- [ ] Feature flags para rollout gradual Premium
- [ ] PWA (Service Worker, offline-first flashcards)
- [ ] App mobile nativo (Capacitor compartilhando design tokens)