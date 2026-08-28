import {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  forwardRef,
} from "react";
import { controlClasses, cx, fieldDescriptionIds } from "./styles";

interface FieldAccessibilityProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

export function FormField({
  id,
  label,
  hint,
  error,
  required = false,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: (accessibilityProps: FieldAccessibilityProps) => ReactNode;
  className?: string;
}) {
  const describedBy = fieldDescriptionIds(id, Boolean(hint), Boolean(error));

  return (
    <div className={cx("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-neutral-800">
        {label}
        {required && <span className="ml-1 text-red-700" aria-hidden="true">*</span>}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {hint && <p id={`${id}-hint`} className="text-xs leading-5 text-neutral-500">{hint}</p>}
      {error && <p id={`${id}-error`} className="text-xs font-medium leading-5 text-red-700">{error}</p>}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} {...props} className={controlClasses(className)} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, ...props },
  ref,
) {
  return <select ref={ref} {...props} className={controlClasses(className)} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} {...props} className={cx(controlClasses(), "resize-y", className)} />;
});
