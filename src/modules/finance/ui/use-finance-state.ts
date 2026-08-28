"use client";

import { useEffect, useMemo, useState } from "react";
import { EntityId } from "@/domain/common/entity-id";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { FinanceState, SupabaseFinanceGateway } from "@/modules/finance/adapters/supabase-finance-gateway";

const emptyFinanceState: FinanceState = Object.freeze({
  units: Object.freeze([]),
  sectors: Object.freeze([]),
  documents: Object.freeze([]),
  installments: Object.freeze([]),
  instructions: Object.freeze([]),
  payments: Object.freeze([]),
});

export function useFinanceState(organizationId: EntityId) {
  const gateway = useMemo(() => new SupabaseFinanceGateway(createBrowserSupabaseClient()), []);
  const [state, setState] = useState<FinanceState>(emptyFinanceState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void gateway
      .listState(organizationId)
      .then((nextState) => {
        if (!active) return;
        setState(nextState);
      })
      .catch((cause) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "Não foi possível carregar o Financeiro.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [gateway, organizationId]);

  return { gateway, state, loading, error };
}
