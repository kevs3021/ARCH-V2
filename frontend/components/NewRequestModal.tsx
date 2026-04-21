// components/requests/NewRequestModal.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X, FileText, Loader2, ChevronDown, Search } from 'lucide-react';

interface NewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Branch {
  id: string;
  branch: string;
}

interface Campaign {
  id: string;
  campaign_name: string;
}

const COMPANY_OPTIONS = ['SPMA', 'SPMC', 'SPM Dubai'];

const REQUEST_TYPE_OPTIONS = [
  'Advanced Request',
  'For Reimbursement',
  'Direct Expense',
  'Credit Card',
  'Repairs and Maintenance',
  'Rental Expenses',
];

function SimpleDropdown({
  value,
  onChange,
  options,
  placeholder,
  label,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  label: string;
  required?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-foreground mb-1.5">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <div className="relative">
        <button
          type="button"
          className={`input-field w-full flex items-center justify-between select-none rounded-sm min-w-0 ${!value && required ? 'border-destructive' : ''}`}
          onClick={() => setIsOpen((current) => !current)}
        >
          <span className={`truncate ${value ? 'text-foreground' : 'text-muted-foreground'}`}>
            {value || placeholder}
          </span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 dropdown-panel border border-border/50 rounded-sm shadow-lg bg-background">
            <div className="max-h-48 overflow-y-auto p-1">
              {options.length === 0 ? (
                <div className="p-3 text-center text-muted-foreground text-sm">No options</div>
              ) : (
                options.map((opt) => {
                  const isSelected = opt === value;
                  return (
                    <button
                      key={opt}
                      type="button"
                      className={`w-full text-left px-3 py-2 rounded-sm hover:bg-primary/10 text-sm ${isSelected ? 'font-semibold text-primary' : 'text-foreground'}`}
                      onClick={() => {
                        onChange(opt);
                        setIsOpen(false);
                      }}
                    >
                      {opt}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SearchableDropdown({
  value,
  onChange,
  options,
  placeholder,
  label,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { id: string; branch?: string; campaign_name?: string }[];
  placeholder: string;
  label: string;
  required?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const displayKey = options.length > 0 ? ('branch' in options[0] ? 'branch' : 'campaign_name') : '';
  const filteredOptions = options.filter((opt) =>
    displayKey &&
    (opt[displayKey as keyof typeof opt] as string)
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = displayKey
    ? options.find(
        (opt) => (opt[displayKey as keyof typeof opt] as string) === value
      )
    : undefined;

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-foreground mb-1.5">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <div className="relative">
        <button
          type="button"
          className={`input-field w-full flex items-center justify-between select-none rounded-sm min-w-0 ${!value && required ? 'border-destructive' : ''}`}
          onClick={() => setIsOpen((current) => !current)}
        >
          <span className={`truncate ${value ? 'text-foreground' : 'text-muted-foreground'}`}>
            {selectedOption ? (selectedOption[displayKey as keyof typeof selectedOption] as string) : placeholder}
          </span>
          <div className="flex items-center gap-2 flex-shrink-0">
            {value && (
              <X
                className="w-4 h-4 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
              />
            )}
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 dropdown-panel border border-border/50 rounded-sm shadow-lg max-h-80 overflow-hidden bg-background">
            <div className="p-2 border-b border-border/50" style={{ minHeight: '44px' }}>
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-transparent border-none outline-none text-sm text-foreground rounded-sm"
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto p-1">
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-center text-muted-foreground text-sm">No results found</div>
              ) : (
                filteredOptions.map((opt) => {
                  const optionValue = opt[displayKey as keyof typeof opt] as string;
                  const isSelected = optionValue === value;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className={`w-full text-left px-3 py-2 rounded-sm hover:bg-primary/10 text-sm ${isSelected ? 'font-semibold text-primary' : 'text-foreground'}`}
                      onClick={() => {
                        onChange(optionValue);
                        setIsOpen(false);
                        setSearch('');
                      }}
                    >
                      {optionValue}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function NewRequestModal({ isOpen, onClose }: NewRequestModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const [form, setForm] = useState({
    request_title: '',
    request_type: '',
    company: '',
    branch: '',
    campaign: '',
    date_needed: '',
    remarks: '',
  });

  // Fetch branches on mount
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const [branchRes, campaignRes] = await Promise.all([
          fetch('/api/branches'),
          fetch('/api/campaigns'),
        ]);

        if (cancelled) return;

        if (branchRes.ok) {
          const branchData = await branchRes.json();
          setBranches(branchData);
        }

        if (campaignRes.ok) {
          const campaignData = await campaignRes.json();
          setCampaigns(campaignData);
        }
      } catch (err) {
        console.error('Failed to fetch branches or campaigns:', err);
      }
    };

    if (isOpen) {
      fetchData();
    }
    return () => { cancelled = true; };
  }, [isOpen]);

  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (!form.request_type) {
      setError('Request Type is required');
      setIsSubmitting(false);
      return;
    }
    if (!form.company) {
      setError('Company is required');
      setIsSubmitting(false);
      return;
    }
    if (!form.branch) {
      setError('Branch is required');
      setIsSubmitting(false);
      return;
    }
    if (!form.campaign) {
      setError('Campaign is required');
      setIsSubmitting(false);
      return;
    }
    if (!form.date_needed) {
      setError('Date Needed is required');
      setIsSubmitting(false);
      return;
    }
    if (!form.remarks) {
      setError('Remarks is required');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          date_needed: form.date_needed || null,
        }),
      });

      const response = await res.json();

      if (!res.ok) {
        throw new Error(response.error || 'Failed to create request');
      }

      const requestId = response.data?.request_id || response.data?.id;
      onClose();
      setForm({
        request_title: '',
        request_type: '',
        company: '',
        branch: '',
        campaign: '',
        date_needed: '',
        remarks: '',
      });
      if (requestId) {
        router.push(`/others/advances-requests/${requestId}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }, [form, onClose, router]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative p-10 w-full max-w-2xl mx-4 glass-card max-h-[90vh] overflow-y-auto" style={{ borderRadius: '8px' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <h2 className="font-display text-xl font-semibold text-foreground">New Request</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-sm bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-error-container/80 rounded-sm">
            <p className="text-on-error-container text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Request Title */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Request Title <span className="text-destructive">*</span>
            </label>
            <input
              name="request_title"
              value={form.request_title}
              onChange={handleChange}
              className="input-field rounded-sm"
              placeholder="e.g. Team lunch allowance"
              required
            />
          </div>

          {/* Request Type */}
          <SimpleDropdown
            value={form.request_type}
            onChange={(value) => setForm((prev) => ({ ...prev, request_type: value }))}
            options={REQUEST_TYPE_OPTIONS}
            placeholder="Select Request Type"
            label="Request Type"
            required
          />

          {/* Company, Branch, Campaign */}
          <div className="grid grid-cols-3 gap-4">
            <div className="min-w-0">
              <SimpleDropdown
                value={form.company}
                onChange={(value) => setForm((prev) => ({ ...prev, company: value }))}
                options={COMPANY_OPTIONS}
                placeholder="Select Company"
                label="Company"
                required
              />
            </div>
            <div className="min-w-0">
              <SearchableDropdown
                value={form.branch}
                onChange={(value) => setForm((prev) => ({ ...prev, branch: value }))}
                options={branches}
                placeholder="Select Branch"
                label="Branch"
                required
              />
            </div>
            <div className="min-w-0">
              <SearchableDropdown
                value={form.campaign}
                onChange={(value) => setForm((prev) => ({ ...prev, campaign: value }))}
                options={campaigns}
                placeholder="Select Campaign"
                label="Campaign"
                required
              />
            </div>
          </div>

          {/* Date Needed */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Date Needed <span className="text-destructive">*</span>
            </label>
            <input
              name="date_needed"
              type="date"
              value={form.date_needed}
              onChange={handleChange}
              className={`input-field rounded-sm ${!form.date_needed ? 'border-destructive' : ''}`}
              required
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Remarks <span className="text-destructive">*</span>
            </label>
            <textarea
              name="remarks"
              value={form.remarks}
              onChange={handleChange}
              className={`input-field min-h-[80px] resize-none rounded-md ${!form.remarks ? 'border-destructive' : ''}`}
              placeholder="Additional details..."
              required
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Request'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
