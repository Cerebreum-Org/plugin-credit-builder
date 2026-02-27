/**
 * Credit Context Provider — Gives the agent awareness of the user's credit state
 */

import type { Provider, IAgentRuntime, Memory, State } from '@elizaos/core';
import { CreditProfileService } from '../services/creditProfileService';

const profileService = new CreditProfileService();

export const creditContextProvider: Provider = {
  name: 'credit_context',
  description: 'Provides current credit profile, audit results, and pending dispute status as context for the agent',

  get: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<string> => {
    const userId = message.userId;
    const profile = profileService.getProfile(userId);

    if (!profile) {
      return 'No credit profile on file for this user. Use ANALYZE_CREDIT to start.';
    }

    const audit = profileService.getAudit(userId);
    const pending = profileService.getPendingDisputes(userId);
    const overdue = profileService.getOverdueDisputes(userId);

    let context = `[Credit Context]\n`;
    context += `Score: ${profile.current_score || 'unknown'}\n`;
    context += `Phase: ${audit?.score_phase || 'unknown'}\n`;
    context += `Accounts: ${profile.total_accounts || 'unknown'}\n`;
    context += `Utilization: ${profile.utilization_percent !== undefined ? profile.utilization_percent + '%' : 'unknown'}\n`;
    context += `Negative items: ${(profile.negative_items || []).length}\n`;
    context += `Pending disputes: ${pending.length}\n`;
    context += `Overdue disputes: ${overdue.length}\n`;

    if (overdue.length > 0) {
      context += `\n⚠️ ${overdue.length} dispute(s) past 30-day deadline — recommend escalation to CFPB\n`;
    }

    if (audit) {
      context += `\nTop weakness: ${audit.weaknesses[0]?.description || 'none identified'}\n`;
      context += `Top action: ${audit.recommended_actions[0]?.action || 'none'} (est. +${audit.recommended_actions[0]?.estimated_score_impact || 0}pts)\n`;
    }

    if (profile.business) {
      context += `\n[Business Credit]\n`;
      context += `Entity: ${profile.business.legal_name} (${profile.business.entity_type || 'unknown'})\n`;
      context += `DUNS: ${profile.business.duns_number || 'not registered'}\n`;
      context += `PAYDEX: ${profile.business.paydex_score || 'not established'}\n`;
      context += `Trade lines: ${profile.business.existing_trade_lines || 0}\n`;
    }

    return context;
  },
};
