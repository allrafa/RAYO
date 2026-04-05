// 🎯 LIÇÃO 0 - CONTEÚDO COMPLETO
// "Frases que Destroem, Palavras que Constroem"
// Quebra de senso comum sobre comunicação em relacionamentos

export const lesson0Content = {
  id: 'lesson-0-frases-que-destroem',
  title: 'Frases que Destroem, Palavras que Constroem',
  subtitle: 'Descubra como pequenas palavras criam grandes problemas',
  category: 'comunicacao',
  difficulty: 1,
  estimated_minutes: 3,
  xp_reward: 10,
  hearts_reward: 1,
  
  // INTRO - O problema
  intro: {
    title: 'Você já disse alguma dessas frases?',
    examples: [
      '"Você nunca me escuta!"',
      '"Você sempre faz isso!"',
      '"Eu não falei nada demais..."',
      '"Você é muito sensível!"',
      '"Eu só estava brincando!"'
    ],
    hook: 'Se você já disse ou ouviu alguma dessas frases, essa lição vai mudar a forma como você se comunica.'
  },
  
  // STEP 1 - Áudio principal (60 segundos)
  audioStep: {
    duration_seconds: 60,
    script: `
Sabe aquela frase: "Você NUNCA me escuta"?

Ela parece inofensiva, né? Mas essa palavrinha — NUNCA — 
destrói mais relacionamentos do que você imagina.

Vou te explicar o porquê.

Quando você diz "Você NUNCA me escuta" ou "Você SEMPRE faz isso",
você não está descrevendo a realidade.
Você está GENERALIZANDO.

E sabe o que acontece no cérebro de quem ouve isso?

Defesa automática.

A pessoa pensa: "Como assim NUNCA? Eu escutei ontem! Eu escutei semana passada!"

E ao invés de resolver o problema, vocês entram numa discussão sobre 
quem está certo ou errado.

O problema real? Ele continua lá. Sem solução.

Agora, imagine trocar essa frase por:

"Hoje eu senti que você estava distraído quando eu falei. 
Podemos conversar sobre isso?"

Viu a diferença?

Você saiu do ataque para a CONEXÃO.
Da generalização para o ESPECÍFICO.
Da culpa para a SOLUÇÃO.

Comunicação não é sobre quem ganha a discussão.

É sobre quem cuida melhor do relacionamento.

E aqui no RAIO, você vai aprender exatamente como fazer isso.

Pequenas mudanças nas palavras.
Grandes transformações na família.
    `,
    voice_notes: 'Tom: Conversacional, amigável, sem julgamento. Como se fosse um amigo mais experiente dando um conselho valioso.',
    audio_url: '/assets/lessons/lesson-0-audio.mp3' // 🔴 BACKEND - Gravar áudio
  },
  
  // STEP 2 - Quiz de reconhecimento
  quizStep: {
    type: 'multiple_choice',
    question: 'Das frases abaixo, qual você acha que GERA MAIS CONEXÃO no relacionamento?',
    options: [
      {
        id: 'a',
        text: '"Você sempre esquece das coisas importantes!"',
        isCorrect: false,
        feedback: 'Essa frase usa "sempre" — uma generalização que ativa defesa. A pessoa vai focar em provar que NEM SEMPRE esquece, ao invés de resolver o problema.'
      },
      {
        id: 'b',
        text: '"Eu não aguento mais! Você nunca me dá atenção!"',
        isCorrect: false,
        feedback: 'Duas palavras perigosas aqui: "nunca" e "não aguento mais". Isso cria uma sensação de catástrofe e coloca a outra pessoa na defensiva.'
      },
      {
        id: 'c',
        text: '"Hoje eu senti falta da sua atenção. Podemos reservar um tempo juntos amanhã?"',
        isCorrect: true,
        feedback: '✨ EXATO! Essa frase é específica ("hoje"), expressa um sentimento ("senti falta") e propõe uma solução ("podemos reservar um tempo"). Isso é comunicação construtiva!'
      },
      {
        id: 'd',
        text: '"Você está sempre no celular, isso é um absurdo!"',
        isCorrect: false,
        feedback: 'Usar "sempre" + "absurdo" cria julgamento e exagero. A pessoa vai se defender ao invés de entender o que você realmente precisa.'
      }
    ]
  },
  
  // STEP 3 - Reflexão pessoal
  reflectionStep: {
    question: 'Pensando na sua última discussão em casa, qual palavra você mais usou?',
    options: [
      {
        emoji: '❌',
        label: 'Nunca / Sempre',
        value: 'generalizacao',
        insight: 'Generalizações criam conflito. Que tal tentar ser mais específico da próxima vez?'
      },
      {
        emoji: '🤔',
        label: 'Mas / Porém',
        value: 'contraposicao',
        insight: 'O famoso "mas" anula tudo que vem antes. Experimente trocar por "E também..." para somar, não subtrair.'
      },
      {
        emoji: '🗣️',
        label: 'Você fez / Você é',
        value: 'acusacao',
        insight: 'Falar "você" soa como acusação. Tente "Eu senti..." para expressar seu lado sem atacar.'
      },
      {
        emoji: '😶',
        label: 'Eu não disse nada',
        value: 'silencio',
        insight: 'O silêncio também comunica — e muitas vezes dói mais que as palavras. Expressar-se com clareza é um ato de amor.'
      }
    ]
  },
  
  // STEP 4 - Cenário prático (brasileiro!)
  scenarioStep: {
    title: 'Situação Real: Sábado à Tarde',
    scenario: `
Você combinou de sair com seu parceiro(a) no sábado.
Mas na hora H, a pessoa está deitada no sofá assistindo futebol/novela.

Você se sente esquecido(a) e desvalorizado(a).

O que você diz?
    `,
    options: [
      {
        id: 'a',
        text: '"Você NUNCA cumpre o que promete! Sempre é assim!"',
        tone: 'destrutiva',
        consequence: 'Briga garantida. A pessoa vai se defender e vocês vão discutir sobre quem está certo.',
        creates_connection: false
      },
      {
        id: 'b',
        text: '"Tudo bem, não tem problema..." (mas você fica magoado)',
        tone: 'passivo-agressiva',
        consequence: 'Você engole o sentimento, mas ele vai voltar pior depois. Relacionamentos morrem no não-dito.',
        creates_connection: false
      },
      {
        id: 'c',
        text: '"Amor, a gente tinha combinado de sair hoje. Eu estava esperando por isso. Ainda dá tempo?"',
        tone: 'construtiva',
        consequence: 'Você expressa o que sente SEM atacar. Abre espaço para uma conversa real e uma solução juntos.',
        creates_connection: true,
        raio_teaches: 'Comunicação clara + Sem culpa = Conexão verdadeira'
      }
    ],
    correct_option: 'c'
  },
  
  // STEP 5 - A grande revelação
  revelationStep: {
    title: '💡 A Verdade Que Ninguém Fala',
    points: [
      {
        myth: '❌ MITO: "Quem ama, entende sem precisar falar"',
        truth: '✅ VERDADE: Quem ama, FALA com clareza e respeito. Ninguém lê mentes.'
      },
      {
        myth: '❌ MITO: "Se eu falar o que sinto, vou parecer fraco"',
        truth: '✅ VERDADE: Vulnerabilidade é força. Guardar sentimentos é que enfraquece o relacionamento.'
      },
      {
        myth: '❌ MITO: "Discussão faz parte, todo casal briga"',
        truth: '✅ VERDADE: Conflitos fazem parte. BRIGAS destrutivas, não. Você pode discordar sem destruir.'
      }
    ],
    key_insight: 'A maioria dos casais brasileiros não se separa por falta de amor. Se separa por falta de COMUNICAÇÃO.'
  },
  
  // STEP 6 - Desafio prático
  challengeStep: {
    title: '🎯 Seu Desafio Para Hoje',
    challenge: 'Escolha UMA pessoa da sua família e diga algo que você nunca disse.',
    examples: [
      'Para seu parceiro(a): "Eu te admiro por..."',
      'Para seu filho(a): "Eu aprendi com você que..."',
      'Para seus pais: "Eu sou grato(a) por..."',
      'Para um irmão: "Uma coisa que eu valorizo em você é..."'
    ],
    why: 'Relacionamentos não crescem no automático. Crescem na INTENÇÃO de se conectar.',
    reminder: 'Não precisa ser perfeito. Precisa ser VERDADEIRO.'
  },
  
  // STEP 7 - Feedback final (valor da plataforma)
  feedbackStep: {
    title: '✨ Você Acabou de Completar Sua Primeira Lição!',
    achievement: 'Parabéns! Você deu o primeiro passo para transformar sua comunicação familiar.',
    
    what_you_learned: [
      '✓ Por que "nunca" e "sempre" destroem conversas',
      '✓ Como trocar acusação por conexão',
      '✓ A diferença entre brigar e resolver conflitos',
      '✓ Um desafio prático para hoje mesmo'
    ],
    
    value_proposition: {
      title: 'E se você pudesse fazer isso TODOS OS DIAS?',
      promise: [
        'Imagina ter uma nova lição como essa a cada dia.',
        'Imagina aprender a lidar com conflitos, educar filhos, cultivar intimidade, fortalecer a fé em família.',
        'Imagina transformar 5 minutos por dia em um relacionamento completamente diferente em 30 dias.',
        '',
        'Isso é o RAIO.',
        '',
        'Não são palestras longas. Não é teoria complicada.',
        'São práticas simples, baseadas em REAL LIFE, que você aplica HOJE e vê resultado AMANHÃ.'
      ],
      cta: 'Esse é só o começo da sua jornada de transformação familiar. 💛'
    },
    
    social_proof: {
      stat: 'Mais de 10.000 famílias já estão transformando suas relações com o RAIO.',
      testimonial: {
        quote: '"Eu achei que meu casamento estava acabado. Hoje, depois de 30 dias no RAIO, a gente se comunica de um jeito que nunca conseguimos em 10 anos juntos."',
        author: '— Juliana, 34 anos, São Paulo'
      }
    },
    
    rewards: {
      xp: 10,
      hearts: 1,
      badge: null, // Primeira lição não ganha badge ainda
      streak: 1
    },
    
    next_step: {
      title: 'Pronto para a próxima?',
      lesson_preview: {
        title: 'Lição 1: Perguntas que Salvam Relacionamentos',
        description: 'Aprenda as 3 perguntas que todo casal deveria fazer (mas ninguém ensinou).',
        locked_until: 'signup' // ou 'complete_challenge'
      }
    }
  }
};

