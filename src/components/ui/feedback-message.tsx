import { HTMLAttributes } from "react";
import { SemanticTone, cx } from "./styles";

const feedbackToneClasses: Record<SemanticTone, string> = {
  neutral: "border-neutral-200 bg-white text-neutral-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  attention: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-900",
  info: "border-sky-200 bg-sky-50 text-sky-900",
};

export interface FeedbackMessageProps extends HTMLAttributes<HTMLParagraphElement> {
  tone?: SemanticTone;
}

export function FeedbackMessage({ tone = "neutral", className, ...props }: FeedbackMessageProps) {
  return (
    <p
      {...props}
      className={cx("rounded-xl border px-4 py-3 text-sm leading-6", feedbackToneClasses[tone], className)}
    />
  );
}
