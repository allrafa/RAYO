import { ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";

interface SimpleQuizTestProps {
  quizType: string;
  onBack: () => void;
}

export function SimpleQuizTest({ quizType, onBack }: SimpleQuizTestProps) {
  return (
    <div className="h-full w-full bg-gradient-to-br from-rayo-forest-50 to-rayo-lime-50">
      <div className="h-full p-4 pt-8">
        <div className="max-w-2xl mx-auto h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center mb-6 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="mr-3"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-xl font-semibold">
              Quiz de {quizType === 'communication' ? 'Comunicação' : 'Conflitos'}
            </h1>
          </div>

          {/* Content */}
          <div className="bg-white rounded-lg p-6 shadow-sm flex-1 flex flex-col">
            <h2 className="text-lg font-medium mb-4">
              Quiz está funcionando!
            </h2>
            <p className="text-muted-foreground mb-6 flex-1">
              Esta é uma versão simplificada para testar se o modal está funcionando corretamente.
              O modal agora abre sempre no topo da tela, independentemente de onde você estava na página.
            </p>
            
            <Button onClick={onBack} className="w-full mt-auto">
              Fechar Quiz
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}