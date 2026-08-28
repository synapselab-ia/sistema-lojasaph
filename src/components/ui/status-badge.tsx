import { HTMLAttributes } from "react";
import { SemanticTone, statusBadgeClasses } from "./styles";

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: SemanticTone;
}

export function StatusBadge({ tone = "neutral", className, ...props }: StatusBadgeProps) {
  return <span {...props} className={statusBadgeClasses(tone, className)} />;
}
