'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { updateTicketDisposition } from '@/app/actions/tickets';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useTelephonyStore } from '@/store/telephonyStore';
import { PhoneOff, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Disposition = {
  code: string;
  label: string;
  description: string;
  color: 'blue' | 'green' | 'amber' | 'red' | 'gray';
};

const DISPOSITIONS: Disposition[] = [
  { code: 'CYBER_FRAUD_COMPLAINT', label: 'Cyber Fraud Complaint',    description: 'Victim reported a genuine cybercrime / fraud incident',             color: 'blue' },
  { code: 'ENQUIRY',              label: 'Enquiry / Guidance',         description: 'Caller sought information, no crime reported',                      color: 'green' },
  { code: 'BLANK_CALL',          label: 'Blank Call',                  description: 'No response from caller after answering',                          color: 'gray' },
  { code: 'MISDIAL',             label: 'Misdial / Wrong Number',      description: 'Caller reached this number by mistake',                            color: 'amber' },
  { code: 'REPEAT_CALLER',       label: 'Repeat Caller',               description: 'Caller previously registered a complaint for the same incident',   color: 'red' },
];

const baseMap: Record<string, string> = {
  blue:  'border-cyber-700 hover:border-primary/50 hover:bg-primary/5',
  green: 'border-cyber-700 hover:border-emerald-500/40 hover:bg-emerald-500/5',
  amber: 'border-cyber-700 hover:border-amber-500/40 hover:bg-amber-500/5',
  red:   'border-cyber-700 hover:border-red-500/40 hover:bg-red-500/5',
  gray:  'border-cyber-700 hover:border-cyber-600',
};

const activeMap: Record<string, string> = {
  blue:  'border-primary/60 bg-primary/8 ring-1 ring-primary/20',
  green: 'border-emerald-500/50 bg-emerald-500/8 ring-1 ring-emerald-500/20',
  amber: 'border-amber-500/50 bg-amber-500/8 ring-1 ring-amber-500/20',
  red:   'border-red-500/50 bg-red-500/8 ring-1 ring-red-500/20',
  gray:  'border-cyber-600 bg-cyber-800/60 ring-1 ring-cyber-500/20',
};

const dotMap: Record<string, string> = {
  blue:  'bg-primary', green: 'bg-emerald-500',
  amber: 'bg-amber-500', red: 'bg-red-500', gray: 'bg-slate-500',
};

export default function WrapUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ticketId = searchParams.get('id');
  const { toast } = useToast();
  const { exitWrapUp } = useTelephonyStore();

  const [selected, setSelected] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleComplete = async () => {
    if (!selected) return;
    setIsSubmitting(true);
    try {
      if (ticketId) await updateTicketDisposition(ticketId, selected);
      exitWrapUp();
      toast({
        title: 'Wrap-up complete',
        description: `Disposition: ${DISPOSITIONS.find((d) => d.code === selected)?.label}`,
      });
      router.push('/dashboard');
    } catch {
      toast({ title: 'Error', description: 'Failed to save disposition', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <PhoneOff className="w-4 h-4 text-violet-400" />
          <h1 className="page-title">Call Disposition</h1>
        </div>
        <p className="page-subtitle">
          {ticketId
            ? <><span className="font-mono text-cyber-300">{ticketId}</span> · Select the call outcome</>
            : 'No complaint registered · Select the call outcome'}
        </p>
      </div>

      {/* Disposition options */}
      <div className="space-y-2 mb-5">
        {DISPOSITIONS.map((d) => {
          const isSelected = selected === d.code;
          return (
            <button
              key={d.code}
              type="button"
              onClick={() => setSelected(d.code)}
              className={cn(
                'w-full text-left p-3.5 rounded-lg border transition-all duration-150',
                isSelected ? activeMap[d.color] : baseMap[d.color]
              )}
            >
              <div className="flex items-center gap-3">
                {/* Selection indicator */}
                <div className={cn(
                  'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                  isSelected ? `border-current ${dotMap[d.color]}` : 'border-cyber-600'
                )}>
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-cyber-100">{d.label}</p>
                  <p className="text-xs text-cyber-500 mt-0.5 truncate">{d.description}</p>
                </div>
                {isSelected && (
                  <CheckCircle2 className="w-4 h-4 ml-auto shrink-0 text-cyber-300" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <Button
        onClick={handleComplete}
        disabled={!selected || isSubmitting}
        className="w-full h-9 bg-primary hover:bg-primary-hover text-white font-semibold text-sm gap-2"
      >
        {isSubmitting ? (
          <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Completing...</>
        ) : (
          <><CheckCircle2 className="w-4 h-4" />Complete &amp; Go Available</>
        )}
      </Button>
    </div>
  );
}
