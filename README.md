# Study Management Platform

Plataforma completa para gerenciamento de estudos com API REST (Spring Boot) e interface Web (React + Vite).

## Estrutura do Projeto

O repositório está organizado da seguinte forma:

- `/backend`: API REST desenvolvida em Spring Boot.
- `/frontend`: Aplicação Single Page (SPA) desenvolvida em React + TypeScript + Vite.

Para mais informações sobre a estrutura do projeto, consulte [docs/estrutura.md](docs/estrutura.md).

## Stack

### Backend
- **Java 21** com **Spring Boot 3.2**
- **Spring Security** + **JWT** para autenticação stateless
- **Spring Data JPA** com **MySQL**
- **Swagger/OpenAPI** para documentação automática em `/swagger-ui.html`

### Frontend
- **React 19**
- **Vite** (Build tool)
- **Vanilla CSS** (Design system customizado com variáveis CSS e escala Fibonacci)
- **Axios** (Consumo da API com interceptores de autenticação)
- **Zustand** (Estado de autenticação persistido)
- **Recharts** (Visualização de métricas e gráficos)
- **pdfjs-dist** (Leitor de PDFs com annotations integrado)

## Endpoints da API

### Autenticação (`/api/auth`)
- `POST /api/auth/register` - Registrar novo usuário
- `POST /api/auth/login` - Login do usuário (retorna JWT e dados básicos)

### Matérias (`/api/subjects`)
- `GET /api/subjects` - Listar matérias do usuário
- `GET /api/subjects/{id}` - Obter matéria por ID
- `POST /api/subjects` - Criar nova matéria
- `PUT /api/subjects/{id}` - Atualizar matéria
- `DELETE /api/subjects/{id}` - Deletar matéria (cascade delete para sessões e metas)

### Sessões de Estudo (`/api/study-sessions`)
- `GET /api/study-sessions` - Listar todas as sessões do usuário
- `GET /api/study-sessions/{id}` - Obter sessão por ID
- `POST /api/study-sessions` - Criar sessão (recalcula metas automaticamente)
- `PUT /api/study-sessions/{id}` - Atualizar sessão
- `DELETE /api/study-sessions/{id}` - Deletar sessão

### Metas (`/api/goals`)
- `GET /api/goals` - Listar todas as metas
- `GET /api/goals/{id}` - Obter meta por ID
- `POST /api/goals` - Criar meta (com cálculo automático de progresso inicial)
- `PUT /api/goals/{id}` - Atualizar meta
- `DELETE /api/goals/{id}` - Deletar meta

### Resumos Notion-style (`/api/summaries`)
- `GET /api/summaries` - Listar resumos
- `GET /api/summaries/{id}` - Obter resumo por ID
- `GET /api/summaries/subject/{subjectId}` - Listar resumos por matéria
- `POST /api/summaries` - Criar resumo
- `PUT /api/summaries/{id}` - Atualizar resumo
- `DELETE /api/summaries/{id}` - Deletar resumo

### Spaced Repetition / Flashcards (`/api/flashcards`)
- `GET /api/flashcards` - Listar todos os flashcards
- `GET /api/flashcards/due` - Listar flashcards prontos para revisão (algoritmo Leitner)
- `POST /api/flashcards` - Criar flashcard manual ou vinculado a resumo
- `PUT /api/flashcards/{id}` - Atualizar flashcard
- `POST /api/flashcards/{id}/review?quality={easy|good|hard}` - Submeter revisão (avança/recua de caixa Leitner)
- `DELETE /api/flashcards/{id}` - Deletar flashcard

### Arquivos e Anotações PDF (`/api/files`)
- `POST /api/files/upload?subjectId={id}` - Upload de PDF físico para uma matéria
- `GET /api/files` - Listar arquivos do usuário
- `GET /api/files/subject/{id}` - Listar arquivos de uma matéria
- `GET /api/files/download/{id}` - Baixar/visualizar arquivo PDF
- `DELETE /api/files/{id}` - Deletar arquivo e suas anotações
- `GET /api/files/{id}/annotations?pageNumber={num}` - Listar anotações (destaques/notas) da página
- `POST /api/files/annotations` - Salvar anotação
- `DELETE /api/files/annotations/{id}` - Deletar anotação

### Inteligência Artificial / Gemini (`/api/ai`)
- `POST /api/ai/flashcards/generate?subjectId={id}` - Gerar flashcards automaticamente a partir de texto (requer flag premium e API key ou usa mock inteligente)

## Testes

```bash
# Executa os testes de backend
& "C:\Users\fares\.gemini\antigravity\scratch\apache-maven-3.9.6\bin\mvn.cmd" test
```

## Observações

- As rotas da API, exceto autenticação e documentação, exigem token JWT.
- O arquivo `.env.example` na raiz e subpastas serve como base para a configuração local.
- Certifique-se de que os arquivos `.env` não sejam commitados.

