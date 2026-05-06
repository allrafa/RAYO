// ============================================================================
// 🍪 RAYO ECOSYSTEM - CONSENT BANNER
// Banner de consentimento LGPD-compliant
// ============================================================================

import { useState, useEffect } from 'react';
import { ConsentManager, ConsentPreferences, shouldShowConsentBanner } from '../lib/privacy/consent';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Card } from './ui/card';
import { X, Shield, Cookie } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export function ConsentBanner({ onOpenPrivacyPolicy }: { onOpenPrivacyPolicy?: () => void } = {}) {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>(
    ConsentManager.getPreferences()
  );
  const { theme } = useTheme();
  
  useEffect(() => {
    // Mostrar banner se ainda não deu consentimento
    if (shouldShowConsentBanner()) {
      // Delay de 1 segundo para não ser intrusivo
      setTimeout(() => setShowBanner(true), 1000);
    }
  }, []);
  
  const handleAcceptAll = () => {
    ConsentManager.acceptAll();
    setShowBanner(false);
  };
  
  const handleRejectAll = () => {
    ConsentManager.rejectAll();
    setShowBanner(false);
  };
  
  const handleSavePreferences = () => {
    ConsentManager.savePreferences(preferences);
    setShowBanner(false);
  };
  
  const handleTogglePreference = (key: keyof ConsentPreferences) => {
    if (key === 'essential') return; // Não pode desabilitar essenciais
    
    setPreferences({
      ...preferences,
      [key]: !preferences[key],
    });
  };
  
  if (!showBanner) return null;
  
  return (
    <div 
      className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none"
      style={{ 
        background: showDetails 
          ? 'rgba(0, 0, 0, 0.5)' 
          : 'transparent',
      }}
      onClick={() => showDetails && setShowDetails(false)}
    >
      <Card 
        className="w-full max-w-4xl m-4 mb-4 lg:mb-6 pointer-events-auto shadow-2xl"
        style={{
          background: 'var(--rayo-sand-50)',
          borderColor: 'var(--rayo-sand-300)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {!showDetails ? (
            // Banner Simples
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--rayo-terra-100)' }}
                >
                  <Cookie 
                    className="w-6 h-6" 
                    style={{ color: 'var(--rayo-terra-500)' }}
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 
                    className="text-[18px] mb-2"
                    style={{ 
                      fontWeight: 600,
                      color: 'var(--rayo-forest-900)' 
                    }}
                  >
                    Sua privacidade importa 🔒
                  </h3>
                  <p 
                    className="text-[14px] leading-relaxed"
                    style={{ color: 'var(--rayo-ink-700)' }}
                  >
                    Usamos cookies e tecnologias similares para melhorar sua experiência, 
                    analisar o uso da plataforma e personalizar conteúdo. Você tem controle 
                    total sobre suas preferências.
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={handleRejectAll}
                  className="flex-1 sm:flex-none"
                  style={{
                    borderColor: 'var(--rayo-sand-300)',
                    color: 'var(--rayo-ink-700)',
                  }}
                >
                  Rejeitar Todos
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setShowDetails(true)}
                  className="flex-1 sm:flex-none"
                  style={{
                    borderColor: 'var(--rayo-terra-500)',
                    color: 'var(--rayo-terra-500)',
                  }}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Personalizar
                </Button>
                
                <Button
                  onClick={handleAcceptAll}
                  className="flex-1"
                  style={{
                    background: 'var(--rayo-terra-500)',
                    color: theme === 'dark' ? 'var(--rayo-forest-900)' : '#FFFFFF',
                  }}
                >
                  Aceitar Todos
                </Button>
              </div>
              
              <p 
                className="text-[12px] text-center"
                style={{ color: 'var(--rayo-ink-400)' }}
              >
                Ao continuar, você concorda com nossa{' '}
                <button 
                  onClick={onOpenPrivacyPolicy}
                  className="underline hover:no-underline"
                  style={{ color: 'var(--rayo-terra-500)' }}
                >
                  Política de Privacidade
                </button>
                {' e '}
                <button 
                  onClick={onOpenPrivacyPolicy}
                  className="underline hover:no-underline"
                  style={{ color: 'var(--rayo-terra-500)' }}
                >
                  Termos de Uso
                </button>
              </p>
            </div>
          ) : (
            // Detalhes e Personalização
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield 
                    className="w-6 h-6" 
                    style={{ color: 'var(--rayo-terra-500)' }}
                  />
                  <h3 
                    className="text-[18px]"
                    style={{ 
                      fontWeight: 600,
                      color: 'var(--rayo-forest-900)' 
                    }}
                  >
                    Suas Preferências de Privacidade
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowDetails(false)}
                  style={{ color: 'var(--rayo-ink-700)' }}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="space-y-4">
                {/* Essencial */}
                <div 
                  className="flex items-start gap-4 p-4 rounded-lg"
                  style={{ background: 'var(--rayo-sand-300)' }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 
                        className="text-[15px]"
                        style={{ 
                          fontWeight: 600,
                          color: 'var(--rayo-forest-900)' 
                        }}
                      >
                        Cookies Essenciais
                      </h4>
                      <span 
                        className="text-[12px] px-2 py-0.5 rounded"
                        style={{ 
                          background: 'var(--rayo-terra-100)',
                          color: 'var(--rayo-terra-500)',
                        }}
                      >
                        Obrigatório
                      </span>
                    </div>
                    <p 
                      className="text-[13px]"
                      style={{ color: 'var(--rayo-ink-700)' }}
                    >
                      Necessários para o funcionamento básico da plataforma (login, navegação, preferências).
                    </p>
                  </div>
                  <Switch checked disabled />
                </div>
                
                {/* Analytics */}
                <div 
                  className="flex items-start gap-4 p-4 rounded-lg border"
                  style={{ borderColor: 'var(--rayo-sand-300)' }}
                >
                  <div className="flex-1">
                    <h4 
                      className="text-[15px] mb-1"
                      style={{ 
                        fontWeight: 600,
                        color: 'var(--rayo-forest-900)' 
                      }}
                    >
                      Analytics e Performance
                    </h4>
                    <p 
                      className="text-[13px]"
                      style={{ color: 'var(--rayo-ink-700)' }}
                    >
                      Nos ajudam a entender como você usa a plataforma para melhorar a experiência.
                      Dados anônimos e agregados.
                    </p>
                  </div>
                  <Switch
                    checked={preferences.analytics}
                    onCheckedChange={() => handleTogglePreference('analytics')}
                  />
                </div>
                
                {/* Marketing */}
                <div 
                  className="flex items-start gap-4 p-4 rounded-lg border"
                  style={{ borderColor: 'var(--rayo-sand-300)' }}
                >
                  <div className="flex-1">
                    <h4 
                      className="text-[15px] mb-1"
                      style={{ 
                        fontWeight: 600,
                        color: 'var(--rayo-forest-900)' 
                      }}
                    >
                      Marketing e Comunicação
                    </h4>
                    <p 
                      className="text-[13px]"
                      style={{ color: 'var(--rayo-ink-700)' }}
                    >
                      Emails sobre novos conteúdos, cursos e ofertas especiais. Você pode cancelar a qualquer momento.
                    </p>
                  </div>
                  <Switch
                    checked={preferences.marketing}
                    onCheckedChange={() => handleTogglePreference('marketing')}
                  />
                </div>
                
                {/* Personalização */}
                <div 
                  className="flex items-start gap-4 p-4 rounded-lg border"
                  style={{ borderColor: 'var(--rayo-sand-300)' }}
                >
                  <div className="flex-1">
                    <h4 
                      className="text-[15px] mb-1"
                      style={{ 
                        fontWeight: 600,
                        color: 'var(--rayo-forest-900)' 
                      }}
                    >
                      Personalização de Conteúdo
                    </h4>
                    <p 
                      className="text-[13px]"
                      style={{ color: 'var(--rayo-ink-700)' }}
                    >
                      Recomendações de cursos e livros baseadas no seu perfil e atividade. 
                      Torna a experiência mais relevante para você.
                    </p>
                  </div>
                  <Switch
                    checked={preferences.personalization}
                    onCheckedChange={() => handleTogglePreference('personalization')}
                  />
                </div>
              </div>
              
              <div 
                className="p-4 rounded-lg"
                style={{ background: 'var(--rayo-terra-100)' }}
              >
                <p 
                  className="text-[13px]"
                  style={{ color: 'var(--rayo-ink-700)' }}
                >
                  <strong style={{ color: 'var(--rayo-forest-900)' }}>
                    Seus direitos LGPD:
                  </strong>{' '}
                  Você pode acessar, corrigir, exportar ou deletar seus dados a qualquer momento 
                  nas configurações da conta. Leia mais em nossa{' '}
                  <button 
                    onClick={onOpenPrivacyPolicy}
                    className="underline"
                    style={{ color: 'var(--rayo-terra-500)' }}
                  >
                    Política de Privacidade
                  </button>.
                </p>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDetails(false)}
                  className="flex-1"
                  style={{
                    borderColor: 'var(--rayo-sand-300)',
                    color: 'var(--rayo-ink-700)',
                  }}
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleSavePreferences}
                  className="flex-1"
                  style={{
                    background: 'var(--rayo-terra-500)',
                    color: theme === 'dark' ? 'var(--rayo-forest-900)' : '#FFFFFF',
                  }}
                >
                  Salvar Preferências
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
