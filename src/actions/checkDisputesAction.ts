/**
 * CHECK_DISPUTES — Monitor pending disputes, deadlines, and overdue items
 */

import type { Action, ActionResult, IAgentRuntime, Memory, HandlerCallback, State } from '@elizaos/core';
import { CreditProfileService } from '../services/creditProfileService';

const profileService = new CreditProfileService();

export const checkDisputesAction: Action = {
  name: 'CHECK_DISPUTES',
  similes: [
    'DISPUTE_STATUS', 'PENDING_DISPUTES', 'OVERDUE_DISPUTES', 'TRACK_DISPUTES',
    'MY_DISPUTES', 'DISPUTE_DEADLINES', 'DISPUTE_TRACKER',
  ],
  description: 'Check the status of all pending credit disputes, track 30-day response deadlines, and identify overdue items ready for escalation (CFPB complaint or FCRA attorney).',

  validate: async () => true,

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    options: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    const userId = message.userId;
    const pending = profileService.getPendingDisputes(userId);
    const overdue = profileService.getOverdueDisputes(userId);
    const all = profileService.getDisputes(userId);

    if (all.length === 0) {
      if (callback) {
        await callback({
          text: 'No disputes on record. Use ANALYZE_CREDIT to audit your credit, then SEND_DISPUTE to file dispute letters.',
          actions: ['ANALYZE_CREDIT'],
          source: message.content.source,
        });
      }
      return { success: true, text: 'No disputes found' };
    }

    let response = `**Dispute Tracker**\n\n`;
    response += `Total disputes: ${all.length}\n`;
    response += `Pending: ${pending.length}\n`;
    response += `Overdue: ${overdue.length}\n\n`;

    if (overdue.length > 0) {
      response += `**⚠️ OVERDUE — Ready for Escalation:**\n`;
      overdue.forEach(d => {
        const daysOver = Math.ceil((Date.now() - new Date(d.response_deadline).getTime()) / (1000 * 60 * 60 * 24));
        response += `- **${d.letter_name}** → ${d.target} | ${daysOver} days overdue\n`;
        response += `  Action: File CFPB complaint (consumerfinance.gov/complaint) or send Intent to Sue letter\n`;
        response += `  Bureau violated FCRA § 1681i — they had 30 days to investigate\n\n`;
      });
    }

    if (pending.length > 0) {
      response += `**Pending (Within 30-Day Window):**\n`;
      pending.forEach(d => {
        const daysLeft = Math.ceil((new Date(d.response_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        response += `- **${d.letter_name}** → ${d.target} | ${daysLeft} days remaining | Status: ${d.status}\n`;
        if (d.tracking_number) response += `  Tracking: ${d.tracking_number}\n`;
      });
    }

    const resolved = all.filter(d => d.status === 'resolved');
    if (resolved.length > 0) {
      response += `\n**Resolved (${resolved.length}):**\n`;
      resolved.forEach(d => {
        response += `- ${d.letter_name} → ${d.target}: ${d.outcome || 'resolved'}\n`;
      });
    }

    if (callback) {
      await callback({ text: response, actions: ['CHECK_DISPUTES'], source: message.content.source });
    }

    return { success: true, text: 'Dispute status retrieved', data: { pending, overdue, all } };
  },

  examples: [
    [
      { name: '{{user}}', content: { text: 'What\'s the status of my disputes?' } },
      { name: '{{agent}}', content: { text: 'Dispute Tracker — Total: 3, Pending: 2, Overdue: 1...', actions: ['CHECK_DISPUTES'] } },
    ],
  ],
};
