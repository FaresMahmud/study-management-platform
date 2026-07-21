# 🧠 Contexto de Arquitetura, Regras de Design e Engenharia (SaaS StudyFlow)
> **Este arquivo foi criado especificamente para alimentar assistentes de Inteligência Artificial (LLMs)**, provendo um entendimento completo sobre as regras de negócio, stack técnica, decisões de design, requisitos funcionais, não funcionais e caminhos para evolução do projeto.

---

## 1. Visão Geral do Sistema
O **Study Management Platform (StudyFlow)** é uma plataforma SaaS de alta performance voltada para a gestão de estudos, produtividade e aprendizagem ativa baseada em evidências. Seus principais pilares de experiência de usuário são:
1. **Preparação Orientada (Exam Prep)**: Criação de cronogramas focados em exames específicos com metas de maestria (%) e contagem regressiva de dias.
2. **Memorização Ativa**: Sistema de **Flashcards** baseados no *Leitner System* com agendamento inteligente.
3. **Ingestão e OCR**: Upload de PDFs com extração assíncrona de texto via Apache Tika e segmentação semântica (chunks).
4. **Tutor Virtual RAG**: Chatbot inteligente integrado à API do Gemini para tirar dúvidas baseando-se unicamente nos PDFs do aluno.
5. **Modo Foco (Pomodoro)**: Temporizador científico integrado para cronometrar blocos de estudo e monitorar a produtividade.

---

## 2. Stack Tecnológica

### Backend (Java)
*   **Core**: Java 21 + Spring Boot 3.2.4.
*   **Segurança**: Spring Security + JWT.
*   **Persistência**: Spring Data JPA + Hibernate.
*   **Banco de Dados**: MySQL (Local/Prod) + Flyway para migrações de esquema.
*   **Testes**: JUnit 5 + Mockito + Banco H2 *in-memory* (modo PostgreSQL).
*   **Auxiliares**: Lombok (Getter/Setter e Equals/ToString customizados), Jsoup (Sanitizador HTML).

### Frontend (React)
*   **Core**: React 19 + TypeScript + Vite.
*   **Roteamento**: React Router DOM v7.
*   **Gerenciamento de Estado**: Zustand.
*   **Comunicação API**: Axios (com interceptor de desempacotamento de páginas do Spring).
*   **Visualização de Dados**: Recharts.
*   **Estilização**: CSS Vanilla com Tokens Baseados em HSL e Fibonacci.

---

## 3. Arquitetura de Software (Modular Monolith)
O backend utiliza uma **Arquitetura Baseada em Recursos/Funcionalidades (Modular Monolith / Package-by-Feature)**. Cada pasta funcional encapsula suas próprias Controllers, Services, Repositories, Mappers, DTOs e Classes de Domínio:

*   `com.studyplatform.auth`: Cadastro, login e segurança.
*   `com.studyplatform.examprep`: Entidade central `ExamPrep` (preparação de exames), APIs de CRUD, DTOs de mapeamento e listeners de eventos assíncronos.
*   `com.studyplatform.subject`: Matérias associadas aos exames.
*   `com.studyplatform.goal`: Metas de maestria por disciplina e recálculo ponderado de domínio.
*   `com.studyplatform.session`: Registro de sessões de estudo comuns.
*   `com.studyplatform.summary`: Resumos de estudo com editor Notion-style.
*   `com.studyplatform.flashcard`: Pilhas de flashcards e algoritmo Leitner.
*   `com.studyplatform.file`: Upload físico de arquivos e anotações.
*   `com.studyplatform.ai` / `com.studyplatform.ai.vector`: Geração de resumos e perguntas, geração de embeddings do Gemini (`text-embedding-004`) e cálculo de similaridade de cosseno em memória Java.
*   `com.studyplatform.shared`: Configurações transversais (segurança JWT, JpaConfig Auditing, RateLimiting).

---

## 4. Nova Arquitetura de Preparação para Provas (Exam Prep)

### 4.1 Entidade Central `ExamPrep`
Representa a preparação ativa do aluno para um exame (ex: "ENEM 2026", "Concurso Público").
*   Mede o sucesso baseado em **Domínio (%)** ao invés de horas brutas estudadas.
*   **Colunas:** `id` (Long, PK), `title` (String), `exam_date` (LocalDate), `target_score` (Integer, meta de 0 a 100), `status` (Enum: `ACTIVE`, `COMPLETED`, `ARCHIVED`), `share_token` (String, UUID público), `is_public` (Boolean).

### 4.2 Pipeline OCR & Chunking
*   **Apache Tika:** Realiza extração e OCR de PDFs upados.
*   **Asynchronous Processing:** Executado via `@Async` no `PdfProcessingService` para não bloquear a Thread HTTP de upload do arquivo.
*   **PdfChunk:** Salva os fragmentos no banco MySQL (tabela `pdf_chunks`) contendo 500 a 1000 tokens cada.

