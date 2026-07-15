// Devocional do casal (RITMO_PLAN.md F1) — 30 devocionais curados.
//
// Versículos da tradução Almeida Revista e Corrigida (domínio público
// no Brasil). Reflexões, perguntas e orações são redação original do
// produto. Rotação global determinística por dia (mesma mecânica da
// Palavra do dia): todo casal vive o MESMO devocional no mesmo dia.
//
// Formato pensado pra 3–5 minutos a dois: versículo → reflexão curta →
// UMA pergunta pra conversar → oração de uma frase.

export interface CoupleDevotional {
  theme: string;
  title: string;
  ref: string;
  verse: string;
  reflection: string[];
  question: string;
  prayer: string;
}

export const COUPLE_DEVOTIONALS: CoupleDevotional[] = [
  {
    theme: "casamento",
    title: "Um cordão de três dobras",
    ref: "Eclesiastes 4:12",
    verse: "E, se alguém prevalecer contra um, os dois lhe resistirão; e o cordão de três dobras não se quebra tão depressa.",
    reflection: [
      "O casamento não foi desenhado pra ser uma corda de duas dobras. A terceira dobra — Deus no centro — é o que segura quando a vida puxa forte demais.",
      "Hoje, em vez de perguntar 'o que meu cônjuge pode fazer por mim', perguntem juntos: 'o que nós dois podemos entregar a Deus?'",
    ],
    question: "Em que área da nossa vida a gente tem tentado resistir sozinhos, sem incluir Deus?",
    prayer: "Senhor, sê a terceira dobra do nosso cordão. Amém.",
  },
  {
    theme: "comunicação",
    title: "Pronto para ouvir",
    ref: "Tiago 1:19",
    verse: "Todo o homem seja pronto para ouvir, tardio para falar, tardio para se irar.",
    reflection: [
      "A ordem do versículo não é acidental: ouvir vem primeiro. A maioria das brigas de casal não nasce do que foi dito, mas do que não foi ouvido.",
      "Ouvir de verdade é um ato de amor que custa: exige largar o celular, o argumento pronto e a pressa.",
    ],
    question: "Quando foi a última vez que você se sentiu completamente ouvido(a) por mim?",
    prayer: "Pai, dá-nos ouvidos prontos e bocas pacientes. Amém.",
  },
  {
    theme: "perdão",
    title: "Antes do sol se pôr",
    ref: "Efésios 4:26-27",
    verse: "Irai-vos e não pequeis; não se ponha o sol sobre a vossa ira. Não deis lugar ao diabo.",
    reflection: [
      "A Bíblia não proíbe a raiva — ela dá um prazo pra ela. Mágoa que dorme em casa acorda com raízes.",
      "Perdoar antes do sol se pôr não é fingir que não doeu; é decidir que a aliança vale mais que a razão.",
    ],
    question: "Existe alguma mágoa pequena que a gente deixou dormir e ainda não conversamos?",
    prayer: "Senhor, não deixes o sol se pôr sobre nada entre nós. Amém.",
  },
  {
    theme: "filhos",
    title: "Flechas na mão do guerreiro",
    ref: "Salmos 127:4",
    verse: "Como flechas na mão dum homem poderoso, assim são os filhos da mocidade.",
    reflection: [
      "Flechas não são feitas pra ficar na aljava — são feitas pra serem apontadas e lançadas. Criar filhos é mirar: valores, fé, caráter.",
      "E ninguém lança flecha com uma mão só. A pontaria dos dois precisa estar alinhada.",
    ],
    question: "Pra onde estamos apontando nossos filhos (ou os filhos que sonhamos ter)?",
    prayer: "Pai, alinha a nossa pontaria com a Tua. Amém.",
  },
  {
    theme: "finanças",
    title: "Onde está o tesouro",
    ref: "Mateus 6:21",
    verse: "Porque onde estiver o vosso tesouro, aí estará também o vosso coração.",
    reflection: [
      "O extrato do cartão é um mapa do coração. Ele mostra, sem retoques, o que a gente de fato valoriza.",
      "Dinheiro no casamento não é assunto de planilha — é assunto de altar. Decidir juntos onde investir é decidir juntos o que adorar.",
    ],
    question: "Se alguém olhasse nossos gastos deste mês, o que diria que a gente mais valoriza?",
    prayer: "Senhor, que nosso tesouro esteja onde Tu estás. Amém.",
  },
  {
    theme: "intimidade com Deus",
    title: "De madrugada, ainda escuro",
    ref: "Marcos 1:35",
    verse: "E, levantando-se de manhã, muito cedo, fazendo ainda escuro, saiu, e foi para um lugar deserto, e ali orava.",
    reflection: [
      "Jesus — com a agenda mais importante da história — protegia o primeiro horário do dia pra estar com o Pai.",
      "Um casal que ora junto antes do mundo acordar decide a direção do dia em vez de só reagir a ele.",
    ],
    question: "Qual seria o nosso 'lugar deserto' — um momento do dia só nosso com Deus?",
    prayer: "Pai, acorda-nos primeiro pra Ti. Amém.",
  },
  {
    theme: "paciência",
    title: "O amor sofre, o amor espera",
    ref: "1 Coríntios 13:4",
    verse: "A caridade é sofredora, é benigna; a caridade não é invejosa; a caridade não trata com leviandade, não se ensoberbece.",
    reflection: [
      "A primeira coisa que Paulo diz sobre o amor não é que ele sente — é que ele aguenta. Amor maduro tem fôlego de longa distância.",
      "Seu cônjuge está em construção, como você. Paciência é dar ao outro o mesmo prazo de obra que Deus te dá.",
    ],
    question: "Em que eu posso ser mais paciente com você nesta semana?",
    prayer: "Senhor, dá ao nosso amor o Teu fôlego. Amém.",
  },
  {
    theme: "casamento",
    title: "Deixar e unir",
    ref: "Gênesis 2:24",
    verse: "Portanto, deixará o varão o seu pai e a sua mãe e apegar-se-á à sua mulher, e serão ambos uma carne.",
    reflection: [
      "Antes de unir, o versículo manda deixar. Todo casamento carrega bagagens das casas de onde viemos — algumas boas, outras que precisam ficar pra trás.",
      "Ser 'uma carne' é construir uma cultura nova, da qual vocês dois são fundadores.",
    ],
    question: "Que costume das nossas famílias de origem queremos manter — e qual queremos deixar?",
    prayer: "Pai, faz de nós fundadores de um lar novo em Ti. Amém.",
  },
  {
    theme: "gratidão",
    title: "Em tudo, dai graças",
    ref: "1 Tessalonicenses 5:18",
    verse: "Em tudo dai graças, porque esta é a vontade de Deus em Cristo Jesus para convosco.",
    reflection: [
      "A gratidão é uma lente: ela não muda a paisagem, mas muda o que a gente enxerga nela.",
      "Casais que agradecem juntos treinam os olhos pra ver o que está dando certo — e o que se celebra, cresce.",
    ],
    question: "Quais três coisas da nossa vida juntos você agradece hoje?",
    prayer: "Obrigado, Senhor, por tudo que temos — começando um pelo outro. Amém.",
  },
  {
    theme: "serviço",
    title: "Lavar os pés de quem se ama",
    ref: "João 13:14",
    verse: "Ora, se eu, Senhor e Mestre, vos lavei os pés, vós deveis também lavar os pés uns aos outros.",
    reflection: [
      "Jesus escolheu a tarefa mais humilde da casa pra mostrar o maior amor. No casamento, grandeza se mede no balde e na toalha.",
      "Servir o cônjuge sem placar — sem 'agora é sua vez' — é o evangelho em tamanho doméstico.",
    ],
    question: "Qual 'lavagem de pés' — uma tarefa concreta — eu posso assumir pra te aliviar nesta semana?",
    prayer: "Mestre, ensina-nos a servir como Tu. Amém.",
  },
  {
    theme: "comunicação",
    title: "Palavra boa alegra",
    ref: "Provérbios 12:25",
    verse: "A solicitude no coração do homem o abate, mas uma boa palavra o alegra.",
    reflection: [
      "Dentro de casa, sua voz é a que mais pesa — pra derrubar ou pra levantar. Uma frase dita na hora certa muda o dia inteiro do outro.",
      "Elogio específico vale mais que dez genéricos: diga o quê, diga quando, diga por quê.",
    ],
    question: "Qual palavra você precisava ouvir de mim mais vezes?",
    prayer: "Senhor, põe boas palavras na nossa boca um pro outro. Amém.",
  },
  {
    theme: "perdão",
    title: "Setenta vezes sete",
    ref: "Mateus 18:21-22",
    verse: "Senhor, até quantas vezes pecará meu irmão contra mim, e eu lhe perdoarei? Até sete? Jesus lhe disse: Não te digo que até sete, mas até setenta vezes sete.",
    reflection: [
      "Pedro queria um limite; Jesus respondeu com uma conta impossível de acompanhar. Perdão no casamento não é estoque — é fonte.",
      "Quem guarda a conta das falhas do outro transforma a cama num tribunal. Quem perdoa transforma a casa num altar.",
    ],
    question: "Tem alguma 'conta' que eu pareço estar guardando contra você?",
    prayer: "Pai, apaga nossas contas como apagaste as Tuas contra nós. Amém.",
  },
  {
    theme: "filhos",
    title: "Ensina no caminho",
    ref: "Provérbios 22:6",
    verse: "Instrui o menino no caminho em que deve andar, e, até quando envelhecer, não se desviará dele.",
    reflection: [
      "Instruir não é dar palestra — é andar junto. Filhos aprendem menos do que ouvem e mais do que veem.",
      "O casamento de vocês é a primeira aula de amor que seus filhos vão assistir. O currículo é o dia a dia.",
    ],
    question: "O que nossos filhos (presentes ou futuros) aprenderiam sobre amor só de olhar pra gente?",
    prayer: "Senhor, faz do nosso lar a melhor escola. Amém.",
  },
  {
    theme: "intimidade com Deus",
    title: "Lâmpada para os pés",
    ref: "Salmos 119:105",
    verse: "Lâmpada para os meus pés é tua palavra, e luz para o meu caminho.",
    reflection: [
      "Lâmpada de pé ilumina o próximo passo, não o mapa inteiro. Deus raramente mostra o ano — mas sempre mostra o passo.",
      "Ler a Palavra juntos é sincronizar as lanternas: os dois enxergando o mesmo chão.",
    ],
    question: "Qual decisão estamos tentando enxergar longe demais, quando Deus só pediu o próximo passo?",
    prayer: "Pai, ilumina o passo de hoje — e nós o daremos juntos. Amém.",
  },
  {
    theme: "humildade",
    title: "Cada um ao outro",
    ref: "Filipenses 2:3",
    verse: "Nada façais por contenda ou por vanglória, mas por humildade; cada um considere os outros superiores a si mesmo.",
    reflection: [
      "A matemática do Reino é estranha: no casamento, ganha quem cede primeiro. Considerar o outro superior não é se apagar — é se doar.",
      "As maiores guerras domésticas são vencidas com a menor das frases: 'você tem razão'.",
    ],
    question: "Em qual discussão recente eu poderia ter cedido primeiro?",
    prayer: "Jesus, dá-nos a Tua humildade um com o outro. Amém.",
  },
  {
    theme: "propósito",
    title: "Eu e a minha casa",
    ref: "Josué 24:15",
    verse: "Porém, eu e a minha casa serviremos ao Senhor.",
    reflection: [
      "Josué não esperou consenso nacional — ele decidiu pela porta da própria casa. Todo lar serve a alguma coisa: uma agenda, uma tela, um medo, ou um Senhor.",
      "A declaração de Josué é um convite pra vocês assinarem juntos: aqui dentro, servimos a Deus.",
    ],
    question: "Na prática, o que a nossa casa mais 'serviu' nos últimos tempos?",
    prayer: "Senhor, eu e a minha casa Te serviremos. Amém.",
  },
  {
    theme: "descanso",
    title: "Vinde a mim",
    ref: "Mateus 11:28",
    verse: "Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei.",
    reflection: [
      "Cansaço não tratado vira irritação, e irritação sem endereço desconta em quem está mais perto — geralmente o cônjuge.",
      "Antes de pedir descanso um ao outro, levem o cansaço a Quem pode de fato aliviar.",
    ],
    question: "De 0 a 10, qual seu nível de cansaço real hoje — e como posso te ajudar a descansar?",
    prayer: "Jesus, recebe o nosso cansaço; devolve-nos alívio. Amém.",
  },
  {
    theme: "fidelidade",
    title: "Guarda o teu coração",
    ref: "Provérbios 4:23",
    verse: "Sobre tudo o que se deve guardar, guarda o teu coração, porque dele procedem as saídas da vida.",
    reflection: [
      "A infidelidade nunca começa num ato — começa numa atenção. O coração vai aonde os olhos voltam com frequência.",
      "Guardar o coração é serviço de portaria: decidir cedo o que não entra, pra não ter que expulsar depois.",
    ],
    question: "Que 'portas pequenas' nós dois precisamos combinar de manter fechadas?",
    prayer: "Senhor, sê o porteiro dos nossos corações. Amém.",
  },
  {
    theme: "gentileza",
    title: "Benignos uns para os outros",
    ref: "Efésios 4:32",
    verse: "Antes, sede uns para com os outros benignos, misericordiosos, perdoando-vos uns aos outros, como também Deus vos perdoou em Cristo.",
    reflection: [
      "É curioso como tratamos visitas com mais gentileza do que quem dorme do nosso lado. A intimidade não pode ser desculpa pra grosseria.",
      "Benignidade é o amor em tom de voz, em 'por favor', em pequenos cuidados sem data comemorativa.",
    ],
    question: "Em que momento do dia a dia meu tom de voz mais te machuca?",
    prayer: "Pai, que a gentileza more aqui. Amém.",
  },
  {
    theme: "provisão",
    title: "O Senhor é o meu pastor",
    ref: "Salmos 23:1",
    verse: "O Senhor é o meu pastor; nada me faltará.",
    reflection: [
      "Davi não disse 'nada me falta' — disse 'nada me faltará'. É confiança lançada no futuro, onde moram as nossas ansiedades de provisão.",
      "Casal que crê na provisão de Deus discute planos, não pânicos.",
    ],
    question: "Qual preocupação de provisão a gente precisa entregar ao Pastor hoje?",
    prayer: "Pastor nosso, cuidamos do rebanho de dois; Tu cuidas de nós. Amém.",
  },
  {
    theme: "unidade",
    title: "Dois andarão juntos?",
    ref: "Amós 3:3",
    verse: "Andarão dois juntos, se não estiverem de acordo?",
    reflection: [
      "Acordo não é pensar igual — é caminhar na mesma direção. Casais podem divergir na rota e ainda assim concordar no destino.",
      "Reservem tempo pra alinhar o destino: onde queremos estar daqui a um ano, juntos?",
    ],
    question: "Se nada mudar, onde estaremos daqui a um ano — e é pra lá que queremos ir?",
    prayer: "Senhor, alinha os nossos passos num só caminho. Amém.",
  },
  {
    theme: "oração",
    title: "Dois concordarem",
    ref: "Mateus 18:19",
    verse: "Se dois de vós concordarem na terra acerca de qualquer coisa que pedirem, isso lhes será feito por meu Pai, que está nos céus.",
    reflection: [
      "Existe uma promessa específica pra oração em dupla — e vocês são a dupla mais disponível um pro outro.",
      "Orar em voz alta pelo cônjuge, na frente dele, é dizer ao mesmo tempo 'eu te amo' e 'eu creio'.",
    ],
    question: "Pelo que você quer que eu ore por você em voz alta agora?",
    prayer: "Pai, aqui estão os dois, concordando diante de Ti. Amém.",
  },
  {
    theme: "recomeço",
    title: "As misericórdias se renovam",
    ref: "Lamentações 3:22-23",
    verse: "As misericórdias do Senhor são a causa de não sermos consumidos, porque as suas misericórdias não têm fim; novas são cada manhã.",
    reflection: [
      "Deus opera com estoque renovado diariamente — ontem não contamina hoje. Casamento precisa dessa mesma contabilidade.",
      "Cada manhã é uma página em branco pro casal: quem escreve nela primeiro, o rancor ou a misericórdia?",
    ],
    question: "O que a gente precisa deixar em 'ontem' pra começar hoje de página limpa?",
    prayer: "Senhor, renova-nos como renovas as manhãs. Amém.",
  },
  {
    theme: "palavras",
    title: "Morte e vida na língua",
    ref: "Provérbios 18:21",
    verse: "A morte e a vida estão no poder da língua; e aquele que a ama comerá do seu fruto.",
    reflection: [
      "Dentro de um casamento, a língua planta todos os dias — e a colheita aparece no clima da casa.",
      "Que fruto suas palavras de hoje vão dar daqui a dez anos? Profecias domésticas se cumprem.",
    ],
    question: "Que frase você quer NUNCA mais ouvir de mim — e qual quer ouvir mais?",
    prayer: "Pai, planta vida na nossa língua. Amém.",
  },
  {
    theme: "confiança",
    title: "Confia de todo o coração",
    ref: "Provérbios 3:5-6",
    verse: "Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento. Reconhece-o em todos os teus caminhos, e ele endireitará as tuas veredas.",
    reflection: [
      "O maior inimigo da confiança em Deus é o nosso próprio entendimento — o plano B que a gente guarda escondido.",
      "Reconhecê-Lo 'em todos os caminhos' inclui os caminhos do casal: carreira, mudanças, filhos, recomeços.",
    ],
    question: "Em qual decisão atual estamos nos estribando só no nosso entendimento?",
    prayer: "Senhor, endireita as veredas que entregamos a Ti. Amém.",
  },
  {
    theme: "alegria",
    title: "Alegrai-vos com a mulher da tua mocidade",
    ref: "Provérbios 5:18",
    verse: "Seja bendito o teu manancial, e alegra-te com a mulher da tua mocidade.",
    reflection: [
      "A Bíblia manda se alegrar no cônjuge — alegria conjugal é obediência, não acaso. Diversão a dois é manutenção da aliança.",
      "Quando foi a última vez que vocês riram juntos até doer? Agenda de casal sem alegria vira sociedade administrativa.",
    ],
    question: "O que a gente fazia junto que nos divertia — e paramos de fazer?",
    prayer: "Pai, devolve-nos o riso a dois. Amém.",
  },
  {
    theme: "hospitalidade",
    title: "Casa aberta",
    ref: "Hebreus 13:2",
    verse: "Não vos esqueçais da hospitalidade, porque, por ela, alguns, não o sabendo, hospedaram anjos.",
    reflection: [
      "Um lar cristão não é fortaleza — é farol. A mesa de vocês pode ser o lugar onde alguém encontra Deus pela primeira vez.",
      "Hospitalidade não exige casa pronta; exige coração aberto e um prato a mais.",
    ],
    question: "Quem a gente poderia convidar pra nossa mesa este mês?",
    prayer: "Senhor, faz da nossa casa um farol. Amém.",
  },
  {
    theme: "esperança",
    title: "Planos de paz",
    ref: "Jeremias 29:11",
    verse: "Porque eu bem sei os pensamentos que penso de vós, diz o Senhor; pensamentos de paz e não de mal, para vos dar o fim que esperais.",
    reflection: [
      "Deus pensa em vocês — e os pensamentos dEle sobre o casal de vocês são de paz, não de desistência.",
      "Nas temporadas difíceis, a esperança não é otimismo: é lembrar Quem escreveu o final.",
    ],
    question: "Qual sonho de casal a gente engavetou e talvez Deus queira reabrir?",
    prayer: "Pai, alinhamos nossos planos aos Teus pensamentos de paz. Amém.",
  },
  {
    theme: "tempo",
    title: "Ensina-nos a contar os dias",
    ref: "Salmos 90:12",
    verse: "Ensina-nos a contar os nossos dias, de tal maneira que alcancemos corações sábios.",
    reflection: [
      "Ninguém termina a vida desejando ter passado mais tempo no celular. Contar os dias é gastá-los de propósito.",
      "O tempo é o único presente que, uma vez dado ao cônjuge, ninguém devolve — por isso vale tanto.",
    ],
    question: "Se esta fosse nossa última semana comum juntos, o que faríamos diferente amanhã?",
    prayer: "Senhor, ensina-nos a contar — e a aproveitar — os nossos dias. Amém.",
  },
  {
    theme: "identidade",
    title: "Nova criatura, novo casal",
    ref: "2 Coríntios 5:17",
    verse: "Assim que, se alguém está em Cristo, nova criatura é: as coisas velhas já passaram; eis que tudo se fez novo.",
    reflection: [
      "Em Cristo, nenhum casal está condenado a repetir a própria história — nem a dos pais, nem a dos erros passados.",
      "'Tudo se fez novo' inclui padrões, vícios de briga e feridas antigas. A aliança de vocês tem direito a um recomeço de fábrica.",
    ],
    question: "Que padrão antigo — nosso ou herdado — queremos declarar 'coisa velha' hoje?",
    prayer: "Cristo, faz novas todas as coisas entre nós. Amém.",
  },
];

const DAY_MS = 86400000;

export function devotionalIndexForDate(date: Date): number {
  const dayOfEpoch = Math.floor(date.getTime() / DAY_MS);
  return dayOfEpoch % COUPLE_DEVOTIONALS.length;
}

export function devotionalForDate(date: Date): CoupleDevotional {
  return COUPLE_DEVOTIONALS[devotionalIndexForDate(date)];
}
