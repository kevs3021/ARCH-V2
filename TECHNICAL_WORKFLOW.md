# ARCH V2 - Technical Workflow Documentation

## Overview

ARCH V2 is a comprehensive financial request management system that handles multiple types of requests through a standardized workflow pipeline. The system manages the complete lifecycle of requests from creation through approval, processing, liquidation, and validation.

---

## Request Types

The system handles 11 primary request types, each with unique creation and processing requirements:

### 1. **Advanced Request** (Standard Advance Payment)
- **Purpose**: Request for advance funds before expense is incurred
- **Key Characteristic**: Requires liquidation after funds are credited
- **Special Features**: Supports "Additionals" breakdown for extra funds after initial credit
- **Status Flow**: Open → For Approval → Approved → For Liquidation → Liquidated → Validated → Closed

### 2. **For Reimbursement**
- **Purpose**: Reimbursement for already-incurred expenses
- **Key Characteristic**: Liquidation provided upfront (funds already spent)
- **Approval Scope**: Narrower - only validates receipts, not items to be purchased
- **Status Flow**: For Approval → Approved → Recorded → For Crediting → Credited → Validated → Closed

### 3. **Direct Expense** (SPMA/SPMC/SPM Dubai)
- **Purpose**: Direct company expenses with company payment
- **Key Characteristic**: Can credit before approval for urgent/JRS requests
- **Special Features**: Optional approval for urgent requests; different flow for SMC/SPMA vs SPM Dubai
- **Status Flow**: For Approval → Approved → Recorded → (Optional: For Crediting → Credited) → For Liquidation → Liquidated → Validated → Closed

### 4. **Credit Card**
- **Purpose**: Credit card reimbursement requests
- **Key Characteristic**: Credited through checks, not bank transfer
- **Special Features**: Payment-First flag for immediate crediting; no internal approval stage
- **Status Flow**: For Approval → Approved → Recorded → Credited → Closed

### 5. **Repairs and Maintenance**
- **Purpose**: R&M expenses with optional payment-first capability
- **Key Characteristic**: Can be payment-first (50% option) or receipt-first
- **Special Features**: Dual liquidation paths based on payment terms
- **Status Flow**: For Approval → Approved → Recorded → For Liquidation → Liquidated → (Conditional) For Crediting → Validated → Closed

### 6. **Advanced Legal Request**
- **Purpose**: Legal/Repo expenses with bank and cardholder specifications
- **Key Characteristic**: Requires bank and approver assignment
- **Status Flow**: For Approval → Approved → Recorded → For Crediting → Credited → For Liquidation → Liquidated → Validated → Closed

### 7. **Advanced Credit Request**
- **Purpose**: Credit requests with similar bank/approver structure
- **Key Characteristic**: Same workflow as Legal Request
- **Status Flow**: For Approval → Approved → Recorded → For Crediting → Credited → For Liquidation → Liquidated → Validated → Closed

### 8. **JEPS UBP**
- **Purpose**: Special request type for unified processing
- **Key Characteristic**: Direct to liquidation after recording (no crediting monitoring)
- **Status Flow**: For Approval → Approved → Recorded → For Liquidation → Liquidated → Validated → Closed

### 9. **Legal Petty Request**
- **Purpose**: Small legal petty cash requests
- **Key Characteristic**: Custodian-managed; special document status tracking
- **Document Statuses**: Pending → Received/Incomplete/On Hold
- **Status Flow**: For Approval → Approved → Credited (via custodian) → For Liquidation → Liquidated → Validated → For Crediting → Closed

### 10. **Advanced Repo Request**
- **Purpose**: Repossession advance requests with field personnel assignment
- **Special Fields**: Caravan Location, CH Code, CH Name, Fieldman, Deposit to, Area
- **Status Flow**: For Approval → Approved → Recorded → For Crediting → Credited → For Liquidation → Liquidated → Validated → Closed

### 11. **Repo Petty Request**
- **Purpose**: Repossession petty cash with custodian management
- **Key Characteristic**: Same custodian batching as Legal Petty but for repo
- **Document Statuses**: Pending → Received/Incomplete/On Hold
- **Status Flow**: For Approval → Approved → Credited (via custodian) → For Liquidation → Liquidated → Validated → For Crediting → Closed

