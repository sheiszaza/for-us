import type { ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = HTMLMotionProps<'button'> & {
  children: ReactNode;
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-300/40',
  secondary: 'bg-white/80 text-rose-700 shadow-md shadow-rose-100 ring-1 ring-rose-100',
  ghost: 'bg-transparent text-rose-700',
  danger: 'bg-rose-950 text-white shadow-lg shadow-rose-900/20',
};

export function Button({ children, className = '', variant = 'primary', type = 'button', ...props }: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
