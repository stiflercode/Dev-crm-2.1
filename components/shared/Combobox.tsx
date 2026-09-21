'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ComboboxProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}

export function Combobox({
  options, value, onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyText = 'No results found.',
  disabled = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-between w-full h-[38px] px-3 text-sm rounded-[7px]',
          'transition-colors border outline-none',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          !value && 'text-[var(--text-placeholder)]',
          className
        )}
        style={{
          background: 'var(--bg-input)',
          borderColor: open ? 'var(--border-input-focus)' : 'var(--border-input)',
          color: value ? 'var(--text-input)' : 'var(--text-placeholder)',
          boxShadow: open ? '0 0 0 3px rgba(37, 99, 235, 0.10)' : 'none',
        }}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        align="start"
        style={{
          minWidth: '240px',
          width: 'var(--radix-popover-trigger-width)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '10px',
          boxShadow: '0 8px 30px rgba(15,23,42,0.12), 0 2px 8px rgba(15,23,42,0.06)',
          zIndex: 9999,
        }}
      >
        <Command style={{ background: 'transparent' }}>
          <div style={{ borderBottom: '1px solid var(--border-default)' }}>
            <CommandInput
              placeholder={searchPlaceholder}
              className="h-9 text-sm border-0 focus:ring-0 outline-none"
              style={{
                background: 'transparent',
                color: 'var(--text-primary)',
              }}
            />
          </div>
          <CommandList className="max-h-[220px] overflow-y-auto">
            <CommandEmpty
              className="py-6 text-center text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              {emptyText}
            </CommandEmpty>
            <CommandGroup className="p-1">
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onChange(option.value === value ? '' : option.value);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 px-2 py-2 rounded-md text-sm cursor-pointer"
                  style={{
                    color: 'var(--text-body)',
                    background: 'transparent',
                  }}
                >
                  <span
                    className="flex items-center justify-center w-4 h-4 rounded shrink-0"
                    style={{
                      background: value === option.value ? 'rgba(37,99,235,0.1)' : 'transparent',
                    }}
                  >
                    <Check
                      className="h-3 w-3"
                      style={{
                        color: '#2563EB',
                        opacity: value === option.value ? 1 : 0,
                      }}
                    />
                  </span>
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
