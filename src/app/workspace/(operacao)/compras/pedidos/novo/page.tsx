"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { buttonClasses } from "@/components/ui/styles";
import { PurchaseOrderForm } from "@/modules/purchases/ui/purchase-order-form";

export default function NewPurchaseOrderPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Compras · Pedidos"
        title="Novo pedido"
        description="Monte o pedido para um fornecedor e local de recebimento. O estoque só é alterado quando um recebimento é registrado."
        actions={<Link href="/workspace/compras/pedidos" className={buttonClasses({ variant: "secondary" })}>Voltar para pedidos</Link>}
      />
      <PurchaseOrderForm onCreated={(orderId) => router.push(`/workspace/compras/pedidos/${orderId}`)} />
    </div>
  );
}
