# Study Management Platform

Plataforma completa para gerenciamento de estudos com API REST (Spring Boot) e interface Web (React + Vite).

## Estrutura do Projeto

O repositório está organizado da seguinte forma:

- `/backend`: API REST desenvolvida em Spring Boot.
- `/frontend`: Aplicação Single Page (SPA) desenvolvida em React + TypeScript + Vite.

## Stack

### Backend
- **Java 21** com **Spring Boot 3.2**
- **Spring Security** + **JWT** para autenticação
- **Spring Data JPA** com **MySQL**
- **Swagger/OpenAPI** para documentação

### Frontend
- **React 18**
- **Vite** (Build tool)
- **Tailwind CSS** (Estilização)
- **Axios** (Consumo da API)

## Funcionalidades

- Interface responsiva para gestão de estudos
- Cadastro e login de usuários com autenticação JWT
- Gerenciamento de matérias
- Registro de sessões de estudo
- Criação e acompanhamento de metas
- Documentação automática da API via Swagger
- Dashboard com métricas de progresso

## Pré-requisitos

- Java 21
- Maven 3.9+
- MySQL 8+
- Node.js 18+ e npm/yarn

## Configuração

1. Crie o banco de dados no MySQL:

   ```sql
   CREATE DATABASE studyplatform;
   ```

2. Copie o arquivo de exemplo para `.env` e preencha com seus dados locais:

   - `SERVER_PORT`
   - `DB_URL`
   - `DB_USERNAME`
   - `DB_PASSWORD`
   - `JWT_SECRET`
   - `JWT_EXPIRATION`

3. Para o Frontend, navegue até a pasta `frontend` e configure o arquivo `.env`:
   ```bash
   VITE_API_URL=http://localhost:8080/api
   ```

4. Verifique se os arquivos `.env` continuam fora do Git. O repositório já ignora `.env` e `.env.*`.

## Como executar

### Backend

```bash
mvn spring-boot:run
```

A aplicação sobe, por padrão, em `http://localhost:8080`.

## Swagger

Depois de iniciar a aplicação, acesse:

```text
http://localhost:8080/swagger-ui.html
```

Para testar rotas protegidas:

1. Faça login em `POST /api/auth/login`
2. Copie o token JWT retornado
3. Clique em `Authorize` no Swagger e informe `Bearer {seu_token}`

## Endpoints principais

### Autenticação

- `POST /api/auth/register`
- `POST /api/auth/login`

### Matérias

- `GET /api/subjects`
- `GET /api/subjects/{id}`
- `POST /api/subjects`
- `PUT /api/subjects/{id}`
- `DELETE /api/subjects/{id}`

### Sessões de estudo

- `GET /api/study-sessions`
- `GET /api/study-sessions/{id}`
- `POST /api/study-sessions`
- `PUT /api/study-sessions/{id}`
- `DELETE /api/study-sessions/{id}`

### Metas

- `GET /api/goals`
- `GET /api/goals/{id}`
- `POST /api/goals`
- `PUT /api/goals/{id}`
- `DELETE /api/goals/{id}`

## Testes

```bash
mvn test
```

## Observações

- As rotas da API, exceto autenticação e documentação, exigem token JWT.
- O arquivo `.env.example` serve como base para a configuração local.
