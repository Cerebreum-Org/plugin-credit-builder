/**
 * Credit Profile Service — Manages client credit profiles and audit state
 *
 * Extends ElizaOS Service with persistence:
 * - Profiles → runtime cache (key-value)
 * - Disputes → runtime memory system (event-like records)
 * - Audits → ephemeral (recomputed from profile data)
 */

import { Service, type IAgentRuntime, type Memory, type UUID, logger } from '@elizaos/core';
import type { CreditProfile, CreditAudit, DisputeRecord, RecommendedAction, DisputeCandidate, NegativeItem, CreditorAddress } from '../types';

declare module '@elizaos/core' {
  interface ServiceTypeRegistry {
    CREDIT_PROFILE: 'credit_profile';
  }
}

const CACHE_PREFIX = 'credit-builder:profile:';
const CREDITOR_ADDR_PREFIX = 'credit-builder:creditor-addr:';
const DISPUTES_TABLE = 'credit_disputes';

export class CreditProfileService extends Service {
  static serviceType = 'credit_profile' as const;
  capabilityDescription = 'Manages credit profiles, audits, and dispute records with persistence';

  static async start(runtime: IAgentRuntime): Promise<CreditProfileService> {
    const service = new CreditProfileService(runtime);
    logger.info('[CreditBuilder] CreditProfileService started');
    return service;
  }

  async stop(): Promise<void> {
    logger.info('[CreditBuilder] CreditProfileService stopped');
  }

  // -- Profile Management ---------------------------------------------------

  async saveProfile(userId: string, profile: CreditProfile): Promise<void> {
    await this.runtime.setCache(`${CACHE_PREFIX}${userId}`, profile);
    logger.info(`[CreditBuilder] Profile saved for ${userId}`);
  }

  async getProfile(userId: string): Promise<CreditProfile | undefined> {
    return await this.runtime.getCache<CreditProfile>(`${CACHE_PREFIX}${userId}`);
  }

  async updateProfile(userId: string, updates: Partial<CreditProfile>): Promise<CreditProfile | undefined> {
    const existing = await this.getProfile(userId);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    await this.saveProfile(userId, updated);
    return updated;
  }

  // -- Credit Audit ---------------------------------------------------------

  async runAudit(userId: string): Promise<CreditAudit | undefined> {
    const profile = await this.getProfile(userId);
    if (!profile) return undefined;

    const score = profile.current_score || 0;
    const phase = score >= 740 ? 'elite' : score >= 670 ? 'optimization' : score >= 580 ? 'acceleration' : 'foundation';

    const strengths: CreditAudit['strengths'] = [];
    const weaknesses: CreditAudit['weaknesses'] = [];

    // Payment history analysis (35%)
    if (profile.on_time_payment_percent !== undefined) {
      if (profile.on_time_payment_percent >= 99) {
        strengths.push({ factor: 'payment_history', description: 'Near-perfect payment history', impact: 'high', score_weight_percent: 35 });
      } else if (profile.on_time_payment_percent < 95) {
        weaknesses.push({ factor: 'payment_history', description: `Payment history at ${profile.on_time_payment_percent}% — late payments are the #1 score killer`, impact: 'high', score_weight_percent: 35 });
      }
    }

    // Utilization analysis (30%)
    const util = profile.utilization_percent ?? (profile.total_credit_limit ? ((profile.total_balance || 0) / profile.total_credit_limit) * 100 : undefined);
    let utilStatus: CreditAudit['utilization_status'] = 'excellent';
    if (util !== undefined) {
      if (util <= 9) { utilStatus = 'excellent'; strengths.push({ factor: 'utilization', description: `Utilization at ${util.toFixed(0)}% — optimal range`, impact: 'high', score_weight_percent: 30 }); }
      else if (util <= 30) { utilStatus = 'good'; }
      else if (util <= 50) { utilStatus = 'fair'; weaknesses.push({ factor: 'utilization', description: `Utilization at ${util.toFixed(0)}% — should be under 30%, ideal under 10%`, impact: 'high', score_weight_percent: 30 }); }
      else { utilStatus = 'critical'; weaknesses.push({ factor: 'utilization', description: `Utilization at ${util.toFixed(0)}% — CRITICAL. Pay down immediately`, impact: 'high', score_weight_percent: 30 }); }
    }

    // Age analysis (15%)
    if (profile.average_account_age_months !== undefined) {
      if (profile.average_account_age_months >= 84) {
        strengths.push({ factor: 'age', description: `Average account age ${(profile.average_account_age_months / 12).toFixed(1)} years — excellent`, impact: 'medium', score_weight_percent: 15 });
      } else if (profile.average_account_age_months < 24) {
        weaknesses.push({ factor: 'age', description: `Average account age under 2 years — need to let accounts age`, impact: 'medium', score_weight_percent: 15 });
      }
    }

    // Mix analysis (10%)
    const types = profile.account_types || [];
    const hasRevolving = types.includes('revolving');
    const hasInstallment = types.some(t => ['installment', 'auto', 'student', 'personal', 'mortgage'].includes(t));
    const missingTypes: CreditAudit['missing_account_types'] = [];
    if (!hasRevolving) missingTypes.push('revolving');
    if (!hasInstallment) missingTypes.push('installment');
    if (types.length < 3) {
      weaknesses.push({ factor: 'mix', description: `Only ${types.length} account type(s) — FICO rewards variety`, impact: 'low', score_weight_percent: 10 });
    }

    // Inquiries (10%)
    if (profile.hard_inquiries_last_12mo !== undefined && profile.hard_inquiries_last_12mo > 3) {
      weaknesses.push({ factor: 'inquiries', description: `${profile.hard_inquiries_last_12mo} hard inquiries in last 12 months — slow down applications`, impact: 'low', score_weight_percent: 10 });
    }

    // Disputable items
    const disputableItems: DisputeCandidate[] = (profile.negative_items || [])
      .filter(item => item.disputable !== false)
      .map(item => this.assessDisputeCandidate(item))
      .sort((a, b) => b.priority_score - a.priority_score);

    // Recommended actions
    const actions = this.generateRecommendations(profile, phase, utilStatus, missingTypes);

    const audit: CreditAudit = {
      profile,
      score_phase: phase,
      strengths,
      weaknesses,
      disputable_items: disputableItems,
      missing_account_types: missingTypes,
      utilization_status: utilStatus,
      payment_history_status: (profile.on_time_payment_percent || 0) >= 99 ? 'perfect' : (profile.on_time_payment_percent || 0) >= 95 ? 'good' : (profile.on_time_payment_percent || 0) >= 85 ? 'needs_work' : 'poor',
      recommended_actions: actions,
    };

    return audit;
  }

