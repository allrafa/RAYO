import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  Bell, 
  Users, 
  Camera, 
  Mic, 
  MapPin, 
  Shield, 
  Check, 
  ArrowRight,
  X
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { enhancedToast } from "./EnhancedToast";

interface InitialPermissionsProps {
  onComplete: () => void;
}

export function InitialPermissions({ onComplete }: InitialPermissionsProps) {
  const [step, setStep] = useState(1);
  const [permissions, setPermissions] = useState({
    notifications: false,
    camera: false,
    microphone: false,
    location: false,
    contacts: false
  });

  const permissionsList = [
    {
      id: "notifications",
      icon: Bell,
      title: "Notificações",
      description: "Receba lembretes e atualizações importantes",
      benefit: "Não perca nenhuma novidade do RAIO",
      required: false
    },
    {
      id: "camera",
      icon: Camera,
      title: "Câmera",
      description: "Para compartilhar fotos e participar de videochamadas",
      benefit: "Compartilhe momentos especiais com a comunidade",
      required: false
    },
    {
      id: "microphone",
      icon: Mic,
      title: "Microfone",
      description: "Para participar de conversas por voz e podcasts",
      benefit: "Interaja através da Trilha da Transformação",
      required: false
    },
    {
      id: "contacts",
      icon: Users,
      title: "Contatos",
      description: "Encontre amigos que já usam o RAIO",
      benefit: "Conecte-se com pessoas que você conhece",
      required: false
    }
  ];

  const handlePermissionRequest = async (permissionId: string) => {
    try {
      let granted = false;

      switch (permissionId) {
        case "notifications":
          if ("Notification" in window) {
            const permission = await Notification.requestPermission();
            granted = permission === "granted";
          }
          break;
        
        case "camera":
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            granted = true;
          } catch (error) {
            granted = false;
          }
          break;
        
        case "microphone":
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            granted = true;
          } catch (error) {
            granted = false;
          }
          break;
        
        case "location":
          if ("geolocation" in navigator) {
            try {
              await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
              });
              granted = true;
            } catch (error) {
              granted = false;
            }
          }
          break;
        
        case "contacts":
          // Simular permissão de contatos (não há API web padrão)
          granted = confirm("RAIO gostaria de acessar seus contatos para encontrar amigos");
          break;
        
        default:
          granted = false;
      }

      setPermissions(prev => ({
        ...prev,
        [permissionId]: granted
      }));

      if (granted) {
        enhancedToast.success({
          title: "Permissão concedida! ✅",
          description: "Obrigado por confiar no RAIO",
          haptic: true
        });
      } else {
        enhancedToast.info({
          title: "Permissão negada",
          description: "Você pode alterar isso nas configurações depois",
          haptic: true
        });
      }
    } catch (error) {
      enhancedToast.error({
        title: "Erro ao solicitar permissão",
        description: "Tente novamente ou pule esta etapa",
        haptic: true
      });
    }
  };

  const handleSkipAll = () => {
    enhancedToast.info({
      title: "Permissões ignoradas",
      description: "Você pode configurar isso depois nas configurações",
      haptic: true
    });
    onComplete();
  };

  const handleContinue = () => {
    enhancedToast.success({
      title: "Configuração concluída! 🎉",
      description: "Bem-vindo ao ecossistema RAIO",
      haptic: true
    });
    onComplete();
  };

  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto w-full text-center"
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-green-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
              <Shield className="w-10 h-10 text-white" />
            </div>
          </motion.div>

          {/* Title & Description */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-12"
          >
            <h1 className="text-3xl font-bold text-white mb-4">
              Vamos personalizar sua experiência
            </h1>
            <p className="text-white/70 leading-relaxed">
              Para oferecer a melhor experiência possível, precisamos de algumas permissões. 
              Você tem total controle sobre seus dados.
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-3"
          >
            <Button
              onClick={() => setStep(2)}
              className="w-full h-12 bg-primary hover:bg-primary/90 rounded-xl font-semibold"
            >
              Configurar permissões
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            
            <Button
              variant="ghost"
              onClick={handleSkipAll}
              className="w-full text-white/70 hover:text-white hover:bg-white/10"
            >
              Pular esta etapa
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between p-4"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStep(1)}
          className="text-white/70 hover:text-white hover:bg-white/10 p-2"
        >
          ← Voltar
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkipAll}
          className="text-white/70 hover:text-white hover:bg-white/10"
        >
          Pular tudo
        </Button>
      </motion.div>

      {/* Content */}
      <div className="flex-1 px-6 pb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto w-full"
        >
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl font-bold text-white mb-3">
              Configure suas permissões
            </h2>
            <p className="text-white/70">
              Cada permissão melhora sua experiência no RAIO
            </p>
          </motion.div>

          {/* Permissions List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4 mb-8"
          >
            {permissionsList.map((permission, index) => {
              const IconComponent = permission.icon;
              const isGranted = permissions[permission.id as keyof typeof permissions];
              
              return (
                <motion.div
                  key={permission.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
                          <IconComponent className="w-6 h-6 text-primary" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white mb-1">
                            {permission.title}
                          </h3>
                          <p className="text-sm text-white/70 mb-2">
                            {permission.description}
                          </p>
                          <p className="text-xs text-primary">
                            {permission.benefit}
                          </p>
                        </div>
                        
                        <div className="flex-shrink-0">
                          {isGranted ? (
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handlePermissionRequest(permission.id)}
                              className="bg-primary/20 text-primary hover:bg-primary hover:text-white border border-primary/30"
                            >
                              Permitir
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Continue Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              onClick={handleContinue}
              className="w-full h-12 bg-primary hover:bg-primary/90 rounded-xl font-semibold"
            >
              Continuar para o RAIO
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}