// Estado de prontidão de integrações críticas, preenchido no boot
// (server/index.ts) e exposto no GET /api/health. Motivação (LAUNCH_PLAN.md
// B5/P1-2): e-mail sem API key e billing sem webhook falhavam em silêncio —
// o app subia "saudável" com verificação de conta e pagamentos quebrados.
export const runtimeStatus = {
  emailConfigured: false,
  billingInitialized: false,
  billingError: null as string | null,
};
