import { ReactNode } from "react";
import { cx } from "./styles";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cx("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="text-sm font-medium text-emerald-700">{eyebrow}</p>}
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-neutral-950">{title}</h1>
        {description && <div className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">{description}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
