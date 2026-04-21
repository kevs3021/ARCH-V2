'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Search, ChevronDown, X } from 'lucide-react';
import { queueAuthNotification } from '@/lib/authNotifications';

type Provider = 'lark' | null;

type LarkData = {
  larkUserId: string;
  companyEmail?: string;
  email?: string;
  firstName: string;
  lastName: string;
  profileUrl: string;
};

type Branch = { id: string; branch: string };
type Campaign = { id: string; campaign_name: string };

function formatName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
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
    displayKey && (opt[displayKey as keyof typeof opt] as string)
      ?.toLowerCase()
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

  const selectedOption = displayKey ? options.find(
    (opt) => (opt[displayKey as keyof typeof opt] as string) === value
  ) : undefined;

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-foreground mb-2">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <div className="relative">
        <div
          className="input-field flex items-center justify-between cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
            {selectedOption ? (selectedOption[displayKey as keyof typeof selectedOption] as string) : placeholder}
          </span>
          <div className="flex items-center gap-2">
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
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 dropdown-panel border border-border/50 rounded-lg shadow-lg max-h-80 overflow-hidden">
            <div className="p-2 border-b border-border/50" style={{ minHeight: '44px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Search className="w-4 h-4 text-muted-foreground" style={{ width: '16px', height: '16px', flexShrink: 0, marginLeft: '4px' }} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  style={{ flex: 1, padding: '8px', fontSize: '14px', background: 'transparent', border: 'none', outline: 'none', minWidth: 0 }}
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
                    <div
                      key={opt.id}
                      className="px-3 py-2 rounded-lg cursor-pointer hover:bg-primary/10 text-sm"
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        color: isSelected ? '#3966d0' : 'inherit',
                        fontWeight: isSelected ? 600 : 400
                      }}
                      onClick={() => {
                        onChange(optionValue);
                        setIsOpen(false);
                        setSearch('');
                      }}
                    >
                      <span>{optionValue}</span>
                      {isSelected && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#3966d0' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
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

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [provider, setProvider] = useState<Provider>(null);
  const [larkData, setLarkData] = useState<LarkData | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    branch: '',
    campaign: '',
    role: 'requestor',
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/branches').then((res) => res.json()),
      fetch('/api/campaigns').then((res) => res.json()),
    ])
      .then(([branchData, campaignData]) => {
        if (Array.isArray(branchData)) setBranches(branchData);
        if (Array.isArray(campaignData)) setCampaigns(campaignData);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch('/api/auth/lark/pending')
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data) => {
        if (data.success) {
          setProvider('lark');
          const pending = data.data;
          if (pending) {
            setLarkData(pending);
            setForm((prev) => ({
              ...prev,
              firstName: pending.firstName || prev.firstName,
              lastName: pending.lastName || prev.lastName,
            }));
          }
        } else {
          throw new Error();
        }
      })
      
      .catch(() => router.push('/login'))
      .finally(() => setIsLoading(false));
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!provider) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const endpoint = '/api/auth/lark/register';

      const formattedForm = {
        ...form,
        firstName: formatName(form.firstName),
        lastName: formatName(form.lastName),
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedForm),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      if (provider === 'lark') {
        queueAuthNotification({
          tone: 'message',
          title: 'Pending Approval',
          message: data.notification?.message || 'Your account is pending for approval',
        });
      }

      if (data.redirectTo) {
        router.push(data.redirectTo);
      } else {
        router.push('/home');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md relative z-10">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl hero-gradient flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-2xl">A</span>
          </div>
          <div>
            <span className="font-display font-bold text-3xl text-foreground tracking-tight">ARCH</span>
            <p className="text-xs text-muted-foreground -mt-1">The Luminous Ledger</p>
          </div>
        </div>

        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl font-semibold text-foreground mb-2">
              Complete Your Profile
            </h1>
            <p className="text-muted-foreground text-sm">
              A few more details to set up your account.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-error-container/80 rounded-xl">
              <p className="text-on-error-container text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {larkData?.profileUrl && (
              <div className="flex justify-center mb-4">
                <img
                  src={larkData.profileUrl}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border-2 border-primary/30"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  First Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
                  className="input-field"
                  placeholder="First name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Last Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
                  className="input-field"
                  placeholder="Last name"
                  required
                />
              </div>
            </div>

            <SearchableDropdown
              value={form.branch}
              onChange={(value) => setForm((prev) => ({ ...prev, branch: value }))}
              options={branches}
              placeholder="Select a branch"
              label="Branch"
              required
            />

            <SearchableDropdown
              value={form.campaign}
              onChange={(value) => setForm((prev) => ({ ...prev, campaign: value }))}
              options={campaigns}
              placeholder="Select a campaign"
              label="Campaign"
              required
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3.5"
            >
              {isSubmitting ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Complete Registration <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <p className="text-muted-foreground text-sm">
            Already have an account?{' '}
            <a href="/login" className="text-primary hover:text-primary/80 font-medium">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
