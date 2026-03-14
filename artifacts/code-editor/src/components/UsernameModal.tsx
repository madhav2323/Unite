import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Terminal } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onSubmit: (username: string) => void;
}

export function UsernameModal({ isOpen, onSubmit }: Props) {
  const [val, setVal] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (val.trim()) {
      onSubmit(val.trim());
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="w-full max-w-md overflow-hidden rounded-2xl bg-panel border border-border shadow-2xl shadow-black/50"
          >
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary">
                  <Terminal className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Welcome to CodeSync</h2>
                  <p className="text-sm text-muted-foreground">Enter a username to join the session</p>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    autoFocus
                    type="text"
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                    placeholder="e.g. hackerman99"
                    className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={!val.trim()} 
                  className="w-full py-6 text-base rounded-xl font-semibold"
                >
                  Join Session
                </Button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
