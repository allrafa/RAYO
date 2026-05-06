# RAIO — Credenciais de Acesso

> ⚠️ **Arquivo sensível.** Mantenha-o privado. Não faça commit em repositórios públicos. Sempre que possível, troque a senha após o primeiro login pela tela "Esqueci minha senha".

## Conta única (admin)

| Campo | Valor |
|---|---|
| **E-mail** | `allrafaimc@gmail.com` |
| **Senha** | `Raio@Admin#2026` |
| **Papel** | `admin` (acesso total: CMS, moderação, métricas, gestão de usuários) |
| **Nome exibido** | Rafael (Admin) |

## Como entrar

1. Abra a plataforma no preview (ou no domínio publicado).
2. Na tela de boas-vindas, clique em **"Começar agora"** e siga até a tela de login.
3. Selecione **"Já tenho conta"** / **"Entrar"**.
4. Use o e-mail e a senha acima.

## Operações administrativas que essa conta pode fazer

- Criar, editar e publicar conteúdo no CMS (áudios, vídeos, reels, séries, cursos, livros).
- Promover/rebaixar usuários (`client` ↔ `producer` ↔ `moderator` ↔ `admin`).
- Esconder e restaurar posts/comentários (soft delete).
- Curar o Home Feed.
- Visualizar métricas de plataforma.

## Trocar a senha depois

Use a rota **"Esqueci minha senha"** na tela de login — o RAIO envia um link via Resend para o e-mail cadastrado.

## Limpeza de banco realizada nesta sessão

Todas as outras contas (testes, contas descartáveis de DM, contas de teste com papéis admin/moderator/producer) foram **removidas**. Restou apenas a conta acima. As tabelas relacionadas (posts, comentários, conversas, sessões etc.) caíram em cascata via FK.
