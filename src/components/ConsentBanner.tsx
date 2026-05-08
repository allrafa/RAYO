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

  // Termos é página pública (/terms) — navegação direta funciona em
  // qualquer contexto. Política aceita o handler quando passado (overlay
  // pós-login) e cai pra /privacy se não houver.
  const openTerms = () => {
    if (typeof window !== 'undefined') window.location.href = '/terms';
  };
  const openPrivacy = () => {
    if (onOpenPrivacyPolicy) onOpenPrivacyPolicy();
    else if (typeof window !== 'undefined') window.location.href = '/privacy';
  };

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
        className={`w-full m-3 sm:m-4 pointer-events-auto shadow-xl ${showDetails ? 'max-w-2xl' : 'max-w-2xl'}`}
        style={{
          background: 'var(--rayo-sand-50)',
          borderColor: 'var(--rayo-sand-300)',
          borderRadius: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={showDetails ? 'p-5' : 'p-4 sm:p-4'}>
          {!showDetails ? (
            // Banner compacto — uma linha em desktop, empilhado em mobile
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--rayo-terra-100)' }}
                >
                  <Cookie
                    className="w-4 h-4"
                    style={{ color: 'var(--rayo-terra-500)' }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[13px] leading-snug"
                    style={{ color: 'var(--rayo-ink-700)' }}
                  >
                    <strong style={{ color: 'var(--rayo-forest-900)', fontWeight: 600 }}>
                      Cookies
                    </strong>
                    {' '}para melhorar sua experiência. Veja nossa{' '}
                    <button
                      type="button"
                      onClick={openPrivacy}
                      className="underline hover:no-underline"
                      style={{ color: 'var(--rayo-terra-500)' }}
                    >
                      Política
                    </button>
                    {' e '}
                    <button
                      type="button"
                      onClick={openTerms}
                      className="underline hover:no-underline"
                      style={{ color: 'var(--rayo-terra-500)' }}
                    >
                      Termos
                    </button>
                    .
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowDetails(true)}
                  className="text-[12px] underline hover:no-underline px-2 py-1.5"
                  style={{ color: 'var(--rayo-ink-500)' }}
                >
                  Personalizar
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRejectAll}
                  className="h-8 px-3 text-[12px] rounded-full"
                  style={{
                    borderColor: 'var(--rayo-sand-300)',
                    color: 'var(--rayo-ink-700)',
                  }}
                >
                  Rejeitar
                </Button>
                <Button
                  size="sm"
                  onClick={handleAcceptAll}
                  className="h-8 px-4 text-[12px] rounded-full"
                  style={{
                    background: 'var(--rayo-terra-500)',
                    color: theme === 'dark' ? 'var(--rayo-forest-900)' : '#FFFFFF',
                  }}
                >
                  Aceitar
                </Button>
              </div>
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
                    onClick={openPrivacy}
                    className="underline"
                    style={{ color: 'var(--rayo-terra-500)' }}
                  >
                    Política de Privacidade
                  </button>
                  {' e nos '}
                  <button
                    onClick={openTerms}
                    className="underline"
                    style={{ color: 'var(--rayo-terra-500)' }}
                  >
                    Termos de Uso
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
