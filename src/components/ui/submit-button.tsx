"use client";

import { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button, ButtonProps } from "./button";

export interface SubmitButtonProps extends ButtonProps {
  pendingLabel?: ReactNode;
}

export function SubmitButton({
  pendingLabel = "Processando...",
  children,
  loading = false,
  type = "submit",
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const busy = loading || pending;

  return (
    <Button {...props} type={type} loading={busy}>
      {busy ? pendingLabel : children}
    </Button>
  );
}