// Variações de conteúdo por contexto familiar
export const lesson0Variations = {
  // Para solteiros
  solteiro: {
    scenario: 'Seu amigo(a) cancelou um compromisso importante pela terceira vez.',
    challenge: 'Diga para um amigo próximo: "Eu valorizo nossa amizade porque..."'
  },
  
  // Para namorando
  namoro: {
    scenario: 'Vocês combinaram de se ver, mas ele(a) está respondendo mensagens de forma fria.',
    challenge: 'Mande uma mensagem para seu namorado(a): "Uma coisa que eu admiro em você é..."'
  },
  
  // Para noivos
  noivos: {
    scenario: 'Vocês estão planejando o casamento e discordam sobre um detalhe importante.',
    challenge: 'Diga para seu(sua) noivo(a): "Eu estou ansioso(a) para construir com você..."'
  },
  
  // Para casados
  casados: {
    scenario: 'Sábado à tarde, vocês tinham combinado de sair, mas ele(a) está no sofá.',
    challenge: 'Diga para seu cônjuge: "Uma coisa que eu ainda admiro em você depois de todo esse tempo é..."'
  },
  
  // Para pais
  pais: {
    scenario: 'Seu filho(a) não está te ouvindo e você está perdendo a paciência.',
    challenge: 'Diga para seu filho(a): "Uma coisa que eu aprendi com você foi..."'
  }
};

