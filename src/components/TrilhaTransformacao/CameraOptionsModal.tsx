import { Camera, ImageIcon, Monitor, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';

interface CameraOptionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOptionSelect: (option: 'camera' | 'gallery' | 'screen') => void;
}

export function CameraOptionsModal({ open, onOpenChange, onOptionSelect }: CameraOptionsModalProps) {
  const options = [
    {
      id: 'camera' as const,
      icon: Camera,
      label: 'Tirar foto',
      description: 'Capture uma imagem com a câmera'
    },
    {
      id: 'gallery' as const,
      icon: ImageIcon,
      label: 'Galeria',
      description: 'Escolher da galeria de fotos'
    },
    {
      id: 'screen' as const,
      icon: Monitor,
      label: 'Compartilhar tela',
      description: 'Mostrar sua tela para o consultor'
    }
  ];

  const handleOptionClick = (option: 'camera' | 'gallery' | 'screen') => {
    onOptionSelect(option);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-medium">
            Enviar mídia
          </DialogTitle>
          <DialogDescription className="text-center text-gray-400">
            Escolha como deseja capturar ou selecionar sua mídia
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <Button
                key={option.id}
                variant="ghost"
                className="w-full h-auto p-4 flex items-start gap-4 hover:bg-gray-800 text-left justify-start"
                onClick={() => handleOptionClick(option.id)}
              >
                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white">{option.label}</div>
                  <div className="text-sm text-gray-400">{option.description}</div>
                </div>
              </Button>
            );
          })}
        </div>
        
        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-white"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}