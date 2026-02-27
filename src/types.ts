/**
 * Credit Builder Plugin — Type Definitions
 */

// ---------------------------------------------------------------------------
// Client Profile
// ---------------------------------------------------------------------------

export interface CreditProfile {
  name: string;
  address_line1: string;
  city: string;
  state: string;
  zip: string;
  ssn_last4?: string;
  dob?: string;
  email?: string;
  phone?: string;

  // Personal Credit
  current_score?: number;
  score_source?: 'fico' | 'vantage' | 'self_reported' | 'unknown';
  total_accounts?: number;
  oldest_account_age_months?: number;
  average_account_age_months?: number;
  total_credit_limit?: number;
  total_balance?: number;
  utilization_percent?: number;
  on_time_payment_percent?: number;
  negative_items?: NegativeItem[];
  hard_inquiries_last_12mo?: number;
  account_types?: AccountType[];

  // Business Credit
  business?: BusinessProfile;

  // Financial
  monthly_income?: number;
  monthly_expenses?: number;
  available_for_deposits?: number;

  // Goals
  credit_goals?: string[];
  timeline_months?: number;
}

export interface BusinessProfile {
  legal_name: string;
  entity_type?: 'llc' | 'corporation' | 's_corp' | 'sole_prop' | 'partnership';
  ein?: string;
  duns_number?: string;
  state_of_formation?: string;
  formation_date?: string;
  business_address?: string;
  business_phone?: string;
  website?: string;
  industry?: string;
  annual_revenue?: number;
  monthly_revenue?: number;
  paydex_score?: number;
  intelliscore?: number;
  existing_trade_lines?: number;
  bank_account_open?: boolean;
}

export interface NegativeItem {
  type: 'late_payment' | 'collection' | 'chargeoff' | 'bankruptcy' | 'judgment' | 'tax_lien' | 'inquiry' | 'other';
  creditor_name: string;
  account_number_last4?: string;
  amount?: number;
  date_reported?: string;
  date_of_delinquency?: string;
  status?: string;
  bureau?: 'equifax' | 'experian' | 'transunion' | 'all';
  disputable?: boolean;
  dispute_reason?: string;
}

export type AccountType = 'revolving' | 'installment' | 'mortgage' | 'auto' | 'student' | 'personal' | 'heloc' | 'charge';

// ---------------------------------------------------------------------------
// Credit Audit
// ---------------------------------------------------------------------------

export interface CreditAudit {
  profile: CreditProfile;
  score_phase: 'foundation' | 'acceleration' | 'optimization' | 'elite';
  strengths: AuditItem[];
  weaknesses: AuditItem[];
  disputable_items: DisputeCandidate[];
  missing_account_types: AccountType[];
  utilization_status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  payment_history_status: 'perfect' | 'good' | 'needs_work' | 'poor';
  recommended_actions: RecommendedAction[];
}

export interface AuditItem {
  factor: 'payment_history' | 'utilization' | 'age' | 'mix' | 'inquiries';
  description: string;
  impact: 'high' | 'medium' | 'low';
  score_weight_percent: number;
}

export interface DisputeCandidate {
  item: NegativeItem;
  recommended_letter_type: string;
  estimated_score_gain: number;
  success_probability: number;
  priority_score: number; // gain * probability
  escalation_path: string[];
}

export interface RecommendedAction {
  action: string;
  description: string;
  estimated_score_impact: number;
  cost: number;
  timeline_days: number;
  priority: number;
  phase: 'foundation' | 'acceleration' | 'optimization' | 'elite';
}

// ---------------------------------------------------------------------------
// Dispute Tracking
// ---------------------------------------------------------------------------

export interface DisputeRecord {
  id: string;
  letter_type: string;
  letter_name: string;
  target: string;
  recipient_name: string;
  items_disputed: NegativeItem[];
  sent_date: string;
  response_deadline: string;
  escalation_date: string;
  status: 'draft' | 'sent' | 'delivered' | 'response_received' | 'resolved' | 'escalated' | 'overdue';
  lob_letter_id?: string;
  tracking_number?: string;
  cost?: number;
  outcome?: 'deleted' | 'corrected' | 'verified' | 'pending';
  notes?: string;
}

// ---------------------------------------------------------------------------
// Letter Types
// ---------------------------------------------------------------------------

export type LetterType =
  | 'basic_bureau'
  | '609_verification'
  | '611_reinvestigation'
  | 'method_of_verification'
  | 'identity_theft'
  | 'debt_validation'
  | 'cease_desist'
  | 'pay_for_delete'
  | 'goodwill'
  | 'direct_creditor'
  | 'chargeoff_removal'
  | 'unauthorized_inquiry'
  | 'hipaa_medical'
  | 'statute_of_limitations'
  | 'intent_to_sue'
  | 'arbitration_election'
  | 'billing_error'
  | 'breach_of_contract'
  | 'demand_letter';

