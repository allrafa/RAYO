import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Mail, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { enhancedToast } from "./EnhancedToast";

interface EmailVerificationProps {
  email: string;
  onVerified: () => void;
  onBack: () => void;
}

export function EmailVerification({ email, onVerified, onBack }: EmailVerificationProps) {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Countdown para reenvio
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return; // Previne múltiplos caracteres
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus no próximo input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verificar quando todos os campos estão preenchidos
    if (newCode.every(digit => digit !== "") && newCode.join("").length === 6) {
      handleVerify(newCode.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (verificationCode: string) => {
    setIsLoading(true);
    
    // Simular verificação
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simular sucesso (você pode adicionar validação real aqui)
      if (verificationCode.length === 6) {
        enhancedToast.success({
          title: "Email verificado! ✅",
          description: "Bem-vindo ao RAYO",
          haptic: true
        });
        onVerified();
      } else {
        throw new Error("Código inválido");
      }
    } catch (error) {
      enhancedToast.error({
        title: "Código inválido",
        description: "Verifique o código e tente novamente",
        haptic: true
      });
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    
    setIsLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      enhancedToast.success({
        title: "Email reenviado! 📧",
        description: "Verifique sua caixa de entrada",
        haptic: true
      });
      
      setCanResend(false);
      setCountdown(60);
    } catch (error) {
      enhancedToast.error({
        title: "Erro ao reenviar",
        description: "Tente novamente em alguns instantes",
        haptic: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEmailApp = () => {
    // Tentar abrir o app de email nativo
    window.open('mailto:', '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center p-4"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-white/70 hover:text-white hover:bg-white/10 p-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </motion.div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm mx-auto w-full text-center"
        >
          {/* Email Icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-primary" />
            </div>
          </motion.div>

          {/* Title & Description */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-white mb-4">
              Verifique seu email
            </h1>
            <p className="text-white/70 leading-relaxed">
              Enviamos um email para{" "}
              <span className="text-white font-medium">{email}</span>.
              Clique no link ou digite o código abaixo.
            </p>
            
            <div className="mt-4">
              <p className="text-sm text-white/60">
                Não recebeu o email? Verifique seu spam ou{" "}
                <button 
                  onClick={handleResend}
                  disabled={!canResend}
                  className="text-primary hover:text-primary/80 underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {canResend ? "tente outro email" : `aguarde ${countdown}s`}
                </button>
              </p>
            </div>
          </motion.div>

          {/* Code Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <div className="flex justify-center space-x-3 mb-6">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={el => inputRefs.current[index] = el}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleCodeChange(index, e.target.value)}
                  onKeyDown={e => handleKeyDown(index, e)}
                  className={`w-12 h-12 text-center text-xl font-bold rounded-lg border-2 transition-all
                    ${digit 
                      ? 'border-primary bg-primary/10 text-white' 
                      : 'border-white/20 bg-white/5 text-white'
                    } 
                    focus:border-primary focus:bg-primary/10 focus:outline-none`}
                  autoFocus={index === 0}
                />
              ))}
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-3"
          >
            <Button
              onClick={handleOpenEmailApp}
              className="w-full h-12 bg-primary hover:bg-primary/90 rounded-xl font-semibold"
              disabled={isLoading}
            >
              Abrir app de email
            </Button>
            
            <Button
              variant="outline"
              onClick={handleResend}
              disabled={!canResend || isLoading}
              className="w-full h-12 border-white/20 text-white hover:bg-white/10 rounded-xl font-semibold disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {canResend ? "Reenviar email" : `Reenviar em ${countdown}s`}
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Floating Numbers Keypad (Mobile Style) */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="grid grid-cols-3 gap-4 p-6 bg-black/20"
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
          <Button
            key={number}
            variant="ghost"
            onClick={() => {
              const emptyIndex = code.findIndex(digit => digit === "");
              if (emptyIndex !== -1) {
                handleCodeChange(emptyIndex, number.toString());
              }
            }}
            className="h-14 text-xl font-semibold text-white hover:bg-white/10 rounded-xl"
          >
            {number}
            {number === 2 && <span className="text-xs block">ABC</span>}
            {number === 3 && <span className="text-xs block">DEF</span>}
            {number === 4 && <span className="text-xs block">GHI</span>}
            {number === 5 && <span className="text-xs block">JKL</span>}
            {number === 6 && <span className="text-xs block">MNO</span>}
            {number === 7 && <span className="text-xs block">PQRS</span>}
            {number === 8 && <span className="text-xs block">TUV</span>}
            {number === 9 && <span className="text-xs block">WXYZ</span>}
          </Button>
        ))}
        
        {/* Empty space */}
        <div></div>
        
        {/* Zero */}
        <Button
          variant="ghost"
          onClick={() => {
            const emptyIndex = code.findIndex(digit => digit === "");
            if (emptyIndex !== -1) {
              handleCodeChange(emptyIndex, "0");
            }
          }}
          className="h-14 text-xl font-semibold text-white hover:bg-white/10 rounded-xl"
        >
          0
        </Button>
        
        {/* Backspace */}
        <Button
          variant="ghost"
          onClick={() => {
            const lastFilledIndex = code.map((digit, i) => digit ? i : -1).filter(i => i !== -1).pop();
            if (lastFilledIndex !== undefined && lastFilledIndex >= 0) {
              const newCode = [...code];
              newCode[lastFilledIndex] = "";
              setCode(newCode);
              inputRefs.current[lastFilledIndex]?.focus();
            }
          }}
          className="h-14 text-white hover:bg-white/10 rounded-xl"
        >
          ←
        </Button>
      </motion.div>
    </div>
  );
}