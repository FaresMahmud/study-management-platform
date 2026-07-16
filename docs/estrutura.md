## Estrutura do projeto

```
study-management-platform/
├── docs/                            Documentação (estrutura e changelog)
├── backend/                         Spring Boot 3.2 + Java 21
│   └── src/main/java/com/studyplatform/
│       ├── StudyPlatformApplication.java
│       ├── config/                 OpenAPI + Spring Security
│       ├── controller/            REST controllers (Auth, Subjects, Sessions, Goals, etc.)
│       ├── service/               Business services (AuthService, StudySessionService, etc.)
│       ├── repository/           Spring Data JPA repositories
│       ├── dto/                   DTOs de request e response
│       │   ├── request/
│       │   └── response/
│       ├── mapper/               Entity <-> DTO mappers
│       ├── entity/               JPA entities
│       ├── exception/            Exceptions + GlobalExceptionHandler
│       └── security/             JWT filter + user details
│
├── frontend/                        React 18 + Vite + TypeScript
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── index.css
│       ├── api/                   client.ts (axios)
│       ├── assets/                imagens/ícones
│       ├── components/            Navbar, OnboardingModal
│       ├── pages/                 Dashboard, Goals, StudySessions, Subjects, Login, Register, etc.
│       ├── store/                 authStore (Zustand)
│       ├── types/                 interfaces
│       └── utils/                 helpers (streak, confetti)
│
└── README.md                        Documentação principal
```

