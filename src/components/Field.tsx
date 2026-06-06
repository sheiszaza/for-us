import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
};

const baseClassName =
  'w-full rounded-3xl border border-rose-100 bg-white/75 px-4 py-3 text-rose-950 outline-none transition placeholder:text-rose-300 focus:border-rose-300 focus:ring-4 focus:ring-rose-100';

export function Field({ label, className = '', ...props }: FieldProps) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-rose-800">
      <span>{label}</span>
      <input className={`${baseClassName} ${className}`} {...props} />
    </label>
  );
}

export function TextArea({ label, className = '', rows = 4, ...props }: TextAreaProps) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-rose-800">
      <span>{label}</span>
      <textarea className={`${baseClassName} resize-none ${className}`} rows={rows} {...props} />
    </label>
  );
}
