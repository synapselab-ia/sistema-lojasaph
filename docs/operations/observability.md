# Observabilidade — logs, correlação e triagem

Data de verificação: 2026-08-20  
Escopo: `REQ-PLAT-006`

## Objetivo

Permitir identificar falhas relevantes do runtime sem expor secrets ou dados sensíveis e sem depender de um fornecedor pago específico.

A arquitetura desta fase é descrita em `ADR-007-observability-contract.md`. A revalidação detalhada de 2026-08-20 está em `docs/qa/observability.md`.

## Estado dos provedores verificado

### Vercel

O projeto conectado `sistema-lojasaph` expõe Runtime Logs e Runtime Errors. As consultas suportam filtro por deployment, ambiente, nível, status, origem, texto e request ID.

A auditoria de 2026-08-20 comprovou o contrato em dados reais de runtime: um erro histórico de `/workspace` foi capturado como `runtime.request.error` com `correlationId`, rota e `digest`. O erro funcional pertencia a deployment anterior e a correção de serialização Server → Client já está em deployments posteriores.

O latest Production deployment consultado na auditoria estava `READY`. Na janela recente disponível foram observadas respostas `200` em `/workspace` e módulos operacionais, sem novo `error`/`warning` retornado para esse deployment.

A retenção do plano atual é curta. Uma consulta de sete dias foi rejeitada como além da janela disponível, enquanto a consulta da última hora funcionou. Portanto o sistema não promete investigação histórica por Runtime Logs além da retenção efetivamente disponível no plano vigente.

Não habilitar Observability Plus, Drain ou outro destino pago apenas para ampliar retenção sem requisito operacional aprovado.

### Supabase

O projeto conectado foi revalidado como `ACTIVE_HEALTHY`, região `sa-east-1`, PostgreSQL `17.6.1.141`.

Logs de API/Postgres/Auth podem ser consultados pelo Logs Explorer/API. A auditoria de 2026-08-20 usou apenas leitura e confirmou tráfego operacional atual, status HTTP/RPC e request IDs do provedor.

Os logs nativos do Supabase podem conter PII e metadados próprios do provedor, como IP, referer, UUIDs e identidade Auth. Não copiar logs brutos para Issue/PR; registrar somente a evidência mínima necessária.

Log Drains não são usados: a documentação atual informa disponibilidade somente para planos Pro, Team e Enterprise. A organização conectada permanece no plano Free. Se o plano ou o requisito de retenção mudar, reavaliar antes de configurar destino externo.

O changelog de 2026-07-23 anunciou a remoção do endpoint Management API `logs.all` em 2026-09-23 em favor do endpoint unificado `logs`. O Sistema Lojasaph não possui integração direta com `logs.all`; qualquer automação futura deve usar a API vigente.

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

Como a retenção atual é curta, a triagem deve começar pela menor janela possível. Ausência de um log antigo não prova ausência do erro se a janela já expirou.

Não copiar logs brutos com dados de cliente para GitHub.

## Triagem no Supabase

Usar Logs Explorer/API em modo read-only para investigar falhas de Postgres, Auth ou Data API quando a aplicação indicar erro de provedor.

1. Restringir janela de horário.
2. Selecionar serviço relevante.
3. Correlacionar por rota/RPC, código de erro e horário.
4. Não assumir que o `correlationId` do Next estará presente em chamadas Supabase feitas diretamente pelo browser.
5. Tratar conteúdo de logs do provedor como potencialmente sensível; resumir em vez de copiar bruto.
6. Não alterar schema/RLS para investigar um log sem requisito/migration versionada.

## Smoke test seguro em preview

Nunca usar token real para validar logging.

Procedimento validado na Fase 17:

1. abrir o preview em `/auth/callback` sem `code` e sem `token_hash`;
2. confirmar que a aplicação redireciona para login com mensagem genérica;
3. confirmar presença de `x-correlation-id` na response;
4. buscar `auth.callback.failed` em Runtime Logs do deployment;
5. confirmar JSON estruturado e ausência de secrets/PII.

Este cenário é deliberadamente inválido e não cria sessão nem altera dados.

A auditoria de 2026-08-20 não criou novo deployment: o comportamento real já estava comprovado e os blobs centrais de `core.ts` e `instrumentation.ts` do Production deployment auditado coincidem com a `main`.

## Limitações conscientes

- não há vendor dedicado de browser error tracking nesta fase;
- erros puramente client-side podem não aparecer nos Runtime Logs da Vercel se não tiverem contraparte server-side;
- chamadas Supabase feitas no browser não recebem automaticamente a correlação do logger server-side;
- a retenção de Runtime Logs do plano Vercel atual é curta e não é tratada como retenção histórica contratual;
- SLA/SLO, alertas e on-call continuam não definidos;
- Log Drains do Supabase não estão disponíveis no plano atual;
- esta fundação não substitui auditoria de negócio já existente no banco.

## Critério para evolução

Considerar Sentry, OpenTelemetry exportado, Log Drain, Observability Plus ou outro destino somente quando houver necessidade concreta de telemetria client-side, tracing entre serviços, retenção maior, alertas ou compliance. A adoção deve preservar o contrato atual e a política de redaction.
