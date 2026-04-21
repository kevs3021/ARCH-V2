'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  Wallet, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  LogOut,
  User,
  Sparkles,
  Upload,
  X,
  Edit2,
  Save,
  Loader2,
  ScanLine,
  Check,
  ClipboardCheck,
  FileCheck,
  TrendingUp,
  DollarSign,
  Inbox,
  Bot,
  ThumbsUp,
  ThumbsDown,
  Building2,
  Calendar,
  Tag,
  Download,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface Stats {
  totalRequests: number;
  pendingRequests: number;
  completedRequests: number;
  totalLiquidations: number;
  pendingLiquidations: number;
}

interface AIApprovalRequest {
  id: string;
  title: string;
  requester: string;
  department: string;
  amount: string;
  date: string;
  category: string;
  aiVerdict: 'approved' | 'denied';
  aiReason: string;
}

const MOCK_AI_REQUESTS: AIApprovalRequest[] = [
  {
    id: '1',
    title: 'Office Supplies Purchase - Q2',
    requester: 'John Doe',
    department: 'Operations',
    amount: 'IDR 2,500,000',
    date: '2026-04-05',
    category: 'Advance Request',
    aiVerdict: 'approved',
    aiReason: 'Documentation complete. Budget available.',
  },
  {
    id: '2',
    title: 'Client Dinner Meeting Expense',
    requester: 'Jane Smith',
    department: 'Sales',
    amount: 'IDR 1,850,000',
    date: '2026-04-06',
    category: 'Reimbursement',
    aiVerdict: 'denied',
    aiReason: 'Receipt date does not match meeting invitation.',
  },
  {
    id: '3',
    title: 'Software License - Figma Team',
    requester: 'Mike Johnson',
    department: 'Design',
    amount: 'IDR 12,000,000',
    date: '2026-04-07',
    category: 'Purchase Request',
    aiVerdict: 'approved',
    aiReason: 'Vendor verified. Competitive pricing confirmed.',
  },
];

interface AIReconciliationRequest {
  id: string;
  title: string;
  requester: string;
  department: string;
  requestedAmount: string;
  liquidatedAmount: string;
  date: string;
  category: string;
  aiInsight: string;
  isReconciled: boolean;
  variance: string;
}

const MOCK_RECONCILIATION_REQUESTS: AIReconciliationRequest[] = [
  {
    id: '1',
    title: 'Office Supplies Purchase - Q2',
    requester: 'John Doe',
    department: 'Operations',
    requestedAmount: 'PHP 50,000',
    liquidatedAmount: 'PHP 48,500',
    date: '2026-04-05',
    category: 'Advance Request',
    aiInsight: 'Overspent by PHP 1,500. Missing receipt for transportation costs.',
    isReconciled: false,
    variance: '-PHP 1,500',
  },
  {
    id: '2',
    title: 'Client Dinner Meeting Expense',
    requester: 'Jane Smith',
    department: 'Sales',
    requestedAmount: 'PHP 25,000',
    liquidatedAmount: 'PHP 15,000',
    date: '2026-04-06',
    category: 'Reimbursement',
    aiInsight: 'Pending refund. Requestor has not yet returned the excess PHP 10,000.',
    isReconciled: false,
    variance: '+PHP 10,000',
  },
  {
    id: '3',
    title: 'Software License - Figma Team',
    requester: 'Mike Johnson',
    department: 'Design',
    requestedAmount: 'PHP 120,000',
    liquidatedAmount: 'PHP 120,000',
    date: '2026-04-07',
    category: 'Purchase Request',
    aiInsight: 'Exact match. Invoice and receipts aligned. Ready for validation.',
    isReconciled: true,
    variance: 'PHP 0',
  },
  {
    id: '4',
    title: 'Team Building Event Budget',
    requester: 'Sarah Wilson',
    department: 'HR',
    requestedAmount: 'PHP 80,000',
    liquidatedAmount: 'PHP 78,500',
    date: '2026-04-04',
    category: 'Advance Request',
    aiInsight: 'Requestor has returned the excess amount of PHP 1,500. Deposit slip on file.',
    isReconciled: true,
    variance: 'PHP 0',
  },
  {
    id: '5',
    title: 'Hardware Upgrade - Engineering',
    requester: 'David Chen',
    department: 'Engineering',
    requestedAmount: 'PHP 85,000',
    liquidatedAmount: 'PHP 91,000',
    date: '2026-04-03',
    category: 'Purchase Request',
    aiInsight: 'Overspent by PHP 6,000. Missing purchase order for additional items.',
    isReconciled: false,
    variance: '-PHP 6,000',
  },
];