// Frases comuns que a lição desconstrui
export const commonPhrasesMistakes = [
  {
    frase_errada: '"Você nunca me escuta!"',
    por_que_e_ruim: 'Generalização que ativa defesa',
    frase_certa: '"Hoje eu senti que você estava distraído. Podemos conversar?"',
    impacto: 'Específico, sem acusação, convida ao diálogo'
  },
  {
    frase_errada: '"Você sempre faz isso!"',
    por_que_e_ruim: 'Cria sensação de que nada vai mudar',
    frase_certa: '"Isso aconteceu de novo e me incomodou. Como podemos resolver juntos?"',
    impacto: 'Foca no comportamento específico, não na pessoa'
  },
  {
    frase_errada: '"Você é muito sensível!"',
    por_que_e_ruim: 'Invalida os sentimentos da pessoa',
    frase_certa: '"Eu não sabia que isso te afetava assim. Me ajuda a entender?"',
    impacto: 'Valida e busca compreensão'
  },
  {
    frase_errada: '"Eu não falei nada demais..."',
    por_que_e_ruim: 'Minimiza o impacto e desconsidera o sentimento do outro',
    frase_certa: '"Não era minha intenção te magoar. O que eu disse que te afetou?"',
    impacto: 'Assume responsabilidade e abre espaço para reparação'
  },
  {
    frase_errada: '"Eu só estava brincando!"',
    por_que_e_ruim: 'Transfere culpa para quem se sentiu mal',
    frase_certa: '"Foi uma brincadeira, mas vi que te incomodou. Desculpa."',
    impacto: 'Reconhece impacto mesmo que intenção fosse outra'
  },
  {
    frase_errada: '"Você não entende nada!"',
    por_que_e_ruim: 'Ataca a inteligência/capacidade da pessoa',
    frase_certa: '"Acho que não consegui me expressar bem. Deixa eu tentar de novo?"',
    impacto: 'Assume responsabilidade pela comunicação'
  },
  {
    frase_errada: '"Eu já disse isso mil vezes!"',
    por_que_e_ruim: 'Exagero que cria frustração e culpa',
    frase_certa: '"Esse assunto é importante pra mim. Podemos dar atenção a ele?"',
    impacto: 'Expressa importância sem criar culpa'
  },
  {
    frase_errada: '"Tá bom, faz do seu jeito então..." (com raiva)',
    por_que_e_ruim: 'Passivo-agressivo, cria ressentimento silencioso',
    frase_certa: '"Eu prefiro que seja de outra forma, mas vamos conversar sobre isso."',
    impacto: 'Honesto e aberto ao diálogo'
  }
];

