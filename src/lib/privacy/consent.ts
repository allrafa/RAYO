// ============================================================================
// 🔐 RAYO ECOSYSTEM - CONSENT & PRIVACY MANAGER
// Sistema completo de gerenciamento de consentimento (LGPD)
// Consultoria: Bozoma Saint John - "Confiança é a moeda mais valiosa"
// ============================================================================

import { analytics } from '../analytics/mixpanel';

// ============================================
// TIPOS
// ============================================

export interface ConsentPreferences {
  essential: boolean; // Sempre true (necessário para funcionamento)
  analytics: boolean; // Mixpanel, métricas de uso
  marketing: boolean; // Emails promocionais
  personalization: boolean; // Recomendações personalizadas
  thirdParty: boolean; // Compartilhamento com parceiros
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'community' | 'private';
  showOnlineStatus: boolean;
  allowDirectMessages: boolean;
  showInSearchResults: boolean;
}

// ============================================
// CONSENT MANAGER
// ============================================

export class ConsentManager {
  // Task #163 — chaves migradas pra `rayo_*` no rebrand RAIO→RAYO
  // (Maio/2026). Migração one-shot em src/lib/storageMigration.ts
  // copia o valor da chave legada antes do primeiro consumer ler.
  private static STORAGE_KEY = 'rayo_consent_preferences';
  private static PRIVACY_KEY = 'rayo_privacy_settings';
  
  // ============================================
  // PREFERÊNCIAS DE CONSENTIMENTO
  // ============================================
  
  static getPreferences(): ConsentPreferences {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Erro ao carregar preferências:', error);
    }
    