### 12. **General Petty Request** (Custodian Batching)
- **Purpose**: General small expenses through custodian batching
- **Processing**: Direct from Lark approval form → Custodian collects → Files batch → Records in ARCH
- **Batch Document Statuses**: Pending → Received/Incomplete/On Hold
- **Special Rules**: 3 pending batches → custodian disabled from new requests
- **Status Flow**: Filed (batch) → Recorded in ERP → Closed

---

## Unified Workflow Phases

All request types follow a standardized workflow with phase-specific operations:

### Phase 1: Request Creation

**Multiple Creation Methods:**
1. **Manual Entry**: User fills request form with all details
2. **OCR Upload**: AI extracts data from document (PO, invoice); user reviews and edits
3. **Chatbot**: Conversational AI guides through questions; auto-fills fields
4. **Voice**: Voice assistant collects details via audio input (future)

**Key Operations:**
- Validate required fields based on request type
- Assign approvers and stakeholders
- Categorize request (request type, company, branch, campaign)
- Set urgency based on "Date Needed"
- Status: DRAFT → FOR APPROVAL (when submitted)

**Request Data Structure:**
```
{
  classification: Legal|Repo (for legal/repo requests)
  requestType: Advanced|Reimbursement|DirectExpense|CreditCard|etc
  requestTitle: string
  company: SPMA|SPMC|SPM Dubai
  branch: string
  campaign: string
  requestTagging: string
  dateNeeded: date (determines urgency)
  ccEmails: string[]
  remarks: string
  
  // Type-specific fields
  paymentFirst: boolean (Credit Card, R&M)
  bankCode: string (Legal/Repo requests)
  approvers: User[]
  
  // For Repo requests
  caravan_location: string
  ch_code: string
  ch_name: string
  deposit_to: string
  area: string
  fieldman: string
}
```

**Supporting Documents:**
- Uploaded during creation
- Auto-labeled by AI based on content
- Stored separately from liquidation documents

---

### Phase 2: Breakdown/Item Definition

**Applicable to**: Advanced Request, Direct Expense, Credit Card, R&M, Legal, Credit, JEPS UBP, Legal Petty, Repo Advanced, Repo Petty

**Breakdown Fields:**
```
{
  particulars: string (item description)
  amount: decimal
  approvers: User[] (can differ per breakdown)
  purpose_reason: string
  store_payee: string (who receives payment)
  requestor: User
}
```

**Special Cases:**
- **Additionals Breakdown**: User selects "Additionals" as particular after initial credit; optional approver
- **Reimbursement**: Instead of breakdowns, receives LIQUIDATION data upfront
- **Petty Requests**: Single or batched entries with receipt details

---

### Phase 3: Approval Process

**Trigger**: Request status changed to FOR APPROVAL

**AI-Assisted Flow:**
1. AI summarizes request (total amount, breakdowns, vendor, purpose)
2. AI provides recommendation (Approve/Deny) based on predefined business rules
3. Approver receives AI summary + recommendation
4. Approver can:
   - **Confirm**: Accept AI recommendation
   - **Override**: Approve/Deny against AI recommendation
   - **Request Info**: Query via message trail

**Approval Rules by Type:**
- **Advanced/Direct/Legal**: All breakdowns must be approved individually; if ANY rejected → entire request rejected
- **Reimbursement**: Approval validates receipt amounts only
- **Petty (Custodian)**: Approval via Lark form; Lark sends approval to Direct Leader assigned by requestor

**Auto-Approval Scenarios:**
- Urgent/special requests (Direct Expense) may auto-approve if AI validates them before approval step

**Status Transitions:**
- APPROVED: All breakdowns approved
- REJECTED: Any breakdown rejected (with reason sent to requestor)
- FOR APPROVAL: Remains if awaiting response

---

### Phase 4: Processing by Accounting

**Trigger**: Request status = APPROVED

**Key Operations:**

#### 4.1. Recording to ERP
1. Accountant encodes each approved breakdown into FACT ERP
2. Status → RECORDED (per breakdown)
3. AI auto-updates → FOR CREDITING

