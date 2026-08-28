"use client";

import { ReactNode } from "react";
import { Button } from "./button";
import { ModalLayer } from "./modal-layer";

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  id = "app-dialog",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  id?: string;
}) {
  const titleId = `${id}-title`;
  const descriptionId = description ? `${id}-description` : undefined;

  return (
    <ModalLayer
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      describedBy={descriptionId}
      panelClassName="left-1/2 top-1/2 max-h-[calc(100dvh-2rem)] w-[min(calc(100vw-2rem),32rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-neutral-200 p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id={titleId} className="text-lg font-semibold text-neutral-950">{title}</h2>
          {description && <div id={descriptionId} className="mt-2 text-sm leading-6 text-neutral-600">{description}</div>}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
      </div>
      {children && <div className="mt-5">{children}</div>}
      {footer && <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>}
    </ModalLayer>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  loading = false,
  id = "confirm-dialog",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  id?: string;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      id={id}
      footer={(
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
          <Button
            type="button"
            variant={destructive ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
          >
            {loading ? "Processando..." : confirmLabel}
          </Button>
        </>
      )}
    />
  );
}
