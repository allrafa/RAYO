/**
 * RAIO - YouTube Mock Banner
 * Banner informativo sobre modo mock
 */

import { Info, X, ExternalLink, Key } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '../ui/button';

export function YouTubeMockBanner() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Banner é só uma ajuda de configuração para devs (como obter a YouTube
    // API Key). Em produção nunca aparece. Task #42.
    if (import.meta.env.PROD) return;

    // Verifica se já foi dispensado anteriormente
    const wasDismissed = localStorage.getItem('raio-youtube-mock-banner-dismissed');
    if (!wasDismissed) {
      // Mostra banner após 2 segundos
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem('raio-youtube-mock-banner-dismissed', 'true');
  };

  if (!show || dismissed) return null;

  return (
    <div className="fixed bottom-24 lg:bottom-8 left-4 right-4 lg:left-auto lg:right-8 lg:max-w-lg z-50 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 rounded-xl shadow-2xl p-1">
        <div className="bg-gray-900/95 backdrop-blur-sm rounded-lg p-4 text-white">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold mb-1 flex items-center gap-2">
                🎬 Modo Demonstração Ativo
              </h3>
              <p className="text-sm text-white/80 mb-3">
                Vídeos de exemplo estão sendo exibidos. Configure a API do YouTube para ver o conteúdo real do canal <span className="font-semibold text-white">@eusourafaraio</span>
              </p>
              
              {!expanded ? (
                <button
                  onClick={() => setExpanded(true)}
                  className="text-xs text-blue-300 hover:text-blue-200 underline flex items-center gap-1"
                >
                  <Key className="w-3 h-3" />
                  Como configurar API Key →
                </button>
              ) : (
                <div className="bg-black/30 rounded-lg p-3 mb-3 space-y-2">
                  <p className="text-xs text-white/90 font-semibold">Passos Rápidos:</p>
                  <ol className="text-xs text-white/80 space-y-1.5 list-decimal list-inside">
                    <li>Acesse o <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 underline inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink className="w-3 h-3 inline" /></a></li>
                    <li>Ative a <span className="font-mono bg-white/10 px-1 rounded">YouTube Data API v3</span></li>
                    <li>Crie uma <span className="font-semibold text-white">API Key</span> em "Credenciais"</li>
                    <li>Cole a key em <span className="font-mono bg-white/10 px-1 rounded text-xs">/components/youtube/YouTubeService.ts</span></li>
                  </ol>
                  <a
                    href="/YOUTUBE_API_SETUP.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-300 hover:text-blue-200 underline flex items-center gap-1 mt-2"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Ver guia completo
                  </a>
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="text-white/70 hover:text-white hover:bg-white/10 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