// Princípios de comunicação que a lição ensina
export const communicationPrinciples = {
  principio_1: {
    title: 'Seja ESPECÍFICO, não GENÉRICO',
    rule: 'Troque "sempre/nunca" por "hoje/agora/neste momento"',
    example: '"Hoje eu me senti sozinho(a)" ao invés de "Você nunca está presente"'
  },
  principio_2: {
    title: 'Fale de VOCÊ, não do OUTRO',
    rule: 'Use "Eu sinto/Eu preciso" ao invés de "Você fez/Você é"',
    example: '"Eu preciso de mais atenção" ao invés de "Você não me dá atenção"'
  },
  principio_3: {
    title: 'Proponha SOLUÇÕES, não PROBLEMAS',
    rule: 'Termine a frase com "Podemos..." ao invés de deixar só a reclamação',
    example: '"Podemos reservar 30 min por dia só pra nós?" ao invés de "A gente nunca conversa"'
  },
  principio_4: {
    title: 'Valide ANTES de discordar',
    rule: 'Use "Eu entendo que... E também..." ao invés de "Mas..."',
    example: '"Eu entendo que você está cansado. E também preciso da sua ajuda com isso."'
  }
};

// 🔴 BACKEND REQUIRED - Salvar progresso
export interface Lesson0Progress {
  user_id: string;
  lesson_id: string;
  started_at: Date;
  completed_at?: Date;
  
  // Respostas
  quiz_answer: string;
  reflection_choice: string;
  scenario_choice: string;
  
  // Tracking
  time_spent_seconds: number;
  audio_listened: boolean;
  challenge_accepted: boolean;
  
  // Recompensas
  xp_earned: number;
  hearts_earned: number;
}
