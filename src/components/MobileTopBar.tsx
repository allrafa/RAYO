// Task #93 — pílulas flutuantes (lupa + envelope) removidas. Busca virou
// barra clicável dentro do feed da Comunidade; Mensagens vive na aba
// "Mensagens" do header da Comunidade. Mantemos o componente exportado
// como no-op para não quebrar imports existentes.
export function MobileTopBar(_props: {
  onOpenMessages: () => void;
  onTabChange: (tab: string) => void;
}) {
  return null;
}
