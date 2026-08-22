## Estrutura do Projeto (Real — Vertical Slice)

```
study-management-platform/
├── docs/                              # Documentação técnica (esta pasta)
│   ├── GLOSSARY.md                   # Glossário de domínio e técnico
│   ├── ARCHITECTURE.md               # Arquitetura real (camadas, deps, pastas)
│   ├── configuration.md              # Setup local, env vars, serviços
│   ├── patterns.md                   # Padrões de código com exemplos
│   ├── project-overview.md           # Visão de produto, fluxos, atores
│   └── structure.md                  # Este arquivo
│
├── backend/                           # Spring Boot 3.2.4 + Java 21
│   ├── pom.xml
│   ├── Dockerfile
│   ├── uploads/                       # Arquivos enviados (gitignored)
│   └── src/
│       ├── main/
│       │   ├── java/com/studyplatform/
│       │   │   ├── StudyPlatformApplication.java
│       │   │   ├── auth/                       # Feature: autenticação
│       │   │   │   ├── controller/
│       │   │   │   ├── service/
│       │   │   │   ├── dto/
│       │   │   │   ├── repository/
│       │   │   │   └── entity/
│       │   │   ├── user/
│       │   │   ├── subject/
│       │   │   ├── session/
│       │   │   ├── goal/
│       │   │   ├── analytics/
│       │   │   ├── pomodoro/
│       │   │   ├── summary/
│       │   │   ├── flashcard/
│       │   │   ├── examprep/                  # Inclui quiz, simulation
│       │   │   ├── file/                      # Inclui annotation, pdf chunks
│       │   │   ├── podcast/
│       │   │   ├── ai/                        # Gemini, RAG, TTS, Vector Store
│       │   │   └── shared/                    # Cross-cutting
│       │   │       ├── config/                # SecurityConfig, CacheConfig, JpaConfig, OpenApi, RateLimiting
│       │   │       ├── exception/             # GlobalExceptionHandler, BusinessException, ResourceNotFoundException
│       │   │       └── security/              # JwtService, JwtAuthenticationFilter, UserDetailsServiceImpl, OAuth2, SecurityService
│       │   └── resources/
│       │       ├── application.properties
│       │       ├── application-dev.properties
│       │       ├── application-prod.properties
│       │       ├── logback-spring.xml
│       │       └── db/migration/              # Flyway V1–V12
│       └── test/
│           └── java/com/studyplatform/       # JUnit 5 + Mockito + Testcontainers
│
├── frontend/                          # React 19 + Vite 8 + TypeScript
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── .env.example                   # VITE_API_URL
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/
│       │   └── client.ts              # Axios + interceptors (JWT, /api→/api/v1, Page unwrap, 401 logout)
│       ├── components/
│       │   ├── dashboard/             # Dashboard específicos (HeroSession, DailyGoal, ActivityGrid, mocks)
│       │   ├── layout/                # Sidebar, Navbar
│       │   ├── study/                 # FlashcardCard, SummaryCard, SessionTimer, SubjectProgress, LearningZoneCard
│       │   ├── ui/                    # Button, Card, EmptyState, FadeIn, Modal, Input, Select, Tooltip, ProgressRing, Avatar, Chip, Tabs
│       │   ├── wizard/                # ExamWizard, WizardStepIndicator
│       │   ├── Navbar.tsx
│       │   └── PdfViewer.tsx
│       ├── hooks/                     # useApi (legacy), useGamification, useTimer
│       ├── mocks/                     # Fixtures de demo (studyMocks.ts)
│       ├── pages/                     # Dashboard, FocusMode, Flashcards, Quiz, Simulation, StudyWorkspace, Subjects, Goals, Summaries, Analytics, Login, Register, PublicShareView, Podcast, StudySession, ExamMode
│       ├── store/
│       │   ├── authStore.ts           # Zustand: token, name, email, premium, login/logout (localStorage)
│       │   └── podcastStore.ts        # Zustand: globalAudio (HTMLAudioElement), play/pause/stop
│       ├── types/
│       │   └── index.ts               # Interfaces TypeScript (espelham DTOs backend)
│       └── utils/                     # confetti.ts, streak.ts, format.ts
│
└── README.md
```

### Princípios de Organização

| Princípio | Descrição |
|---|---|
| **Vertical Slice por Feature** | Cada domínio (`auth`, `subject`, `examprep`, `ai`, etc.) contém suas próprias camadas: `controller/`, `service/`, `repository/`, `dto/`, `entity/` |
| **Shared Cross-cutting** | Código transversal fica em `shared/` (`config`, `exception`, `security`) |
| **Frontend por Tipo + Domínio** | `components/ui` = genéricos reutilizáveis; `components/study` = específicos de domínio; `components/dashboard` = compostos da home |
| **Estado Global Mínimo** | Apenas 2 stores Zustand: `authStore` (identidade) e `podcastStore` (player global) |
| **Server State via React Query** | `useQuery`/`useMutation` com chaves estáveis; `useApi` legacy apenas em páginas não migradas |
| **API Client Único** | `api/client.ts` centraliza Axios, interceptors, reescrita de URL v1, desenvelope de paginação Spring, logout automático |