### 4.3 Tutor Virtual RAG (Retrieval-Augmented Generation)
*   **Embeddings:** A API do Gemini (`text-embedding-004`) gera vetores de 768 dimensões para chunks e perguntas.
*   **Busca por Cosseno:** O `VectorStoreService` calcula em memória Java a distância cosseno para obter os top 5 chunks mais semelhantes à dúvida do aluno, garantindo isolamento estrito (nunca mistura arquivos de exames diferentes).
*   **Prompt RAG:** Contextualiza o Gemini: *"Contexto: [chunks]. Com base apenas no contexto, responda: [pergunta]"*. Exposto em `POST /api/v1/chat/ask`.

### 4.4 Event-Driven Decoupling
*   Para evitar transações de banco lentas, o recálculo ponderado de maestria da meta (`Goal`) foi desacoplado usando o barramento de eventos do Spring Boot.
*   A criação de Quizzes e Simulados publica um `ExamPrepActivityEvent` que é interceptado pelo listener assíncrono `@Async` `ExamPrepActivityListener` em background para atualizar a proficiência da meta.

---

## 5. Regras e Design System do Frontend (UI/UX Científica)

Para manter a aplicação limpa, objetiva e confortável, todo desenvolvedor (e IA) deve seguir as seguintes regras visuais estritas:

### 5.1 Carga Cognitiva Controlada (John Sweller & Hick's Law)
*   **Nomenclatura Literal:** Mantenha os termos óbvios e autoexplicativos. Nunca utilize termos ambíguos ou mistos.
    *   Sempre use o nome **"Flashcards"** para cartões de memorização.
    *   Use **"Matérias & PDFs"** para o antigo Workspace.
    *   Use **"Metas de Maestria"** para Goals.
    *   Use **"Simulados"** e **"Histórico"** (de estudo) nos menus.
*   **Foco Visual:** O Dashboard deve ser simplificado. Exiba apenas informações vitais: status do Exame (countdown), ações rápidas (Quizzes, Flashcards, Simulados), progresso de Metas de Maestria e o Chat do Tutor Virtual.

### 5.2 Espaçamento de Fibonacci (Grid Áureo)
Utilize exclusivamente números da sequência de Fibonacci para paddings, margens, gaps e tamanhos de fonte:
*   `gap: 8px` / `gap: 13px` / `gap: 21px` para distâncias internas e entre cards.
*   `padding: 13px` / `padding: 21px` / `padding: 34px` para contêineres e bordas de páginas.
*   **Escala Tipográfica Fibonacci (Base 16px):**
    *   `13px` (Legendas, textos secundários e metadados)
    *   `16px` (Texto principal do corpo de posts e botões)
    *   `21px` (Títulos de cards e seções menores)
    *   `34px` (Títulos das seções principais de páginas)
    *   `55px` (Destaque principal/Contador de tempo)

### 5.3 Paleta de Cores Científica para Concentração
Não utilize cores planas ou contrastes agressivos. Adote variáveis HSL que estimulem clareza mental e reduzam o cansaço ocular:
*   `--bg-primary: hsl(222, 28%, 8%)` (Fundo Obsidian Dark)
*   `--bg-secondary: hsl(222, 24%, 12%)` (Fundo Slate Dark para cards)
*   `--bg-tertiary: hsl(222, 20%, 15%)` (Fundo escuro para inputs e blocos internos)
*   `--border-color: hsl(222, 16%, 22%)` (Bordas de divisão sutis)
*   `--primary: hsl(217, 91%, 60%)` (Foco Royal Blue para botões e links ativos)
*   `--success: hsl(142, 72%, 45%)` (Verde esmeralda para progresso e maestria bem-sucedida)
*   `--warning: hsl(38, 92%, 50%)` (Âmbar para contagem de dias/alertas)

---

## 6. Divisão de Trabalho e Convenção de Mesclagem (Merge Git)

Se dois desenvolvedores (ou duas IAs) estiverem codificando em paralelo, a distribuição deve seguir as trilhas abaixo para evitar conflitos de mesclagem de arquivos:

### Trilha A (Desenvolvedor A) — Core, OCR & Eventos
*   **Foco:** Ingestão de arquivos, modelagem JPA central, listeners de eventos, autenticação social e contêineres de testes.
*   **Arquivos de Trabalho:**
    *   `com.studyplatform.examprep` (Entidades bases e listeners)
    *   `com.studyplatform.shared.config` (JpaConfig e JPA Auditing)
    *   `com.studyplatform.entity` (Ajustes de relacionamentos e JPA)
*   **Migrações Flyway SQL Reservadas:** `V3`, `V4` e `V11`.

### Trilha B (Desenvolvedor B) — IA (RAG), Gamificação e Funcionalidades
*   **Foco:** IA do Gemini, cálculo de cosseno, quizzes, simulados cronometrados, Pomodoro, compartilhamento social e cache com Redis.
*   **Arquivos de Trabalho:**
    *   `com.studyplatform.ai` / `com.studyplatform.ai.vector` (Tutor IA e Busca Vetorial)
    *   `com.studyplatform.analytics` (Zona de Aprendizado)
    *   `com.studyplatform.session` (Foco e Pomodoro)
*   **Migrações Flyway SQL Reservadas:** `V5`, `V6`, `V7`, `V8`, `V9` e `V10`.
