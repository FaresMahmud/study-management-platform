# STUDYFLOW 2.0 — AGENT RULES AND DESIGN SYSTEM SPECIFICATION
# Version 2.0 | July 2026

## SEÇÃO 0: PRINCÍPIOS FUNDAMENTAIS
1. "O que eu faço AGORA?" — O usuário deve saber em ≤ 3 segundos.
2. Fricção mínima para ações principais (1-2 cliques máximo).
3. Feedback contínuo, nunca estático.
4. Falha segura — erros são oportunidades, não punições.
5. Progresso em múltiplas camadas (tempo, cards, quizzes, simulados).

## SEÇÃO 1: TOKENS DE DESIGN
- **Cores (Dark Mode):**
  - Background: `#07080F` (AMOLED Dark)
  - Surface: `rgba(255,255,255,0.025)` (Slate Dark)
  - Surface-hover: `rgba(255,255,255,0.045)`
  - Surface-elevated: `rgba(255,255,255,0.035)`
  - Border-default: `rgba(255,255,255,0.06)`
  - Border-hover: `rgba(255,255,255,0.12)`
  - Border-active: `rgba(99,102,241,0.3)`
  - Primary: `#6366F1` (Indigo)
  - Success: `#10B981` (Emerald)
  - Warning: `#F59E0B` (Amber)
  - Danger: `#EF4444` (Ruby)
  - AI-accent: `#EC4899` (Magenta/Pink)
  - Text-primary: `#F8FAFC`
  - Text-secondary: `#94A3B8`
  - Text-muted: `#64748B`

- **Font Scale & Spacing (Fibonacci-based):**
  - Display: 56px (weight 900, tabular-nums)
  - H1: 28px (weight 800)
  - H2: 20px (weight 700)
  - H3: 18px (weight 800)
  - H4: 16px (weight 700)
  - Body-large: 15px (weight 500)
  - Body: 14px (weight 500)
  - Caption: 12px (weight 600)
  - Spacing (Base 4px): xs (4px), sm (8px), md (16px), lg (24px), xl (32px), 2xl (48px)
  - Radius-sm (8px), Radius-md (12px), Radius-lg (16px), Radius-xl (20px), Radius-2xl (24px)