#### 4.2. Internal Approval & Crediting
1. Request waits for internal approval (varies by company/type)
2. **Special Cases**: 
   - SSS-related (bereavement, maternity): Directly marked CLOSED (no liquidation required)
   - Last Pay, Training Allowance, Payroll, Disbursement: Marked CLOSED after crediting
   - JRS or urgent (Direct Expense): Can credit BEFORE approval (payment-first flow)
3. Accountant credits amount to requestor via bank transfer or check
4. Proof of transfer sent via message trail or uploaded as receipt
5. Status → CREDITED

#### 4.3. Petty (Custodian) Flow
1. Custodian collects approved petty requests
2. Custodian batches them (Filed status on Monday 3PM / Thursday 3PM auto-trigger)
3. Accountant records batch details to FACT ERP
4. Custodian transfers amount (batched) to requestor
5. Batch status → CLOSED after recording

#### 4.4. SPM Dubai Special Case
1. Accounting waits for SOA (Statement of Account) from Dubai
2. Once confirmed, encodes breakdown to FACT ERP
3. Directly moves to CLOSED (no liquidation required)

**Status After Processing**: FOR LIQUIDATION (or CLOSED for exceptions)

---

### Phase 5: Liquidation (Breakdown Matching)

**Trigger**: Request status = FOR LIQUIDATION

**Applicable to**: Advanced, Reimbursement, Direct Expense, Credit Card, R&M, Legal, Credit, JEPS UBP, Legal Petty, Repo Advanced, Repo Petty

**Liquidation Entry Structure:**
```
{
  particulars: string (links to specific breakdown)
  vendor: string
  or_number: string (official receipt number)
  or_date: date
  remarks: string
  attachment: File (receipt image/PDF)
  expense_type: company|bank (for Repo)
  amount: decimal
}
```

**Creation Methods:**
1. **Manual**: User enters liquidation details + uploads receipt
2. **OCR**: AI scans receipt, extracts vendor, amount, OR#, date; auto-fills form
3. **Chatbot**: Conversational questions guide liquidation entry
4. **Voice**: Voice input describes liquidation details

**Excess Handling:**
- If credited amount > spent amount: User selects "Excess" as particular
- AI flags excess automatically; suggests Excess option
- Excess entries are tagged in liquidation records

**Additionals Handling:**
- If amount needed > initial credit: User creates new breakdown (Additionals)
- Additionals can be credited immediately (optional approver)
- Liquidated like standard breakdowns

**Status After Liquidation Submission**: LIQUIDATED

**Petty Context:**
- For petty batches: Custodian adds receipt details to batch
- AI validates receipt amounts match request amounts
- Batch remains in liquidation until all receipts validated

---

### Phase 6: Validation & Closing

**Trigger**: Request status = LIQUIDATED (or batch ready for validation)

**AI-Automated Validation:**
1. AI cross-checks liquidated amounts vs. approved breakdown amounts
2. AI verifies all required documents present
3. AI flags discrepancies:
   - Amount mismatch (receipt ≠ approved)
   - Missing documents
   - Incomplete receipt details

**Discrepancy Handling:**
- Requestor notified via message trail with plain-language explanation
- Requestor re-uploads corrected documents
- If valid → Status → VALIDATED

**Accounting Final Steps:**
1. Review AI validation output
2. Mark status → CLOSED (system requires no further action)
3. **Physical Document Step**: Requestor must physically submit hard copies
4. Once hard copies received → Document Status → RECEIVED

**Special Cases:**
- **R&M Payment-First (50%)**: After liquidation validated, accounting credits remaining 50% (FOR CREDITING → CREDITED → VALIDATED → CLOSED)
- **Petty Custodian**: After liquidation validated, Petty handler receives credit internally; custodian balance replenished; batch recorded to ERP; status → CLOSED

**Final Status**: CLOSED + Document Status: RECEIVED

---

## Critical Status Transitions

