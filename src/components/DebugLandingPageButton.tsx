/**
 * 🐛 DEBUG ONLY - Botão Flutuante para Visualizar Landing Page
 * 
 * Este componente é TEMPORÁRIO para facilitar o acesso à Landing Page durante desenvolvimento.
 * Remover antes do lançamento em produção.
 */

import { Zap } from 'lucide-react';
import { useState } from 'react';
import { LandingPageModal } from './LandingPageModal';

export function DebugLandingPageButton() {
  const [showLandingPage, setShowLandingPage] = useState(false);

  return (
    <>
      {/* Botão Flutuante - Canto Inferior Direito */}
      <button
        onClick={() => setShowLandingPage(true)}
        className="fixed bottom-24 right-6 z-[9999] flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95"
        style={{
          background: '#FFD700',
          color: '#000000',
          border: '2px solid #000000',
          fontWeight: 'bold',
        }}
        title="🐛 Debug: Ver Landing Page"
      >
        <Zap className="w-5 h-5" />
        <span className="text-sm">Ver LP</span>
      </button>

      {/* Modal da Landing Page */}
      {showLandingPage && (
        <LandingPageModal
          isOpen={showLandingPage}
          onClose={() => setShowLandingPage(false)}
        />
      )}
    </>
  );
}
