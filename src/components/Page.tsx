import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

type PageProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function Page({ eyebrow, title, description, action, children }: PageProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="grid gap-6"
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          {eyebrow ? <p className="text-xs font-black uppercase tracking-[0.32em] text-rose-400">{eyebrow}</p> : null}
          <h1 className="mt-2 text-3xl font-black tracking-tight text-rose-950 sm:text-4xl">{title}</h1>
          {description ? <p className="mt-2 max-w-xl text-sm leading-6 text-rose-700/75">{description}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </motion.section>
  );
}
