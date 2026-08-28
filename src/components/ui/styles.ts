export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md";
export type SemanticTone = "neutral" | "success" | "attention" | "danger" | "info";
export type PanelPadding = "none" | "sm" | "md";

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "border border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-700 hover:border-neutral-700",
  secondary: "border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50 hover:border-neutral-400",
  danger: "border border-red-700 bg-red-700 text-white hover:bg-red-800 hover:border-red-800",
  ghost: "border border-transparent bg-transparent text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-2.5 text-sm",
};

export function buttonClasses({
  variant = "secondary",
  size = "md",
  block = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
} = {}): string {
  return cx(
    "inline-flex min-h-11 items-center justify-center rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
    buttonVariants[variant],
    buttonSizes[size],
    block && "w-full",
    className,
  );
}

const semanticToneClasses: Record<SemanticTone, string> = {
  neutral: "border-neutral-200 bg-neutral-50 text-neutral-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  attention: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-900",
  info: "border-sky-200 bg-sky-50 text-sky-900",
};

export function statusBadgeClasses(tone: SemanticTone = "neutral", className?: string): string {
  return cx(
    "inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
    semanticToneClasses[tone],
    className,
  );
}

const panelPaddingClasses: Record<PanelPadding, string> = {
  none: "p-0",
  sm: "p-4",
  md: "p-5",
};

export function panelClasses({
  tone = "neutral",
  padding = "md",
  className,
}: {
  tone?: SemanticTone;
  padding?: PanelPadding;
  className?: string;
} = {}): string {
  const surface = tone === "neutral"
    ? "border-neutral-200 bg-white text-neutral-950"
    : semanticToneClasses[tone];

  return cx("rounded-2xl border shadow-sm", surface, panelPaddingClasses[padding], className);
}

export function controlClasses(className?: string): string {
  return cx(
    "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-950 shadow-sm transition placeholder:text-neutral-400 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500",
    "focus:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-200",
    className,
  );
}

export function fieldDescriptionIds(id: string, hasHint: boolean, hasError: boolean): string | undefined {
  const ids = [hasHint ? `${id}-hint` : null, hasError ? `${id}-error` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}
