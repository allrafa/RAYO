import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface TermsPageProps {
  onBack: () => void;
}

export function TermsPage({ onBack }: TermsPageProps) {
  const sections = [
    {
      title: "1. Aceitação dos Termos",
      content: `Ao criar uma conta ou utilizar a plataforma RAYO ("plataforma", "serviço"), você declara que leu, entendeu e concorda integralmente com estes Termos de Uso. Caso não concorde, por favor não utilize o serviço.

Estes Termos formam um contrato entre você ("usuário") e a RAYO. Podemos atualizá-los periodicamente; alterações significativas serão comunicadas dentro da plataforma com antecedência razoável.`,
    },
    {
      title: "2. O que é a RAYO",
      content: `A RAYO é uma plataforma digital de conteúdo, comunidade e ferramentas para fortalecer famílias em cinco contextos de vida: Solteiro, Namoro, Noivos, Casados e Pais.

Oferecemos cursos, vídeos, áudios, livros, séries, missões de gamificação, fóruns, mensagens diretas e recursos de acompanhamento pessoal.`,
    },
    {
      title: "3. Cadastro e Conta",
      content: `Para usar a maior parte do serviço você precisa criar uma conta com dados verdadeiros e atualizados, ou entrar com seu Google/Apple.

• Você é responsável por manter suas credenciais em segurança e por toda atividade realizada na sua conta.
• Avise-nos imediatamente em caso de uso não autorizado.
• Cada conta é pessoal e intransferível.
• Reservamos o direito de recusar, suspender ou cancelar contas que violem estes Termos.`,
    },
    {
      title: "4. Idade Mínima",
      content: `O serviço é destinado a maiores de 18 anos. Menores de idade só podem utilizar a plataforma com consentimento e sob supervisão de um responsável legal, conforme exige a LGPD (Art. 14).`,
    },
    {
      title: "5. Conduta do Usuário",
      content: `Ao participar da comunidade (posts, comentários, mensagens diretas, perfis), você concorda em NÃO:

• Publicar conteúdo ilegal, ofensivo, discriminatório, violento, sexualmente explícito ou que viole direitos de terceiros.
• Praticar assédio, bullying, ameaças ou discurso de ódio contra qualquer pessoa.
• Compartilhar spam, golpes, links maliciosos ou conteúdo enganoso.
• Personificar outras pessoas ou criar contas falsas.
• Tentar burlar mecanismos de segurança, moderação ou rate limiting.
• Coletar dados de outros usuários sem consentimento explícito.

Conteúdo que infringir estas regras pode ser ocultado pelos moderadores; contas reincidentes podem ser suspensas ou excluídas sem aviso prévio.`,
    },
    {
      title: "6. Conteúdo do Usuário",
      content: `Você mantém todos os direitos autorais sobre o conteúdo que publica na plataforma (posts, comentários, fotos de perfil, etc.).

Ao publicar, você concede à RAYO uma licença não exclusiva, mundial, gratuita e revogável (mediante exclusão do conteúdo ou da conta) para hospedar, exibir e distribuir esse conteúdo dentro da plataforma, com a finalidade exclusiva de operar o serviço.

Você é integralmente responsável pelo conteúdo que publica e garante que tem todos os direitos necessários para fazê-lo.`,
    },
    {
      title: "7. Conteúdo da RAYO e Propriedade Intelectual",
      content: `Todos os cursos, vídeos, áudios, livros, séries, textos, marca, logotipos, design e código da plataforma são propriedade da RAYO ou licenciados a ela e protegidos pelas leis de propriedade intelectual.

É proibido copiar, redistribuir, revender, fazer engenharia reversa ou criar obras derivadas a partir do conteúdo da RAYO sem autorização expressa por escrito.

A licença de uso é pessoal, limitada, não exclusiva e revogável — restrita ao consumo dentro da plataforma.`,
    },
    {
      title: "8. Planos, Pagamentos e Reembolsos",
      content: `A RAYO oferece conteúdos gratuitos e conteúdos pagos (premium). Quando aplicável:

• Os preços, formas de pagamento e periodicidade serão exibidos de forma clara antes da contratação.
• Assinaturas se renovam automaticamente até que o usuário cancele.
• O cancelamento pode ser feito a qualquer momento dentro da plataforma e passa a valer no fim do ciclo já pago.
• Direito de arrependimento: nos termos do CDC (Art. 49), compras feitas online podem ser canceladas em até 7 dias com reembolso integral, desde que o conteúdo pago não tenha sido substancialmente consumido.`,
    },
    {
      title: "9. Disponibilidade e Modificações do Serviço",
      content: `Trabalhamos para manter o serviço disponível 24/7, mas não garantimos disponibilidade ininterrupta. Podemos realizar manutenções programadas, atualizações ou interrupções por motivos técnicos ou de força maior.

Reservamos o direito de modificar, suspender ou descontinuar funcionalidades a qualquer momento, comunicando os usuários quando a mudança afetar funcionalidades essenciais.`,
    },
    {
      title: "10. Privacidade e Dados Pessoais",
      content: `O tratamento dos seus dados pessoais é regido pela nossa Política de Privacidade, em conformidade com a LGPD (Lei 13.709/2018).

Ao utilizar o serviço, você concorda também com os termos da Política de Privacidade, disponível em /privacy.`,
    },
    {
      title: "11. Limitação de Responsabilidade",
      content: `O conteúdo da plataforma RAYO tem caráter informativo, educacional e de desenvolvimento pessoal. Não substitui orientação profissional individualizada de psicólogos, terapeutas, médicos, advogados ou outros especialistas em situações que demandem acompanhamento técnico.

Na máxima extensão permitida por lei, a RAYO não se responsabiliza por:

• Decisões pessoais tomadas com base no conteúdo da plataforma.
• Conteúdo publicado por outros usuários na comunidade.
• Indisponibilidades temporárias ou perdas decorrentes de força maior.
• Danos indiretos, lucros cessantes ou perda de dados.`,
    },
    {
      title: "12. Encerramento da Conta",
      content: `Você pode encerrar sua conta a qualquer momento na seção "Privacidade e Dados (LGPD)" do seu perfil. O encerramento aplica os critérios de retenção descritos na Política de Privacidade.

Podemos encerrar ou suspender sua conta, com ou sem aviso prévio, em caso de violação destes Termos, fraude, abuso ou determinação judicial.`,
    },
    {
      title: "13. Foro e Lei Aplicável",
      content: `Estes Termos são regidos pelas leis da República Federativa do Brasil. Qualquer controvérsia será dirimida no foro da comarca do consumidor, conforme prevê o Código de Defesa do Consumidor.`,
    },
    {
      title: "14. Contato",
      content: `Dúvidas sobre estes Termos podem ser enviadas para:

• E-mail: contato@rayo.app
• Privacidade e LGPD: privacidade@rayo.app

Última atualização: Maio de 2026.`,
    },
  ];

  return (
    <div className="min-h-screen pb-24 lg:pb-8" style={{ background: "var(--rayo-sand-100)" }}>
      <div className="max-w-3xl mx-auto px-4 lg:px-8 py-6 lg:py-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" style={{ color: "var(--rayo-forest-900)" }} />
          </Button>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" style={{ color: "var(--rayo-terra-500)" }} />
            <h1 className="text-xl lg:text-2xl" style={{ fontWeight: 700, color: "var(--rayo-forest-900)" }}>
              Termos de Uso
            </h1>
          </div>
        </div>

        <Card className="p-5 lg:p-8 border-0 shadow-md mb-6" style={{ background: "var(--rayo-sand-50)" }}>
          <p className="text-sm mb-4" style={{ color: "var(--rayo-ink-700)" }}>
            Bem-vindo à RAYO. Estes Termos de Uso regulam o acesso e o uso da nossa plataforma de
            conteúdo, comunidade e ferramentas para fortalecimento de famílias.
          </p>
          <p className="text-sm" style={{ color: "var(--rayo-ink-700)" }}>
            Leia com atenção. Ao criar uma conta ou continuar usando o serviço, você confirma que
            concorda com estes Termos e com a nossa Política de Privacidade.
          </p>
        </Card>

        <div className="space-y-4">
          {sections.map((section, index) => (
            <Card key={index} className="p-5 lg:p-6 border-0 shadow-sm" style={{ background: "var(--rayo-sand-50)" }}>
              <h2 className="text-base lg:text-lg mb-3" style={{ fontWeight: 600, color: "var(--rayo-forest-900)" }}>
                {section.title}
              </h2>
              <p className="text-sm whitespace-pre-line leading-relaxed" style={{ color: "var(--rayo-ink-700)" }}>
                {section.content}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
