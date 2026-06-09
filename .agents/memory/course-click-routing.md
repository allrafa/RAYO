---
name: Course click routing contract
description: Regra cross-cutting para abrir cursos no catálogo RAYO (trilha paga vs curso avulso).
---

Qualquer card/CTA novo que abra um curso no catálogo (AcademiaPage / Turmas)
DEVE espelhar o contrato do `CourseCard`:

- Se o curso tem `course.trail_slug` → `window.location.href = /trilhas/${trail_slug}`
  (é onde mora o checkout Stripe da trilha paga).
- Senão → fluxo de detalhe do curso (`setCurrentCourseId(id)` + `setIsInCourseDetail(true)`).

**Why:** numa reformulação do catálogo, um novo card de entrada (StartHereCard)
abriu direto o detalhe do curso, ignorando `trail_slug` — isso pula a
landing/paywall da trilha paga. Pego em code review como regressão severa.

**How to apply:** ao criar qualquer novo componente que renderiza/abre um curso
em `src/components/AcademiaPage.tsx` (ou correlatos), não chame o detalhe do
curso diretamente; cheque `trail_slug` primeiro. O `CourseCard.handleCardClick`
é a referência canônica.
