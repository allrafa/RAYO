import { Button } from "./ui/button";
import { RotateCcw } from "lucide-react";

export function DebugResetOnboarding() {
  const handleReset = () => {
    if (confirm("Resetar onboarding? Isso vai limpar todos os dados salvos e voltar para a tela inicial.")) {
      localStorage.removeItem("raio-user");
      localStorage.removeItem("raio-welcome-seen");
      window.location.reload();
    }
  };

  // Só mostrar em desenvolvimento
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <Button
      onClick={handleReset}
      variant="outline"
      size="sm"
      className="fixed bottom-20 left-4 z-50 bg-red-500 hover:bg-red-600 text-white border-red-600"
    >
      <RotateCcw className="w-4 h-4 mr-2" />
      Reset Onboarding
    </Button>
  );
}
