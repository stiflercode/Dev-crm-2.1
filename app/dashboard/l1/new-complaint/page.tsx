'use client';

import { useForm, useFieldArray, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTelephonyStore } from '@/store/telephonyStore';
import { createTicket, saveDraft } from '@/app/actions/tickets';
import { Combobox } from '@/components/shared/Combobox';
import {
  CYBERCRIME_TAXONOMY, SOCIAL_MEDIA_PLATFORMS, MAHARASHTRA_DISTRICTS,
  getCategoryDetails, isFinancialCategory,
} from '@/lib/taxonomy';
import {
  Plus, Trash2, IndianRupee, CheckCircle2, AlertTriangle,
  User, Phone, MapPin, Tag, CreditCard, Zap, UserX, ShieldAlert, Save,
  ChevronRight, ChevronLeft, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

/* ─── Zod Schemas ─── */
const transactionSchema = z.object({
  utrNumber:             z.string().min(1, 'UTR/Transaction ID required'),
  bankName:              z.string().min(1, 'Bank name required'),
  accountNumber:         z.string().optional(),
  upiId:                 z.string().optional(),
  transactionAmount:     z.preprocess((v) => parseFloat(String(v)), z.number().positive('Amount must be positive')),
  transactionDateTime:   z.string().min(1, 'Date & time required'),
  referenceNumber:       z.string().optional(),
  transactionRemarks:    z.string().optional(),
  paymentGatewayDetails: z.string().optional(),
  affectedSystemDetails: z.string().optional(),
  merchantInfo:          z.string().optional(),
  proofOfOwnership:      z.string().optional(),
});

const formSchema = z.object({
  victimName:          z.string().min(2, 'Name must be at least 2 characters'),
  victimContact:       z.string().regex(/^[6-9]\d{9}$/, 'Enter valid 10-digit mobile number'),
  alternateContact:    z.string().optional(),
  address:             z.string().optional(),
  district:            z.string().optional(),
  state:               z.string().optional(),
  email:               z.string().email().optional().or(z.literal('')),
  nearestPoliceStation:z.string().optional(),
  identificationType:  z.string().optional(),
  identificationId:    z.string().optional(),
  sensitivity:         z.boolean().default(false),
  priority:            z.boolean().default(false),
  category:            z.string().min(1, 'Category required'),
  subCategory:         z.string().min(1, 'Sub-category required'),
  platform:            z.string().optional(),
  platformUrl:         z.string().optional(),
  platformHandle:      z.string().optional(),
  description:         z.string().optional(),
  incidentDateTime:    z.string().optional(),
  transactions:        z.array(transactionSchema),
  suspectName:         z.string().optional(),
  suspectMobile:       z.string().optional(),
  suspectEmail:        z.string().optional(),
  suspectBankOrUPI:    z.string().optional(),
  suspectHouseNo:      z.string().optional(),
  suspectStreetName:   z.string().optional(),
  suspectColony:       z.string().optional(),
  suspectVillage:      z.string().optional(),
  suspectCountry:      z.string().optional(),
  suspectState:        z.string().optional(),
  suspectDistrict:     z.string().optional(),
  suspectPincode:      z.string().optional(),
  suspectRemarks:      z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const CATEGORY_OPTIONS = CYBERCRIME_TAXONOMY.map((t) => ({ value: t.category, label: t.category }));
const PLATFORM_OPTIONS = SOCIAL_MEDIA_PLATFORMS.map((p) => ({ value: p, label: p }));
const DISTRICT_OPTIONS = MAHARASHTRA_DISTRICTS.map((d) => ({ value: d, label: d }));
const ID_TYPE_OPTIONS = [
  { value: 'AADHAAR',         label: 'Aadhaar Card' },
  { value: 'PAN',             label: 'PAN Card' },
  { value: 'VOTER_ID',        label: 'Voter ID' },
  { value: 'PASSPORT',        label: 'Passport' },
  { value: 'DRIVING_LICENCE', label: 'Driving Licence' },
  { value: 'OTHER',           label: 'Other' },
];

/* ─── Step config ─── */
const STEPS = [
  { id: 1, label: 'Victim Details',   icon: <User className="w-3.5 h-3.5" /> },
  { id: 2, label: 'Incident Details', icon: <Tag className="w-3.5 h-3.5" /> },
  { id: 3, label: 'Transactions',     icon: <CreditCard className="w-3.5 h-3.5" /> },
  { id: 4, label: 'Suspect Details',  icon: <UserX className="w-3.5 h-3.5" /> },
  { id: 5, label: 'Review & Submit',  icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
];

/* ─── Shared sub-components ─── */
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-body)' }}>
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-500">{message}</p>;
}

function FieldGroup({
  label, error, children, required, className,
}: {
  label: string; error?: string; children: React.ReactNode; required?: boolean; className?: string;
}) {
  return (
    <div className={cn('flex flex-col', className)}>
      <FieldLabel required={required}>{label}</FieldLabel>
      {children}
      <FieldError message={error} />
    </div>
  );
}

function CrmInput({ className, ...props }: React.ComponentProps<'input'>) {
  return <input className={cn('crm-input', className)} {...props} />;
}

function CrmTextarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn('crm-input resize-none', className)}
      style={{ height: 'auto', padding: '8px 12px' }}
      {...props}
    />
  );
}

function YesNoToggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium w-24 shrink-0" style={{ color: 'var(--text-body)' }}>
        {label}
      </span>
      <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border-input)' }}>
        <button type="button" onClick={() => onChange(true)}
          className="px-5 py-1.5 text-sm font-medium transition-all"
          style={{
            background: value ? '#2563EB' : 'var(--bg-input)',
            color: value ? 'white' : 'var(--text-muted)',
          }}>
          Yes
        </button>
        <button type="button" onClick={() => onChange(false)}
          className="px-5 py-1.5 text-sm font-medium transition-all border-l"
          style={{
            borderColor: 'var(--border-input)',
            background: !value ? 'var(--bg-elevated)' : 'var(--bg-input)',
            color: !value ? 'var(--text-body)' : 'var(--text-muted)',
          }}>
          No
        </button>
      </div>
    </div>
  );
}

/* ─── Step Indicator ─── */
function StepIndicator({ current, total, isFinancial }: { current: number; total: number; isFinancial: boolean }) {
  const visibleSteps = isFinancial ? STEPS : STEPS.filter((s) => s.id !== 3);
  const remappedCurrent = isFinancial ? current : current >= 3 ? current + 1 : current;

  return (
    <div className="flex items-center">
      {visibleSteps.map((step, idx) => {
        const isDone   = step.id < remappedCurrent;
        const isActive = step.id === remappedCurrent;
        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div className={cn('step-dot', isDone ? 'completed' : isActive ? 'active' : 'pending')}>
                {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>{idx + 1}</span>}
              </div>
              <span className={cn('text-[10px] whitespace-nowrap font-medium',
                isActive ? 'text-blue-600' : isDone ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]')}>
                {step.label}
              </span>
            </div>
            {idx < visibleSteps.length - 1 && (
              <div className={cn('step-line flex-1', isDone ? 'completed' : '')}
                style={{ marginBottom: '18px' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Golden Hour Status sidebar panel ─── */
function GoldenHourPanel({ incidentDateTime }: { incidentDateTime?: string }) {
  const [elapsed, setElapsed] = useState('—');
  const [isGolden, setIsGolden] = useState(false);
  const [remaining, setRemaining] = useState('—');

  useEffect(() => {
    if (!incidentDateTime) { setElapsed('—'); setIsGolden(false); setRemaining('—'); return; }
    const update = () => {
      const diff = Date.now() - new Date(incidentDateTime).getTime();
      const totalSec = Math.floor(diff / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      setElapsed(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);

      const goldenHourMs = 3 * 60 * 60 * 1000;
      const isG = diff <= goldenHourMs;
      setIsGolden(isG);

      if (isG) {
        const remSec = Math.floor((goldenHourMs - diff) / 1000);
        const rh = Math.floor(remSec / 3600);
        const rm = Math.floor((remSec % 3600) / 60);
        const rs = remSec % 60;
        setRemaining(`${String(rh).padStart(2,'0')}:${String(rm).padStart(2,'0')}:${String(rs).padStart(2,'0')}`);
      } else {
        setRemaining('Expired');
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [incidentDateTime]);

  return (
    <div className="form-section">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg"
          style={{ background: isGolden ? 'rgba(239,68,68,0.08)' : 'rgba(37,99,235,0.08)' }}>
          <Zap className="w-4 h-4" style={{ color: isGolden ? '#DC2626' : '#2563EB' }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
            Golden Hour Status
          </p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {incidentDateTime ? 'Since incident time' : 'Enter incident time'}
          </p>
        </div>
      </div>

      {incidentDateTime ? (
        <div className={cn('rounded-xl p-4 text-center', isGolden
          ? 'bg-red-50 border border-red-200 dark:bg-red-900/10 dark:border-red-800/30'
          : 'bg-blue-50 border border-blue-200 dark:bg-blue-900/10 dark:border-blue-800/30')}>
          <p className="text-[11px] font-medium uppercase tracking-wider mb-2"
            style={{ color: isGolden ? '#DC2626' : '#2563EB' }}>
            {isGolden ? 'GOLDEN HOUR ACTIVE' : 'OUT OF GOLDEN HOUR'}
          </p>
          <p className="text-3xl font-mono font-bold mb-1"
            style={{ color: isGolden ? '#DC2626' : 'var(--text-heading)' }}>
            {elapsed}
          </p>
          {isGolden && (
            <p className="text-xs" style={{ color: '#DC2626' }}>
              Remaining: {remaining}
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-elevated)', border: '1px dashed var(--border-default)' }}>
          <Clock className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Enter incident date & time in Step 2 to see Golden Hour status
          </p>
        </div>
      )}

      {incidentDateTime && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-default)' }}>
          <div className="flex justify-between text-xs">
            <span style={{ color: 'var(--text-muted)' }}>Incident Time</span>
            <span className="font-medium" style={{ color: 'var(--text-body)' }}>
              {new Date(incidentDateTime).toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Complaint Summary sidebar panel ─── */
function ComplaintSummaryPanel({ totalFraud, transactions }: { totalFraud: number; transactions: { transactionAmount: number }[] }) {
  const lienEstimate = totalFraud * 0.0; // placeholder — lien is determined by L2
  return (
    <div className="form-section">
      <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text-heading)' }}>
        Complaint Summary
      </p>
      <div className="space-y-3">
        <SummaryRow label="Total Fraud Amount">
          <span className="text-base font-bold" style={{ color: totalFraud > 0 ? '#DC2626' : 'var(--text-muted)' }}>
            ₹ {totalFraud.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </SummaryRow>
        <SummaryRow label="Transactions">
          <span className="font-semibold text-sm" style={{ color: 'var(--text-body)' }}>
            {transactions.length}
          </span>
        </SummaryRow>
        <SummaryRow label="Total Lien Amount">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
            ₹ 0.00
          </span>
        </SummaryRow>
        <div className="pt-2 border-t" style={{ borderColor: 'var(--border-default)' }}>
          <SummaryRow label="Recovery Rate">
            <span className="font-bold text-sm" style={{ color: '#16A34A' }}>0%</span>
          </SummaryRow>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
      {children}
    </div>
  );
}

/* ─── Main Component ─── */
export default function NewComplaintPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [isGoldenHourResult, setIsGoldenHourResult] = useState(false);
  const { state: telState, endCall } = useTelephonyStore();

  const {
    register, handleSubmit, control, watch, setValue, getValues,
    trigger, formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      state: 'Maharashtra', suspectCountry: 'India',
      sensitivity: false, priority: false, transactions: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'transactions' });
  const watchedCategory     = watch('category');
  const watchedTransactions = watch('transactions');
  const watchedSensitivity  = watch('sensitivity');
  const watchedPriority     = watch('priority');
  const watchedIncidentDT   = watch('incidentDateTime');
  const categoryDetails     = watchedCategory ? getCategoryDetails(watchedCategory) : null;
  const isFinancial         = watchedCategory ? isFinancialCategory(watchedCategory) : false;
  const requiresPlatform    = categoryDetails?.requiresPlatform ?? false;

  useEffect(() => { setValue('subCategory', ''); }, [watchedCategory, setValue]);

  const subCategoryOptions = categoryDetails
    ? categoryDetails.subCategories.map((s) => ({ value: s, label: s }))
    : [];

  const totalFraudAmount = watchedTransactions.reduce(
    (sum, t) => sum + (Number(t.transactionAmount) || 0), 0
  );

  const addTransaction = () => append({
    utrNumber: '', bankName: '', accountNumber: '', upiId: '',
    transactionAmount: 0, transactionDateTime: new Date().toISOString().slice(0, 16),
    referenceNumber: '', transactionRemarks: '', paymentGatewayDetails: '',
    affectedSystemDetails: '', merchantInfo: '', proofOfOwnership: '',
  });

  const stepFields: Record<number, (keyof FormValues)[]> = {
    1: ['victimName', 'victimContact'],
    2: ['category', 'subCategory'],
    3: [], 4: [], 5: [],
  };

  const effectiveSteps = isFinancial ? 5 : 4;
  const getDisplayStep = (s: number) => isFinancial ? s : s > 3 ? s - 1 : s;
  const getLogicalStep = (display: number) => isFinancial ? display : display >= 3 ? display + 1 : display;

  const handleNext = async () => {
    const logicalStep = getLogicalStep(currentStep);
    const fieldsToValidate = stepFields[logicalStep] ?? [];
    const valid = fieldsToValidate.length === 0 || await trigger(fieldsToValidate);
    if (valid) {
      const nextLogical = logicalStep === 2 && !isFinancial ? 4 : logicalStep + 1;
      setCurrentStep(getDisplayStep(nextLogical));
    }
  };

  const handleBack = () => {
    const logicalStep = getLogicalStep(currentStep);
    const prevLogical = logicalStep === 4 && !isFinancial ? 2 : logicalStep - 1;
    setCurrentStep(getDisplayStep(prevLogical));
  };

  const buildSuspectDetails = (data: FormValues) => {
    const hasSuspect = [
      data.suspectName, data.suspectMobile, data.suspectEmail, data.suspectBankOrUPI,
      data.suspectHouseNo, data.suspectStreetName, data.suspectColony, data.suspectVillage,
      data.suspectPincode, data.suspectRemarks,
    ].some((v) => v?.trim());
    if (!hasSuspect) return undefined;
    return {
      name: data.suspectName, mobileNumber: data.suspectMobile, email: data.suspectEmail,
      bankAccountOrUPI: data.suspectBankOrUPI, remarks: data.suspectRemarks,
      address: {
        houseNo: data.suspectHouseNo, streetName: data.suspectStreetName,
        colony: data.suspectColony, villageTownCity: data.suspectVillage,
        country: data.suspectCountry, state: data.suspectState,
        district: data.suspectDistrict, pincode: data.suspectPincode,
      },
    };
  };

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const result = await createTicket({
        victimDetails: {
          name: data.victimName, contactNumber: data.victimContact,
          alternateContact: data.alternateContact, address: data.address,
          district: data.district, state: data.state, email: data.email,
        },
        nearestPoliceStation: data.nearestPoliceStation,
        identificationDetails: data.identificationType
          ? { type: data.identificationType as never, id: data.identificationId }
          : undefined,
        sensitivity: data.sensitivity, priority: data.priority,
        categoryDetails: {
          category: data.category, subCategory: data.subCategory,
          platform: data.platform, platformUrl: data.platformUrl,
          platformHandle: data.platformHandle, description: data.description,
        },
        suspectDetails: buildSuspectDetails(data),
        transactions: isFinancial ? data.transactions : [],
        incidentDateTime: data.incidentDateTime,
      });
      if (result.success && result.complaintId) {
        setSubmittedId(result.complaintId);
        setIsGoldenHourResult(result.isGoldenHour ?? false);
        endCall();
        toast({ title: 'Complaint Registered', description: `ID: ${result.complaintId}` });
      } else {
        throw new Error(result.error ?? 'Unknown error');
      }
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePartialSave = async () => {
    const data = getValues();
    if (!data.victimName || !data.victimContact || !data.category || !data.subCategory) {
      toast({
        title: 'Cannot Save Draft',
        description: 'Name, Mobile, Category and Sub-category are required for a draft.',
        variant: 'destructive',
      });
      return;
    }
    setIsSavingDraft(true);
    try {
      const result = await saveDraft({
        victimDetails: {
          name: data.victimName, contactNumber: data.victimContact,
          alternateContact: data.alternateContact, address: data.address,
          district: data.district, state: data.state, email: data.email,
        },
        nearestPoliceStation: data.nearestPoliceStation,
        identificationDetails: data.identificationType
          ? { type: data.identificationType as never, id: data.identificationId }
          : undefined,
        sensitivity: data.sensitivity, priority: data.priority,
        categoryDetails: {
          category: data.category, subCategory: data.subCategory,
          platform: data.platform, platformUrl: data.platformUrl,
          platformHandle: data.platformHandle, description: data.description,
        },
        suspectDetails: buildSuspectDetails(data),
        transactions: data.transactions,
        incidentDateTime: data.incidentDateTime,
      });
      if (result.success) {
        toast({ title: 'Draft Saved', description: `Draft ID: ${result.complaintId}` });
        router.push('/dashboard/l1/my-tickets');
      } else {
        throw new Error(result.error ?? 'Failed to save');
      }
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' });
    } finally {
      setIsSavingDraft(false);
    }
  };

  /* ── Success Screen ── */
  if (submittedId) {
    return (
      <div className="max-w-lg mx-auto mt-16 animate-fade-in-up">
        <div className={cn(
          'form-section text-center',
          isGoldenHourResult ? 'border-red-300 dark:border-red-800/30' : 'border-green-300 dark:border-green-800/30'
        )}>
          <div className={cn(
            'inline-flex items-center justify-center w-16 h-16 rounded-full mb-5 mx-auto',
            isGoldenHourResult
              ? 'bg-red-50 border-2 border-red-200 dark:bg-red-900/10 dark:border-red-800/30'
              : 'bg-green-50 border-2 border-green-200 dark:bg-green-900/10 dark:border-green-800/30'
          )}>
            {isGoldenHourResult
              ? <Zap className="w-8 h-8 text-red-500" />
              : <CheckCircle2 className="w-8 h-8 text-green-600" />}
          </div>
          <h2 className="text-xl font-bold font-outfit mb-1" style={{ color: 'var(--text-heading)' }}>
            {isGoldenHourResult ? 'Golden Hour Case Registered' : 'Complaint Registered'}
          </h2>
          {isGoldenHourResult && (
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              L2 officers have been alerted. Immediate action in progress.
            </p>
          )}
          <div className="rounded-xl p-4 mb-6 text-left"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
            <p className="text-[11px] uppercase tracking-wider font-medium mb-1"
              style={{ color: 'var(--text-muted)' }}>Complaint ID</p>
            <p className="font-mono text-xl font-bold tracking-widest"
              style={{ color: 'var(--text-heading)' }}>{submittedId}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/dashboard/l1/wrap-up?id=' + submittedId)}
              className="btn-primary h-9 text-sm px-5">
              Select Disposition
            </button>
            <button
              onClick={() => { setSubmittedId(null); setIsGoldenHourResult(false); setCurrentStep(1); }}
              className="h-9 px-5 text-sm font-medium rounded-lg border transition-colors"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-body)', background: 'var(--bg-surface)' }}>
              New Complaint
            </button>
          </div>
        </div>
      </div>
    );
  }

  const logicalStep = getLogicalStep(currentStep);

  return (
    <div className="w-full animate-fade-in-up">
      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">New Complaint Registration</h1>
          <p className="mandatory-note mt-1">All fields marked * are mandatory</p>
        </div>
        <div className="flex items-center gap-2">
          {telState === 'ON_CALL' && (
            <div className="flex items-center gap-1.5 rounded-lg px-3 py-1.5"
              style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-700 text-xs font-semibold">Live Call</span>
            </div>
          )}
          <button type="button" onClick={handlePartialSave} disabled={isSavingDraft}
            className="flex items-center gap-1.5 h-9 px-4 text-sm font-medium rounded-lg border transition-colors"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-body)', background: 'var(--bg-surface)' }}>
            {isSavingDraft
              ? <><span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />Saving...</>
              : <><Save className="w-3.5 h-3.5" />Save Draft</>}
          </button>
        </div>
      </div>

      {/* ── Step Indicator ── */}
      <div className="mb-8 px-2">
        <StepIndicator current={currentStep} total={effectiveSteps} isFinancial={isFinancial} />
      </div>

      {/* ── Main layout: Form (left) + Sidebar (right) ── */}
      <div className="flex gap-6 items-start">
        {/* ─── FORM AREA ─── */}
        <div className="flex-1 min-w-0">
          <form onSubmit={handleSubmit(onSubmit)}>

            {/* Step 1: Victim Details */}
            {logicalStep === 1 && (
              <div className="form-section space-y-6">
                <p className="form-section-title">
                  <User className="w-4 h-4 text-blue-600" />
                  Victim Details
                </p>

                {/* Row 1: Name, Mobile, Alternate */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  <FieldGroup label="Full Name" error={errors.victimName?.message} required>
                    <CrmInput {...register('victimName')} placeholder="Enter full name" />
                  </FieldGroup>
                  <FieldGroup label="Mobile Number" error={errors.victimContact?.message} required>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                        style={{ color: 'var(--text-muted)' }} />
                      <CrmInput {...register('victimContact')} placeholder="Enter 10-digit mobile number"
                        maxLength={10} className="pl-9" />
                    </div>
                  </FieldGroup>
                  <FieldGroup label="Alternate Contact">
                    <CrmInput {...register('alternateContact')} placeholder="Alternate number" />
                  </FieldGroup>
                </div>

                {/* Row 2: Email, District, Police Station */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  <FieldGroup label="Email">
                    <CrmInput {...register('email')} type="email" placeholder="Enter email address" />
                  </FieldGroup>
                  <FieldGroup label="District">
                    <Controller name="district" control={control} render={({ field }) => (
                      <Combobox options={DISTRICT_OPTIONS} value={field.value ?? ''} onChange={field.onChange}
                        placeholder="Select District" searchPlaceholder="Search districts..." />
                    )} />
                  </FieldGroup>
                  <FieldGroup label="Nearest Police Station">
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                        style={{ color: 'var(--text-muted)' }} />
                      <CrmInput {...register('nearestPoliceStation')} placeholder="Select Police Station"
                        className="pl-9" />
                    </div>
                  </FieldGroup>
                </div>

                {/* Row 3: Address, ID Type, ID Number */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  <FieldGroup label="Address">
                    <CrmInput {...register('address')} placeholder="Enter full address" />
                  </FieldGroup>
                  <FieldGroup label="Identification Type">
                    <Controller name="identificationType" control={control} render={({ field }) => (
                      <Combobox options={ID_TYPE_OPTIONS} value={field.value ?? ''} onChange={field.onChange}
                        placeholder="Select ID Type" searchPlaceholder="Search..." />
                    )} />
                  </FieldGroup>
                  <FieldGroup label="Identification Number">
                    <CrmInput {...register('identificationId')} placeholder="Enter ID number" />
                  </FieldGroup>
                </div>

                {/* Sensitivity / Priority */}
                <div className="pt-4 border-t space-y-4" style={{ borderColor: 'var(--border-default)' }}>
                  <p className="form-section-title mb-0 border-0 pb-0">
                    <ShieldAlert className="w-4 h-4 text-blue-600" />
                    Mandatory Information
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Controller name="sensitivity" control={control} render={({ field }) => (
                      <YesNoToggle value={field.value} onChange={field.onChange} label="Sensitive Victim" />
                    )} />
                    <Controller name="priority" control={control} render={({ field }) => (
                      <YesNoToggle value={field.value} onChange={field.onChange} label="Priority" />
                    )} />
                  </div>
                  {(watchedSensitivity || watchedPriority) && (
                    <div className="flex gap-2">
                      {watchedSensitivity && (
                        <span className="text-xs px-3 py-1 rounded-full font-medium"
                          style={{ background: 'rgba(124,58,237,0.08)', color: '#6D28D9', border: '1px solid rgba(124,58,237,0.2)' }}>
                          Sensitive
                        </span>
                      )}
                      {watchedPriority && (
                        <span className="text-xs px-3 py-1 rounded-full font-medium"
                          style={{ background: 'rgba(239,68,68,0.08)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.2)' }}>
                          Priority
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Incident & Classification */}
            {logicalStep === 2 && (
              <div className="form-section space-y-6">
                <p className="form-section-title">
                  <Tag className="w-4 h-4 text-blue-600" />
                  Crime Classification &amp; Incident Details
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  <FieldGroup label="Category" error={errors.category?.message} required>
                    <Controller name="category" control={control} render={({ field }) => (
                      <Combobox options={CATEGORY_OPTIONS} value={field.value} onChange={field.onChange}
                        placeholder="Select crime category..." searchPlaceholder="Search categories..." />
                    )} />
                  </FieldGroup>
                  <FieldGroup label="Sub-Category" error={errors.subCategory?.message} required>
                    <Controller name="subCategory" control={control} render={({ field }) => (
                      <Combobox options={subCategoryOptions} value={field.value} onChange={field.onChange}
                        placeholder={watchedCategory ? 'Select sub-category...' : 'Select category first'}
                        searchPlaceholder="Search..." disabled={!watchedCategory} />
                    )} />
                  </FieldGroup>
                  <FieldGroup label="Incident Date & Time">
                    <CrmInput {...register('incidentDateTime')} type="datetime-local"
                      max={new Date().toISOString().slice(0, 16)} />
                  </FieldGroup>
                </div>

                {requiresPlatform && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FieldGroup label="Platform">
                      <Controller name="platform" control={control} render={({ field }) => (
                        <Combobox options={PLATFORM_OPTIONS} value={field.value ?? ''} onChange={field.onChange}
                          placeholder="Select platform..." searchPlaceholder="Search platforms..." />
                      )} />
                    </FieldGroup>
                    <FieldGroup label="Profile URL">
                      <CrmInput {...register('platformUrl')} placeholder="https://..." />
                    </FieldGroup>
                    <FieldGroup label="Handle / Username">
                      <CrmInput {...register('platformHandle')} placeholder="@username" />
                    </FieldGroup>
                  </div>
                )}

                <FieldGroup label="Incident Description / Narration">
                  <CrmTextarea {...register('description')}
                    placeholder="Brief description of the incident as narrated by the victim..." rows={4} />
                </FieldGroup>

                {isFinancial && (
                  <div className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm"
                    style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span style={{ color: '#92400E' }}>
                      This is a financial fraud category — you will enter transactions in the next step
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Financial Transactions */}
            {logicalStep === 3 && isFinancial && (
              <div className="form-section">
                <div className="flex items-center justify-between mb-6">
                  <p className="form-section-title flex items-center gap-2 mb-0 border-0 pb-0">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    Financial Transactions
                  </p>
                  <button type="button" onClick={addTransaction}
                    className="btn-primary h-8 text-sm px-3 gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Add Transaction
                  </button>
                </div>

                {fields.length === 0 ? (
                  <div className="py-12 text-center rounded-xl border border-dashed"
                    style={{ borderColor: 'var(--border-default)' }}>
                    <CreditCard className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      No transactions added
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      Click &ldquo;Add Transaction&rdquo; to log financial transactions
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <div key={field.id} className="p-5 rounded-xl border"
                        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xs font-semibold uppercase tracking-wider"
                            style={{ color: 'var(--text-muted)' }}>
                            Transaction #{index + 1}
                          </span>
                          <button type="button" onClick={() => remove(index)}
                            className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
                            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626' }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <FieldGroup label="UTR / Txn ID" error={errors.transactions?.[index]?.utrNumber?.message} required>
                            <CrmInput {...register(`transactions.${index}.utrNumber`)} placeholder="UTR number" />
                          </FieldGroup>
                          <FieldGroup label="Bank / Wallet" required>
                            <CrmInput {...register(`transactions.${index}.bankName`)} placeholder="Bank name" />
                          </FieldGroup>
                          <FieldGroup label="Amount (₹)" required>
                            <div className="relative">
                              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                                style={{ color: 'var(--text-muted)' }} />
                              <CrmInput {...register(`transactions.${index}.transactionAmount`)}
                                type="number" min="1" step="1" placeholder="0" className="pl-9" />
                            </div>
                          </FieldGroup>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <FieldGroup label="Account / UPI">
                            <CrmInput {...register(`transactions.${index}.accountNumber`)} placeholder="Account number" />
                          </FieldGroup>
                          <FieldGroup label="UPI ID">
                            <CrmInput {...register(`transactions.${index}.upiId`)} placeholder="user@upi" />
                          </FieldGroup>
                          <FieldGroup label="Date & Time" required>
                            <CrmInput {...register(`transactions.${index}.transactionDateTime`)} type="datetime-local" />
                          </FieldGroup>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FieldGroup label="Reference No.">
                            <CrmInput {...register(`transactions.${index}.referenceNumber`)} placeholder="Optional" />
                          </FieldGroup>
                          <FieldGroup label="Payment Gateway">
                            <CrmInput {...register(`transactions.${index}.paymentGatewayDetails`)} placeholder="e.g. Razorpay" />
                          </FieldGroup>
                          <FieldGroup label="Merchant Info">
                            <CrmInput {...register(`transactions.${index}.merchantInfo`)} placeholder="Merchant name/ID" />
                          </FieldGroup>
                        </div>
                      </div>
                    ))}

                    <div className="flex justify-end">
                      <div className="flex items-center gap-3 rounded-xl px-5 py-3"
                        style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Amount at Risk:</span>
                        <span className="text-xl font-bold font-outfit" style={{ color: '#D97706' }}>
                          ₹{totalFraudAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Suspect Details */}
            {logicalStep === 4 && (
              <div className="form-section space-y-6">
                <div className="flex items-center justify-between">
                  <p className="form-section-title flex items-center gap-2 mb-0 border-0 pb-0">
                    <UserX className="w-4 h-4 text-blue-600" />
                    Suspect Details
                  </p>
                  <span className="text-[11px] px-2.5 py-1 rounded-md font-medium"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>
                    All fields optional
                  </span>
                </div>
                <div className="border-b pb-2" style={{ borderColor: 'var(--border-default)' }} />

                <FieldGroup label="Suspected Website URLs / Social Media Handles">
                  <CrmInput {...register('platformUrl')} placeholder="https://... or @handle" />
                </FieldGroup>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3"
                    style={{ color: 'var(--text-muted)' }}>Personal Details</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FieldGroup label="Name"><CrmInput {...register('suspectName')} placeholder="Name" /></FieldGroup>
                    <FieldGroup label="Mobile"><CrmInput {...register('suspectMobile')} placeholder="Mobile" /></FieldGroup>
                    <FieldGroup label="Email"><CrmInput {...register('suspectEmail')} type="email" placeholder="Email" /></FieldGroup>
                    <FieldGroup label="Bank / UPI"><CrmInput {...register('suspectBankOrUPI')} placeholder="Account or UPI" /></FieldGroup>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3"
                    style={{ color: 'var(--text-muted)' }}>Address</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FieldGroup label="House No."><CrmInput {...register('suspectHouseNo')} placeholder="House No." /></FieldGroup>
                    <FieldGroup label="Street"><CrmInput {...register('suspectStreetName')} placeholder="Street" /></FieldGroup>
                    <FieldGroup label="Colony"><CrmInput {...register('suspectColony')} placeholder="Colony" /></FieldGroup>
                    <FieldGroup label="Village / City"><CrmInput {...register('suspectVillage')} placeholder="Village / City" /></FieldGroup>
                    <FieldGroup label="Country"><CrmInput {...register('suspectCountry')} placeholder="Country" /></FieldGroup>
                    <FieldGroup label="State"><CrmInput {...register('suspectState')} placeholder="State" /></FieldGroup>
                    <FieldGroup label="District"><CrmInput {...register('suspectDistrict')} placeholder="District" /></FieldGroup>
                    <FieldGroup label="Pincode"><CrmInput {...register('suspectPincode')} placeholder="Pincode" maxLength={6} /></FieldGroup>
                  </div>
                </div>

                <FieldGroup label="Suspect Remarks">
                  <CrmTextarea {...register('suspectRemarks')} placeholder="Any additional information about the suspect..." rows={3} />
                </FieldGroup>
              </div>
            )}

            {/* Step 5: Review & Submit */}
            {logicalStep === 5 && (
              <div className="form-section space-y-5">
                <p className="form-section-title">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  Review &amp; Submit
                </p>

                <div className="space-y-3">
                  <ReviewSection title="Victim">
                    <ReviewRow label="Name"     value={getValues('victimName')} />
                    <ReviewRow label="Mobile"   value={getValues('victimContact')} mono />
                    <ReviewRow label="District" value={getValues('district') || '—'} />
                    <ReviewRow label="Email"    value={getValues('email') || '—'} />
                  </ReviewSection>
                  <ReviewSection title="Classification">
                    <ReviewRow label="Category"     value={getValues('category')} />
                    <ReviewRow label="Sub-Category" value={getValues('subCategory')} />
                    {getValues('incidentDateTime') && (
                      <ReviewRow label="Incident Time"
                        value={new Date(getValues('incidentDateTime')!).toLocaleString('en-IN')} />
                    )}
                  </ReviewSection>
                  {(watchedSensitivity || watchedPriority) && (
                    <ReviewSection title="Flags">
                      {watchedSensitivity && <ReviewRow label="Sensitivity" value="Yes — Sensitive Case" />}
                      {watchedPriority    && <ReviewRow label="Priority"    value="Yes — Priority Case" />}
                    </ReviewSection>
                  )}
                  {isFinancial && fields.length > 0 && (
                    <ReviewSection title="Financial">
                      <ReviewRow label="Transactions" value={`${fields.length} transaction(s)`} />
                      <ReviewRow label="Total Amount" value={`₹${totalFraudAmount.toLocaleString('en-IN')}`} />
                    </ReviewSection>
                  )}
                </div>

                <button type="submit" disabled={isSubmitting}
                  className="btn-primary w-full h-11 text-sm font-semibold justify-center">
                  {isSubmitting
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Registering...</>
                    : 'Register Complaint'}
                </button>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <button type="button" onClick={handleBack} disabled={currentStep === 1}
                className="flex items-center gap-1.5 h-9 px-4 text-sm font-medium rounded-lg border transition-colors disabled:opacity-30"
                style={{ borderColor: 'var(--border-default)', color: 'var(--text-body)', background: 'var(--bg-surface)' }}>
                <ChevronLeft className="w-4 h-4" /> Back
              </button>

              <div className="flex items-center gap-1.5">
                {Array.from({ length: effectiveSteps }).map((_, i) => (
                  <div key={i} className={cn('rounded-full transition-all', i + 1 === currentStep
                    ? 'w-5 h-1.5 bg-blue-600'
                    : i + 1 < currentStep ? 'w-1.5 h-1.5 bg-blue-400'
                    : 'w-1.5 h-1.5 bg-[var(--border-default)]')} />
                ))}
              </div>

              {currentStep < effectiveSteps ? (
                <button type="button" onClick={handleNext}
                  className="btn-primary h-9 text-sm px-5 gap-1.5">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="w-20" />
              )}
            </div>
          </form>
        </div>

        {/* ─── RIGHT SIDEBAR PANELS ─── */}
        <div className="w-72 shrink-0 space-y-4 hidden lg:block">
          <GoldenHourPanel incidentDateTime={watchedIncidentDT} />
          {isFinancial && (
            <ComplaintSummaryPanel
              totalFraud={totalFraudAmount}
              transactions={watchedTransactions}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Review helpers ─── */
function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-default)' }}>
      <div className="px-4 py-2 border-b" style={{ background: '#EFF6FF', borderColor: 'var(--border-default)' }}>
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#2563EB' }}>
          {title}
        </span>
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--border-muted)' }}>{children}</div>
    </div>
  );
}
function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center px-4 py-2.5 gap-4">
      <span className="text-xs w-28 shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className={cn('text-sm flex-1', mono && 'font-mono')} style={{ color: 'var(--text-body)' }}>
        {value}
      </span>
    </div>
  );
}