export const LETTER_TYPE_INFO: Record<LetterType, { id: number; name: string; category: string; legal_basis: string; target_type: string }> = {
  basic_bureau: { id: 1, name: 'Basic Credit Bureau Dispute', category: 'FCRA', legal_basis: 'FCRA § 1681i', target_type: 'bureau' },
  '609_verification': { id: 2, name: '609 Verification Request', category: 'FCRA', legal_basis: 'FCRA § 609', target_type: 'bureau' },
  '611_reinvestigation': { id: 3, name: '611 Reinvestigation Demand', category: 'FCRA', legal_basis: 'FCRA § 611', target_type: 'bureau' },
  method_of_verification: { id: 4, name: 'Method of Verification Demand', category: 'FCRA', legal_basis: 'FCRA § 611(a)(6)', target_type: 'bureau' },
  identity_theft: { id: 5, name: 'Identity Theft Dispute', category: 'FCRA', legal_basis: 'FCRA § 605B', target_type: 'bureau' },
  debt_validation: { id: 6, name: 'Debt Validation Letter', category: 'FDCPA', legal_basis: 'FDCPA § 1692g', target_type: 'collector' },
  cease_desist: { id: 7, name: 'Cease and Desist Letter', category: 'FDCPA', legal_basis: 'FDCPA § 1692c(c)', target_type: 'collector' },
  pay_for_delete: { id: 8, name: 'Pay-for-Delete Letter', category: 'Negotiation', legal_basis: 'Negotiation', target_type: 'collector' },
  goodwill: { id: 9, name: 'Goodwill Removal Letter', category: 'Courtesy', legal_basis: 'Courtesy', target_type: 'creditor' },
  direct_creditor: { id: 10, name: 'Direct Creditor Dispute', category: 'FCRA', legal_basis: 'FCRA § 1681s-2(b)', target_type: 'creditor' },
  chargeoff_removal: { id: 11, name: 'Charge-Off Removal Request', category: 'Negotiation', legal_basis: 'Negotiation', target_type: 'creditor' },
  unauthorized_inquiry: { id: 12, name: 'Unauthorized Inquiry Removal', category: 'FCRA', legal_basis: 'FCRA § 1681b', target_type: 'bureau' },
  hipaa_medical: { id: 13, name: 'HIPAA Medical Debt Dispute', category: 'HIPAA', legal_basis: 'HIPAA + FDCPA', target_type: 'collector' },
  statute_of_limitations: { id: 14, name: 'Statute of Limitations Defense', category: 'State Law', legal_basis: 'State SOL', target_type: 'collector' },
  intent_to_sue: { id: 15, name: 'Intent to Sue Letter', category: 'FCRA/FDCPA', legal_basis: 'FCRA § 1681n', target_type: 'any' },
  arbitration_election: { id: 16, name: 'Arbitration Election', category: 'Contract', legal_basis: 'Federal Arbitration Act', target_type: 'creditor' },
  billing_error: { id: 17, name: 'Billing Error (FCBA)', category: 'FCBA', legal_basis: 'FCBA § 1666', target_type: 'creditor' },
  breach_of_contract: { id: 18, name: 'Breach of Contract Notice', category: 'Contract', legal_basis: 'State contract law', target_type: 'any' },
  demand_letter: { id: 19, name: 'Formal Demand Letter', category: 'General', legal_basis: 'Contract law', target_type: 'any' },
};

// ---------------------------------------------------------------------------
// Bureau Addresses
// ---------------------------------------------------------------------------

export const BUREAU_ADDRESSES = {
  equifax: { name: 'Equifax Information Services LLC', address_line1: 'P.O. Box 740256', city: 'Atlanta', state: 'GA', zip: '30374-0256' },
  experian: { name: 'Experian', address_line1: 'P.O. Box 4500', city: 'Allen', state: 'TX', zip: '75013' },
  transunion: { name: 'TransUnion LLC Consumer Dispute Center', address_line1: 'P.O. Box 2000', city: 'Chester', state: 'PA', zip: '19016' },
} as const;

// ---------------------------------------------------------------------------
// Creditor / Collector Addresses
// ---------------------------------------------------------------------------

export interface CreditorAddress {
  creditor_name: string;
  entity_type: 'creditor' | 'collector';
  name: string;           // as printed on letter
  address_line1: string;
  city: string;
  state: string;
  zip: string;
}

export type LetterAddress = {
  name: string;
  address_line1: string;
  city: string;
  state: string;
  zip: string;
};
