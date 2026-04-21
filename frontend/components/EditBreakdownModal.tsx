'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X, Loader2, Edit, ChevronDown, Search } from 'lucide-react';

interface Breakdown {
  breakdown_id: string;
  particulars: string;
  amount: number | null;
  purpose: string | null;
  store: string | null;
}

interface EditBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  breakdown: Breakdown;
}

function ParticularsDropdown({
  value,
  onChange,
  options,
  placeholder,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  required?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase())
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

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-foreground mb-1.5">
        Particulars {required && <span className="text-destructive">*</span>}
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
                  const isSelected = opt === value;
                  return (
                    <button
                      key={opt}
                      type="button"
                      className={`w-full text-left px-3 py-2 rounded-sm hover:bg-primary/10 text-sm ${isSelected ? 'font-semibold text-primary' : 'text-foreground'}`}
                      onClick={() => {
                        onChange(opt);
                        setIsOpen(false);
                        setSearch('');
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

export default function EditBreakdownModal({ isOpen, onClose, breakdown }: EditBreakdownModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [particularsError, setParticularsError] = useState('');
  const [particularsList, setParticularsList] = useState<string[]>([]);

  const [form, setForm] = useState({
    particulars: breakdown.particulars,
    amount: breakdown.amount != null ? String(breakdown.amount) : '',
    purpose: breakdown.purpose ?? '',
    store: breakdown.store ?? '',
  });

  useEffect(() => {
    let cancelled = false;
    if (isOpen) {
      fetch('/api/utilities/ledger?type=particulars')
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled && Array.isArray(data)) {
            const names = data.filter((p: any) => p.name).map((p: any) => p.name);
            setParticularsList(names);
          }
        })
        .catch(() => {});
    }
    return () => { cancelled = true; };
  }, [isOpen]);

  useEffect(() => {
    setForm({
      particulars: breakdown.particulars,
      amount: breakdown.amount != null ? String(breakdown.amount) : '',
      purpose: breakdown.purpose ?? '',
      store: breakdown.store ?? '',
    });
    setError('');
    setParticularsError('');
  }, [breakdown, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'particulars' && particularsError) {
      setParticularsError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.particulars.trim()) {
      setParticularsError('Particulars is required.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const body: Record<string, string | number | null> = {};
    if (form.particulars !== breakdown.particulars) body.particulars = form.particulars;
    const newAmount = form.amount ? parseFloat(form.amount) : null;
    if (newAmount !== breakdown.amount) body.amount = newAmount;
    const newPurpose = form.purpose || null;
    if (newPurpose !== breakdown.purpose) body.purpose = newPurpose;
    const newStore = form.store || null;
    if (newStore !== breakdown.store) body.store = newStore;

    try {
      const res = await fetch(`/api/breakdowns/${breakdown.breakdown_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update breakdown');
      }

      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md mx-4 glass-card p-6 rounded-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Edit className="w-5 h-5 text-primary" />
            </div>
            <h2 className="font-display text-xl font-semibold text-foreground">Edit Breakdown</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors"
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
          <ParticularsDropdown
            value={form.particulars}
            onChange={(value) => setForm((prev) => ({ ...prev, particulars: value }))}
            options={particularsList}
            placeholder="Select Particulars"
            required
          />
          {particularsError && (
            <p className="mt-1.5 text-xs text-destructive">{particularsError}</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Amount</label>
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={handleChange}
                className="input-field rounded-sm"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Store</label>
              <input
                name="store"
                value={form.store}
                onChange={handleChange}
                className="input-field rounded-sm"
                placeholder="Store name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Purpose</label>
            <textarea
              name="purpose"
              value={form.purpose}
              onChange={handleChange}
              className="input-field min-h-[60px] resize-none rounded-sm"
              placeholder="Purpose of this breakdown..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
