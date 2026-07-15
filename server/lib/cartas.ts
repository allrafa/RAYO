// Carta Semanal RAYO (RITMO_PLAN.md F2) — 10 edições curadas, rotação
// por semana. Redação original do produto; o versículo citado é da
// Almeida Revista e Corrigida (domínio público no Brasil).
//
// A carta é o e-mail editorial de domingo: mais reflexiva que a Missão
// do Dia, escrita pra ser lida em ~3 minutos antes da semana começar.

export interface CartaSemanal {
  headline: string;
  headlineItalic?: string;
  readingMinutes: number;
  paragraphs: string[];
}

export const CARTAS_SEMANAIS: CartaSemanal[] = [
  {
    headline: "A semana começa na mesa",
    headlineItalic: "não na segunda-feira",
    readingMinutes: 3,
    paragraphs: [
      "Existe um mito de que a semana começa na segunda, no despertador, no trânsito. Mas as famílias que a gente mais admira começam a semana no domingo — numa mesa, num culto, numa conversa sem pressa.",
      "O que vocês decidirem hoje — o tom, a prioridade, a oração — vai dar o clima dos próximos sete dias. <strong>A semana é filha do domingo.</strong>",
      "Nossa sugestão: antes de dormir hoje, respondam juntos a uma pergunta — \"o que não pode faltar nesta semana pra gente?\" Não precisa ser grande. Precisa ser combinado.",
    ],
  },
  {
    headline: "Constância vence intensidade",
    readingMinutes: 3,
    paragraphs: [
      "Ninguém constrói um casamento forte num fim de semana intenso — nem uma vida com Deus num retiro por ano. O que constrói é o pouco de todo dia: o amém, a oração de trinta segundos, a pergunta sincera no jantar.",
      "\"Não desprezes os dias das coisas pequenas\" é um princípio que atravessa a Escritura inteira. <strong>Deus faz questão de crescer devagar o que Ele quer que dure.</strong>",
      "Se esta semana vier corrida, não abandone tudo — diminua o tamanho, não a frequência. Um versículo por dia ainda é uma semana inteira com Deus.",
    ],
  },
  {
    headline: "O descanso também é santo",
    readingMinutes: 3,
    paragraphs: [
      "O sábado foi a primeira coisa que Deus chamou de santa — antes de qualquer templo, qualquer altar. O descanso não é o prêmio de quem terminou a lista; é a confiança de quem sabe Quem sustenta o mundo.",
      "Cansaço acumulado vira irritação, e irritação sem endereço desconta em quem amamos. <strong>Descansar é um ato de amor pela sua casa.</strong>",
      "Esta semana, protejam juntos pelo menos uma hora de descanso de verdade — sem tela, sem pauta. Só vocês e a gratidão.",
    ],
  },
  {
    headline: "Fale a língua de quem você ama",
    readingMinutes: 3,
    paragraphs: [
      "Todo mundo dá amor do jeito que gosta de receber — e é por isso que tanta gente se sente sozinha dentro de casa cheia. O desafio não é amar mais; é amar na língua do outro.",
      "Uns ouvem amor em palavras, outros em tempo, em serviço, em toque, em presentes. <strong>Amor que não é traduzido não é recebido.</strong>",
      "Pergunta da semana pra fazer um pro outro: \"o que eu faço que mais te faz sentir amado(a) — e o que você queria que eu fizesse mais?\"",
    ],
  },
  {
    headline: "Filhos aprendem o que veem",
    headlineItalic: "e esquecem o que ouvem",
    readingMinutes: 3,
    paragraphs: [
      "A gente prepara discurso pros filhos e esquece que eles estão assistindo ao filme inteiro: como tratamos um ao outro, como reagimos à conta inesperada, como pedimos perdão — ou não pedimos.",
      "<strong>O casamento dos pais é a primeira teologia dos filhos.</strong> É nele que eles aprendem, antes de qualquer culto, se Deus é confiável.",
      "Esta semana, deixem os filhos flagrarem vocês dois orando juntos. Não pra ensinar — só pra viver. O resto, a cena ensina sozinha.",
    ],
  },
  {
    headline: "Dinheiro é conversa de altar",
    readingMinutes: 4,
    paragraphs: [
      "Brigas de dinheiro raramente são sobre dinheiro — são sobre medo, controle e sonhos não ditos. Por isso planilha nenhuma resolve o que uma conversa honesta não começou.",
      "Jesus falou mais sobre dinheiro do que sobre oração — não porque Deus precise do nosso, mas porque o coração vai atrás do tesouro. <strong>Orçamento é documento espiritual.</strong>",
      "Marquem 30 minutos esta semana: sem acusação, com café. Três perguntas: o que entrou, o que saiu, o que sonhamos? Deus cabe nas três.",
    ],
  },
  {
    headline: "Perdão não é sentimento",
    headlineItalic: "é decisão com data",
    readingMinutes: 3,
    paragraphs: [
      "Se esperarmos vontade de perdoar, o rancor cria raiz. O perdão bíblico não nasce da emoção — nasce da decisão, e a emoção vem atrás, mancando, mas vem.",
      "\"Não se ponha o sol sobre a vossa ira\" é um prazo de validade da mágoa. <strong>Casa onde a mágoa dorme, o amor acorda cansado.</strong>",
      "Existe alguma conversa adiada aí na sua casa? Esta é a semana. Comecem com \"eu senti\" em vez de \"você fez\" — muda tudo.",
    ],
  },
  {
    headline: "Vocês são um time",
    headlineItalic: "não adversários de quarto",
    readingMinutes: 3,
    paragraphs: [
      "Em toda discussão de casal existe uma terceira parte: o problema. Casais maduros aprendem a ficar do mesmo lado da mesa, com o problema do outro lado.",
      "\"Eu contra você\" não tem vencedor — tem dois perdedores dormindo na mesma cama. <strong>Ou vocês vencem juntos, ou perderam os dois.</strong>",
      "Na próxima divergência, tentem a frase mágica: \"como NÓS vamos resolver isso?\" O pronome certo desarma metade da guerra.",
    ],
  },
  {
    headline: "A gratidão treina o olhar",
    readingMinutes: 3,
    paragraphs: [
      "O cérebro acha o que procura: quem cata defeito, acha; quem cata graça, acha também. Gratidão não é ingenuidade — é mira.",
      "\"Em tudo dai graças\" não nega a dor; ele se recusa a deixá-la ser a única manchete do dia. <strong>O que se agradece, cresce.</strong>",
      "Desafio da semana: toda noite, cada um fala UMA coisa do outro pela qual agradece — específica, do dia. Sete noites mudam um clima.",
    ],
  },
  {
    headline: "Comecem antes de estar prontos",
    readingMinutes: 3,
    paragraphs: [
      "Ninguém se sente pronto pra orar em voz alta com o cônjuge, abrir a Bíblia com os filhos, convidar amigos pra falar de fé. A prontidão é um mito — a obediência é um começo.",
      "Pedro afundou quando olhou pra onda, mas foi o único que andou sobre o mar — porque saiu do barco sem estar pronto. <strong>Deus dirige carro em movimento.</strong>",
      "Aquilo que vocês estão adiando \"até se sentirem preparados\"? Façam a versão pequena dela esta semana. Feito imperfeito ensina mais que perfeito adiado.",
    ],
  },
];

const WEEK_MS = 7 * 86400000;

/** Número da edição: semanas desde a época (estável e crescente). */
export function cartaEditionForDate(date: Date): number {
  return Math.floor(date.getTime() / WEEK_MS);
}

export function cartaForDate(date: Date): CartaSemanal {
  return CARTAS_SEMANAIS[cartaEditionForDate(date) % CARTAS_SEMANAIS.length];
}