### Standard Advanced Request Flow
```
OPEN 
  ↓ (Submitted for approval)
FOR APPROVAL 
  ↓ (All breakdowns approved)
APPROVED 
  ↓ (Accounting processes)
FOR LIQUIDATION 
  ↓ (Receipts submitted)
LIQUIDATED 
  ↓ (AI validates receipts)
VALIDATED 
  ↓ (All docs received)
CLOSED
```

### Direct Expense (Urgent/JRS) Flow
```
FOR APPROVAL 
  ↓ (AI validates before approval)
APPROVED 
  ↓ (Can credit immediately without internal approval)
RECORDED 
  ↓ (Credited parallel to approval)
CREDITED 
  ↓ (Then submitted for approval)
FOR APPROVAL (again) 
  ↓ (Retroactive approval)
APPROVED 
  ↓ (Auto-transition)
FOR LIQUIDATION 
  ↓ (Receipts submitted)
LIQUIDATED → VALIDATED → CLOSED
```

### Petty (Custodian) Flow
```
FOR APPROVAL (Lark form) 
  ↓ (Lark sends to Direct Leader)
APPROVED 
  ↓ (Custodian transfers amount)
CREDITED 
  ↓ (Batch filed Monday/Thursday 3PM)
FOR LIQUIDATION 
  ↓ (Receipts added to batch)
LIQUIDATED → VALIDATED 
  ↓ (Petty handler receives; custodian replenished)
FOR CREDITING 
  ↓ (Internal crediting of balance)
CLOSED
```

---

## Key Data Models

### Request Header
```typescript
interface Request {
  id: UUID;
  classification: 'Advanced' | 'Reimbursement' | 'DirectExpense' | 'CreditCard' | 'R&M' | 'Legal' | 'Credit' | 'JEPS_UBP' | 'LegalPetty' | 'RepoPetty';
  requestType: string;
  company: 'SPMA' | 'SPMC' | 'SPM Dubai';
  status: RequestStatus;
  totalAmount: decimal;
  approvers: User[];
  requestor: User;
  dateNeeded: date;
  createdAt: timestamp;
  updatedAt: timestamp;
}
```

### Breakdown Item
```typescript
interface Breakdown {
  id: UUID;
  requestId: UUID;
  particulars: string;
  amount: decimal;
  approvers: User[];
  status: 'NOT_APPROVED' | 'APPROVED' | 'REJECTED' | 'RECORDED';
  rejectionReason?: string;
  createdAt: timestamp;
}
```

### Liquidation Entry
```typescript
interface Liquidation {
  id: UUID;
  requestId: UUID;
  breakdownId: UUID; // or null for Excess
  vendor: string;
  orNumber: string;
  orDate: date;
  amount: decimal;
  isExcess: boolean;
  attachmentId: UUID;
  validationStatus: 'PENDING' | 'MATCHED' | 'DISCREPANCY';
  discrepancyReason?: string;
  createdAt: timestamp;
}
```

### Petty Batch
```typescript
interface PettyBatch {
  id: UUID;
  custodianId: UUID;
  status: 'PENDING' | 'FILED' | 'RECORDED' | 'CLOSED';
  documentStatus: 'PENDING' | 'RECEIVED' | 'INCOMPLETE' | 'ON_HOLD';
  itemCount: number;
  totalAmount: decimal;
  filedAt: timestamp;
  createdAt: timestamp;
}
```

---

## Message Trail

**Purpose**: Asynchronous communication between requestor, approver, and accounting

**Use Cases:**
- Approver requests clarification on breakdown
- Rejection reasons sent with plain-language explanations
- Accounting flags discrepancies with solutions
- Transfer proofs and documents shared
- Status change notifications

**Key Feature**: Supports Lark bot integration for notifications and in-chat responses

---

## Document Management

**Two Document Types:**
1. **Supporting Documents** (uploaded during request creation)
   - Quotes, purchase orders, specifications
   - Optional for most types
   - Auto-labeled by AI

2. **Liquidation Documents** (uploaded during liquidation phase)
   - Official receipts (OR)
   - Invoices
   - Proof of payment
   - Required for closing; physical copies required later

**Special Petty Handling:**
- Receipts can be e-receipts (flagged separately)
- Vouchers accepted if no official receipt
- Batch export to PDF with filtered document types

---

## Business Rules & Constraints

