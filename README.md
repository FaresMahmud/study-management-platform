# Study Management Platform

API REST para gerenciamento de estudos desenvolvida com Spring Boot, JWT e MySQL.

## Stack

- Java 21
- Spring Boot 3.2
- Spring Security + JWT
- Spring Data JPA
- MySQL
- Swagger/OpenAPI

## Funcionalidades

- Cadastro e login de usuários com JWT
- Gerenciamento de matérias
- Registro de sessões de estudo
- Criação e acompanhamento de metas
- Documentação automática da API via Swagger

## Pré-requisitos

- Java 21
- Maven 3.9+
- MySQL 8+

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

3. Verifique se o `.env` continua fora do Git. O repositório já ignora `.env`, `.env.*` e mantém `.env.example` versionado.

## Como executar

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