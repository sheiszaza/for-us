import { useCallback, type MouseEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from './Button';

type ModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export function Modal({ open, title, children, onClose }: ModalProps) {
  const handleBackdropClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-end bg-rose-950/25 px-4 pb-safe backdrop-blur-sm sm:place-items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackdropClick}
        >
          <motion.section
            initial={{ y: 36, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 36, opacity: 0 }}
            className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-[2rem] bg-cream-50 p-5 shadow-2xl shadow-rose-950/20"
            role="dialog"
            aria-modal="true"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-xl font-black text-rose-950">{title}</h2>
              <Button variant="ghost" className="size-10 p-0" onClick={onClose} aria-label="Close modal">
                <X className="size-5" />
              </Button>
            </div>
            {children}
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
