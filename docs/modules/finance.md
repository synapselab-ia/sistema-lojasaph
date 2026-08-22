# Módulo — Financeiro, parcelas, contas a pagar e anexos

Status: núcleo transacional concluído na Fase 11 / PR #32; anexos privados adicionados na Fase 42 / Issue #92.

## Objetivo

Substituir o controle de NFs/contas a pagar por documentos financeiros estruturados, parcelas, vencimentos e eventos de pagamento auditáveis, preservando as ambiguidades históricas em vez de inventar regras. Anexos privados permitem guardar o arquivo de apoio do documento sem transformá-lo em fonte de regra fiscal nem expô-lo publicamente.

## Modelo persistente

- `payable_documents`: obrigação do fornecedor por Organization/Unit, setor opcional e identificadores do documento quando conhecidos.
- `installments`: parcela, quantidade total de parcelas, valor nominal e vencimento.
- `payment_instructions`: referência bruta associada à parcela, separada do pagamento executado.
- `payments`: eventos `payment` e `reversal`; o pagamento original nunca é apagado por estorno.
- `payable_installment_summary`: view `security_invoker` que deriva saldo e status sob RLS.
- `finance_attachments`: metadata imutável do arquivo privado, vinculada inicialmente ao `payable_document` por Organization.

## Perguntas abertas preservadas

### Q-013 — identificadores do documento

Número, série, chave de acesso e data de emissão são opcionais. O sistema não fabrica identificadores ausentes no legado.

### Q-014 — pagamento parcial/múltiplos pagamentos

O modelo aceita vários eventos de pagamento por parcela. Isso evita uma cardinalidade 1:1 irreversível. A UI inicial permite registrar eventos individuais sem obrigar fluxo avançado de renegociação.

### Q-015 — valor pago diferente do nominal

A diferença é preservada como saldo positivo/negativo. O sistema não classifica automaticamente juros, multa, desconto ou taxa. Exemplo: nominal R$ 1.000 e pagamentos líquidos de R$ 1.100 resultam em saldo `-R$ 100` e status pago, sem criar uma causa fictícia para os R$ 100.

### Q-016 — Pix/Boleto

O valor histórico é armazenado em `payment_instructions.raw_reference`, com rótulo opcional. Não existe enum inventado que force o conteúdo a ser Pix, boleto ou linha digitável.

### Q-017 — `Checar data`

Não foi transformado em status editável. `paid`, `overdue`, `due_today` e `upcoming` são derivados de eventos, vencimento e timezone da Organization. A regra histórica de `Checar data` permanece pendente sem contaminar o modelo.

## Status derivados

Para documento ativo:

1. `paid`: pagamento líquido >= valor nominal;
2. `overdue`: saldo não pago e vencimento anterior à data local da Organization;
3. `due_today`: vencimento igual à data local;
4. `upcoming`: vencimento futuro.

Documento cancelado faz todas as parcelas derivarem `cancelled`.

`balance_amount = nominal_amount - net_paid_amount`.

Sobrepagamento gera saldo negativo e permanece visível.

## Commands PostgreSQL

### `create_payable_document`

- papéis `owner/admin/manager/finance`;
- command ID = ID do documento para idempotência forte;
- valida Organization, Unit, Sector e Supplier;
- exige conjunto completo/consistente de parcelas;
- rejeita duplicidade de número, datas ausentes e valores inválidos;
- normaliza ordem das parcelas para retry semântico;
- cria referências de pagamento separadamente;
- auditado.

### `record_installment_payment`

- papéis financeiros;
- evento separado, nunca overwrite de `Valor Pago`;
- valor > 0 com precisão monetária exata;
- retry idempotente compara parcela, valor, data, referência e observação;
- documento precisa estar ativo;
- pode haver múltiplos eventos e sobrepagamento, sem classificação automática da diferença;
- auditado.

### `reverse_installment_payment`

- cria evento `reversal` no mesmo valor do pagamento original;
- não apaga nem altera o pagamento original;
- somente um estorno integral por evento nesta primeira versão;
- idempotente e auditado.

### `cancel_payable_document`

- exige saldo líquido de pagamentos igual a zero;
- pagamentos existentes precisam ser estornados antes;
- não apaga parcelas, pagamentos ou referências;
- retry compara também o motivo;
- auditado.

### `can_upload_finance_attachment`

- preflight read-only;
- exige sessão autenticada;
- reutiliza `private.has_payable_document_role(...)`;
- permite somente `owner/admin/manager/finance` no escopo real do documento;
- não concede acesso físico ao Storage.

### `register_finance_attachment`

- revalida sessão, papel e escopo depois do upload físico;
- aceita somente bucket canônico `finance-attachments`;
- exige storage key opaca `Organization/document/attachment UUID`;
- valida filename, MIME, tamanho até 10 MiB e SHA-256 lowercase;
- retry com mesmo ID e metadata é idempotente; payload divergente gera conflito;
- grava metadata e `audit_logs` no mesmo boundary PostgreSQL;
- não expõe UPDATE/DELETE do anexo nesta primeira versão.

## Anexos privados / Storage

A primeira vertical slice de `REQ-FIN-008` liga o arquivo ao documento financeiro. O modelo de domínio pode evoluir posteriormente para parcela/pagamento/recebimento sem forçar esses vínculos agora.

