# StudyFlow - Frontend

Frontend do **StudyFlow**, construido com **React**, **TypeScript** e **Vite**. O frontend é a aplicação que consome a API do backend para fornecer funcionalidades de rastreamento de estudo, gerenciamento de flashcards, preparação de exames e foco em produtividade.

---

## Visão Geral

- **Rastreamento de Sessões de Estudo**: Registrar e monitorar sessões de estudo com associação de matérias
- **Gerenciamento de Flashcards**: Criar e revisar flashcards com repetição espaçada
- **Preparação de Exames**: Acompanhar preparações de exames com pontuação alvo e dias restantes
- **Visualização de Progresso**: Dashboard com estatísticas, calendário de heatmap e foco semanal
- **Modo de Foco**: Cronômetro Pomodoro, modo zen e opções de áudio ambiente
- **Definição de Metas**: Definir e acompanhar metas de estudo com monitoramento de progresso

## Tech Stack

- **React 19** com TypeScript
- **Vite 8** para desenvolvimento rápido e build
- **React Router DOM 7** para navegação
- **TanStack React Query 5** para gerenciamento de estado no servidor
- **Zustand 5** para gerenciamento de estado no cliente
- **Recharts 3** para visualização de dados
- **Lucide React** para ícones
- **Axios** para comunicações de API
- **PDF.js** para visualização de PDFs

## Plugins e Ferramentas

- **[@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react)** - Usa Oxc para React Fast Refresh
- **[@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc)** - Plugin React baseado em SWC
- **[vite-plugin-pwa](https://vite-pwa-org.netlify.app)** - Suporte a Progressive Web App com manifesto e service worker
- **[vitest](https://vitest.dev)** - Testes unitários e de integração
- **ESLint** com configuração consciente de TypeScript e plugins React

## Configuração PWA

O aplicativo está configurado como Progressive Web App com:
- Nome: "StudyFlow - Plataforma de Estudos"
- Nome curto: "StudyFlow"
- Exibição: standalone
- Orientação: retrato
- Manifesto de aplicativo web com ícones 192x192 e 512x512
- Service worker com cache runtime para Google Fonts e assets

## Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `dev` | Inicia servidor de desenvolvimento em `http://localhost:5173` |
| `build` | Build para produção |
| `preview` | Preview do build de produção localmente |
| `lint` | Executa ESLint para qualidade de código |
| `test` | Executa testes Vitest |
| `test:coverage` | Executa Vitest com relatório de cobertura |

## Recursos Principais

### Dashboard
- Grade de atividades mostrando sessões de estudo recentes
- Cards de progresso de matérias com codificação de cor
- Cards de foco semanal com rastreamento Pomodoro
- Calendário de heatmap para visualização de hábitos de estudo
- Grade de estatísticas com métricas de estudo

### Sessões de Estudo
- Criar, editar e deletar sessões de estudo
- Associar sessões a matérias
- Controlar duração e observações
- Histórico e filtro de sessões

### Flashcards
- Criar flashcards com conteúdo front/back
- Associação a matérias
- Sistema de boxes/repetição espaçada
- Programação de revisão com datas de próxima revisão

### Preparação de Exames
- Acompanhar preparações de exames
- Definir pontuação alvo
- Monitorar dias restantes
- Compartilhar preparações de exames via links públicos

### Foco & Produtividade
- Cronômetro Pomodoro com tipos de sessão customizáveis
- Opções de áudio ambiente (chuva, café, etc.)
- Modo zen para estudo sem distrações
- Integração de cronômetro de foco com dashboard

### Autenticação de Usuário
- Fluxos de Login/Register
- Rotas protegidas
- Gerenciamento de sessão de usuário
- Portão de recursos premium

## Estrutura de Componentes

```
src/
├── api/           # Configurações de cliente API
├── components/
│   ├── ui/        # primitives UI reutilizáveis (Button, Card, etc.)
│   ├── dashboard/ # Components específicos de dashboard
│   ├── study/     # Components de sessão de estudo e flashcards
│   ├── wizard/    # Components de workflows guiados
│   └── pages/     # Components de nível de página
├── store/         # Gerenciamento de estado Zustand
├── types/         # Definições TypeScript
├── styles/        # CSS global e theming
└── utils/         # Funções helper (format, streak, confetti)
```

## Desenvolvimento

O projeto utiliza ESLint com configuração consciente de TypeScript. Para ativar o linting consciente de tipos, o config usa `tseslint.configs.recommendedTypeChecked` com referências de projeto para `tsconfig.app.json` e `tsconfig.node.json`.

O React Compiler não está habilitado por padrão devido a considerações de performance em desenvolvimento/build, mas pode ser adicionado seguindo a [documentação do React Compiler](https://react.dev/learn/react-compiler/installation).

## Links Úteis

- [Documentação do Vite](https://vite.dev/guide)
- [Documentação do React](https://react.dev/reference)
- [TanStack Query](https://tanstack.com/query)
- [Zustand](https://zustand-demo.pmnd.rs)
- [Recharts](://recharts.org)
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app)