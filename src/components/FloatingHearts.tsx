import { motion } from 'framer-motion';

const hearts = ['❤', '♡', '♥', '💕', '💗'];

export function FloatingHearts() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {Array.from({ length: 16 }).map((_, index) => (
        <motion.span
          key={index}
          initial={{ y: '110vh', opacity: 0 }}
          animate={{ y: '-10vh', opacity: [0, 0.35, 0] }}
          transition={{
            duration: 12 + (index % 5) * 2,
            repeat: Infinity,
            delay: index * 1.35,
            ease: 'easeInOut',
          }}
          className="absolute text-xl text-rose-300/80"
          style={{
            left: `${(index * 23) % 100}%`,
            filter: 'blur(0.1px)',
          }}
        >
          {hearts[index % hearts.length]}
        </motion.span>
      ))}
    </div>
  );
}
