# Study Management Platform

Plataforma completa para gerenciamento de estudos com API REST (Spring Boot) e interface Web (React + Vite).

---

## Visão Geral

O **Study Management Platform** é uma aplicação full-stack que ajuda estudantes a organizar matérias, preparar-se para exames, criar flashcards, acompanhar metas de estudo e gerar conteúdo por IA (resumos, quizzes, simulados, podcasts).

### Funcionalidades Principais

| Categoria | Funcionalidades |
|---|---|
| **Matérias** | Cadastro com cores, associação a provas e metas |
| **Metas de Estudo** | Níveis de domínio alvo (0–100), rastreamento de progresso |
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

### Frontend
- **React 19** + **TypeScript** + **Vite 8**
- **Vanilla CSS** (Design system customizado com variáveis CSS e escala Fibonacci)
- **Axios** com interceptores (JWT, reescrita `/api` → `/api/v1`, desenvelope de paginação)
- **Zustand** (estado global: autenticação, player de podcast)
- **TanStack React Query** (server state, cache, invalidação)
- **Recharts** (visualização de métricas)
- **pdfjs-dist** (leitor de PDFs com anotações)

---

## Estrutura do Projeto

```
study-management-platform/
├── backend/          # Spring Boot 3.2.4 + Java 21 (Vertical Slice por feature)
├── frontend/         # React 19 + Vite 8 + TypeScript
└── docs/             # Documentação técnica (6 arquivos)
```

Detalhamento completo em [`docs/structure.md`](docs/structure.md).

---

## Documentação para Agentes de IA

Este projeto possui documentação estruturada para agentes de IA:

- **[`AGENTS.md`](AGENTS.md)** — Ponto de entrada obrigatório. Contexto arquitetural, funcional e técnico mínimo para trabalhar no sistema sem suposições.
- **[`docs/`](docs/)** — Documentação técnica complementar (6 arquivos):
  - [`project-overview.md`](docs/project-overview.md) — Visão de produto, fluxos de negócio, atores, conceitos centrais
  - [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Arquitetura real implementada (camadas, dependências, pastas, padrões)
  - [`configuration.md`](docs/configuration.md) — Setup local completo: prerequisites, env vars, serviços externos
  - [`patterns.md`](docs/patterns.md) — Padrões de código reais com exemplos (backend + frontend)
  - [`GLOSSARY.md`](docs/GLOSSARY.md) — Glossário unificado de domínio e técnico
  - [`structure.md`](docs/structure.md) — Estrutura do projeto (vertical slice)

---

## Configuração

### Pré-requisitos
- Java 21 JDK
- Node.js 20+ e npm
- MySQL local (porta 3306, banco `studyplatform`)
- ChromaDB (porta 8000, opcional para RAG)
- Redis (opcional, para cache)

### Variáveis de Ambiente
Copie `.env.example` para `.env` na raiz ou em `backend/` e configure:

```bash
# Obrigatórios
SPRING_PROFILES_ACTIVE=dev
JWT_SECRET=sua_chave_secreta_com_pelo_menos_32_caracteres
DB_URL=jdbc:mysql://localhost:3306/studyplatform?...
DB_USERNAME=root
DB_PASSWORD=sua_senha_local

# Opcionais (IA/RAG)
GEMINI_API_KEY=...
CHROMA_URL=http://localhost:8000
```

Detalhes completos em [`docs/configuration.md`](docs/configuration.md).

---

## Como Executar Localmente

### Backend
```bash
cd backend
mvn spring-boot:run
```
API em `http://localhost:8080` | Swagger em `http://localhost:8080/swagger-ui.html`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
App em `http://localhost:5173`

---

## Testes

```bash
# Backend (JUnit 5 + Mockito + Testcontainers)
cd backend
mvn test
```

> Não há testes automatizados no frontend no momento.

---

## Deploy

### Backend
- Build: `mvn clean package` (gera JAR)
- Dockerfile disponível em `backend/Dockerfile`
- Profile de produção: `prod` (PostgreSQL/Neon, HikariCP otimizado)
- Actuator em `/actuator/health` e `/actuator/prometheus`

### Frontend
- Build: `npm run build` (gera `frontend/dist/`)
- Dockerfile disponível em `frontend/Dockerfile`
- SPA estática servida por qualquer servidor de arquivos/CDN
- Variável de build: `VITE_API_URL`

Diferenças dev vs prod em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#diferen%C3%A7as-dev-vs-prod).

---

## Segurança

- Nenhuma credencial ou chave secreta deve ser commitada
- Arquivos `.env` e `.env.local` estão no `.gitignore`
- Use `.env.example` como referência
- Autenticação JWT stateless com BCrypt
- Rate limiting configurado via `RateLimitingFilter`
- Rotas públicas explícitas em `SecurityConfig`
