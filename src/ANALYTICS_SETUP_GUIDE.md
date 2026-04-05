# 📊 Guia Rápido - Configuração de Analytics

## ✅ Status: Analytics Funcionando em Modo Demo

O sistema de analytics está **totalmente implementado** e funcionando em **modo demo**. Todos os eventos são logados no console para desenvolvimento.

Para ativar o tracking real com Mixpanel:

---

## 🚀 Setup em 3 Passos

### 1️⃣ Criar Conta Mixpanel (Gratuito)

1. Acesse: https://mixpanel.com/register/
2. Crie conta gratuita (10M eventos/mês free)
3. Crie um novo projeto: "RAIO - Development"
4. Copie o **Project Token**

### 2️⃣ Configurar Variáveis de Ambiente

Edite o arquivo `.env` na raiz do projeto:

```bash
# Analytics
VITE_MIXPANEL_TOKEN=seu_token_aqui_123abc
VITE_ANALYTICS_ENABLED=true
```

### 3️⃣ Reiniciar o Servidor

```bash
npm run dev
```

Pronto! 🎉 Os eventos agora estão sendo enviados para o Mixpanel.

---

## 📊 Verificar se Está Funcionando

### No Console do Browser:

```
📊 Analytics Event: APP_OPENED { ... }
👤 User identified: user_123
```

### No Mixpanel Dashboard:

1. Acesse: https://mixpanel.com/
2. Vá em **Events** → Você verá eventos chegando em tempo real
3. Vá em **Users** → Você verá perfis de usuários

---

## 🎯 Eventos Disponíveis

### Autenticação
- `AUTH_SIGNUP_STARTED`
- `AUTH_SIGNUP_COMPLETED`
- `AUTH_LOGIN_SUCCESS`

### Onboarding
- `ONBOARDING_STARTED`
- `ONBOARDING_STEP_COMPLETED`
- `ONBOARDING_COMPLETED`

### Academia
- `ACADEMIA_COURSE_ENROLLED`
- `ACADEMIA_LESSON_COMPLETED`
- `ACADEMIA_BOOK_READING_STARTED`

### Conselheiro IA
- `AI_CONVERSATION_STARTED`
- `AI_MESSAGE_SENT`

### Comunidade
- `COMMUNITY_POST_CREATED`
- `COMMUNITY_POST_LIKED`

### Gamificação
- `GAMIFICATION_LEVEL_UP`
- `GAMIFICATION_BADGE_EARNED`

### Monetização
- `PAYWALL_VIEWED`
- `PREMIUM_CHECKOUT_COMPLETED`

**Ver taxonomia completa:** `/lib/analytics/mixpanel.ts`

---

## 💻 Como Usar no Código

### Importar:
```typescript
import { analytics } from './lib/analytics/mixpanel';
```

### Track Evento Simples:
```typescript
analytics.trackCourseEnrolled(
  courseId: 1,
  courseTitle: "Comunicação no Casamento",
  isPremium: true,
  price: 49
);
```

### React Hook:
```typescript
import { usePageView } from './hooks/useAnalytics';

function MyPage() {
  usePageView('MyPage');
  // Automaticamente envia SCREEN_VIEWED
  
  return <div>...</div>;
}
```

### Track com Dados Customizados:
```typescript
analytics.track('CUSTOM_EVENT', {
  custom_property: 'value',
  another_property: 123,
});
```

---

## 🔐 LGPD Compliance

O sistema respeita automaticamente:
- ✅ Consentimento do usuário (via ConsentBanner)
- ✅ Do Not Track do browser
- ✅ Opt-out a qualquer momento
- ✅ Não coleta IP

### Como Funciona:

1. **Primeiro acesso:** Banner de consentimento aparece
2. **Usuário aceita Analytics:** Mixpanel ativado
3. **Usuário rejeita:** Apenas eventos essenciais (localStorage)
4. **Usuário muda ideia:** Pode alterar em Configurações → Privacidade

---

## 📈 Dashboards Recomendados

### Criar no Mixpanel:

**1. Executive Dashboard**
- WAPM (North Star Metric)
- MAU
- MRR
- Churn Rate

**2. Product Dashboard**
- DAU/MAU Ratio
- Session Length
- Course Completion Rate
- Book Completion Rate

**3. Growth Dashboard**
- Sign-up Funnel
- Onboarding Completion
- Premium Conversion
- Retention Cohorts

**Tutorial:** https://help.mixpanel.com/hc/en-us/articles/360035055471-Dashboards

---

## 🐛 Troubleshooting

### "Eventos não aparecem no Mixpanel"

**1. Verifique o token:**
```bash
# No console do browser:
console.log(import.meta.env.VITE_MIXPANEL_TOKEN)
# Deve mostrar seu token
```

**2. Verifique consentimento:**
```bash
# No console do browser:
localStorage.getItem('raio_consent_preferences')
# Deve mostrar: {"analytics": true, ...}
```

**3. Verifique eventos no console:**
- Abra DevTools → Console
- Procure por: `📊 Analytics Event:`
- Se aparecer = código funcionando, problema é no Mixpanel
- Se não aparecer = problema no código

**4. Network Tab:**
- Abra DevTools → Network
- Filtre por "mixpanel"
- Deve ver requests para `api.mixpanel.com`

### "TypeError: Cannot read properties of undefined"

**Solução:** Arquivo `.env` não está sendo lido.

```bash
# 1. Verifique se existe:
ls -la .env

# 2. Se não existir, crie:
cp .env.example .env

# 3. Reinicie o servidor:
npm run dev
```

### "Analytics em modo demo"

**Isso é normal!** Significa que não há token configurado.

Para ativar:
1. Configure `VITE_MIXPANEL_TOKEN` no `.env`
2. Reinicie `npm run dev`

---

## 🎓 Recursos

- **Mixpanel Docs:** https://developer.mixpanel.com/docs
- **Taxonomia RAIO:** Ver `/lib/analytics/mixpanel.ts`
- **Métricas RAIO:** Ver `/METRICS_DICTIONARY.md`
- **Dashboard Sprint 1:** Ver `/SPRINT_1_PROGRESS.md`

---

## 🆘 Suporte

**Precisa de ajuda?**

1. Verifique este guia primeiro
2. Consulte `/SPRINT_1_ANALISE_DETALHADA.md`
3. Verifique console do browser (erros em vermelho)
4. Entre em contato com o time de produto

---

## ✅ Checklist de Verificação

Antes de considerar analytics "configurado":

- [ ] Conta Mixpanel criada
- [ ] Token adicionado no `.env`
- [ ] Servidor reiniciado
- [ ] Eventos aparecem no console
- [ ] Eventos aparecem no Mixpanel (pode levar 1-2 min)
- [ ] ConsentBanner funcionando
- [ ] Usuário pode opt-in/opt-out

---

**Atualizado:** Janeiro 2025  
**Versão:** 1.0  
**Status:** ✅ Pronto para uso
