// Palavra do dia (ENGAGEMENT_PLAN.md E1) — curadoria de versículos na
// tradução Almeida Revista e Corrigida (domínio público no Brasil),
// organizados pelos temas do público RAYO: casamento, família, filhos,
// fé, constância, amor, sabedoria, paz e propósito.
//
// A rotação é DETERMINÍSTICA e GLOBAL (mesmo versículo para todos no
// mesmo dia) — é isso que dá sentido ao contador comunitário de améns.

export interface DailyVerse {
  ref: string;
  text: string;
  theme: string;
}

export const DAILY_VERSES: DailyVerse[] = [
  { ref: "Josué 24:15", theme: "família", text: "Eu e a minha casa serviremos ao Senhor." },
  { ref: "Salmos 127:1", theme: "família", text: "Se o Senhor não edificar a casa, em vão trabalham os que a edificam." },
  { ref: "Provérbios 22:6", theme: "filhos", text: "Instrui o menino no caminho em que deve andar, e, até quando envelhecer, não se desviará dele." },
  { ref: "Salmos 127:3", theme: "filhos", text: "Eis que os filhos são herança do Senhor, e o fruto do ventre, o seu galardão." },
  { ref: "1 Coríntios 13:4", theme: "amor", text: "O amor é sofredor, é benigno; o amor não é invejoso; o amor não trata com leviandade, não se ensoberbece." },
  { ref: "1 Coríntios 13:7", theme: "amor", text: "O amor tudo sofre, tudo crê, tudo espera, tudo suporta." },
  { ref: "Eclesiastes 4:9", theme: "casamento", text: "Melhor é serem dois do que um, porque têm melhor paga do seu trabalho." },
  { ref: "Eclesiastes 4:12", theme: "casamento", text: "E, se alguém prevalecer contra um, os dois lhe resistirão; e o cordão de três dobras não se quebra tão depressa." },
  { ref: "Gênesis 2:24", theme: "casamento", text: "Portanto, deixará o varão o seu pai e a sua mãe e apegar-se-á à sua mulher, e serão ambos uma carne." },
  { ref: "Colossenses 3:14", theme: "amor", text: "E, sobre tudo isso, revesti-vos de amor, que é o vínculo da perfeição." },
  { ref: "Filipenses 4:6", theme: "paz", text: "Não estejais inquietos por coisa alguma; antes, as vossas petições sejam em tudo conhecidas diante de Deus, pela oração e súplicas, com ação de graças." },
  { ref: "Filipenses 4:7", theme: "paz", text: "E a paz de Deus, que excede todo o entendimento, guardará os vossos corações e os vossos sentimentos em Cristo Jesus." },
  { ref: "Filipenses 4:13", theme: "fé", text: "Posso todas as coisas naquele que me fortalece." },
  { ref: "Provérbios 3:5", theme: "fé", text: "Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento." },
  { ref: "Provérbios 3:6", theme: "propósito", text: "Reconhece-o em todos os teus caminhos, e ele endireitará as tuas veredas." },
  { ref: "Salmos 37:5", theme: "fé", text: "Entrega o teu caminho ao Senhor; confia nele, e ele o fará." },
  { ref: "Isaías 41:10", theme: "fé", text: "Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus; eu te esforço, e te ajudo, e te sustento com a destra da minha justiça." },
  { ref: "Salmos 23:1", theme: "fé", text: "O Senhor é o meu pastor; nada me faltará." },
  { ref: "Josué 1:9", theme: "coragem", text: "Esforça-te e tem bom ânimo; não pasmes, nem te espantes, porque o Senhor, teu Deus, é contigo por onde quer que andares." },
  { ref: "Mateus 6:33", theme: "propósito", text: "Mas buscai primeiro o Reino de Deus, e a sua justiça, e todas essas coisas vos serão acrescentadas." },
  { ref: "Salmos 46:1", theme: "paz", text: "Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia." },
  { ref: "Lamentações 3:22-23", theme: "constância", text: "As misericórdias do Senhor são a causa de não sermos consumidos; porque as suas misericórdias não têm fim; novas são cada manhã." },
  { ref: "Salmos 118:24", theme: "gratidão", text: "Este é o dia que fez o Senhor; regozijemo-nos e alegremo-nos nele." },
  { ref: "1 Tessalonicenses 5:18", theme: "gratidão", text: "Em tudo dai graças, porque esta é a vontade de Deus em Cristo Jesus para convosco." },
  { ref: "Provérbios 17:22", theme: "alegria", text: "O coração alegre serve de bom remédio, mas o espírito abatido virá a secar os ossos." },
  { ref: "Salmos 119:105", theme: "sabedoria", text: "Lâmpada para os meus pés é a tua palavra e luz, para o meu caminho." },
  { ref: "Tiago 1:5", theme: "sabedoria", text: "E, se algum de vós tem falta de sabedoria, peça-a a Deus, que a todos dá liberalmente e não o lança em rosto; e ser-lhe-á dada." },
  { ref: "Provérbios 15:1", theme: "relacionamento", text: "A resposta branda desvia o furor, mas a palavra dura suscita a ira." },
  { ref: "Efésios 4:32", theme: "relacionamento", text: "Antes, sede uns para com os outros benignos, misericordiosos, perdoando-vos uns aos outros, como também Deus vos perdoou em Cristo." },
  { ref: "Efésios 4:26", theme: "relacionamento", text: "Irai-vos e não pequeis; não se ponha o sol sobre a vossa ira." },
  { ref: "Romanos 12:12", theme: "constância", text: "Alegrai-vos na esperança, sede pacientes na tribulação, perseverai na oração." },
  { ref: "Gálatas 6:9", theme: "constância", text: "E não nos cansemos de fazer o bem, porque a seu tempo ceifaremos, se não houvermos desfalecido." },
  { ref: "Salmos 121:1-2", theme: "fé", text: "Elevo os meus olhos para os montes: de onde me virá o socorro? O meu socorro vem do Senhor, que fez o céu e a terra." },
  { ref: "Mateus 11:28", theme: "descanso", text: "Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei." },
  { ref: "Salmos 34:8", theme: "intimidade", text: "Provai e vede que o Senhor é bom; bem-aventurado o homem que nele confia." },
  { ref: "Jeremias 29:11", theme: "propósito", text: "Porque eu bem sei os pensamentos que penso de vós, diz o Senhor; pensamentos de paz e não de mal, para vos dar o fim que esperais." },
  { ref: "Salmos 90:12", theme: "sabedoria", text: "Ensina-nos a contar os nossos dias, de tal maneira que alcancemos coração sábio." },
  { ref: "Provérbios 16:3", theme: "propósito", text: "Confia ao Senhor as tuas obras, e teus pensamentos serão estabelecidos." },
  { ref: "Deuteronômio 6:6-7", theme: "filhos", text: "E estas palavras que hoje te ordeno estarão no teu coração; e as intimarás a teus filhos e delas falarás assentado em tua casa." },
  { ref: "Provérbios 29:17", theme: "filhos", text: "Castiga o teu filho, e te fará descansar e dará delícias à tua alma." },
  { ref: "Colossenses 3:13", theme: "relacionamento", text: "Suportando-vos uns aos outros e perdoando-vos uns aos outros, se algum tiver queixa contra outro; assim como Cristo vos perdoou, assim fazei vós também." },
  { ref: "1 Pedro 4:8", theme: "amor", text: "Mas, sobretudo, tende ardente amor uns para com os outros, porque o amor cobrirá a multidão de pecados." },
  { ref: "Salmos 133:1", theme: "família", text: "Oh! Quão bom e quão suave é que os irmãos vivam em união!" },
  { ref: "Romanos 8:28", theme: "fé", text: "E sabemos que todas as coisas contribuem juntamente para o bem daqueles que amam a Deus, daqueles que são chamados por seu decreto." },
  { ref: "Salmos 55:22", theme: "descanso", text: "Lança o teu cuidado sobre o Senhor, e ele te susterá; nunca permitirá que o justo seja abalado." },
  { ref: "Isaías 40:31", theme: "constância", text: "Mas os que esperam no Senhor renovarão as suas forças e subirão com asas como águias; correrão e não se cansarão; caminharão e não se fatigarão." },
  { ref: "Provérbios 31:10", theme: "casamento", text: "Mulher virtuosa, quem a achará? O seu valor muito excede o de rubins." },
  { ref: "Salmos 128:1-2", theme: "família", text: "Bem-aventurado aquele que teme ao Senhor e anda nos seus caminhos! Pois comerás do trabalho das tuas mãos; feliz serás, e te irá bem." },
  { ref: "João 15:5", theme: "intimidade", text: "Eu sou a videira, vós, as varas; quem está em mim, e eu nele, este dá muito fruto, porque sem mim nada podereis fazer." },
  { ref: "Salmos 62:1", theme: "descanso", text: "A minha alma espera somente em Deus; dele vem a minha salvação." },
  { ref: "Mateus 5:9", theme: "paz", text: "Bem-aventurados os pacificadores, porque eles serão chamados filhos de Deus." },
  { ref: "Provérbios 18:22", theme: "casamento", text: "O que acha uma mulher acha uma coisa boa e alcançou a benevolência do Senhor." },
  { ref: "Salmos 103:2", theme: "gratidão", text: "Bendize, ó minha alma, ao Senhor, e não te esqueças de nenhum de seus benefícios." },
  { ref: "2 Timóteo 1:7", theme: "coragem", text: "Porque Deus não nos deu o espírito de temor, mas de fortaleza, e de amor, e de moderação." },
  { ref: "Salmos 27:1", theme: "coragem", text: "O Senhor é a minha luz e a minha salvação; a quem temerei? O Senhor é a força da minha vida; de quem me recearei?" },
  { ref: "Hebreus 11:1", theme: "fé", text: "Ora, a fé é o firme fundamento das coisas que se esperam e a prova das coisas que se não veem." },
  { ref: "Salmos 37:4", theme: "intimidade", text: "Deleita-te também no Senhor, e ele te concederá o que deseja o teu coração." },
  { ref: "Miqueias 6:8", theme: "propósito", text: "Ele te declarou, ó homem, o que é bom; e que é o que o Senhor pede de ti, senão que pratiques a justiça, e ames a beneficência, e andes humildemente com o teu Deus?" },
  { ref: "Salmos 19:14", theme: "intimidade", text: "Sejam agradáveis as palavras da minha boca e a meditação do meu coração perante a tua face, Senhor, Rocha minha e Redentor meu!" },
  { ref: "João 13:34", theme: "amor", text: "Um novo mandamento vos dou: Que vos ameis uns aos outros; como eu vos amei a vós, que também vós uns aos outros vos ameis." },
];

// Índice determinístico global: dias desde a época, módulo o tamanho da
// lista. Mesmo versículo pra todo mundo no mesmo dia (fuso do servidor).
export function verseIndexForDate(date: Date): number {
  const dayOfEpoch = Math.floor(date.getTime() / 86_400_000);
  return ((dayOfEpoch % DAILY_VERSES.length) + DAILY_VERSES.length) % DAILY_VERSES.length;
}

export function verseForDate(date: Date): DailyVerse {
  return DAILY_VERSES[verseIndexForDate(date)];
}