  // -- Dispute Tracking (persisted via memory system) -----------------------

  async addDispute(userId: string, dispute: DisputeRecord): Promise<void> {
    const memory: Memory = {
      entityId: userId as UUID,
      agentId: this.runtime.agentId,
      roomId: userId as UUID,
      content: {
        text: `Dispute: ${dispute.letter_name} → ${dispute.target}`,
        ...dispute,
      },
      metadata: {
        type: 'custom',
        source: 'credit-builder',
        tags: ['dispute', dispute.letter_type, dispute.target],
      },
    };
    await this.runtime.createMemory(memory, DISPUTES_TABLE);
    logger.info(`[CreditBuilder] Dispute record saved for ${userId}: ${dispute.id}`);
  }

  async getDisputes(userId: string): Promise<DisputeRecord[]> {
    const memories = await this.runtime.getMemories({
      tableName: DISPUTES_TABLE,
      roomId: userId as UUID,
    });
    return memories.map(m => this.memoryToDispute(m)).filter((d): d is DisputeRecord => d !== null);
  }

  async getPendingDisputes(userId: string): Promise<DisputeRecord[]> {
    const now = new Date();
    const all = await this.getDisputes(userId);
    return all.filter(d =>
      ['sent', 'delivered'].includes(d.status) &&
      new Date(d.response_deadline) > now
    );
  }

  async getOverdueDisputes(userId: string): Promise<DisputeRecord[]> {
    const now = new Date();
    const all = await this.getDisputes(userId);
    return all.filter(d =>
      ['sent', 'delivered'].includes(d.status) &&
      new Date(d.response_deadline) <= now
    );
  }

  // -- Creditor Address Management ------------------------------------------

  normalizeCreditorName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  async saveCreditorAddress(userId: string, address: CreditorAddress): Promise<void> {
    const key = `${CREDITOR_ADDR_PREFIX}${userId}:${this.normalizeCreditorName(address.creditor_name)}`;
    await this.runtime.setCache(key, address);
    logger.info(`[CreditBuilder] Creditor address saved for ${userId}: ${address.creditor_name}`);
  }

  async getCreditorAddress(userId: string, creditorName: string): Promise<CreditorAddress | undefined> {
    const key = `${CREDITOR_ADDR_PREFIX}${userId}:${this.normalizeCreditorName(creditorName)}`;
    return await this.runtime.getCache<CreditorAddress>(key);
  }

  // -- Internal Helpers -----------------------------------------------------

  private memoryToDispute(memory: Memory): DisputeRecord | null {
    const c = memory.content as Record<string, unknown>;
    if (!c['letter_type'] || !c['target']) return null;
    return {
      id: (c['id'] as string) || (memory.id as string) || '',
      letter_type: c['letter_type'] as string,
      letter_name: c['letter_name'] as string,
      target: c['target'] as string,
      recipient_name: c['recipient_name'] as string,
      items_disputed: (c['items_disputed'] as NegativeItem[]) || [],
      sent_date: c['sent_date'] as string,
      response_deadline: c['response_deadline'] as string,
      escalation_date: c['escalation_date'] as string,
      status: c['status'] as DisputeRecord['status'],
      lob_letter_id: c['lob_letter_id'] as string | undefined,
      tracking_number: c['tracking_number'] as string | undefined,
      cost: c['cost'] as number | undefined,
      outcome: c['outcome'] as DisputeRecord['outcome'],
      notes: c['notes'] as string | undefined,
    };
  }

