import React, { useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, UserPlus, Check, Star } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";

interface PeopleYouMayKnowProps {
  onBack: () => void;
  onContinue: (followedPeople: string[]) => void;
}

export function PeopleYouMayKnow({ onBack, onContinue }: PeopleYouMayKnowProps) {
  const [followedPeople, setFollowedPeople] = useState<string[]>([]);

  // Pessoas sugeridas baseadas na imagem do Substack
  const suggestedPeople = [
    {
      id: "jessica-raio",
      name: "Jessica Raio",
      handle: "@jessicaraio",
      bio: "Especialista em relacionamentos e família",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=100&h=100&fit=crop&crop=face",
      isVerified: true,
      category: "Especialista"
    },
    {
      id: "rafael-raio", 
      name: "Rafael Raio",
      handle: "@rafaelraio",
      bio: "Coach de casais e comunicação",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
      isVerified: true,
      category: "Especialista"
    },
    {
      id: "ana-silva",
      name: "Ana Silva",
      handle: "@anasilva",
      bio: "Mãe de 3, compartilha dicas de família",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
      isVerified: false,
      category: "Comunidade"
    },
    {
      id: "carlos-mendes",
      name: "Carlos Mendes", 
      handle: "@carlosmendes",
      bio: "Educador financeiro para casais",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
      isVerified: false,
      category: "Finanças"
    },
    {
      id: "patricia-costa",
      name: "Patrícia Costa",
      handle: "@patriciacosta", 
      bio: "Terapeuta familiar e coach de relacionamentos",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face",
      isVerified: false,
      category: "Terapia"
    },
    {
      id: "bruno-santos",
      name: "Bruno Santos",
      handle: "@brunosantos",
      bio: "Pastor e conselheiro matrimonial",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
      isVerified: false,
      category: "Fé"
    },
    {
      id: "maria-oliveira",
      name: "Maria Oliveira",
      handle: "@mariaoliveira",
      bio: "Influenciadora de família cristã",
      avatar: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=100&h=100&fit=crop&crop=face",
      isVerified: false,
      category: "Influencer"
    },
    {
      id: "joao-pereira",
      name: "João Pereira",
      handle: "@joaopereira",
      bio: "Autor de livros sobre paternidade",
      avatar: "https://images.unsplash.com/photo-1566492031773-4f4e44671d66?w=100&h=100&fit=crop&crop=face",
      isVerified: false,
      category: "Autor"
    },
    {
      id: "luciana-martins",
      name: "Luciana Martins",
      handle: "@lucianamartins",
      bio: "Psicóloga infantil e familiar",
      avatar: "https://images.unsplash.com/photo-1554151228-14d9def656e4?w=100&h=100&fit=crop&crop=face",
      isVerified: false,
      category: "Psicologia"
    },
    {
      id: "rodrigo-silva",
      name: "Rodrigo Silva",
      handle: "@rodrigosilva",
      bio: "Mentor de relacionamentos saudáveis",
      avatar: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=100&h=100&fit=crop&crop=face",
      isVerified: false,
      category: "Mentor"
    }
  ];

  const toggleFollowPerson = (personId: string) => {
    setFollowedPeople(prev => 
      prev.includes(personId)
        ? prev.filter(id => id !== personId)
        : [...prev, personId]
    );
  };

  const followAllSuggested = () => {
    setFollowedPeople(suggestedPeople.map(p => p.id));
  };

  const handleContinue = () => {
    onContinue(followedPeople);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between p-4"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-white/70 hover:text-white hover:bg-white/10 p-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        
        <span className="text-sm text-white/70">Próximo</span>
      </motion.div>

      {/* Content */}
      <div className="px-6 pb-6">
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
            <h2 className="text-3xl font-bold text-white mb-3">
              Pessoas que você pode conhecer
            </h2>
            <p className="text-white/70">
              Siga a atividade deles no RAIO
            </p>
          </motion.div>

          {/* People List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3 mb-8"
          >
            {suggestedPeople.map((person, index) => {
              const isFollowing = followedPeople.includes(person.id);
              
              return (
                <motion.div
                  key={person.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * index }}
                >
                  <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={person.avatar} alt={person.name} />
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {person.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-white text-sm truncate">
                              {person.name}
                            </h3>
                            {person.isVerified && (
                              <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-white/60 truncate">
                            {person.handle}
                          </p>
                          <p className="text-xs text-white/70 mt-1 line-clamp-2">
                            {person.bio}
                          </p>
                          
                          <Badge 
                            variant="outline"
                            className="text-xs mt-2 border-white/20 text-white/60"
                          >
                            {person.category}
                          </Badge>
                        </div>
                        
                        <Button
                          size="sm"
                          variant={isFollowing ? "secondary" : "outline"}
                          onClick={() => toggleFollowPerson(person.id)}
                          className={`${
                            isFollowing 
                              ? 'bg-primary text-white hover:bg-primary/90' 
                              : 'border-white/20 text-white hover:bg-white/10'
                          } px-4`}
                        >
                          {isFollowing ? 'Seguindo' : 'Seguir'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="space-y-3"
          >
            <Button
              onClick={followAllSuggested}
              className="w-full h-12 bg-primary hover:bg-primary/90 rounded-xl font-semibold"
            >
              Seguir todos
            </Button>
            
            <Button
              variant="ghost"
              onClick={handleContinue}
              className="w-full text-white/70 hover:text-white hover:bg-white/10"
            >
              {followedPeople.length > 0 ? `Continuar (${followedPeople.length} selecionados)` : 'Pular esta etapa'}
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}