/**
 * Shared test fixtures for credit builder plugin tests
 */

import type { UUID, Memory } from '@elizaos/core';
import type { CreditProfile, NegativeItem, DisputeRecord, CreditorAddress } from '../../types';

export const TEST_USER_ID = 'test-user-123' as unknown as string;
export const TEST_AGENT_ID = 'test-agent-id' as unknown as string;

export function createProfile(overrides?: Partial<CreditProfile>): CreditProfile {
  return {
    name: 'John Doe',
    address_line1: '123 Main St',
    city: 'Anytown',
    state: 'CA',
    zip: '90210',
    ssn_last4: '1234',
    dob: '1990-01-15',
    current_score: 620,
    score_source: 'fico',
    total_accounts: 5,
    oldest_account_age_months: 48,
    average_account_age_months: 30,
    total_credit_limit: 10000,
    total_balance: 3000,
    utilization_percent: 30,
    on_time_payment_percent: 96,
    negative_items: [
      createNegativeItem({ type: 'collection', creditor_name: 'Midland Credit Management' }),
      createNegativeItem({ type: 'late_payment', creditor_name: 'Capital One', dispute_reason: 'Not my account' }),
      createNegativeItem({ type: 'chargeoff', creditor_name: 'Chase Bank' }),
    ],
    hard_inquiries_last_12mo: 2,
    account_types: ['revolving', 'installment'],
    ...overrides,
  };
}

export function createNegativeItem(overrides?: Partial<NegativeItem>): NegativeItem {
  return {
    type: 'collection',
    creditor_name: 'Test Creditor',
    account_number_last4: '5678',
    amount: 1500,
    date_reported: '2025-06-15',
    date_of_delinquency: '2025-03-01',
    status: 'open',
    bureau: 'all',
    disputable: true,
    dispute_reason: 'Not my account',
    ...overrides,
  };
}

export function createDispute(overrides?: Partial<DisputeRecord>): DisputeRecord {
  const now = new Date('2026-02-01T12:00:00Z');
  return {
    id: 'dispute-001',
    letter_type: 'basic_bureau',
    letter_name: 'Basic Credit Bureau Dispute',
    target: 'equifax',
    recipient_name: 'Equifax Information Services LLC',
    items_disputed: [createNegativeItem()],
    sent_date: now.toISOString(),
    response_deadline: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    escalation_date: new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'sent',
    lob_letter_id: 'ltr_test123',
    tracking_number: '9200 0000 0000 0000 0001',
    cost: 9.45,
    ...overrides,
  };
}

export function createAddress(overrides?: Partial<CreditorAddress>): CreditorAddress {
  return {
    creditor_name: 'Midland Credit Management',
    entity_type: 'collector',
    name: 'Midland Credit Management',
    address_line1: '350 Camino de la Reina',
    city: 'San Diego',
    state: 'CA',
    zip: '92108',
    ...overrides,
  };
}

export function createMessage(text: string, userId?: string): Memory {
  return {
    entityId: (userId || TEST_USER_ID) as UUID,
    agentId: TEST_AGENT_ID as UUID,
    roomId: (userId || TEST_USER_ID) as UUID,
    content: { text, source: 'test' },
  } as Memory;
}

export const LOB_SEND_RESPONSE = {
  id: 'ltr_mock_abc123',
  tracking_number: '9200 1111 2222 3333 4444',
  price: '9.45',
};

export const LOB_VERIFY_RESPONSE = {
  id: 'us_ver_mock',
  deliverability: 'deliverable',
  primary_line: '123 Main St',
  city: 'Anytown',
  state: 'CA',
  zip_code: '90210',
};