interface DetectedField {
  id: string;
  label: string;
  value: string;
  editable: boolean;
}

type RequestType = 'Advance Request' | 'Reimbursement' | 'Purchase Request';

const REQUEST_TYPES: RequestType[] = ['Advance Request', 'Reimbursement', 'Purchase Request'];

const PREDEFINED_BREAKDOWN = [
  { id: '1', description: 'Office Supplies', amount: 150000, category: 'Operations' },
  { id: '2', description: 'Travel Expenses', amount: 75000, category: 'Travel' },
  { id: '3', description: 'Software License', amount: 250000, category: 'IT' },
];

const SCAN_STEPS = [
  'Initializing OCR engine...',
  'Analyzing document structure...',
  'Detecting text regions...',
  'Extracting key fields...',
  'Parsing financial data...',
  'Identifying request type...',
  'Generating breakdown...',
  'Complete!',
];

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalRequests: 0,
    pendingRequests: 0,
    completedRequests: 0,
    totalLiquidations: 0,
    pendingLiquidations: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // New request modal states
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showDocumentUploadModal, setShowDocumentUploadModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [currentScanStep, setCurrentScanStep] = useState(0);
  const [detectedFields, setDetectedFields] = useState<DetectedField[]>([]);
  const [detectedRequestType, setDetectedRequestType] = useState<RequestType>('Advance Request');
  const [breakdown, setBreakdown] = useState(PREDEFINED_BREAKDOWN);
  const [isEditing, setIsEditing] = useState(false);
  const [simulatedRole, setSimulatedRole] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (cancelled) return;
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          router.push('/login');
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Auth check failed:', error);
          router.push('/login');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    checkAuth();
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    const checkSimulatedRole = () => {
      const role = (window as any).__SIMULATED_ROLE__;
      setSimulatedRole(role);
    };
    checkSimulatedRole();
    const interval = setInterval(checkSimulatedRole, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isScanning && scanProgress < 100) {
      interval = setInterval(() => {
        setScanProgress((prev) => {
          const next = prev + Math.random() * 8 + 2;
          if (next >= 100) {
            setIsScanning(false);
            return 100;
          }
          return next;
        });
        setCurrentScanStep((prev) => Math.min(prev + 1, SCAN_STEPS.length - 2));
      }, 600);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isScanning, scanProgress]);

  const simulateScan = useCallback(() => {
    setIsScanning(true);
    setScanProgress(0);
    setCurrentScanStep(0);
  }, []);

  const finalizeScan = useCallback(() => {
    setDetectedFields([
      { id: 'date', label: 'Date', value: '2026-04-07', editable: true },
      { id: 'requester', label: 'Requester', value: user?.name || 'John Doe', editable: true },
      { id: 'department', label: 'Department', value: 'Engineering', editable: true },
      { id: 'payee', label: 'Payee/Store', value: 'PT Maju Jaya', editable: true },
      { id: 'total', label: 'Total Amount', value: 'IDR 475,000', editable: false },
    ]);
    setDetectedRequestType('Advance Request');
    setBreakdown(PREDEFINED_BREAKDOWN);
  }, [user?.name]);

  useEffect(() => {
    if (scanProgress >= 100 && !isScanning) {
      finalizeScan();
    }
  }, [scanProgress, isScanning]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      simulateScan();
    }
  }, []);

  const handleStartNewRequest = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleStartDocumentUpload = useCallback(() => {
    setShowDocumentUploadModal(true);
  }, []);

  const handleDocumentFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadedFile(file);
      setUploadedFileUrl(URL.createObjectURL(file));
      simulateScan();
    }
  }, []);

  const handleCloseDocumentModal = useCallback(() => {
    setShowDocumentUploadModal(false);
    setUploadedFile(null);
    if (uploadedFileUrl) {
      URL.revokeObjectURL(uploadedFileUrl);
    }
    setUploadedFileUrl(null);
    setIsScanning(false);
    setScanProgress(0);
    setDetectedFields([]);
    setBreakdown(PREDEFINED_BREAKDOWN);
    setIsEditing(false);
  }, [uploadedFileUrl]);

  const handleEditToggle = useCallback(() => {
    setIsEditing((prev) => !prev);
  }, []);

  const handleFieldChange = useCallback((id: string, value: string) => {
    setDetectedFields((prev) =>
      prev.map((field) => (field.id === id ? { ...field, value } : field))
    );
  }, []);

  const handleBreakdownChange = useCallback((id: string, field: 'description' | 'amount', value: string) => {
    setBreakdown((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, [field]: field === 'amount' ? parseInt(value) || 0 : value }
          : item
      )
    );
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowNewRequestModal(false);
    setIsScanning(false);
    setScanProgress(0);
    setDetectedFields([]);
    setIsEditing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleSubmit = useCallback(() => {
    console.log('Submit (mockup):', {
      requestType: detectedRequestType,
      fields: detectedFields,
      breakdown,
    });
    handleCloseDocumentModal();
  }, [detectedRequestType, detectedFields, breakdown, handleCloseDocumentModal]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleFileUpload}
      />

      <main className="max-w-screen-2xl mx-auto px-6 py-8 relative z-10">
        {simulatedRole === 'approver' ? (
          <ApproverHome user={user} />
        ) : simulatedRole === 'accounting' ? (
          <AccountingHome 
            user={user}
            showExportModal={showExportModal}
            setShowExportModal={setShowExportModal}
            exportStartDate={exportStartDate}
            setExportStartDate={setExportStartDate}
            exportEndDate={exportEndDate}
            setExportEndDate={setExportEndDate}
          />
        ) : (
          <RequestorHome 
            user={user} 
            stats={stats}
            handleStartNewRequest={handleStartNewRequest}
            handleStartDocumentUpload={handleStartDocumentUpload}
          />
        )}
      </main>

      {/* New Request Modal */}
      <AnimatePresence>
        {showNewRequestModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl max-h-[90vh] glass-card rounded-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-border/30">
                <h2 className="font-display text-xl font-semibold text-foreground">
                  Create New Request
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 rounded-xl hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {isScanning || scanProgress > 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 relative">
                      <div 
                        className="absolute inset-0 rounded-full border-2 border-primary/20"
                        style={{
                          background: `conic-gradient(from 0deg, transparent ${scanProgress * 3.6}deg, rgba(99, 102, 241, 0.3) ${scanProgress * 3.6}deg)`,
                        }}
                      />
                      <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-2">
                      {SCAN_STEPS[currentScanStep]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Scanning document... {Math.round(scanProgress)}%
                    </p>
                  </div>
                ) : detectedFields.length > 0 ? (
                  <div className="space-y-4">
                    {/* Request Type */}
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Request Type
                      </label>
                      <select
                        value={detectedRequestType}
                        onChange={(e) => setDetectedRequestType(e.target.value as RequestType)}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 rounded-xl bg-muted border-none text-foreground disabled:opacity-60"
                      >
                        {REQUEST_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Detected Fields */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-foreground">
                          Detected Fields
                        </label>
                        <button
                          onClick={handleEditToggle}
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          {isEditing ? (
                            <>
                              <Save className="w-3 h-3" />
                              Done
                            </>
                          ) : (
                            <>
                              <Edit2 className="w-3 h-3" />
                              Edit
                            </>
                          )}
                        </button>
                      </div>
                      <div className="space-y-2">
                        {detectedFields.map((field) => (
                          <div
                            key={field.id}
                            className="flex items-center justify-between p-3 rounded-xl bg-muted/40"
                          >
                            <span className="text-xs text-muted-foreground">
                              {field.label}
                            </span>
                            {field.editable && isEditing ? (
                              <input
                                type="text"
                                value={field.value}
                                onChange={(e) =>
                                  handleFieldChange(field.id, e.target.value)
                                }
                                className="px-2 py-1 rounded-lg bg-background text-foreground text-sm text-right"
                              />
                            ) : (
                              <span className="text-sm font-medium text-foreground">
                                {field.value}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Breakdown
                      </label>
                      <div className="space-y-2">
                        {breakdown.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-3 rounded-xl bg-muted/40"
                          >
                            {isEditing ? (
                              <>
                                <div className="flex-1 flex gap-2">
                                  <input
                                    type="text"
                                    value={item.description}
                                    onChange={(e) =>
                                      handleBreakdownChange(
                                        item.id,
                                        'description',
                                        e.target.value
                                      )
                                    }
                                    className="flex-1 px-2 py-1 rounded-lg bg-background text-foreground text-sm"
                                    placeholder="Description"
                                  />
                                  <input
                                    type="number"
                                    value={item.amount}
                                    onChange={(e) =>
                                      handleBreakdownChange(item.id, 'amount', e.target.value)
                                    }
                                    className="w-24 px-2 py-1 rounded-lg bg-background text-foreground text-sm text-right"
                                    placeholder="Amount"
                                  />
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-foreground">
                                    {item.description}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.category}
                                  </p>
                                </div>
                                <span className="text-sm font-medium text-foreground">
                                  {formatCurrency(item.amount)}
                                </span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 mt-2">
                        <span className="text-sm font-medium text-foreground">
                          Total
                        </span>
                        <span className="text-sm font-semibold text-primary">
                          {formatCurrency(
                            breakdown.reduce((sum, item) => sum + item.amount, 0)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
                      <Upload className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-2">
                      Upload Document for OCR
                    </p>
                    <p className="text-xs text-muted-foreground text-center mb-4">
                      Upload a PDF file and we&apos;ll automatically detect the request details
                    </p>
                    <button
                      onClick={handleStartNewRequest}
                      className="btn-primary text-sm"
                    >
                      Select PDF File
                    </button>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              {detectedFields.length > 0 && !isScanning && scanProgress === 0 && (
                <div className="flex items-center justify-end gap-3 p-4 border-t border-border/30">
                  <button
                    onClick={handleCloseModal}
                    className="btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="btn-primary text-sm flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Submit Request
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document Upload Modal */}
      <AnimatePresence>
        {showDocumentUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4"
            onClick={handleCloseDocumentModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-4xl max-h-[90vh] glass-card rounded-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-border/30">
                <h2 className="font-display text-xl font-semibold text-foreground">
                  Upload Request through Document
                </h2>
                <button
                  onClick={handleCloseDocumentModal}
                  className="p-2 rounded-xl hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-hidden p-4">
                {isScanning || (scanProgress > 0 && scanProgress < 100) ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 relative">
                      <div 
                        className="absolute inset-0 rounded-full border-2 border-primary/20"
                        style={{
                          background: `conic-gradient(from 0deg, transparent ${scanProgress * 3.6}deg, rgba(99, 102, 241, 0.3) ${scanProgress * 3.6}deg)`,
                        }}
                      />
                      <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-2">
                      {SCAN_STEPS[currentScanStep]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Scanning document... {Math.round(scanProgress)}%
                    </p>
                  </div>
                ) : uploadedFileUrl ? (
                  <div className="flex flex-col lg:flex-row gap-4 h-[calc(90vh-250px)] min-h-[400px]">
                    {/* PDF Preview */}
                    <div className="flex-1 min-h-[200px] lg:min-h-0 bg-muted/30 rounded-xl overflow-hidden border border-border/30">
                      <iframe
                        src={uploadedFileUrl}
                        className="w-full h-full min-h-[300px] lg:min-h-[400px]"
                        title="PDF Preview"
                      />
                    </div>

                    {/* Side Panel with Predefined Fields */}
                    <div className="w-full lg:w-80 flex flex-col gap-4 overflow-y-auto max-h-[50vh] lg:max-h-none">
                      {scanProgress >= 100 && detectedFields.length > 0 ? (
                        <>
                          {/* Request Type */}
                          <div>
                            <label className="text-sm font-medium text-foreground mb-2 block">
                              Request Type
                            </label>
                            <select
                              value={detectedRequestType}
                              onChange={(e) => setDetectedRequestType(e.target.value as RequestType)}
                              className="w-full px-3 py-2 rounded-xl bg-muted border-none text-foreground"
                            >
                              {REQUEST_TYPES.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm font-medium text-foreground">
                                Detected Fields
                              </label>
                              <button
                                onClick={handleEditToggle}
                                className="flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                {isEditing ? (
                                  <>
                                    <Save className="w-3 h-3" />
                                    Done
                                  </>
                                ) : (
                                  <>
                                    <Edit2 className="w-3 h-3" />
                                    Edit
                                  </>
                                )}
                              </button>
                            </div>
                            <div className="space-y-2">
                              {detectedFields.map((field) => (
                                <div
                                  key={field.id}
                                  className="flex items-center justify-between p-3 rounded-xl bg-muted/40"
                                >
                                  <span className="text-xs text-muted-foreground">
                                    {field.label}
                                  </span>
                                  {field.editable && isEditing ? (
                                    <input
                                      type="text"
                                      value={field.value}
                                      onChange={(e) =>
                                        handleFieldChange(field.id, e.target.value)
                                      }
                                      className="px-2 py-1 rounded-lg bg-background text-foreground text-sm text-right w-32"
                                    />
                                  ) : (
                                    <span className="text-sm font-medium text-foreground">
                                      {field.value}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Breakdown */}
                          <div>
                            <label className="text-sm font-medium text-foreground mb-2 block">
                              Breakdown
                            </label>
                            <div className="space-y-2">
                              {breakdown.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between p-3 rounded-xl bg-muted/40"
                                >
                                  {isEditing ? (
                                    <div className="flex-1 flex flex-col gap-2">
                                      <input
                                        type="text"
                                        value={item.description}
                                        onChange={(e) =>
                                          handleBreakdownChange(
                                            item.id,
                                            'description',
                                            e.target.value
                                          )
                                        }
                                        className="px-2 py-1 rounded-lg bg-background text-foreground text-sm"
                                        placeholder="Description"
                                      />
                                      <input
                                        type="number"
                                        value={item.amount}
                                        onChange={(e) =>
                                          handleBreakdownChange(item.id, 'amount', e.target.value)
                                        }
                                        className="px-2 py-1 rounded-lg bg-background text-foreground text-sm text-right"
                                        placeholder="Amount"
                                      />
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-foreground">
                                          {item.description}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {item.category}
                                        </p>
                                      </div>
                                      <span className="text-sm font-medium text-foreground">
                                        {formatCurrency(item.amount)}
                                      </span>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 mt-2">
                              <span className="text-sm font-medium text-foreground">
                                Total
                              </span>
                              <span className="text-sm font-semibold text-primary">
                                {formatCurrency(
                                  breakdown.reduce((sum, item) => sum + item.amount, 0)
                                )}
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8">
                          <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                          <p className="text-sm text-muted-foreground text-center">
                            Processing document...
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16">
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleDocumentFileUpload}
                      className="hidden"
                      id="document-upload-input"
                    />
                    <label
                      htmlFor="document-upload-input"
                      className="group flex items-center justify-center gap-3 px-6 py-4 bg-muted/40 hover:bg-muted/60 border-2 border-dashed border-border/40 hover:border-primary/50 rounded-xl cursor-pointer transition-all duration-200"
                    >
                      <div className="w-10 h-10 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors duration-200">
                        <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">
                          Upload PDF Document
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Click to browse or drag and drop
                        </p>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              {uploadedFile && scanProgress >= 100 && detectedFields.length > 0 && (
                <div className="flex items-center justify-end gap-3 p-4 border-t border-border/30">
                  <button
                    onClick={handleCloseDocumentModal}
                    className="btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="btn-primary text-sm flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Submit Request
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface RequestorHomeProps {
  user: UserData | null;
  stats: Stats;
  handleStartNewRequest: () => void;
  handleStartDocumentUpload: () => void;
}

function RequestorHome({ user, stats, handleStartNewRequest, handleStartDocumentUpload }: RequestorHomeProps) {
  return (
    <>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl hero-gradient flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-foreground">
            Welcome back, {user?.name || 'User'}
          </h1>
        </div>
        <p className="text-muted-foreground ml-[52px]">
          Here&apos;s an overview of your financial requests and liquidations.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <button 
          onClick={handleStartNewRequest}
          className="btn-primary flex items-center justify-center gap-2 py-5 rounded-xl shadow-ambient"
        >
          <Plus className="w-5 h-5" />
          New Request
        </button>
        <button 
          onClick={handleStartDocumentUpload}
          className="btn-secondary flex items-center justify-center gap-2 py-5 rounded-xl"
        >
          <Upload className="w-5 h-5" />
          Upload Request through Document
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card card-ambient-primary">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <span className="section-label">Total</span>
          </div>
          <p className="text-display-md text-foreground mb-1">{stats.totalRequests}</p>
          <p className="text-sm text-muted-foreground">Total Requests</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent2/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-accent2" />
            </div>
            <span className="section-label">Pending</span>
          </div>
          <p className="text-display-md text-foreground mb-1">{stats.pendingRequests}</p>
          <p className="text-sm text-muted-foreground">Pending Approval</p>
        </div>

        <div className="card card-ambient-blue">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <span className="section-label">Completed</span>
          </div>
          <p className="text-display-md text-foreground mb-1">{stats.completedRequests}</p>
          <p className="text-sm text-muted-foreground">Completed</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <span className="section-label">Review</span>
          </div>
          <p className="text-display-md text-foreground mb-1">{stats.pendingLiquidations}</p>
          <p className="text-sm text-muted-foreground">Awaiting Review</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-semibold text-foreground">
            Recent Activity
          </h2>
          <button className="text-primary text-sm font-medium hover:underline">
            View All
          </button>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">New request created</p>
              <p className="text-xs text-muted-foreground">Advance Request #1234</p>
            </div>
            <span className="text-xs text-muted-foreground">2 hours ago</span>
          </div>
          
          <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Request approved</p>
              <p className="text-xs text-muted-foreground">Reimbursement #1230</p>
            </div>
            <span className="text-xs text-muted-foreground">1 day ago</span>
          </div>
          
          <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40">
            <div className="w-10 h-10 rounded-full bg-accent2/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-accent2" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Liquidation pending review</p>
              <p className="text-xs text-muted-foreground">Advance #1228</p>
            </div>
            <span className="text-xs text-muted-foreground">2 days ago</span>
          </div>
        </div>
        
        {stats.totalRequests === 0 && stats.pendingLiquidations === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">No recent activity</p>
            <button onClick={handleStartNewRequest} className="btn-primary text-sm">
              Create Your First Request
            </button>
          </div>
        )}
      </div>
    </>
  );
}

interface ApproverHomeProps {
  user: UserData | null;
}

function ApproverHome({ user }: ApproverHomeProps) {
  return (
    <>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shadow-lg">
            <ClipboardCheck className="w-5 h-5 text-purple-500" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-foreground">
            Approval Dashboard
          </h1>
        </div>
        <p className="text-muted-foreground ml-[52px]">
          Review and approve pending requests from your team.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="card card-ambient-primary">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <span className="section-label">Pending</span>
          </div>
          <p className="text-display-md text-foreground mb-1">12</p>
          <p className="text-sm text-muted-foreground">Awaiting Approval</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <span className="section-label">Approved</span>
          </div>
          <p className="text-display-md text-foreground mb-1">48</p>
          <p className="text-sm text-muted-foreground">This Month</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <span className="section-label">Rejected</span>
          </div>
          <p className="text-display-md text-foreground mb-1">3</p>
          <p className="text-sm text-muted-foreground">This Month</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-semibold text-foreground">
              AI-Assisted Approval
            </h2>
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium">
              <Bot className="w-3 h-3" />
              <span>AI Powered</span>
            </div>
          </div>
          <button className="text-primary text-sm font-medium hover:underline">
            View All
          </button>
        </div>
        
        <div className="space-y-3">
          {MOCK_AI_REQUESTS.map((request) => (
            <div 
              key={request.id} 
              className="glass-card p-4 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-medium text-foreground">
                    {request.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {request.requester} • {request.department}
                  </p>
                </div>
                <p className="text-sm font-semibold text-foreground">{request.amount}</p>
              </div>

              <div className={`flex items-center gap-2 p-2.5 rounded-lg ${
                request.aiVerdict === 'approved' 
                  ? 'bg-green-500/10' 
                  : 'bg-red-500/10'
              }`}>
                <Bot className={`w-4 h-4 ${
                  request.aiVerdict === 'approved' 
                    ? 'text-green-600' 
                    : 'text-red-500'
                }`} />
                <span className={`text-xs font-medium ${
                  request.aiVerdict === 'approved' 
                    ? 'text-green-600' 
                    : 'text-red-500'
                }`}>
                  {request.aiVerdict === 'approved' ? 'Approved' : 'Denied'}
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  {request.aiReason}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 mt-2">
                <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors">
                  Reject
                </button>
                <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors">
                  Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

interface AccountingHomeProps {
  user: UserData | null;
  showExportModal: boolean;
  setShowExportModal: (show: boolean) => void;
  exportStartDate: string;
  setExportStartDate: (date: string) => void;
  exportEndDate: string;
  setExportEndDate: (date: string) => void;
}

function AccountingHome({ 
  user,
  showExportModal,
  setShowExportModal,
  exportStartDate,
  setExportStartDate,
  exportEndDate,
  setExportEndDate,
}: AccountingHomeProps) {
  const discrepanciesCount = MOCK_RECONCILIATION_REQUESTS.filter(r => !r.isReconciled).length;
  const reconciledCount = MOCK_RECONCILIATION_REQUESTS.filter(r => r.isReconciled).length;
  const totalProcessed = MOCK_RECONCILIATION_REQUESTS.reduce((sum, r) => {
    const amount = parseFloat(r.liquidatedAmount.replace(/[^0-9.-]/g, ''));
    return sum + amount;
  }, 0);

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center shadow-lg">
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-foreground">
            Accounting Dashboard
          </h1>
        </div>
        <p className="text-muted-foreground ml-[52px]">
          Monitor liquidations and identify discrepancies requiring attention.
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="card card-ambient-primary">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-500" />
            </div>
            <span className="section-label">Attention</span>
          </div>
          <p className="text-display-md text-foreground mb-1">{discrepanciesCount}</p>
          <p className="text-sm text-muted-foreground">Discrepancies</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <span className="section-label">Reconciled</span>
          </div>
          <p className="text-display-md text-foreground mb-1">{reconciledCount}</p>
          <p className="text-sm text-muted-foreground">Validated</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <FileCheck className="w-5 h-5 text-blue-500" />
            </div>
            <span className="section-label">Total</span>
          </div>
          <p className="text-display-md text-foreground mb-1">5</p>
          <p className="text-sm text-muted-foreground">Liquidations</p>
        </div>

        <div className="card card-ambient-blue">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <span className="section-label">Value</span>
          </div>
          <p className="text-display-md text-foreground mb-1">PHP {totalProcessed.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Total Processed</p>
        </div>
      </div>

      {/* Graph / Chart Section */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h3 className="font-display text-lg font-semibold text-foreground mb-4">
            Reconciliation Status Overview
          </h3>
          <div className="flex items-center justify-center h-48">
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 100 100" className="transform -rotate-90 w-40 h-40">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-muted/30"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeDasharray={`${(reconciledCount / MOCK_RECONCILIATION_REQUESTS.length) * 251.2} 251.2`}
                  strokeLinecap="round"
                  className="text-primary"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeDasharray={`${(discrepanciesCount / MOCK_RECONCILIATION_REQUESTS.length) * 251.2} 251.2`}
                  strokeDashoffset={`-${(reconciledCount / MOCK_RECONCILIATION_REQUESTS.length) * 251.2}`}
                  strokeLinecap="round"
                  className="text-accent2"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-2xl font-bold text-foreground">{reconciledCount}</span>
                <span className="text-xs text-muted-foreground">of {MOCK_RECONCILIATION_REQUESTS.length}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-xs text-muted-foreground">Reconciled ({reconciledCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent2" />
              <span className="text-xs text-muted-foreground">Discrepancy ({discrepanciesCount})</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-display text-lg font-semibold text-foreground mb-4">
            Variance by Category
          </h3>
          <div className="space-y-4">
            {['Advance Request', 'Reimbursement', 'Purchase Request'].map((category) => {
              const categoryRequests = MOCK_RECONCILIATION_REQUESTS.filter(r => r.category === category);
              const discrepancies = categoryRequests.filter(r => !r.isReconciled).length;
              const percentage = (discrepancies / categoryRequests.length) * 100 || 0;
              return (
                <div key={category}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-foreground">{category}</span>
                    <span className={`text-xs font-medium ${
                      discrepancies > 0 ? 'text-accent2' : 'text-primary'
                    }`}>
                      {discrepancies} {discrepancies === 1 ? 'issue' : 'issues'}
                    </span>
                  </div>
                  <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        percentage > 50 ? 'bg-red-500' : percentage > 0 ? 'bg-accent2' : 'bg-primary'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Discrepancies Alert Card - Glassmorphism Style */}
      {discrepanciesCount > 0 && (
        <div className="mb-8">
          <div className="glass-card p-4 flex items-start gap-4 hero-gradient/5 border-primary/20">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground mb-1">
                AI Detected {discrepanciesCount} Request{discrepanciesCount > 1 ? 's' : ''} Need Attention
              </h3>
              <p className="text-xs text-muted-foreground">
                Review and resolve before final validation.
              </p>
            </div>
            <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              Review All
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Autonomous Reconciliation & Validation
            </h2>
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium">
              <Bot className="w-3 h-3" />
              <span>AI Powered</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Download className="w-3 h-3" />
              Export Validations
            </button>
            <button className="text-primary text-sm font-medium hover:underline">
              View All
            </button>
          </div>
        </div>
        
        <div className="space-y-3">
          {MOCK_RECONCILIATION_REQUESTS.map((request) => (
            <div 
              key={request.id} 
              className="glass-card p-4 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-medium text-foreground">
                    {request.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {request.requester} • {request.department}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Requested</p>
                  <p className="text-sm font-medium text-foreground">{request.requestedAmount}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="p-2.5 rounded-lg bg-muted/40">
                  <p className="text-xs text-muted-foreground mb-1">Requested</p>
                  <p className="text-sm font-medium text-foreground">{request.requestedAmount}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40">
                  <p className="text-xs text-muted-foreground mb-1">Liquidated</p>
                  <p className="text-sm font-medium text-foreground">{request.liquidatedAmount}</p>
                </div>
                <div className={`p-2.5 rounded-lg ${
                  request.variance.startsWith('-')
                    ? 'bg-red-500/10' 
                    : request.variance === 'PHP 0'
                    ? 'bg-green-500/10'
                    : 'bg-amber-500/10'
                }`}>
                  <p className="text-xs text-muted-foreground mb-1">Variance</p>
                  <p className={`text-sm font-medium ${
                    request.variance.startsWith('-')
                      ? 'text-red-500' 
                      : request.variance === 'PHP 0'
                      ? 'text-green-600'
                      : 'text-amber-500'
                  }`}>{request.variance}</p>
                </div>
              </div>

              <div className={`flex items-center gap-2 p-2.5 rounded-lg ${
                request.isReconciled 
                  ? 'bg-green-500/10' 
                  : 'bg-amber-500/10'
              }`}>
                <Bot className={`w-4 h-4 ${
                  request.isReconciled 
                    ? 'text-green-600' 
                    : 'text-amber-500'
                }`} />
                <span className={`text-xs font-medium ${
                  request.isReconciled 
                    ? 'text-green-600' 
                    : 'text-amber-500'
                }`}>
                  {request.isReconciled ? 'Reconciled' : 'Requires Attention'}
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  {request.aiInsight}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 mt-2">
                <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors">
                  View Details
                </button>
                {request.isReconciled ? (
                  <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors">
                    Validate
                  </button>
                ) : (
                  <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors">
                    Resolve Issue
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export Validations Modal */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4"
            onClick={() => setShowExportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md glass-card rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-border/30">
                <h2 className="font-display text-xl font-semibold text-foreground">
                  Export Validations
                </h2>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-2 rounded-xl hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-muted border-none text-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-muted border-none text-foreground"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 p-4 border-t border-border/30">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    console.log('Export:', { startDate: exportStartDate, endDate: exportEndDate });
                    setShowExportModal(false);
                    setExportStartDate('');
                    setExportEndDate('');
                  }}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}