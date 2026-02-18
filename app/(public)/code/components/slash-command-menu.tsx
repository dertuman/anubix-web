'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Terminal } from 'lucide-react';

import type { SlashCommand } from '@/types/code';

export interface SlashCommandMenuHandle {
  handleKeyDown: (_key: string) => boolean;
}

interface SlashCommandMenuProps {
  commands: SlashCommand[];
  inputValue: string;
  onSelect: (_command: string) => void;
}

export const SlashCommandMenu = forwardRef<
  SlashCommandMenuHandle,
  SlashCommandMenuProps
>(({ commands, inputValue, onSelect }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const isSlashInput = inputValue.startsWith('/');
  const query = isSlashInput ? inputValue.slice(1).toLowerCase() : '';

  const filtered = useMemo(() => {
    if (!isSlashInput) return [];
    if (!query) return commands;
    return commands.filter(
      (cmd) =>
        cmd.name.toLowerCase().includes(query) ||
        cmd.description.toLowerCase().includes(query)
    );
  }, [commands, isSlashInput, query]);

  const isOpen = isSlashInput && filtered.length > 0;

  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered.length]);

  useEffect(() => {
    if (!isOpen) return;
    const item = listRef.current?.children[selectedIndex] as
      | HTMLElement
      | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, isOpen]);

  useImperativeHandle(
    ref,
    () => ({
      handleKeyDown(key: string) {
        if (!isOpen) return false;
        if (key === 'ArrowDown') {
          setSelectedIndex((i) => (i + 1) % filtered.length);
          return true;
        }
        if (key === 'ArrowUp') {
          setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
          return true;
        }
        if (key === 'Enter' || key === 'Tab') {
          const cmd = filtered[selectedIndex];
          if (cmd) {
            onSelect(`/${cmd.name}${cmd.argHint ? ' ' : ''}`);
            return true;
          }
        }
        return false;
      },
    }),
    [isOpen, filtered, selectedIndex, onSelect]
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 5 }}
        ref={listRef}
        className="custom-scrollbar border-border/6 bg-card/95 absolute bottom-full left-0 mb-1 max-h-60 w-full overflow-y-auto rounded-xl border shadow-lg backdrop-blur-md"
      >
        {filtered.map((cmd, i) => (
          <button
            key={cmd.name}
            className={`hover:bg-muted/50 flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors ${i === selectedIndex ? 'bg-muted/50' : ''}`}
            onClick={() => onSelect(`/${cmd.name}${cmd.argHint ? ' ' : ''}`)}
            onMouseEnter={() => setSelectedIndex(i)}
          >
            <Terminal className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-medium">/{cmd.name}</span>
                {cmd.argHint && (
                  <span className="text-muted-foreground text-xs">
                    {cmd.argHint}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground truncate text-xs">
                {cmd.description}
              </p>
            </div>
          </button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
});

SlashCommandMenu.displayName = 'SlashCommandMenu';
