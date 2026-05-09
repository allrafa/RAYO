import { PublicLayout } from "./PublicLayout";
import { useSeoMeta } from "./useSeoMeta";

export function ExcluirDadosPage() {
  useSeoMeta({
    title: "Exclusão de dados · RAYO",
    description:
      "Como excluir sua conta e todos os dados pessoais associados ao RAYO, em conformidade com a LGPD e com as exigências de Login do Facebook e do Google.",
    canonical: "https://rayo.app.br/excluir-dados",
  });

  return (
    <PublicLayout active={null}>
      <section className="hero">
        <div className="wrap">
          <span className="hero-eyebrow">Privacidade · LGPD</span>
          <h1 className="hero-title">
            Exclusão <span className="light">de dados.</span>
          </h1>
          <p className="hero-lede">
            Você é dono dos seus dados. Aqui está exatamente como apagar sua conta no RAYO
            e todos os dados pessoais que mantemos sobre você — sem burocracia.
          </p>
        </div>
      </section>

      <section className="main">
        <div className="wrap">
          <div className="legal-content">
            <h2>1. Pelo próprio app (recomendado)</h2>
            <p>
              É o caminho mais rápido. Em até alguns segundos sua conta fica desativada
              e a exclusão definitiva acontece em até 30 dias.
            </p>
            <ol>
              <li>
                Acesse <a href="https://rayo.app.br">rayo.app.br</a> e faça login com a
                conta que você quer apagar (e-mail/senha, Google ou Facebook).
              </li>
              <li>Toque em <strong>Perfil</strong> no menu inferior.</li>
              <li>Abra <strong>Configurações</strong> → <strong>Privacidade · LGPD</strong>.</li>
              <li>
                Toque em <strong>Excluir minha conta</strong> e confirme com sua senha.
              </li>
            </ol>

            <h2>2. Por e-mail (caso não consiga logar)</h2>
            <p>
              Perdeu o acesso à conta, esqueceu a senha ou fez login social com um e-mail
              que não tem mais? Escreva para o nosso encarregado de dados:
            </p>
            <p>
              <strong>dpo@rayo.app.br</strong> — assunto: <em>Exclusão de conta</em>.
            </p>
            <p>Inclua, se possível:</p>
            <ul>
              <li>O e-mail (ou Facebook/Google) usado para criar a conta;</li>
              <li>Seu nome de exibição no RAYO;</li>
              <li>Confirmação de que você é o titular da conta.</li>
            </ul>
            <p>
              Por segurança, podemos pedir uma verificação adicional antes de apagar a
              conta. Respondemos em até <strong>5 dias úteis</strong> e concluímos a
              exclusão em até <strong>30 dias corridos</strong>.
            </p>

            <h2>3. O que é apagado</h2>
            <ul>
              <li>Seus dados de cadastro (nome, e-mail, foto, telefone, segmentos);</li>
              <li>Seu histórico de progresso, conquistas, XP, badges e missões;</li>
              <li>Suas mensagens diretas (ambos os lados deixam de ver o conteúdo);</li>
              <li>Suas inscrições em comunidades, seguidores e curtidas;</li>
              <li>Todos os tokens de login social (Google/Facebook).</li>
            </ul>

            <h2>4. O que pode permanecer</h2>
            <p>
              Algumas informações podem ser retidas em forma anonimizada ou pelo prazo
              estritamente exigido por lei (por exemplo, registros fiscais de compras
              ou logs de segurança). Detalhes completos estão na nossa{" "}
              <a href="/privacy">Política de Privacidade</a>.
            </p>
            <p>
              Posts e comentários públicos que você fez na Comunidade podem ser
              anonimizados (autor exibido como “Usuário removido”) em vez de excluídos,
              para preservar o contexto de respostas de outras pessoas. Se você quiser a
              remoção integral desses conteúdos também, escreva para{" "}
              <strong>dpo@rayo.app.br</strong> indicando os links.
            </p>

            <h2>5. Login com Google ou Facebook</h2>
            <p>
              Se você criou sua conta usando “Continuar com Google” ou “Continuar com
              Facebook”, a exclusão acima também revoga o vínculo do RAYO com o seu
              perfil nessas redes — você não precisa fazer nada lá.
            </p>
            <p>
              Você também pode revogar o acesso do RAYO a qualquer momento direto no
              provedor:
            </p>
            <ul>
              <li>
                Google:{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  myaccount.google.com/permissions
                </a>
              </li>
              <li>
                Facebook:{" "}
                <a
                  href="https://www.facebook.com/settings?tab=applications"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  facebook.com/settings → Apps e sites
                </a>
              </li>
            </ul>
            <p>
              Revogar o acesso no provedor <em>não</em> apaga sua conta no RAYO — só
              impede futuros logins por aquela rede. Para apagar de fato, siga o passo 1
              ou 2 acima.
            </p>

            <h2>6. Dúvidas</h2>
            <p>
              Para qualquer dúvida sobre esta página ou sobre como tratamos seus dados,
              fale com a gente em <strong>dpo@rayo.app.br</strong> ou pelo nosso{" "}
              <a href="/contato">formulário de contato</a>.
            </p>
            <p className="legal-updated">Última atualização: maio de 2026.</p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
