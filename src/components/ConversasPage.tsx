import { useState, useEffect } from "react";
import { MessageCircle, UserPlus, Search, Phone, Video, MoreVertical, Send, Smile, Paperclip, Users, ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Skeleton } from "./ui/skeleton";
import { useApp } from "./AppContext";
import { toast } from "sonner@2.0.3";

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  read: boolean;
  type: 'text' | 'image' | 'audio';
}

interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  lastMessage?: Message;
  unreadCount: number;
  isOnline: boolean;
  lastSeen?: Date;
}

interface Contact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  avatar?: string;
  isConnected: boolean;
  mutualConnections?: number;
}

export function ConversasPage() {
  const { userData, updateUserData } = useApp();
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showContactsDialog, setShowContactsDialog] = useState(false);
  const [isConnectingContacts, setIsConnectingContacts] = useState(false);

  // Mock data - em produção viria do backend
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: "1",
      participantId: "user1",
      participantName: "João Silva",
      participantAvatar: "",
      lastMessage: {
        id: "msg1",
        senderId: "user1",
        content: "Oi! Como foi o curso de comunicação?",
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        read: false,
        type: 'text'
      },
      unreadCount: 2,
      isOnline: true
    },
    {
      id: "2",
      participantId: "user2",
      participantName: "Ana Costa",
      participantAvatar: "",
      lastMessage: {
        id: "msg2",
        senderId: "user2",
        content: "Obrigada pela dica do livro! 📚",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        read: true,
        type: 'text'
      },
      unreadCount: 0,
      isOnline: false,
      lastSeen: new Date(Date.now() - 60 * 60 * 1000)
    },
    {
      id: "3",
      participantId: "user3",
      participantName: "Carlos Mendes",
      participantAvatar: "",
      lastMessage: {
        id: "msg3",
        senderId: "user3",
        content: "Vamos marcar aquele encontro de casais?",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        read: true,
        type: 'text'
      },
      unreadCount: 0,
      isOnline: true
    }
  ]);

  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: "contact1",
      name: "Maria Santos",
      phone: "+55 11 99999-9999",
      email: "maria@email.com",
      isConnected: false,
      mutualConnections: 3
    },
    {
      id: "contact2",
      name: "Pedro Oliveira",
      phone: "+55 11 88888-8888",
      email: "pedro@email.com",
      isConnected: false,
      mutualConnections: 1
    }
  ]);

  const [messages, setMessages] = useState<{ [conversationId: string]: Message[] }>({
    "1": [
      {
        id: "msg1-1",
        senderId: "user1",
        content: "Oi! Como foi o curso de comunicação?",
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        read: false,
        type: 'text'
      },
      {
        id: "msg1-2",
        senderId: "user1",
        content: "Estou ansioso para aplicar as dicas!",
        timestamp: new Date(Date.now() - 25 * 60 * 1000),
        read: false,
        type: 'text'
      }
    ]
  });

  const handleConnectContacts = async () => {
    setIsConnectingContacts(true);
    
    // Verificar se o navegador suporta acesso aos contatos
    if (!('contacts' in navigator)) {
      toast.info("Seu navegador não suporta acesso aos contatos. Simulando descoberta...");
    }
    
    try {
      // Simular permissão e conexão com contatos
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock: adicionar novos contatos descobertos
      const newContacts = [
        {
          id: "contact3",
          name: "Lucia Fernandes",
          phone: "+55 11 77777-7777",
          isConnected: false,
          mutualConnections: 2
        },
        {
          id: "contact4",
          name: "Roberto Silva",
          phone: "+55 11 66666-6666",
          isConnected: false,
          mutualConnections: 5
        }
      ];
      
      setContacts(prev => {
        // Evitar duplicatas
        const existingIds = prev.map(c => c.id);
        const uniqueNewContacts = newContacts.filter(c => !existingIds.includes(c.id));
        return [...prev, ...uniqueNewContacts];
      });
      
      const foundCount = newContacts.length;
      if (foundCount > 0) {
        toast.success(`🎉 Encontramos ${foundCount} contatos que também usam o RAIO!`);
      } else {
        toast.info("Nenhum novo contato encontrado no momento.");
      }
      
    } catch (error) {
      toast.error("Erro ao conectar contatos. Verifique suas permissões e tente novamente.");
    } finally {
      setIsConnectingContacts(false);
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !activeConversation) return;

    const message: Message = {
      id: `msg-${Date.now()}`,
      senderId: userData.id || "current-user",
      content: newMessage,
      timestamp: new Date(),
      read: true,
      type: 'text'
    };

    setMessages(prev => ({
      ...prev,
      [activeConversation]: [...(prev[activeConversation] || []), message]
    }));

    // Atualizar última mensagem da conversa
    setConversations(prev =>
      prev.map(conv =>
        conv.id === activeConversation
          ? { ...conv, lastMessage: message, unreadCount: 0 }
          : conv
      )
    );

    setNewMessage("");
    toast.success("Mensagem enviada!");
  };

  const handleConnectUser = (contactId: string) => {
    setContacts(prev =>
      prev.map(contact =>
        contact.id === contactId
          ? { ...contact, isConnected: true }
          : contact
      )
    );
    toast.success("Convite de conexão enviado!");
  };

  const filteredConversations = conversations.filter(conv =>
    conv.participantName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeConv = conversations.find(conv => conv.id === activeConversation);
  const conversationMessages = activeConversation ? messages[activeConversation] || [] : [];

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatLastSeen = (date?: Date) => {
    if (!date) return "";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 60) return `Visto há ${diffMins}min`;
    if (diffHours < 24) return `Visto há ${diffHours}h`;
    return `Visto ${date.toLocaleDateString('pt-BR')}`;
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] max-w-6xl mx-auto bg-background">
      {/* Lista de Conversas */}
      <div className={`${activeConversation ? 'hidden md:block' : 'block'} w-full md:w-1/3 border-r border-border bg-card`}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-display font-bold">Conversas</h1>
            <Dialog open={showContactsDialog} onOpenChange={setShowContactsDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Conectar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-display">Conectar Contatos</DialogTitle>
                  <DialogDescription className="font-body">
                    Descubra e conecte-se com pessoas na comunidade RAIO
                  </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="discover" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="discover">Descobrir</TabsTrigger>
                    <TabsTrigger value="contacts">Contatos</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="discover" className="space-y-4">
                    <div className="text-center py-6">
                      <Phone className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-body font-medium mb-2">Encontre amigos no RAIO</h3>
                      <p className="font-body text-sm text-muted-foreground mb-4">
                        Conecte seus contatos para encontrar quem já usa o RAIO
                      </p>
                      <Button 
                        onClick={handleConnectContacts}
                        disabled={isConnectingContacts}
                        className="w-full"
                      >
                        {isConnectingContacts ? "Conectando..." : "Conectar Contatos"}
                      </Button>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="contacts" className="space-y-2">
                    <ScrollArea className="h-64">
                      {contacts.map(contact => (
                        <div key={contact.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={contact.avatar} />
                              <AvatarFallback>{contact.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{contact.name}</p>
                              {contact.mutualConnections && (
                                <p className="text-xs text-muted-foreground">
                                  {contact.mutualConnections} conexões em comum
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant={contact.isConnected ? "secondary" : "default"}
                            onClick={() => handleConnectUser(contact.id)}
                            disabled={contact.isConnected}
                          >
                            {contact.isConnected ? "Conectado" : "Conectar"}
                          </Button>
                        </div>
                      ))}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">Nenhuma conversa ainda</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Conecte-se com outros membros para começar a conversar
              </p>
              <Button onClick={() => setShowContactsDialog(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Encontrar Pessoas
              </Button>
            </div>
          ) : (
            filteredConversations.map(conversation => (
              <div
                key={conversation.id}
                onClick={() => setActiveConversation(conversation.id)}
                className={`p-4 cursor-pointer hover:bg-accent border-b transition-colors ${
                  activeConversation === conversation.id ? 'bg-accent' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={conversation.participantAvatar} />
                      <AvatarFallback>
                        {conversation.participantName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {conversation.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium truncate">{conversation.participantName}</h3>
                      {conversation.lastMessage && (
                        <span className="text-xs text-muted-foreground">
                          {formatTime(conversation.lastMessage.timestamp)}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.lastMessage?.content || "Começar conversa..."}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <Badge className="ml-2">{conversation.unreadCount}</Badge>
                      )}
                    </div>
                    
                    {!conversation.isOnline && conversation.lastSeen && (
                      <p className="text-xs text-muted-foreground">
                        {formatLastSeen(conversation.lastSeen)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Área de Conversa */}
      <div className={`${activeConversation ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
        {activeConv ? (
          <>
            {/* Header da Conversa */}
            <div className="p-4 border-b bg-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Botão Voltar - Mobile */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="md:hidden"
                  onClick={() => setActiveConversation(null)}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="relative">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={activeConv.participantAvatar} />
                    <AvatarFallback>
                      {activeConv.participantName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {activeConv.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                  )}
                </div>
                <div>
                  <h2 className="font-body font-medium">{activeConv.participantName}</h2>
                  <p className="font-body text-xs text-muted-foreground">
                    {activeConv.isOnline ? "Online" : formatLastSeen(activeConv.lastSeen)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Video className="w-4 h-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Ver perfil</DropdownMenuItem>
                    <DropdownMenuItem>Silenciar notificações</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Bloquear usuário</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Mensagens */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {conversationMessages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.senderId === (userData.id || "current-user") ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.senderId === (userData.id || "current-user")
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.senderId === (userData.id || "current-user")
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      }`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Input de Mensagem */}
            <div className="p-4 border-t bg-card">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <div className="flex-1 relative">
                  <Input
                    placeholder="Digite sua mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="pr-10"
                  />
                  <Button variant="ghost" size="sm" className="absolute right-1 top-1">
                    <Smile className="w-4 h-4" />
                  </Button>
                </div>
                <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/20">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="font-display font-medium mb-2">Selecione uma conversa</h2>
              <p className="font-body text-muted-foreground">
                Escolha uma conversa para começar a trocar mensagens
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}