'use client';

import { useState } from 'react';
import { createUser } from '@/app/actions/users';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function CreateUserModal() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const [form, setForm] = useState({
    name: '', username: '', password: '', role: 'L1' as 'L1' | 'L2' | 'L3', extension: '',
  });

  const handleSubmit = async () => {
    if (!form.name || !form.username || !form.password || !form.extension) {
      toast({ title: 'All fields required', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await createUser(form);
      if (result.success) {
        toast({ title: 'User created', description: `${form.name} (${form.role})` });
        setOpen(false);
        setForm({ name: '', username: '', password: '', role: 'L1', extension: '' });
        router.refresh();
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls = 'cyber-input';
  const labelCls = 'text-xs font-medium text-cyber-400 mb-1.5 block';

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="h-8 text-xs bg-primary hover:bg-primary-hover text-white gap-1.5 px-3"
      >
        <UserPlus className="w-3.5 h-3.5" />
        Add User
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-primary)] max-w-sm p-5">
          <DialogHeader className="mb-4">
            <DialogTitle className="font-outfit text-base font-bold text-cyber-50">
              New Agent Account
            </DialogTitle>
            <DialogDescription className="text-xs text-cyber-500 mt-0.5">
              Password is bcrypt-hashed before storage.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className={labelCls}>Full Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Rajesh Kumar"
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className={labelCls}>Username *</Label>
                <Input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="rajesh.kumar"
                  className={inputCls}
                />
              </div>
              <div>
                <Label className={labelCls}>Extension *</Label>
                <Input
                  value={form.extension}
                  onChange={(e) => setForm({ ...form, extension: e.target.value })}
                  placeholder="e.g. 1001"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <Label className={labelCls}>Role *</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as 'L1' | 'L2' | 'L3' })}
              >
                <SelectTrigger className={`${inputCls} w-full`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[var(--bg-elevated)] border-[var(--border-default)]">
                  <SelectItem value="L1" className="text-xs">L1 — Analyst (Intake)</SelectItem>
                  <SelectItem value="L2" className="text-xs">L2 — Officer (Investigation)</SelectItem>
                  <SelectItem value="L3" className="text-xs">L3 — Supervisor (Admin)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className={labelCls}>Password *</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min. 8 characters"
                  className={`${inputCls} pr-9`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cyber-600 hover:text-cyber-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-5 gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-8 text-xs text-cyber-500 hover:text-cyber-100"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="h-8 text-xs bg-primary hover:bg-primary-hover text-white px-4 gap-1.5"
            >
              {isSubmitting ? (
                <><span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />Creating...</>
              ) : 'Create Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