  private assessDisputeCandidate(item: NegativeItem): DisputeCandidate {
    let estimatedGain = 0;
    let successProb = 0;
    let letterType = 'basic_bureau';
    const escalation = ['Basic Bureau Dispute', '609 Verification', '611 Reinvestigation', 'CFPB Complaint', 'Intent to Sue', 'FCRA Attorney'];

    switch (item.type) {
      case 'late_payment':
        estimatedGain = 30;
        successProb = item.dispute_reason ? 0.65 : 0.35;
        letterType = item.dispute_reason ? 'basic_bureau' : 'goodwill';
        break;
      case 'collection':
        estimatedGain = 45;
        successProb = 0.55;
        letterType = 'debt_validation';
        break;
      case 'chargeoff':
        estimatedGain = 40;
        successProb = 0.40;
        letterType = 'chargeoff_removal';
        break;
      case 'inquiry':
        estimatedGain = 8;
        successProb = 0.70;
        letterType = 'unauthorized_inquiry';
        break;
      default:
        estimatedGain = 20;
        successProb = 0.50;
    }

    return {
      item,
      recommended_letter_type: letterType,
      estimated_score_gain: estimatedGain,
      success_probability: successProb,
      priority_score: Math.round(estimatedGain * successProb * 10) / 10,
      escalation_path: escalation,
    };
  }

  private generateRecommendations(
    profile: CreditProfile,
    phase: string,
    utilStatus: string,
    missingTypes: string[]
  ): RecommendedAction[] {
    const actions: RecommendedAction[] = [];

    if (utilStatus === 'critical' || utilStatus === 'fair') {
      actions.push({
        action: 'Reduce utilization',
        description: 'Pay down credit card balances. Target under 10% utilization on each card. Use AZEO strategy: pay all cards to $0 except one with a small $5-20 balance.',
        estimated_score_impact: utilStatus === 'critical' ? 50 : 25,
        cost: 0,
        timeline_days: 30,
        priority: 1,
        phase: 'acceleration',
      });
    }

    if ((profile.negative_items || []).length > 0) {
      actions.push({
        action: 'Dispute negative items',
        description: `You have ${profile.negative_items!.length} negative item(s) to dispute. Use the SEND_DISPUTE action to generate and send certified dispute letters.`,
        estimated_score_impact: 30,
        cost: 9,
        timeline_days: 30,
        priority: 2,
        phase: 'acceleration',
      });
    }

    if (phase === 'foundation') {
      if ((profile.total_accounts || 0) < 3) {
        actions.push({
          action: 'Open secured credit card',
          description: 'Open a Discover It Secured or Capital One Secured card. Use for one small recurring charge, set to autopay, pay in full monthly.',
          estimated_score_impact: 20,
          cost: 200,
          timeline_days: 7,
          priority: 3,
          phase: 'foundation',
        });
        actions.push({
          action: 'Open credit builder loan',
          description: 'Open a Self.inc credit builder loan ($25/month). Adds an installment account to your mix.',
          estimated_score_impact: 15,
          cost: 25,
          timeline_days: 7,
          priority: 4,
          phase: 'foundation',
        });
        actions.push({
          action: 'Become authorized user',
          description: 'Ask a trusted family member to add you as an authorized user on their oldest, highest-limit, lowest-utilization card. The full history backdates to your report.',
          estimated_score_impact: 40,
          cost: 0,
          timeline_days: 30,
          priority: 2,
          phase: 'foundation',
        });
      }
    }

    if (missingTypes.length > 0) {
      actions.push({
        action: 'Diversify credit mix',
        description: `Missing account types: ${missingTypes.join(', ')}. Adding variety to your credit mix improves the 10% credit mix factor.`,
        estimated_score_impact: 10,
        cost: 0,
        timeline_days: 30,
        priority: 5,
        phase: 'optimization',
      });
    }

    if (phase !== 'foundation') {
      actions.push({
        action: 'Request credit limit increases',
        description: 'Request CLI on all existing cards (soft pull when possible). Lowers utilization ratio without paying down balances.',
        estimated_score_impact: 15,
        cost: 0,
        timeline_days: 1,
        priority: 3,
        phase: 'optimization',
      });
    }

    actions.push({
      action: 'Enable Experian Boost',
      description: 'Connect utility, phone, and streaming payments to Experian Boost for an instant score bump (Experian only).',
      estimated_score_impact: 10,
      cost: 0,
      timeline_days: 1,
      priority: 4,
      phase: 'acceleration',
    });

    return actions.sort((a, b) => a.priority - b.priority);
  }
}