    // Default: apenas essencial
    return {
      essential: true,
      analytics: false,
      marketing: false,
      personalization: false,
      thirdParty: false,
    };
  }
  
  static savePreferences(preferences: ConsentPreferences) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(preferences));
      
      // Aplicar mudanças imediatamente
      this.applyPreferences(preferences);
      
      // Track mudança (se analytics permitido)
      if (preferences.analytics) {
        analytics.track('CONSENT_UPDATED', {
          analytics_enabled: preferences.analytics,
          marketing_enabled: preferences.marketing,
          personalization_enabled: preferences.personalization,
          thirdParty_enabled: preferences.thirdParty,
        });
      }
      
      console.log('✅ Preferências de consentimento salvas');
    } catch (error) {
      console.error('Erro ao salvar preferências:', error);
    }
  }
  
  private static applyPreferences(prefs: ConsentPreferences) {
    // Analytics
    analytics.setConsent(prefs.analytics);
    
    // Marketing (seria integração com serviço de email)
    if (!prefs.marketing) {
      // Desabilitar emails promocionais
      this.unsubscribeMarketing();
    }
    
    // Personalização
    if (!prefs.personalization) {
      // Desabilitar algoritmo de recomendação
      this.disablePersonalization();
    }
    
    console.log('✅ Preferências aplicadas:', prefs);
  }
  
  static hasConsented(): boolean {
    return localStorage.getItem(this.STORAGE_KEY) !== null;
  }
  
  static acceptAll(): ConsentPreferences {
    const preferences: ConsentPreferences = {
      essential: true,
      analytics: true,
      marketing: true,
      personalization: true,
      thirdParty: false, // Nunca por padrão
    };
    
    this.savePreferences(preferences);
    return preferences;
  }
  
  static rejectAll(): ConsentPreferences {
    const preferences: ConsentPreferences = {
      essential: true,
      analytics: false,
      marketing: false,
      personalization: false,
      thirdParty: false,
    };
    
    this.savePreferences(preferences);
    return preferences;
  }
  
  // ============================================
  // CONFIGURAÇÕES DE PRIVACIDADE
  // ============================================
  
  static getPrivacySettings(): PrivacySettings {
    try {
      const stored = localStorage.getItem(this.PRIVACY_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações de privacidade:', error);
    }
    
    // Default settings
    return {
      profileVisibility: 'community',
      showOnlineStatus: true,
      allowDirectMessages: true,
      showInSearchResults: true,
    };
  }
  
  static savePrivacySettings(settings: PrivacySettings) {
    try {
      localStorage.setItem(this.PRIVACY_KEY, JSON.stringify(settings));
      
      analytics.track('PRIVACY_SETTINGS_UPDATED', {
        profile_visibility: settings.profileVisibility,
        show_online_status: settings.showOnlineStatus,
        allow_direct_messages: settings.allowDirectMessages,
      });
      
      console.log('✅ Configurações de privacidade salvas');
    } catch (error) {
      console.error('Erro ao salvar configurações de privacidade:', error);
    }
  }
  
  // ============================================
  // DIREITOS LGPD
  // ============================================
  
  // Direito 1: Exportar dados
  static async exportUserData(userId: string): Promise<void> {
    try {
      // TODO: Integrar com API para coletar todos os dados
      const data = {
        user_id: userId,
        export_date: new Date().toISOString(),
        profile: {
          // Dados do perfil
        },
        content: {
          // Cursos, livros, posts
        },
        activity: {
          // Histórico de atividades
        },
        preferences: {
          consent: this.getPreferences(),
          privacy: this.getPrivacySettings(),
        },
      };
      
      // Converter para JSON e fazer download
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rayo_dados_${userId}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      analytics.track('USER_DATA_EXPORTED');
      
      console.log('✅ Dados exportados com sucesso');
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      throw error;
    }
  }
  
  // Direito 2: Deletar conta
  static async deleteUserAccount(userId: string): Promise<void> {
    const confirmed = window.confirm(
      '⚠️ ATENÇÃO: Tem certeza que deseja deletar sua conta?\n\n' +
      'Esta ação é IRREVERSÍVEL e resultará em:\n' +
      '• Exclusão de todos os seus dados\n' +
      '• Perda de acesso a cursos e conteúdos\n' +
      '• Remoção de todos os posts e comentários\n' +
      '• Cancelamento automático de assinatura premium\n\n' +
      'Digite "DELETAR" para confirmar.'
    );
    
    if (!confirmed) return;
    
    const finalConfirmation = window.prompt(
      'Digite "DELETAR" para confirmar a exclusão permanente da conta:'
    );
    
    if (finalConfirmation !== 'DELETAR') {
      alert('Exclusão cancelada.');
      return;
    }
    
    try {
      // TODO: Integrar com API para deletar dados
      // await api.delete(`/users/${userId}`);
      
      // Limpar dados locais
      localStorage.clear();
      sessionStorage.clear();
      
      // Opt-out de analytics
      analytics.setConsent(false);
      analytics.resetUser();
      
      analytics.track('USER_ACCOUNT_DELETED', {
        user_id: userId,
        deletion_date: new Date().toISOString(),
      });
      
      console.log('✅ Conta deletada com sucesso');
      
      // Redirect para página de confirmação
      window.location.href = '/conta-deletada';
    } catch (error) {
      console.error('Erro ao deletar conta:', error);
      alert('Erro ao deletar conta. Entre em contato com o suporte.');
      throw error;
    }
  }
  
  // Direito 3: Corrigir dados
  static async requestDataCorrection(userId: string, corrections: any): Promise<void> {
    try {
      // TODO: Integrar com API
      // await api.post(`/users/${userId}/corrections`, corrections);
      
      analytics.track('DATA_CORRECTION_REQUESTED', {
        user_id: userId,
        fields_to_correct: Object.keys(corrections),
      });
      
      console.log('✅ Solicitação de correção enviada');
    } catch (error) {
      console.error('Erro ao solicitar correção:', error);
      throw error;
    }
  }
  
  // Direito 4: Portabilidade
  static async requestDataPortability(userId: string, format: 'json' | 'csv' | 'xml'): Promise<void> {
    try {
      // Similar ao export, mas em formato específico
      await this.exportUserData(userId);
      
      analytics.track('DATA_PORTABILITY_REQUESTED', {
        user_id: userId,
        format: format,
      });
    } catch (error) {
      console.error('Erro na portabilidade:', error);
      throw error;
    }
  }
  
  // ============================================
  // HELPERS PRIVADOS
  // ============================================
  
  private static unsubscribeMarketing() {
    // TODO: Integrar com serviço de email (SendGrid, etc)
    console.log('📧 Marketing emails desabilitados');
  }
  
  private static disablePersonalization() {
    // Flag para desabilitar algoritmo de recomendação
    localStorage.setItem('rayo_disable_personalization', 'true');
    console.log('🎯 Personalização desabilitada');
  }
  
  // ============================================
  // VALIDAÇÕES
  // ============================================
  
  static canTrackAnalytics(): boolean {
    return this.getPreferences().analytics;
  }
  
  static canSendMarketing(): boolean {
    return this.getPreferences().marketing;
  }
  
  static canPersonalize(): boolean {
    return this.getPreferences().personalization;
  }
  
  static canShareWithThirdParty(): boolean {
    return this.getPreferences().thirdParty;
  }
}

// ============================================
// UTILITIES
// ============================================

export function shouldShowConsentBanner(): boolean {
  return !ConsentManager.hasConsented();
}

export function getConsentStatus(): 'none' | 'partial' | 'full' {
  if (!ConsentManager.hasConsented()) return 'none';
  
  const prefs = ConsentManager.getPreferences();
  const allAccepted = prefs.analytics && prefs.marketing && prefs.personalization;
  
  if (allAccepted) return 'full';
  return 'partial';
}
