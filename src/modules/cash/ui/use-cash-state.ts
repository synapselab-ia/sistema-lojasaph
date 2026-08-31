"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EntityId } from "@/domain/common/entity-id";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { CashState, SupabaseCashGateway } from "@/modules/cash/adapters/supabase-cash-gateway";

const emptyCashState: CashState = Object.freeze({
  units: Object.freeze([]),
  registers: Object.freeze([]),
  paymentMethods: Object.freeze([]),
  feeRules: Object.freeze([]),
  sessions: Object.freeze([]),
  totals: Object.freeze([]),
  movements: Object.freeze([]),
});

export function useCashState(organizationId: EntityId) {
  const gateway = useMemo(() => new SupabaseCashGateway(createBrowserSupabaseClient()), []);
  const [state, setState] = useState<CashState>(emptyCashState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setState(await gateway.listState(organizationId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar o Caixa.");
    } finally {
      setLoading(false);
    }
  }, [gateway, organizationId]);

  useEffect(() => {
    let active = true;
    void gateway
      .listState(organizationId)
      .then((nextState) => {
        if (active) setState(nextState);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Não foi possível carregar o Caixa.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [gateway, organizationId]);

  return { gateway, state, loading, error, refresh };
}
