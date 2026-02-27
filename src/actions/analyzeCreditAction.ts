/**
 * ANALYZE_CREDIT — Intake + Audit action
 * Collects user's credit info and produces a full audit with recommendations
 */

import type { Action, ActionResult, IAgentRuntime, Memory, HandlerCallback, State } from '@elizaos/core';
import { logger } from '@elizaos/core';
import { CreditProfileService } from '../services/creditProfileService';

const profileService = new CreditProfileService();

export const analyzeCreditAction: Action = {
  name: 'ANALYZE_CREDIT',
  similes: [
    'CHECK_MY_CREDIT', 'CREDIT_AUDIT', 'REVIEW_CREDIT', 'CREDIT_REPORT',
    'ANALYZE_MY_CREDIT', 'CREDIT_CHECK', 'CREDIT_ANALYSIS', 'SCORE_ANALYSIS',
    'WHAT_IS_MY_CREDIT', 'HOW_IS_MY_CREDIT', 'CREDIT_HEALTH',
  ],
  description: 'Analyze a user\'s credit profile, identify weaknesses, disputable items, and generate a prioritized action plan with estimated score impacts. Covers FICO scoring factors: payment history (35%), utilization (30%), age (15%), mix (10%), inquiries (10%).',

  validate: async (_runtime: IAgentRuntime, _message: Memory) => {
    return true; // Always valid — handles intake conversationally
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    options: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    const userId = message.userId;
    const text = message.content.text.toLowerCase();

    // Check if we already have a profile
    let profile = profileService.getProfile(userId);

    if (!profile) {
      // Start intake process
      if (callback) {
        await callback({
          text: `Let me analyze your credit. I need some info:

**Required:**
1. Current credit score (approximate is fine)
2. How many open credit accounts do you have?
3. What types? (credit cards, auto loan, student loans, mortgage, etc.)
4. Any late payments, collections, or negative items?
5. What's your total credit limit across all cards?
6. What's your total balance across all cards?

**Optional but helpful:**
7. Age of your oldest account
8. Number of hard inquiries in the last 12 months
9. Monthly income
10. Credit goal (buy a house, get approved for a card, etc.)

Share what you know and I'll build your credit blueprint.`,
          actions: ['ANALYZE_CREDIT'],
          source: message.content.source,
        });
      }
      return { success: true, text: 'Intake started — waiting for credit data' };
    }

    // Run audit on existing profile
    const audit = profileService.runAudit(userId);
    if (!audit) {
      return { success: false, text: 'Could not run audit — profile data incomplete' };
    }

    // Format audit results
    let response = `**Credit Audit Results**\n\n`;
    response += `**Current Phase:** ${audit.score_phase.toUpperCase()}\n`;
    response += `**Score:** ${profile.current_score || 'Unknown'}\n`;
    response += `**Utilization:** ${audit.utilization_status}\n`;
    response += `**Payment History:** ${audit.payment_history_status}\n\n`;

    if (audit.strengths.length > 0) {
      response += `**Strengths:**\n`;
      audit.strengths.forEach(s => { response += `- ${s.description} (${s.score_weight_percent}% of score)\n`; });
      response += '\n';
    }

    if (audit.weaknesses.length > 0) {
      response += `**Weaknesses:**\n`;
      audit.weaknesses.forEach(w => { response += `- ${w.description} (${w.score_weight_percent}% of score)\n`; });
      response += '\n';
    }

    if (audit.disputable_items.length > 0) {
      response += `**Disputable Items (${audit.disputable_items.length}):**\n`;
      audit.disputable_items.forEach(d => {
        response += `- ${d.item.creditor_name}: ${d.recommended_letter_type} — est. +${d.estimated_score_gain}pts (${Math.round(d.success_probability * 100)}% success rate)\n`;
      });
      response += '\n';
    }

    response += `**Recommended Actions (Priority Order):**\n`;
    audit.recommended_actions.slice(0, 5).forEach((a, i) => {
      response += `${i + 1}. **${a.action}** — est. +${a.estimated_score_impact}pts in ${a.timeline_days} days${a.cost > 0 ? ` ($${a.cost})` : ' (free)'}\n`;
      response += `   ${a.description}\n\n`;
    });

    if (callback) {
      await callback({ text: response, actions: ['ANALYZE_CREDIT'], source: message.content.source });
    }

    return { success: true, text: 'Credit audit complete', data: audit };
  },

  examples: [
    [
      { name: '{{user}}', content: { text: 'Can you analyze my credit?' } },
      { name: '{{agent}}', content: { text: 'Let me analyze your credit. I need some info...', actions: ['ANALYZE_CREDIT'] } },
    ],
    [
      { name: '{{user}}', content: { text: 'My credit score is 620, I have 2 credit cards and one collection' } },
      { name: '{{agent}}', content: { text: 'Credit Audit Results — Phase: ACCELERATION...', actions: ['ANALYZE_CREDIT'] } },
    ],
  ],
};