Tipos aceitos:

- PDF;
- XML (`application/xml` e `text/xml`);
- JPEG;
- PNG;
- WebP.

Limite: 10 MiB por arquivo.

Fluxo de upload:

1. browser valida formato/tamanho somente para feedback rápido;
2. route server-only valida sessão e arquivo novamente;
3. RPC de preflight revalida role + resource scope usando a sessão normal;
4. trusted server garante, pela Storage API, bucket privado `finance-attachments` com limite/MIME configurados;
5. servidor calcula SHA-256 e gera UUID opaco;
6. objeto é enviado com `upsert=false` para `organization/document/attachment`;
7. metadata é registrada pelo RPC autenticado;
8. se a etapa 7 falhar, o servidor tenta remover o objeto recém-enviado como compensação.

O bucket não é público e o browser não recebe `SUPABASE_SECRET_KEY`. O admin client existe somente em `src/lib/finance/attachment-server.ts`, marcado `server-only`.

Fluxo de download:

1. route server-only consulta a metadata usando o client autenticado normal;
2. RLS de `finance_attachments` usa `private.can_read_payable_document(...)` e esconde anexo fora do escopo;
3. somente após a metadata ser visível o trusted server baixa o objeto privado via Storage API;
4. a resposta usa `Content-Disposition: attachment`, `no-store` e nunca gera public URL permanente.

Não se manipula `storage.objects` por SQL. O bucket é provisionado de forma idempotente pela Storage API no primeiro upload autorizado.

## Segurança

As tabelas críticas permitem leitura de membros no escopo autorizado por RLS, mas não aceitam write direto do browser. Commands de mutação são `SECURITY DEFINER` intencionais, executáveis somente por `authenticated`, e revalidam `auth.uid()`, papel, Organization, referências e payload.

`finance_attachments` concede somente `SELECT` direto a `authenticated`; `INSERT/UPDATE/DELETE` permanecem revogados. Viewer pode listar/baixar metadata visível, mas não passa no preflight nem no command de registro.

`payable_installment_summary` usa `security_invoker`, portanto não contorna as policies das tabelas-base.

## UI persistente

`/workspace/financeiro` oferece:

- KPIs de nominal, pago líquido, saldo em aberto e quantidade vencida;
- criação de documento e múltiplas parcelas;
- referência Pix/Boleto bruta separada;
- visão por parcela de vencimento, nominal, pago, diferença/saldo e status;
- registro de pagamentos;
- histórico de eventos;
- estorno sem exclusão;
- cancelamento apenas conforme regra do banco;
- painel de anexos por documento, com listagem/download para quem pode ver o documento e upload para perfis financeiros autorizados.

`manageFinance = owner/admin/manager/finance` controla ações visíveis. A UI não é fronteira de segurança.

## Testes

`supabase/tests/finance_payables.sql` cobre o fluxo financeiro transacional original.

`supabase/tests/finance_attachments.sql` usa somente fixtures sintéticas em `BEGIN/ROLLBACK` e cobre:

- Finance in-scope registra metadata;
- retry idempotente e audit único;
- conflito com mesmo ID/payload alterado;
- storage key, MIME, tamanho e checksum inválidos;
- direct INSERT/UPDATE/DELETE negados;
- viewer read-only;
- membership Finance em outra Unit negada;
- cross-Organization negado;
- `anon` sem SELECT/RPC.

Vitest cobre a política de MIME/tamanho/path e a compensação do objeto quando o registro de metadata falha. `client-boundary.test.ts` protege a separação do admin Storage server-only.

## Supabase remoto

A migration histórica `finance_payables_flow` permanece aplicada no projeto homologado em `sa-east-1`.

A migration hospedada de anexos é `20260822195823_finance_attachments`, e o arquivo versionado foi reconciliado para `supabase/migrations/20260822195823_finance_attachments.sql`. Production foi homologada com fixtures sintéticas em `BEGIN/ROLLBACK`: preflight, registro, retry idempotente e audit único passaram, e a checagem posterior confirmou zero resíduos.

RLS/grants hospedados confirmam `SELECT` apenas para `authenticated`, mutations diretas negadas, `anon` sem leitura/EXECUTE e os dois RPCs acessíveis somente ao papel autenticado previsto. Security Advisor reporta os dois RPCs como `SECURITY DEFINER` executáveis por `authenticated`; isso é intencional e segue o boundary dos demais commands críticos, que revalidam sessão, papel e escopo. Performance Advisor reporta apenas INFO de FKs/índices para tuning orientado a carga, sem finding bloqueante.

O conector operacional usado na homologação não expõe mutações de Storage. Por segurança, nenhum bucket/objeto foi criado por SQL. O bucket físico continua sendo garantido pela Storage API no primeiro upload autorizado, conforme o boundary implementado e testado.

## Fora do escopo atual

- Caixa e fechamento diário;
- conciliação bancária;
- SEFAZ/OCR;
- classificação automática de juros/multa/desconto;
- importação definitiva de dados reais;
- classificação automática do tipo de anexo;
- vínculo de Attachment com parcela/pagamento/recebimento nesta primeira entrega;
- exclusão física/lifecycle de anexos;
- URL pública permanente.
