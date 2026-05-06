import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, MessageCircle, Clock, Calendar, Target, PlayCircle, MoreVertical, Search, Filter } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Avatar } from '../ui/avatar';
import { useApp } from '../AppContext';
import { enhancedToast } from '../EnhancedToast';
import { useTrilhaSessions } from '../hooks/useTrilhaSessions';
import { ConversationMessage, TrillhaSession, ConsultantType } from './types';

interface CentralConversasPageProps {
  onClose: () => void;
  onStartNewConversation: () => void;
  onContinueConversation: (sessionId: string) => void;
}

export function CentralConversasPage({ 
  onClose, 
  onStartNewConversation, 
  onContinueConversation 
}: CentralConversasPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'jessica' | 'rafa' | 'active' | 'completed'>('all');
  const [selectedSession, setSelectedSession] = useState<TrillhaSession | null>(null);
  const { userData } = useApp();
  const { sessions, getActiveSessions, getCompletedSessions, getSessionsByConsultant } = useTrilhaSessions();

  // Se não houver sessões, criar dados de exemplo na primeira visita
  useEffect(() => {
    if (sessions.length === 0) {
      // Em produção, isso não seria necessário pois as sessões viriam das conversas reais
      console.log('Nenhuma sessão encontrada. O usuário precisa iniciar conversas para vê-las aqui.');
    }
  }, [sessions]);

  const getFilteredSessions = () => {
    let filteredSessions = sessions;

    // Aplicar filtro por tipo
    switch (filterBy) {
      case 'active':
        filteredSessions = getActiveSessions();
        break;
      case 'completed':
        filteredSessions = getCompletedSessions();
        break;
      case 'jessica':
        filteredSessions = getSessionsByConsultant('jessica');
        break;
      case 'rafa':
        filteredSessions = getSessionsByConsultant('rafa');
        break;
      default:
        filteredSessions = sessions;
    }

    // Aplicar busca
    if (searchQuery) {
      filteredSessions = filteredSessions.filter(session => 
        session.insights.some(insight => insight.toLowerCase().includes(searchQuery.toLowerCase())) ||
        session.nextSteps.some(step => step.toLowerCase().includes(searchQuery.toLowerCase())) ||
        session.emotionalJourney.breakthrough?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filteredSessions;
  };

  const filteredSessions = getFilteredSessions();

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Agora há pouco';
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    if (diffInHours < 48) return 'Ontem';
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} dias atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  const getSessionDuration = (session: TrillhaSession) => {
    if (!session.endTime) return 'Em andamento';
    const diffInMinutes = Math.floor((session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60));
    return `${diffInMinutes} min`;
  };

  const getConsultantInfo = (consultant: ConsultantType) => {
    return consultant === 'jessica' 
      ? { name: 'Jessica Raio', avatarClass: 'terra' as const }
      : { name: 'Rafa Raio', avatarClass: 'forest' as const };
  };

  const handleContinueSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session && !session.endTime) {
      onContinueConversation(sessionId);
    } else {
      enhancedToast.info({
        title: "Conversa finalizada",
        description: "Esta conversa já foi concluída. Inicie uma nova conversa para continuar.",
        haptic: true
      });
    }
  };

  return (
    <div className="ra-page">
      {/* Header */}
      <div className="ra-page-header">
        <div className="ra-page-header-inner">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full"
                aria-label="Voltar"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <p className="ra-eyebrow">Trilha · Histórico</p>
                <h1 className="ra-title" style={{ fontSize: 22 }}>
                  Trilha da <span className="ra-title-light">Transformação</span>
                </h1>
                <p className="ra-subtitle" style={{ fontSize: 12, marginTop: 2 }}>
                  {sessions.length} conversa{sessions.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="ra-pill-primary"
              onClick={onStartNewConversation}
            >
              <Plus className="w-4 h-4" />
              Nova conversa
            </button>
          </div>

          {/* Search and Filter */}
          <div className="pb-4 pt-4 space-y-3">
            <div className="ra-search-wrap">
              <Search className="ra-search-icon w-4 h-4" aria-hidden="true" />
              <input
                type="search"
                placeholder="Buscar insights, planos ou temas…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ra-search"
                aria-label="Buscar conversas"
              />
            </div>

            <div className="ra-tabs" role="tablist" aria-label="Filtros">
              {[
                { key: 'all', label: 'Todas' },
                { key: 'active', label: 'Ativas' },
                { key: 'completed', label: 'Concluídas' },
                { key: 'jessica', label: 'Jessica' },
                { key: 'rafa', label: 'Rafa' }
              ].map(filter => (
                <button
                  key={filter.key}
                  type="button"
                  role="tab"
                  aria-selected={filterBy === filter.key}
                  className={`ra-tab ${filterBy === filter.key ? 'active' : ''}`}
                  onClick={() => setFilterBy(filter.key as any)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <div className="ra-page-content" style={{ paddingTop: 16, gap: 16 }}>
        {filteredSessions.length === 0 ? (
          <div className="ra-empty">
            <div className="ra-empty-icon">
              <MessageCircle className="w-6 h-6" />
            </div>
            <h3 className="ra-empty-title">Nenhuma conversa encontrada</h3>
            <p className="ra-empty-sub">
              {searchQuery ? 'Tente outros termos de busca.' : 'Inicie sua primeira conversa na Trilha da Transformação.'}
            </p>
            <button
              type="button"
              className="ra-pill-primary"
              onClick={onStartNewConversation}
              style={{ marginTop: 4 }}
            >
              <Plus className="w-4 h-4" />
              Começar agora
            </button>
          </div>
        ) : (
          filteredSessions.map(session => {
            const consultantInfo = getConsultantInfo(session.consultant);
            const isActive = !session.endTime;

            return (
              <article
                key={session.id}
                className="ra-card ra-card-hover"
                onClick={() => setSelectedSession(session)}
                style={{ cursor: 'pointer' }}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`ra-disc-avatar ${consultantInfo.avatarClass}`}>
                      {consultantInfo.name.split(' ')[0][0]}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span style={{ fontWeight: 600, color: 'var(--rayo-forest-900)' }}>
                          {consultantInfo.name}
                        </span>
                        {isActive && <span className="ra-tag sage">Ativa</span>}
                      </div>
                      <div className="ra-disc-meta flex items-center gap-3 mt-1">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(session.startTime)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {getSessionDuration(session)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="ra-action"
                    aria-label="Mais opções"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>

                {/* Jornada Emocional */}
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className="ra-disc-meta">Jornada</span>
                  <span className="ra-tag ochre">{session.emotionalJourney.start}</span>
                  <span style={{ color: 'var(--rayo-ink-400)' }}>→</span>
                  <span className="ra-tag sage">{session.emotionalJourney.end}</span>
                </div>

                {/* Breakthrough */}
                {session.emotionalJourney.breakthrough && (
                  <div
                    style={{
                      background: 'var(--rayo-ochre-100, var(--rayo-sand-100))',
                      border: '1px solid var(--rayo-ochre-500)',
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 12,
                    }}
                  >
                    <div
                      className="flex items-center gap-2"
                      style={{ fontSize: 13, fontWeight: 600, color: 'var(--rayo-forest-900)' }}
                    >
                      <Target className="w-4 h-4" style={{ color: 'var(--rayo-ochre-500)' }} />
                      Insight principal
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--rayo-ink-700)', marginTop: 4 }}>
                      {session.emotionalJourney.breakthrough}
                    </p>
                  </div>
                )}

                {/* Próximos Passos */}
                <div className="mb-3">
                  <h4 className="ra-disc-meta" style={{ marginBottom: 8 }}>
                    Próximos passos
                  </h4>
                  <div className="space-y-1.5">
                    {session.nextSteps.slice(0, 2).map((step, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2"
                        style={{ fontSize: 13, color: 'var(--rayo-ink-700)' }}
                      >
                        <span
                          style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: 'var(--rayo-terra-500)',
                            marginTop: 7, flexShrink: 0,
                          }}
                        />
                        <span>{step}</span>
                      </div>
                    ))}
                    {session.nextSteps.length > 2 && (
                      <div style={{ fontSize: 12, color: 'var(--rayo-ink-400)' }}>
                        +{session.nextSteps.length - 2} outros passos
                      </div>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid var(--rayo-sand-300)' }}>
                  <button
                    type="button"
                    className="ra-pill-ghost"
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContinueSession(session.id);
                    }}
                    disabled={!isActive}
                  >
                    <PlayCircle className="w-4 h-4" />
                    {isActive ? 'Continuar' : 'Concluída'}
                  </button>
                  <button
                    type="button"
                    className="ra-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSession(session);
                    }}
                  >
                    Ver detalhes
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Session Detail Modal */}
      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
          onContinue={() => handleContinueSession(selectedSession.id)}
        />
      )}
    </div>
  );
}

// Modal para detalhes da sessão
function SessionDetailModal({ 
  session, 
  onClose, 
  onContinue 
}: { 
  session: TrillhaSession; 
  onClose: () => void; 
  onContinue: () => void; 
}) {
  const consultantInfo = session.consultant === 'jessica'
    ? { name: 'Jessica Raio', avatarClass: 'terra' as const }
    : { name: 'Rafa Raio', avatarClass: 'forest' as const };

  const isActive = !session.endTime;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(12,59,46,0.55)' }}
      onClick={onClose}
    >
      <div
        className="max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        style={{
          background: 'var(--rayo-sand-50)',
          border: '1px solid var(--rayo-sand-300)',
          borderRadius: 20,
          fontFamily: 'Outfit, system-ui, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sticky top-0 p-4"
          style={{ background: 'var(--rayo-sand-50)', borderBottom: '1px solid var(--rayo-sand-300)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`ra-disc-avatar ${consultantInfo.avatarClass}`} style={{ width: 48, height: 48 }}>
                {consultantInfo.name.split(' ')[0][0]}
              </span>
              <div>
                <p className="ra-eyebrow" style={{ marginBottom: 2 }}>Sessão</p>
                <h2 className="ra-title" style={{ fontSize: 18 }}>{consultantInfo.name}</h2>
                <p className="ra-subtitle" style={{ fontSize: 12, marginTop: 2 }}>
                  {new Date(session.startTime).toLocaleDateString('pt-BR')} ·{' '}
                  {isActive ? 'Em andamento' : `${Math.floor((session.endTime!.getTime() - session.startTime.getTime()) / (1000 * 60))} min`}
                </p>
              </div>
            </div>
            <button type="button" className="ra-action" onClick={onClose} aria-label="Fechar">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Jornada Emocional Detalhada */}
          <section>
            <h3 className="ra-eyebrow" style={{ marginBottom: 10 }}>Jornada Emocional</h3>
            <div className="ra-card" style={{ padding: 16 }}>
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <div className="text-2xl mb-1">😟</div>
                  <span className="ra-tag ochre">{session.emotionalJourney.start}</span>
                </div>
                <div className="flex-1 mx-4">
                  <div
                    style={{
                      height: 2,
                      background: 'linear-gradient(90deg, var(--rayo-ochre-500), var(--rayo-sage-500))',
                      borderRadius: 2,
                    }}
                  />
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">😊</div>
                  <span className="ra-tag sage">{session.emotionalJourney.end}</span>
                </div>
              </div>
              {session.emotionalJourney.breakthrough && (
                <div
                  className="mt-4 p-3"
                  style={{
                    background: 'var(--rayo-sand-100)',
                    border: '1px solid var(--rayo-ochre-500)',
                    borderRadius: 10,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--rayo-forest-900)', marginBottom: 4 }}>
                    💡 Insight principal
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--rayo-ink-700)' }}>
                    {session.emotionalJourney.breakthrough}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Insights */}
          <section>
            <h3 className="ra-eyebrow" style={{ marginBottom: 10 }}>Insights Descobertos</h3>
            <div className="space-y-2">
              {session.insights.map((insight, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3"
                  style={{
                    background: 'var(--rayo-sand-100)',
                    border: '1px solid var(--rayo-sand-300)',
                    borderRadius: 12,
                  }}
                >
                  <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: 'var(--rayo-terra-500)',
                      color: 'var(--rayo-sand-50)',
                      fontSize: 11, fontWeight: 700,
                      marginTop: 2,
                    }}
                  >
                    {index + 1}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--rayo-ink-700)' }}>{insight}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Próximos Passos */}
          <section>
            <h3 className="ra-eyebrow" style={{ marginBottom: 10 }}>Plano de Ação</h3>
            <div className="space-y-2">
              {session.nextSteps.map((step, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3"
                  style={{
                    background: 'var(--rayo-sand-100)',
                    border: '1px solid var(--rayo-sand-300)',
                    borderRadius: 12,
                  }}
                >
                  <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: 'var(--rayo-sage-300)',
                      color: 'var(--rayo-forest-900)',
                      marginTop: 2,
                    }}
                  >
                    <Target className="w-3 h-3" />
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--rayo-ink-700)' }}>{step}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Últimas Mensagens */}
          <section>
            <h3 className="ra-eyebrow" style={{ marginBottom: 10 }}>Última conversa</h3>
            <div className="space-y-3 max-h-40 overflow-y-auto">
              {session.messages.slice(-3).map(message => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`ra-chat-bubble ${message.speaker === 'user' ? 'user' : 'assistant'}`}>
                    {message.text}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Ações */}
          <div
            className="flex gap-3 pt-4"
            style={{ borderTop: '1px solid var(--rayo-sand-300)' }}
          >
            <button
              type="button"
              className="ra-pill-primary"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={onContinue}
              disabled={!isActive}
            >
              <PlayCircle className="w-4 h-4" />
              {isActive ? 'Continuar conversa' : 'Conversa finalizada'}
            </button>
            <button type="button" className="ra-pill-ghost" onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}