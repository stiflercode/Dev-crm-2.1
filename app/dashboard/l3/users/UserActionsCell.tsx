'use client';

import { useState } from 'react';
import { toggleUserActive, resetUserPassword } from '@/app/actions/users';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { KeyRound, Eye, EyeOff, UserCheck, UserX } from 'lucide-react';

interface Props {
  userId: string;
  userName: string;
  isActive: boolean;
  isSelf: boolean;
}

export function UserActionsCell({ userId, userName, isActive, isSelf }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const [resetOpen, setResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggle = async () => {
    const result = await toggleUserActive(userId, !isActive);
    if (result.success) {
      toast({
        title: isActive ? 'User deactivated' : 'User activated',
        description: `${userName} is now ${isActive ? 'inactive' : 'active'}.`,
      });
      router.refresh();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: 'Password too short', description: 'Minimum 6 characters required.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await resetUserPassword(userId, newPassword);
      if (result.success) {
        toast({ title: 'Password reset', description: `Password for ${userName} has been updated.` });
        setResetOpen(false);
        setNewPassword('');
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* Reset Password */}
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0"
        title="Reset Password"
        onClick={() => setResetOpen(true)}
      >
        <KeyRound className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
      </Button>

      {/* Toggle Active (not for self) */}
      {!isSelf && (
        <ConfirmDialog
          trigger={
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              title={isActive ? 'Deactivate user' : 'Activate user'}
            >
              {isActive
                ? <UserX className="w-3.5 h-3.5 text-amber-500" />
                : <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
              }
            </Button>
          }
          title={isActive ? `Deactivate ${userName}?` : `Activate ${userName}?`}
          description={
            isActive
              ? `${userName} will no longer be able to log in. You can re-activate at any time.`
              : `${userName} will be able to log in again.`
          }
          confirmLabel={isActive ? 'Deactivate' : 'Activate'}
          variant={isActive ? 'destructive' : 'default'}
          onConfirm={handleToggle}
        />
      )}

      {/* Reset Password Dialog */}
      <Dialog open={resetOpen} onOpenChange={(o) => { setResetOpen(o); if (!o) setNewPassword(''); }}>
        <DialogContent className="max-w-xs p-5" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>
              Reset Password - {userName}
            </DialogTitle>
            <DialogDescription className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Enter a new password for this account.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3">
            <Label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
              New Password *
            </Label>
            <div className="relative">
              <Input
                type={showPw ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="cyber-input pr-9"
                onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setResetOpen(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleResetPassword}
              disabled={isSubmitting || !newPassword}
              className="h-8 text-xs bg-primary hover:bg-primary-hover text-white px-4 gap-1.5"
            >
              {isSubmitting ? (
                <><span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
              ) : (
                <>Reset Password</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}