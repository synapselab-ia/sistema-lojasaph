# Observabilidade — logs, correlação e triagem

Data de verificação: 2026-08-18  
Escopo: `REQ-PLAT-006`

## Objetivo

Permitir identificar falhas relevantes do runtime sem expor secrets ou dados sensíveis e sem depender de um fornecedor pago específico.

A arquitetura desta fase é descrita em `ADR-007-observability-contract.md`.

## Estado dos provedores verificado

### Vercel

O projeto conectado `sistema-lojasaph` expõe Runtime Logs e Runtime Errors. As consultas suportam filtro por deployment, ambiente, nível, status, origem, texto e request ID.

Na verificação anterior à implementação não havia runtime errors nem logs de aplicação nas últimas 24 horas. O preview da Fase 17 confirmou que logs JSON emitidos pelo servidor aparecem em Runtime Logs.

A retenção contratual não foi assumida nesta fase. Antes de depender de uma janela histórica específica em produção, confirmar o plano vigente e a documentação atual da Vercel.

### Supabase

O projeto conectado foi verificado como saudável, PostgreSQL 17, organização no plano Free.

Logs de API/Postgres/Auth podem ser consultados pelo Logs Explorer/API. A Fase 17 fez apenas consultas read-only.

Log Drains não são usados: a documentação atual informa disponibilidade somente para planos Pro, Team e Enterprise. Se o plano mudar, reavaliar antes de configurar destino externo.

O changelog de 2026-07-23 anunciou a remoção do endpoint Management API `logs.all` em 2026-09-23 em favor do endpoint unificado `logs`. O Sistema Lojasaph não adicionou integração direta com `logs.all`; qualquer automação futura deve usar a API vigente.

## Contrato de log

Exemplo sintético:

```json
{
  "timestamp": "2026-08-18T19:28:01.569Z",
  "service": "sistema-lojasaph",
  "level": "warn",
  "event": "auth.callback.failed",
  "correlationId": "00000000-0000-4000-8000-000000000000",
  "context": {
    "hasCode": false,
    "hasTokenHash": "[REDACTED]",
    "hasType": false
  },
  "error": {
    "name": "Error",
    "message": "Missing authentication callback parameters"
  }
}
```

Campos opcionais inexistentes não são emitidos.

### Níveis

- `debug`: diagnóstico temporário e de baixo impacto; evitar em fluxo normal de produção.
- `info`: evento operacional esperado que vale rastreabilidade.
- `warn`: falha tratada, degradação ou configuração ausente que não derrubou o request.
- `error`: exceção inesperada capturada pelo runtime/Next.js.

### Eventos atuais

- `runtime.request.error`
- `auth.callback.failed`
- `auth.password_reset.configuration_missing`
- `auth.password_reset.provider_failed`
- `auth.password_update.provider_failed`
- `auth.signout.provider_failed`

Novos eventos devem ser estáveis e orientados ao fato ocorrido, não à mensagem textual da exceção.

## Correlation ID

Header: `x-correlation-id`.

Fluxo:

1. Proxy recebe a request.
2. Se o header de entrada é válido, ele é reaproveitado; caso contrário, gera-se UUID.
3. O header é propagado para o request interno.
4. A response devolve `x-correlation-id`.
5. Logs da aplicação usam o mesmo identificador quando o boundary o disponibiliza.

Redirecionamentos HTTP podem iniciar um novo request e, portanto, receber novo correlation ID. Para exceções server-side do Next, o `digest` continua sendo referência complementar entre fallback e log.

## Redaction obrigatória

Nunca enviar deliberadamente ao logger:

- senha ou confirmação de senha;
- JWT/access token/refresh token/OTP/token hash real;
- `Authorization` ou cookies completos;
- publishable/secret/service-role keys;
- connection strings;
- payload financeiro completo;
- documentos/PII sem necessidade operacional explícita.

A implementação mascara chaves sensíveis e padrões de texto conhecidos, inclusive e-mail, JWT, Bearer token e URL com credenciais. Isso é uma barreira de segurança adicional; o código chamador continua responsável por fornecer apenas contexto mínimo.

`onRequestError` não copia headers e remove query string do path.

## UI e suporte

### Erro inesperado de página

`error.tsx` e `global-error.tsx` mostram mensagem genérica e botão de retry. Não exibem `error.message`.

Quando houver `digest`, orientar o usuário a informar a `Referência` exibida. O operador procura essa referência nos logs server-side do mesmo período.

### Erro operacional esperado

`DomainError` de regra de negócio pode manter mensagem segura e específica.

Erros de persistência/Supabase e erros desconhecidos são convertidos para:

> Não foi possível concluir a operação. Tente novamente.

Detalhes técnicos permanecem fora da UI.

## Triagem na Vercel

1. Identificar horário, rota e ambiente (`preview` ou `production`).
2. Se disponível, obter `x-correlation-id`, `digest` ou request ID.
3. Consultar Runtime Errors para exceções não tratadas.
4. Consultar Runtime Logs filtrando por:
   - deployment/ambiente;
   - `event`;
   - correlation/request ID;
   - rota e faixa curta de horário.
5. Confirmar que o log não contém dados sensíveis antes de copiar para Issue/PR.
6. Relacionar o evento à versão/deployment antes de corrigir código.

Não copiar logs brutos com dados de cliente para GitHub.

## Triagem no Supabase

Usar Logs Explorer/API em modo read-only para investigar falhas de Postgres, Auth ou Data API quando a aplicação indicar erro de provedor.

1. Restringir janela de horário.
2. Selecionar serviço relevante.
3. Correlacionar por rota/RPC, código de erro e horário.
4. Não assumir que o `correlationId` do Next estará presente em chamadas Supabase feitas diretamente pelo browser.
5. Não alterar schema/RLS para investigar um log sem requisito/migration versionada.

## Smoke test seguro em preview

Nunca usar token real para validar logging.

Procedimento validado na Fase 17:

1. abrir o preview em `/auth/callback` sem `code` e sem `token_hash`;
2. confirmar que a aplicação redireciona para login com mensagem genérica;
3. confirmar presença de `x-correlation-id` na response;
4. buscar `auth.callback.failed` em Runtime Logs do deployment;
5. confirmar JSON estruturado e ausência de secrets/PII.

Este cenário é deliberadamente inválido e não cria sessão nem altera dados.

## Limitações conscientes

- não há vendor dedicado de browser error tracking nesta fase;
- erros puramente client-side podem não aparecer nos Runtime Logs da Vercel se não tiverem contraparte server-side;
- chamadas Supabase feitas no browser não recebem automaticamente a correlação do logger server-side;
- retenção, SLA/SLO, alertas e on-call continuam pendentes;
- Log Drains do Supabase não estão disponíveis no plano atual;
- esta fundação não substitui auditoria de negócio já existente no banco.

## Critério para evolução

Considerar Sentry, OpenTelemetry exportado, Log Drain ou outro destino somente quando houver necessidade concreta de telemetria client-side, tracing entre serviços, retenção maior, alertas ou compliance. A adoção deve preservar o contrato atual e a política de redaction.