### Request Creation Constraints
- Requestor cannot create new request if 4+ requests in FOR LIQUIDATION status
- Accountant can temporarily lift constraint for emergency requests

### Approval Constraints
- Entire request rejected if ANY breakdown rejected
- Request remains in FOR APPROVAL until ALL breakdowns approved (or all rejected)

### Petty Batch Constraints
- Custodian disabled from new batches if 3 batches have PENDING document status
- Auto-file triggers: Every Monday 3PM and Thursday 3PM
- Status change to ON HOLD prevents 3-strike limit counting

### Liquidation Constraints
- Liquidation must match credited amount (with tolerance for cents)
- Excess amounts must be explicitly marked and tracked
- Additionals can be credited immediately (optional approver)

### Crediting Days
- Calculated excluding weekends
- Used for SLA tracking and reporting

---

## AI-Assisted Features (Architectural Considerations)

These features should be designed with integration points for AI logic:

1. **Recommendation Engine**: Approver receives AI recommendation per breakdown
2. **Discrepancy Flagging**: Automated validation with plain-language explanations
3. **Auto-Fill from Documents**: OCR extracts and populates form fields
4. **Conversational Interfaces**: Chatbot guides through creation and liquidation
5. **Overnight Validation**: Scheduled job flags discrepancies for morning review
6. **Batch Suggestions**: AI suggests which batches are ready for recording

---

## Sequence Diagrams

### Standard Approval Flow
```
Requestor          System          Approver          Accounting
   |                 |                 |                 |
   |--Create Request->|                 |                 |
   |                 |--Submit for----->|                 |
   |                 |Approval (AI rec) |                 |
   |                 |                 |--Confirm/Override|
   |                 |<--Decision-------|                 |
   |<-Notify Status--|                 |                 |
   |                 |                 |--Record to ERP-->|
   |                 |                 |                 |--Credit
   |<--Credit Notify-|<--Credit Proof--|                 |
   |                 |                 |                 |--Auto Status
   |--Submit Receipts|                 |                 |
   |---> Liquidation |                 |                 |
   |                 |--Validate (AI)-->|                 |
   |                 |                 |                 |--Close
   |<--Notify Closed-|                 |                 |
```

---

## Integration Points

**External Systems:**
1. **FACT ERP**: Receives approved breakdowns for recording
2. **Bank APIs** (Future): Direct disbursement via banking integration
3. **Lark**: Approval notifications and message trail integration
4. **OCR Service**: Document scanning and data extraction
5. **Maya/Banking Portals**: Manual proof of transfer uploads (until automation)

---

## Error Handling & Fallbacks

1. **OCR Extraction Errors**: User manually corrects auto-filled fields
2. **Validation Discrepancies**: Requestor re-submits corrected documents
3. **Approval Delays**: Message trail escalation; notification reminders
4. **Petty Batch Overages**: Custodian marks ON HOLD; manual intervention
5. **Missing Documents**: Requestor prompted before status change to CLOSED

---

## Security & Audit Considerations

1. **Action Logging**: Every status change, approval, and edit logged with activity tags
2. **Reason Tracking**: Rejections, overrides, and holds require documented reasons
3. **Audit Trail**: All actions timestamped and attributed to user
4. **Document Retention**: Physical copies required before final closure
5. **Role-Based Access**: Requestor, Approver, Accounting, Custodian, Admin roles

---

## Performance Optimization Points

1. **Batch Processing**: Nightly liquidation validation; morning dashboard
2. **Auto-Status Transitions**: Reduce manual status changes where deterministic
3. **Bulk Recording**: Multiple batches recorded in single ERP pass
4. **Document Filtering**: Export only validated receipts by type
5. **Notification Batching**: Combine status updates in single message

---

## Future Enhancements (From Technical Notes)

- **Bank API Integration**: Automatic disbursement without manual portal access
- **Voice Query Support**: Request status and liquidation balance via voice
- **Automated Crediting**: Immediate disbursement for small urgent requests
- **Stale Request Cleanup**: Auto-close requests 2 weeks old if not progressed
- **Notification Preferences**: User-configurable Lark bot linkage and escalations

