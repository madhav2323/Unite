import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  onComplete: () => void;
}

const LETTERS = 'Unite'.split('');

export function LoadingScreen({ onComplete }: Props) {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');

  useEffect(() => {
    // After logo animates in, hold briefly, then fade out
    const holdTimer = setTimeout(() => setPhase('hold'), 1000);
    const outTimer = setTimeout(() => setPhase('out'), 2000);
    const doneTimer = setTimeout(() => onComplete(), 2700);
    return () => {
      clearTimeout(holdTimer);
      clearTimeout(outTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== 'out' ? (
        <motion.div
          key="loading"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0d1117] overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
        >
          {/* Ambient background glow */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'hold' ? 1 : 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(0,255,156,0.08) 0%, rgba(0,255,156,0.03) 40%, transparent 70%)',
              }}
            />
          </motion.div>

          {/* Scanline overlay for hacker aesthetic */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #00ff9c 2px, #00ff9c 4px)',
            }}
          />

          {/* Main content */}
          <div className="relative flex flex-col items-center gap-8">

            {/* Logo */}
            <motion.div
              className="relative"
              initial={{ scale: 0.4, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Outer glow ring */}
              <motion.div
                className="absolute inset-0 rounded-2xl"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: phase === 'hold' ? [0, 0.6, 0.3] : 0,
                  scale: phase === 'hold' ? [0.9, 1.1, 1] : 0.9,
                }}
                transition={{ duration: 1, ease: 'easeOut' }}
                style={{
                  boxShadow: '0 0 60px 20px rgba(0,255,156,0.25)',
                  background: 'transparent',
                }}
              />

              {/* Inner ring pulse */}
              <motion.div
                className="absolute -inset-3 rounded-3xl border border-[#00ff9c]/20"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={phase === 'hold' ? {
                  opacity: [0, 0.8, 0],
                  scale: [0.85, 1.05, 1.15],
                } : { opacity: 0 }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.1 }}
              />

              <motion.img
                src={`${import.meta.env.BASE_URL}logo.png`}
                alt="Unite"
                className="h-24 w-24 rounded-2xl object-cover relative z-10"
                style={{
                  filter: phase === 'hold'
                    ? 'drop-shadow(0 0 24px rgba(0,255,156,0.5)) brightness(1.1)'
                    : 'brightness(1)',
                }}
                transition={{ duration: 0.5 }}
              />
            </motion.div>

            {/* Brand name — letters stagger in */}
            <div className="flex items-baseline gap-0.5">
              {LETTERS.map((letter, i) => (
                <motion.span
                  key={i}
                  className="text-5xl font-bold tracking-tight text-white"
                  initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{
                    duration: 0.45,
                    delay: 0.4 + i * 0.07,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  {letter}
                </motion.span>
              ))}
            </div>

            {/* Tagline */}
            <motion.p
              className="text-[#8b949e] text-sm tracking-widest uppercase font-light"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.5, ease: 'easeOut' }}
            >
              Real-time collaborative code editing
            </motion.p>

            {/* Progress bar */}
            <motion.div
              className="w-48 h-px bg-[#21262d] relative overflow-hidden rounded-full mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.3 }}
            >
              <motion.div
                className="absolute inset-y-0 left-0 bg-[#00ff9c] rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ delay: 0.9, duration: 1.0, ease: 'easeInOut' }}
              />
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                initial={{ left: '-4rem' }}
                animate={{ left: '12rem' }}
                transition={{ delay: 1.0, duration: 0.8, ease: 'easeInOut' }}
              />
            </motion.div>

            {/* Initializing text */}
            <motion.p
              className="text-[10px] font-mono text-[#484f58] tracking-widest"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.6, 1] }}
              transition={{ delay: 1.0, duration: 0.8 }}
            >
              INITIALIZING...
            </motion.p>
          </div>

          {/* Corner accents */}
          {[
            'top-6 left-6 border-t border-l',
            'top-6 right-6 border-t border-r',
            'bottom-6 left-6 border-b border-l',
            'bottom-6 right-6 border-b border-r',
          ].map((cls, i) => (
            <motion.div
              key={i}
              className={`absolute w-8 h-8 border-[#00ff9c]/30 ${cls}`}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
            />
          ))}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
