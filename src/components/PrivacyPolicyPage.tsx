import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface PrivacyPolicyPageProps {
  onBack: () => void;
}

export function PrivacyPolicyPage({ onBack }: PrivacyPolicyPageProps) {
  const sections = [
    {
      title: "1. Informações que Coletamos",
      content: `Coletamos as seguintes informações quando você utiliza a plataforma RAIO:

• Dados de cadastro: nome, endereço de e-mail e senha (armazenada de forma criptografada).
• Dados de perfil: contexto de vida (solteiro, namoro, casados, pais), interesses, objetivos e preferências de conteúdo.
• Dados de uso: progresso em cursos, aulas assistidas, missões completadas, XP acumulado e participação na comunidade.
• Dados de sessão: endereço IP e informações do navegador, utilizados exclusivamente para segurança da autenticação.`,
    },
    {
      title: "2. Como Utilizamos seus Dados",
      content: `Utilizamos seus dados pessoais para:

• Fornecer e personalizar a experiência na plataforma, incluindo recomendações de cursos e conteúdos.
• Gerenciar seu progresso educacional e sistema de gamificação (níveis, badges, missões).
• Permitir sua participação na comunidade (posts, comentários, curtidas).
• Garantir a segurança da sua conta e prevenir acessos não autorizados.
• Realizar análises internas para melhorar nossos serviços (quando autorizado via cookies de análise).`,
    },
    {
      title: "3. Base Legal para o Tratamento (LGPD)",
      content: `O tratamento dos seus dados pessoais é realizado com base nas seguintes hipóteses legais previstas na Lei Geral de Proteção de Dados (Lei 13.709/2018):

• Consentimento: para cookies de análise e comunicações opcionais (Art. 7°, I).
• Execução de contrato: para fornecer os serviços da plataforma que você contratou (Art. 7°, V).
• Legítimo interesse: para segurança, prevenção de fraudes e melhoria dos serviços (Art. 7°, IX).`,
    },
    {
      title: "4. Compartilhamento de Dados",
      content: `Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins comerciais.

Seus dados podem ser compartilhados apenas:
• Com provedores de serviço essenciais ao funcionamento da plataforma (hospedagem, banco de dados).
• Quando exigido por lei ou ordem judicial.
• Para proteger nossos direitos legais em caso de disputa.`,
    },
    {
      title: "5. Segurança dos Dados",
      content: `Implementamos medidas técnicas e organizacionais para proteger seus dados:

• Senhas armazenadas com hash bcrypt (12 rounds).
• Sessões com tokens criptograficamente seguros e expiração automática.
• Comunicação via HTTPS/TLS.
• Consultas parametrizadas para prevenção de SQL injection.
• Rate limiting para proteção contra ataques de força bruta.`,
    },
    {
      title: "6. Seus Direitos (LGPD Art. 18)",
      content: `Você tem os seguintes direitos em relação aos seus dados pessoais:

• Acesso: solicitar uma cópia de todos os dados que mantemos sobre você.
• Correção: atualizar ou corrigir dados incorretos no seu perfil.
• Eliminação: solicitar a exclusão dos seus dados pessoais (direito ao esquecimento).
• Portabilidade: exportar seus dados em formato estruturado (JSON).
• Revogação do consentimento: alterar suas preferências de cookies a qualquer momento.

Para exercer esses direitos, acesse as opções "Exportar meus dados" e "Excluir minha conta" nas configurações do seu perfil.`,
    },
    {
      title: "7. Cookies e Tecnologias Similares",
      content: `Utilizamos os seguintes tipos de cookies:

• Cookies necessários: essenciais para autenticação e funcionamento da plataforma. Não podem ser desativados.
• Cookies de análise (opcionais): nos ajudam a entender como a plataforma é utilizada para melhorar a experiência. Requerem seu consentimento.

Você pode gerenciar suas preferências de cookies através do banner de consentimento ou nas configurações do perfil.`,
    },
    {
      title: "8. Retenção de Dados",
      content: `Mantemos seus dados pessoais enquanto sua conta estiver ativa. Após a exclusão da conta:

• Dados pessoais identificáveis (nome, e-mail) são anonimizados imediatamente.
• Posts e comentários são marcados como "[conteúdo removido por solicitação LGPD]".
• Dados analíticos anonimizados podem ser retidos para fins estatísticos.
• Registros de solicitações LGPD são mantidos para fins de auditoria e conformidade.`,
    },
    {
      title: "9. Contato e Encarregado de Dados (DPO)",
      content: `Para questões sobre privacidade e proteção de dados, entre em contato:

• E-mail: privacidade@raio.app
• Encarregado de Dados (DPO): dpo@raio.app

Você também pode registrar reclamações junto à Autoridade Nacional de Proteção de Dados (ANPD) através do site www.gov.br/anpd.`,
    },
    {
      title: "10. Atualizações desta Política",
      content: `Esta política pode ser atualizada periodicamente. Mudanças significativas serão comunicadas por meio da plataforma. A data da última atualização está indicada abaixo.

Última atualização: Abril de 2026.`,
    },
  ];

  return (
    <div className="min-h-screen pb-24 lg:pb-8" style={{ background: "var(--raio-bg-primary)" }}>
      <div className="max-w-3xl mx-auto px-4 lg:px-8 py-6 lg:py-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" style={{ color: "var(--raio-text-primary)" }} />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: "var(--raio-accent-primary)" }} />
            <h1 className="text-xl lg:text-2xl" style={{ fontWeight: 700, color: "var(--raio-text-primary)" }}>
              Política de Privacidade
            </h1>
          </div>
        </div>

        <Card className="p-5 lg:p-8 border-0 shadow-md mb-6" style={{ background: "var(--raio-bg-secondary)" }}>
          <p className="text-sm mb-4" style={{ color: "var(--raio-text-secondary)" }}>
            A RAIO ("nós", "nosso") valoriza a privacidade dos seus usuários. Esta Política de Privacidade
            descreve como coletamos, usamos, armazenamos e protegemos seus dados pessoais, em conformidade
            com a Lei Geral de Proteção de Dados Pessoais (LGPD — Lei 13.709/2018).
          </p>
          <p className="text-sm" style={{ color: "var(--raio-text-secondary)" }}>
            Ao utilizar a plataforma RAIO, você concorda com as práticas descritas nesta política.
          </p>
        </Card>

        <div className="space-y-4">
          {sections.map((section, index) => (
            <Card key={index} className="p-5 lg:p-6 border-0 shadow-sm" style={{ background: "var(--raio-bg-secondary)" }}>
              <h2 className="text-base lg:text-lg mb-3" style={{ fontWeight: 600, color: "var(--raio-text-primary)" }}>
                {section.title}
              </h2>
              <p className="text-sm whitespace-pre-line leading-relaxed" style={{ color: "var(--raio-text-secondary)" }}>
                {section.content}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
