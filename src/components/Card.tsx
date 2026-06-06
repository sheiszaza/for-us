import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

type CardProps = {
  children: ReactNode;
  className?: string;
  asButton?: boolean;
  onClick?: () => void;
};

export function Card({ children, className = '', asButton = false, onClick }: CardProps) {
  const commonClassName = `glass-card rounded-[2rem] p-5 ${className}`;

  if (asButton) {
    return (
      <motion.button
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={`${commonClassName} w-full text-left`}
      >
        {children}
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`${commonClassName} ${onClick ? 'cursor-pointer' : ''}`}
    >
      {children}
    </motion.div>
  );
}
