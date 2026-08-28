import { ReactNode } from "react";
import { cx } from "./styles";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("rounded-2xl border border-dashed border-neutral-300 bg-white px-5 py-8 text-center", className)}>
      <h2 className="font-semibold text-neutral-950">{title}</h2>
      {description && <div className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-neutral-600">{description}</div>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
