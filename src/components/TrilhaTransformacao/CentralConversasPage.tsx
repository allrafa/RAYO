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
      ? { name: 'Jessica Raio', color: 'bg-pink-500', accent: 'text-pink-600 bg-pink-50' }
      : { name: 'Rafa Raio', color: 'bg-blue-500', accent: 'text-blue-600 bg-blue-50' };
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
      <div className="p-4 space-y-4">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-display font-medium text-gray-900 mb-2">Nenhuma conversa encontrada</h3>
            <p className="font-body text-gray-600 mb-6">
              {searchQuery ? 'Tente outros termos de busca' : 'Inicie sua primeira conversa na Trilha da Transformação'}
            </p>
            <Button
              onClick={onStartNewConversation}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Começar Agora
            </Button>
          </div>
        ) : (
          filteredSessions.map(session => {
            const consultantInfo = getConsultantInfo(session.consultant);
            const isActive = !session.endTime;
            
            return (
              <Card 
                key={session.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedSession(session)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className={`w-10 h-10 ${consultantInfo.color} text-white flex items-center justify-center font-medium`}>
                        {consultantInfo.name.split(' ')[0][0]}
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{consultantInfo.name}</span>
                          {isActive && (
                            <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                              Ativa
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(session.startTime)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {getSessionDuration(session)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <Button variant="ghost" size="icon" className="w-8 h-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Jornada Emocional */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">Jornada:</span>
                    <Badge variant="outline" className="text-orange-600 border-orange-200">
                      {session.emotionalJourney.start}
                    </Badge>
                    <span className="text-gray-400">→</span>
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      {session.emotionalJourney.end}
                    </Badge>
                  </div>

                  {/* Breakthrough se existir */}
                  {session.emotionalJourney.breakthrough && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-yellow-800">
                        <Target className="w-4 h-4" />
                        Insight Principal
                      </div>
                      <p className="text-sm text-yellow-700 mt-1">
                        {session.emotionalJourney.breakthrough}
                      </p>
                    </div>
                  )}

                  {/* Próximos Passos */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Próximos Passos:</h4>
                    <div className="space-y-1">
                      {session.nextSteps.slice(0, 2).map((step, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm text-gray-700">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                          <span>{step}</span>
                        </div>
                      ))}
                      {session.nextSteps.length > 2 && (
                        <div className="text-sm text-gray-500">
                          +{session.nextSteps.length - 2} outros passos
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContinueSession(session.id);
                      }}
                      className="flex-1"
                      disabled={!isActive}
                    >
                      <PlayCircle className="w-4 h-4 mr-1" />
                      {isActive ? 'Continuar' : 'Concluída'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSession(session);
                      }}
                    >
                      Ver Detalhes
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
    ? { name: 'Jessica Raio', color: 'bg-pink-500' }
    : { name: 'Rafa Raio', color: 'bg-blue-500' };
  
  const isActive = !session.endTime;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-t-xl sm:rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className={`w-12 h-12 ${consultantInfo.color} text-white flex items-center justify-center font-medium`}>
                {consultantInfo.name.split(' ')[0][0]}
              </Avatar>
              <div>
                <h2 className="font-semibold">{consultantInfo.name}</h2>
                <p className="text-sm text-gray-600">
                  {new Date(session.startTime).toLocaleDateString('pt-BR')} • 
                  {isActive ? ' Em andamento' : ` ${Math.floor((session.endTime!.getTime() - session.startTime.getTime()) / (1000 * 60))} min`}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Jornada Emocional Detalhada */}
          <div>
            <h3 className="font-medium mb-3">Jornada Emocional</h3>
            <div className="bg-gradient-to-r from-orange-50 to-green-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <div className="text-2xl mb-1">😟</div>
                  <Badge variant="outline" className="text-orange-600 border-orange-200">
                    {session.emotionalJourney.start}
                  </Badge>
                </div>
                <div className="flex-1 mx-4">
                  <div className="h-0.5 bg-gradient-to-r from-orange-300 to-green-300"></div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">😊</div>
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    {session.emotionalJourney.end}
                  </Badge>
                </div>
              </div>
              {session.emotionalJourney.breakthrough && (
                <div className="mt-4 p-3 bg-white rounded border border-yellow-200">
                  <div className="font-medium text-sm text-yellow-800 mb-1">💡 Insight Principal</div>
                  <p className="text-sm text-gray-700">{session.emotionalJourney.breakthrough}</p>
                </div>
              )}
            </div>
          </div>

          {/* Insights */}
          <div>
            <h3 className="font-medium mb-3">Insights Descobertos</h3>
            <div className="space-y-2">
              {session.insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-blue-600">{index + 1}</span>
                  </div>
                  <p className="text-sm text-gray-700">{insight}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Próximos Passos */}
          <div>
            <h3 className="font-medium mb-3">Plano de Ação</h3>
            <div className="space-y-2">
              {session.nextSteps.map((step, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Target className="w-3 h-3 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-700">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Últimas Mensagens */}
          <div>
            <h3 className="font-medium mb-3">Última Conversa</h3>
            <div className="space-y-3 max-h-40 overflow-y-auto">
              {session.messages.slice(-3).map(message => (
                <div key={message.id} className={`flex gap-3 ${message.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs p-3 rounded-lg text-sm ${
                    message.speaker === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    {message.text}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              onClick={onContinue}
              disabled={!isActive}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              {isActive ? 'Continuar Conversa' : 'Conversa Finalizada'}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}