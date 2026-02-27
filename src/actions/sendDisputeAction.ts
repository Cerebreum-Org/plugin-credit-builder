/**
 * SEND_DISPUTE — Generate and send certified dispute letters via Lob API
 */

import type { Action, ActionResult, IAgentRuntime, Memory, HandlerCallback, State } from '@elizaos/core';
import { logger } from '@elizaos/core';
import { LobMailService } from '../services/lobMailService';
import { CreditProfileService } from '../services/creditProfileService';
import type { LetterType, NegativeItem } from '../types';
import { LETTER_TYPE_INFO } from '../types';

const profileService = new CreditProfileService();

export const sendDisputeAction: Action = {
  name: 'SEND_DISPUTE',
  similes: [
    'DISPUTE_CREDIT', 'SEND_DISPUTE_LETTER', 'FILE_DISPUTE', 'DISPUTE_ITEM',
    'CREDIT_DISPUTE', 'REMOVE_NEGATIVE', 'CHALLENGE_CREDIT', 'DISPUTE_COLLECTION',
    'SEND_609', 'SEND_611', 'DEBT_VALIDATION', 'PAY_FOR_DELETE',
  ],
  description: 'Generate and send one of 19 FCRA/FDCPA dispute letter types as USPS Certified Mail with Return Receipt via Lob API. Supports disputes to all 3 credit bureaus, debt collectors, and creditors. Tracks 30-day response deadlines automatically.',

  validate: async (runtime: IAgentRuntime, _message: Memory) => {
    const lobKey = runtime.getSetting('LOB_API_KEY');
    if (!lobKey) {
      logger.warn('[CreditBuilder] LOB_API_KEY not configured — dispute sending disabled');
      return false;
    }
    return true;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    options: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    const userId = message.userId;
    const profile = profileService.getProfile(userId);

    if (!profile) {
      if (callback) {
        await callback({
          text: 'I need your credit profile before I can send disputes. Use ANALYZE_CREDIT first to set up your profile, then come back to send disputes.',
          actions: ['ANALYZE_CREDIT'],
          source: message.content.source,
        });
      }
      return { success: false, text: 'No profile found — run ANALYZE_CREDIT first' };
    }

    const lobKey = runtime.getSetting('LOB_API_KEY') || '';
    const lobService = new LobMailService(lobKey);

    // Parse intent from message
    const text = message.content.text.toLowerCase();

    // Determine letter type
    let letterType: LetterType = 'basic_bureau';
    if (text.includes('609')) letterType = '609_verification';
    else if (text.includes('611')) letterType = '611_reinvestigation';
    else if (text.includes('verification') || text.includes('method')) letterType = 'method_of_verification';
    else if (text.includes('identity') || text.includes('fraud')) letterType = 'identity_theft';
    else if (text.includes('validation') || text.includes('validate')) letterType = 'debt_validation';
    else if (text.includes('cease') || text.includes('stop')) letterType = 'cease_desist';
    else if (text.includes('pay for delete') || text.includes('pay-for-delete')) letterType = 'pay_for_delete';
    else if (text.includes('goodwill')) letterType = 'goodwill';
    else if (text.includes('direct')) letterType = 'direct_creditor';
    else if (text.includes('charge') && text.includes('off')) letterType = 'chargeoff_removal';
    else if (text.includes('inquiry') || text.includes('hard pull')) letterType = 'unauthorized_inquiry';
    else if (text.includes('medical') || text.includes('hipaa')) letterType = 'hipaa_medical';
    else if (text.includes('statute') || text.includes('expired') || text.includes('too old')) letterType = 'statute_of_limitations';
    else if (text.includes('sue') || text.includes('lawsuit')) letterType = 'intent_to_sue';
    else if (text.includes('arbitration')) letterType = 'arbitration_election';
    else if (text.includes('billing') || text.includes('unauthorized charge')) letterType = 'billing_error';

    const info = LETTER_TYPE_INFO[letterType];

    // Determine target
    let sendAll = text.includes('all bureau') || text.includes('all 3') || text.includes('all three');
    let target: 'equifax' | 'experian' | 'transunion' = 'equifax';
    if (text.includes('experian')) target = 'experian';
    else if (text.includes('transunion')) target = 'transunion';

    // Get dispute items from profile or message
    const disputeItems: NegativeItem[] = profile.negative_items?.slice(0, 3) || [{
      type: 'other',
      creditor_name: 'Unknown',
      dispute_reason: 'Information is inaccurate',
    }];

    try {
      let records;
      if (sendAll) {
        if (callback) {
          await callback({
            text: `Sending **${info.name}** to all 3 bureaus as USPS Certified Mail with Return Receipt...\n\nLetter type: #${info.id}\nLegal basis: ${info.legal_basis}\nCost: ~$27 (3 x ~$9)\n\nProcessing...`,
            source: message.content.source,
          });
        }
        records = await lobService.sendToAllBureaus(profile, letterType, disputeItems);
        records.forEach(r => profileService.addDispute(userId, r));

        const summary = records.map(r =>
          `- **${r.target}**: Letter ID ${r.lob_letter_id} | Tracking: ${r.tracking_number || 'pending'} | Deadline: ${new Date(r.response_deadline).toLocaleDateString()}`
        ).join('\n');

        if (callback) {
          await callback({
            text: `**Disputes sent to all 3 bureaus!**\n\n${summary}\n\n30-day response countdown started. I'll alert you when deadlines approach or if any bureau goes overdue.${lobService.isTest ? '\n\n⚠️ TEST MODE — no real mail was sent' : ''}`,
            actions: ['SEND_DISPUTE'],
            source: message.content.source,
          });
        }
      } else {
        if (callback) {
          await callback({
            text: `Sending **${info.name}** to **${target}** as USPS Certified Mail with Return Receipt...\n\nLetter type: #${info.id}\nLegal basis: ${info.legal_basis}\nCost: ~$9\n\nProcessing...`,
            source: message.content.source,
          });
        }
        const record = await lobService.sendDispute(profile, letterType, target, disputeItems);
        profileService.addDispute(userId, record);

        if (callback) {
          await callback({
            text: `**Dispute sent!**\n\n- **Target:** ${target}\n- **Letter:** ${info.name}\n- **Letter ID:** ${record.lob_letter_id}\n- **Tracking:** ${record.tracking_number || 'pending'}\n- **30-day deadline:** ${new Date(record.response_deadline).toLocaleDateString()}\n\nI'll track the response deadline. If they don't respond in 30 days, the item must be deleted by law.${lobService.isTest ? '\n\n⚠️ TEST MODE — no real mail was sent' : ''}`,
            actions: ['SEND_DISPUTE'],
            source: message.content.source,
          });
        }
      }

      return { success: true, text: 'Dispute(s) sent successfully', data: records || records };
    } catch (error: any) {
      logger.error(`[CreditBuilder] Dispute send failed: ${error.message}`);
      if (callback) {
        await callback({
          text: `Failed to send dispute: ${error.message}\n\nCheck that your LOB_API_KEY is valid and billing is set up at dashboard.lob.com`,
          source: message.content.source,
        });
      }
      return { success: false, text: `Failed: ${error.message}` };
    }
  },

  examples: [
    [
      { name: '{{user}}', content: { text: 'Send a basic dispute to Equifax about my Chase late payment' } },
      { name: '{{agent}}', content: { text: 'Sending Basic Credit Bureau Dispute to Equifax...', actions: ['SEND_DISPUTE'] } },
    ],
    [
      { name: '{{user}}', content: { text: 'Send a debt validation letter to all 3 bureaus' } },
      { name: '{{agent}}', content: { text: 'Sending Debt Validation Letter to all 3 bureaus...', actions: ['SEND_DISPUTE'] } },
    ],
    [
      { name: '{{user}}', content: { text: 'File a 609 letter with Experian' } },
      { name: '{{agent}}', content: { text: 'Sending 609 Verification Request to Experian...', actions: ['SEND_DISPUTE'] } },
    ],
  ],
};
