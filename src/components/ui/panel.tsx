import { HTMLAttributes } from "react";
import { PanelPadding, SemanticTone, panelClasses } from "./styles";

type PanelElement = "div" | "section" | "article" | "aside";

export interface PanelProps extends HTMLAttributes<HTMLElement> {
  as?: PanelElement;
  tone?: SemanticTone;
  padding?: PanelPadding;
}

export function Panel({
  as: Component = "section",
  tone = "neutral",
  padding = "md",
  className,
  ...props
}: PanelProps) {
  return <Component {...props} className={panelClasses({ tone, padding, className })} />;
}
