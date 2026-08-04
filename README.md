# Study Management Platform

Plataforma completa para gerenciamento de estudos com API REST (Spring Boot) e interface Web (React + Vite).

---

## Estrutura do Projeto

O repositório está organizado da seguinte forma:

- `/backend`: API REST desenvolvida em Spring Boot.
- `/frontend`: Aplicação Single Page (SPA) desenvolvida em React + TypeScript + Vite.

Para mais informações sobre a estrutura do projeto, consulte [docs/estrutura.md](docs/estrutura.md).

---

## Stack Tecnológica

### Backend
- **Java 21** com **Spring Boot 3.2**
- **Spring Security** + **JWT** para autenticação stateless
- **Spring Data JPA** com suporte a **MySQL** (Desenvolvimento) e **PostgreSQL / Neon Database** (Produção)
- **HikariCP** para gerenciamento de pool de conexões
- **Swagger/OpenAPI** para documentação automática em `/swagger-ui.html`

### Frontend
- **React 19**
- **Vite** (Build tool)
- **Vanilla CSS** (Design system customizado com variáveis CSS e escala Fibonacci)
- **Axios** (Consumo da API com interceptores de autenticação)
- **Zustand** (Estado de autenticação persistido)
- **Recharts** (Visualização de métricas e gráficos)
- **pdfjs-dist** (Leitor de PDFs com annotations integrado)

---

## Configuração de Ambientes e Banco de Dados

O backend do projeto utiliza **Spring Profiles** para separar os ambientes de **Desenvolvimento** e **Produção**:

- **Desenvolvimento (`dev`)**: Utiliza banco de dados MySQL local. Ativado por padrão caso nenhuma variável seja especificada.
- **Produção (`prod`)**: Utiliza banco de dados PostgreSQL hospedado no **Neon Database** via conexão SSL exigida.

### Variáveis de Ambiente (`.env`)

Crie um arquivo `.env` na raiz do projeto ou dentro de `backend/` com base no arquivo `.env.example`:

```bash
# Na raiz ou em backend/
cp .env.example .env
```

#### Principais Variáveis:

| Variável | Perfil | Descrição | Exemplo |
| :--- | :--- | :--- | :--- |
| `SPRING_PROFILES_ACTIVE` | Todos | Perfil ativo do Spring Boot | `dev` ou `prod` |
| `SERVER_PORT` | Todos | Porta de execução do backend | `8080` |
| `DATABASE_URL` | `prod` | Connection String do Neon (PostgreSQL com SSL) | `jdbc:postgresql://ep-xxx.neon.tech/neondb?sslmode=require` |
| `SPRING_DATASOURCE_USERNAME` | `prod` | Usuário do banco (caso não esteja na URL) | `seu_usuario_neon` |
| `SPRING_DATASOURCE_PASSWORD` | `prod` | Senha do banco (caso não esteja na URL) | `sua_senha_neon` |
| `DB_URL` | `dev` | URL do MySQL local | `jdbc:mysql://localhost:3306/studyplatform?...` |
| `DB_USERNAME` | `dev` | Usuário do MySQL local | `root` |
| `DB_PASSWORD` | `dev` | Senha do MySQL local | `sua_senha_local` |
| `JWT_SECRET` | Todos | Chave secreta JWT (mín. 32 caracteres) | `sua_chave_secreta_com_pelo_menos_32_caracteres` |
| `CORS_ALLOWED_ORIGINS` | Todos | Origens permitidas para requisições HTTP | `http://localhost:5173,http://localhost:5174` |

---

## Como Configurar o Neon Database (Produção)

