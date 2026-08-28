"use client";

import { ReactNode } from "react";
import { Button } from "./button";
import { ModalLayer } from "./modal-layer";

export function Drawer({
  open,
  onClose,
  title,
  children,
  id = "app-drawer",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  id?: string;
}) {
  const titleId = `${id}-title`;

  return (
    <ModalLayer
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      panelClassName="inset-y-0 left-0 w-[min(88vw,22rem)] overflow-y-auto p-5"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id={titleId} className="text-base font-semibold text-neutral-950">{title}</h2>
        <Button type="button" size="sm" variant="secondary" onClick={onClose}>Fechar</Button>
      </div>
      {children}
    </ModalLayer>
  );
}
