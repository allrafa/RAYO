import { Target, MessageCircle, CheckCircle, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface PlanCreationModalProps {
  show: boolean;
  consultant: 'jessica' | 'rafa';
  onAccept: () => void;
  onDecline: () => void;
}

export function PlanCreationModal({ show, consultant, onAccept, onDecline }: PlanCreationModalProps) {
  if (!show) return null;

  const consultantInfo = consultant === 'jessica' 
    ? { 
        name: 'Jessica Raio', 
        color: 'from-pink-500 to-purple-600',
        emoji: '💝'
      }
    : { 
        name: 'Rafa Raio', 
        color: 'from-blue-500 to-cyan-600',
        emoji: '🎯'
      };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-white shadow-2xl border-0 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        <CardHeader className={`bg-gradient-to-r ${consultantInfo.color} text-white text-center pb-6`}>
          <div className="text-4xl mb-2">{consultantInfo.emoji}</div>
          <CardTitle className="text-xl mb-1">Criar Plano Personalizado?</CardTitle>
          <p className="text-white/90 text-sm">
            {consultantInfo.name} quer organizar tudo em um plano estruturado
          </p>
        </CardHeader>
        
        <CardContent className="p-6 space-y-4">
          <div className="text-center mb-6">
            <p className="text-gray-700 leading-relaxed">
              Baseado em nossa conversa, posso criar um <strong>plano personalizado</strong> com 
              insights, próximos passos e estratégias específicas para sua situação.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Target className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-sm text-gray-900">Plano Estruturado</div>
                <div className="text-xs text-gray-600">Objetivos claros e passos práticos</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <div className="font-medium text-sm text-gray-900">Acompanhamento</div>
                <div className="text-xs text-gray-600">Progresso salvo e revisável</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <div className="font-medium text-sm text-gray-900">Central de Conversas</div>
                <div className="text-xs text-gray-600">Acesso fácil para continuar depois</div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onDecline}
              className="flex-1 hover:bg-gray-50"
            >
              <X className="w-4 h-4 mr-2" />
              Agora Não
            </Button>
            <Button
              onClick={onAccept}
              className={`flex-1 bg-gradient-to-r ${consultantInfo.color} hover:opacity-90 text-white`}
            >
              <Target className="w-4 h-4 mr-2" />
              Criar Plano
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            Você poderá acessar e modificar seu plano a qualquer momento
          </p>
        </CardContent>
      </Card>
    </div>
  );
}