1. Acesse o console do **[Neon Database](https://neon.tech/)** e crie uma conta ou faça login.
2. Crie um novo projeto (ex: `study-platform-prod`).
3. No painel do projeto (Dashboard), vá até **Connection Details**.
4. Selecione a opção **JDBC** ou copie a Connection String. Ela terá o seguinte formato:
   ```text
   postgresql://[user]:[password]@[ep-xxx-name].us-east-2.aws.neon.tech/[dbname]?sslmode=require
   ```
5. Para utilização com Spring Boot, formate com o prefixo JDBC:
   ```text
   jdbc:postgresql://[ep-xxx-name].us-east-2.aws.neon.tech/[dbname]?sslmode=require
   ```
6. Defina as seguintes variáveis no seu ambiente de hospedagem em nuvem (Render, Railway, Heroku, AWS, etc.):
   ```bash
   SPRING_PROFILES_ACTIVE=prod
   DATABASE_URL=jdbc:postgresql://[user]:[password]@[ep-xxx-name].us-east-2.aws.neon.tech/[dbname]?sslmode=require
   JWT_SECRET=sua_chave_secreta_de_producao
   ```

---

## Como Executar Localmente

### 1. Requisitos Prévios
- Java 21 JDK instalado.
- Node.js (v18+) e npm.
- MySQL em execução localmente (porta 3306) com o banco `studyplatform` criado.

### 2. Iniciar o Backend (Spring Boot)

Em modo de desenvolvimento (Perfil `dev` por padrão):
```bash
cd backend
mvn spring-boot:run
```

Para testar localmente conectando ao Neon PostgreSQL (Perfil `prod`):
```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=prod -Dspring-boot.run.arguments="--DATABASE_URL=jdbc:postgresql://seu-neon-host/neondb?sslmode=require --SPRING_DATASOURCE_USERNAME=seu_user --SPRING_DATASOURCE_PASSWORD=sua_senha"
```

O backend estará disponível em `http://localhost:8080`.
Documentação da API via Swagger: `http://localhost:8080/swagger-ui.html`.

### 3. Iniciar o Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

O frontend estará disponível em `http://localhost:5173`.

---

## Endpoints da API

### Autenticação (`/api/auth`)
- `POST /api/auth/register` - Registrar novo usuário
- `POST /api/auth/login` - Login do usuário (retorna JWT e dados básicos)

### Matérias (`/api/subjects`)
- `GET /api/subjects` - Listar matérias do usuário
- `GET /api/subjects/{id}` - Obter matéria por ID
- `POST /api/subjects` - Criar nova matéria
- `PUT /api/subjects/{id}` - Atualizar matéria
- `DELETE /api/subjects/{id}` - Deletar matéria

### Sessões de Estudo (`/api/study-sessions`)
- `GET /api/study-sessions` - Listar todas as sessões
- `POST /api/study-sessions` - Criar sessão (recalcula metas)
- `PUT /api/study-sessions/{id}` - Atualizar sessão
- `DELETE /api/study-sessions/{id}` - Deletar sessão

### Metas (`/api/goals`)
- `GET /api/goals` - Listar todas as metas
- `POST /api/goals` - Criar meta
- `PUT /api/goals/{id}` - Atualizar meta
- `DELETE /api/goals/{id}` - Deletar meta

### Resumos Notion-style (`/api/summaries`)
- `GET /api/summaries` - Listar resumos
- `POST /api/summaries` - Criar resumo
- `PUT /api/summaries/{id}` - Atualizar resumo
- `DELETE /api/summaries/{id}` - Deletar resumo

### Spaced Repetition / Flashcards (`/api/flashcards`)
- `GET /api/flashcards` - Listar todos os flashcards
- `GET /api/flashcards/due` - Listar flashcards prontos para revisão
- `POST /api/flashcards` - Criar flashcard
- `POST /api/flashcards/{id}/review?quality={easy|good|hard}` - Submeter revisão
- `DELETE /api/flashcards/{id}` - Deletar flashcard

---

## Testes

```bash
# Executa os testes unitários e de integração do backend
cd backend
mvn test
```

---

## Observações de Segurança

- Nenhuma credencial ou chave secreta deve ser commitada no repositório.
- Os arquivos `.env` e `.env.local` estão inclusos no `.gitignore`. Use `.env.example` como referência.
