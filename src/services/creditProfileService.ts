/**
 * Credit Profile Service — Manages client credit profiles and audit state
 */

import { type IAgentRuntime, logger } from '@elizaos/core';
import type { CreditProfile, CreditAudit, DisputeRecord, RecommendedAction, DisputeCandidate, NegativeItem } from '../types';

export class CreditProfileService {
  private profiles: Map<string, CreditProfile> = new Map();
  private audits: Map<string, CreditAudit> = new Map();
  private disputes: Map<string, DisputeRecord[]> = new Map();

  // -- Profile Management ---------------------------------------------------

  saveProfile(userId: string, profile: CreditProfile): void {
    this.profiles.set(userId, profile);
    logger.info(`[CreditBuilder] Profile saved for ${userId}`);
  }

  getProfile(userId: string): CreditProfile | undefined {
    return this.profiles.get(userId);
  }

  updateProfile(userId: string, updates: Partial<CreditProfile>): CreditProfile | undefined {
    const existing = this.profiles.get(userId);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.profiles.set(userId, updated);
    return updated;
  }

  // -- Credit Audit ---------------------------------------------------------

  runAudit(userId: string): CreditAudit | undefined {
    const profile = this.profiles.get(userId);
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

    this.audits.set(userId, audit);
    return audit;
  }

  getAudit(userId: string): CreditAudit | undefined {
    return this.audits.get(userId);
  }

  // -- Dispute Tracking -----------------------------------------------------

  addDispute(userId: string, dispute: DisputeRecord): void {
    const existing = this.disputes.get(userId) || [];
    existing.push(dispute);
    this.disputes.set(userId, existing);
  }

  getDisputes(userId: string): DisputeRecord[] {
    return this.disputes.get(userId) || [];
  }

  getPendingDisputes(userId: string): DisputeRecord[] {
    const now = new Date();
    return this.getDisputes(userId).filter(d =>
      ['sent', 'delivered'].includes(d.status) &&
      new Date(d.response_deadline) > now
    );
  }

  getOverdueDisputes(userId: string): DisputeRecord[] {
    const now = new Date();
    return this.getDisputes(userId).filter(d =>
      ['sent', 'delivered'].includes(d.status) &&
      new Date(d.response_deadline) <= now
    );
  }

  // -- Internal Helpers -----------------------------------------------------

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

    // Utilization fix (biggest quick win)
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

    // Dispute negatives
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

    // Foundation phase
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

    // Credit mix
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

    // Credit limit increases
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

    // Experian Boost
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
