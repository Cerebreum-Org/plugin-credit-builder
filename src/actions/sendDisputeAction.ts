/**
 * SEND_DISPUTE — Generate and send certified dispute letters via Lob API
 */

import type { Action, ActionResult, IAgentRuntime, Memory, HandlerCallback, State } from '@elizaos/core';
import { logger } from '@elizaos/core';
import { LobMailService } from '../services/lobMailService';
import type { CreditProfileService } from '../services/creditProfileService';
import type { LetterType, NegativeItem, CreditorAddress, LetterAddress } from '../types';
import { LETTER_TYPE_INFO } from '../types';

const BUREAU_NAMES = ['equifax', 'experian', 'transunion'] as const;
type BureauName = typeof BUREAU_NAMES[number];

function extractCreditorName(text: string, negativeItems: NegativeItem[]): string | undefined {
  const lower = text.toLowerCase();
  for (const item of negativeItems) {
    if (item.creditor_name && lower.includes(item.creditor_name.toLowerCase())) {
      return item.creditor_name;
    }
  }
  return undefined;
}

function parseCreditorAddress(text: string, entityType: 'creditor' | 'collector'): CreditorAddress | null {
  // Split on commas, then anchor from right: last part = "ST 12345", second-to-last = city, etc.
  const parts = text.split(',').map(s => s.trim());
  if (parts.length < 4) return null;

  const stateZipMatch = parts[parts.length - 1].match(/^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  if (!stateZipMatch) return null;

  const state = stateZipMatch[1].toUpperCase();
  const zip = stateZipMatch[2];
  const city = parts[parts.length - 2];
  const address_line1 = parts[parts.length - 3];
  const name = parts.slice(0, parts.length - 3).join(', ');

  if (!name || !address_line1 || !city) return null;

  return {
    creditor_name: name,
    entity_type: entityType,
    name,
    address_line1,
    city,
    state,
    zip,
  };
}

function detectBureau(text: string): BureauName | undefined {
  const lower = text.toLowerCase();
  if (lower.includes('equifax')) return 'equifax';
  if (lower.includes('experian')) return 'experian';
  if (lower.includes('transunion')) return 'transunion';
  return undefined;
}

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
    const profileService = runtime.getService<CreditProfileService>('credit_profile');
    if (!profileService) {
      logger.error('[CreditBuilder] CreditProfileService not registered');
      return { success: false, text: 'Credit profile service unavailable' };
    }

    const userId = message.entityId as string;
    const profile = await profileService.getProfile(userId);

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

    const lobKey = runtime.getSetting('LOB_API_KEY') as string || '';
    const lobService = new LobMailService(lobKey);

    // Parse intent from message
    const text = (message.content.text || '').toLowerCase();

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
    else if (text.includes('breach') && text.includes('contract')) letterType = 'breach_of_contract';
    else if (text.includes('demand') || text.includes('formal demand')) letterType = 'demand_letter';

    const info = LETTER_TYPE_INFO[letterType];
    const targetType = info.target_type; // 'bureau' | 'creditor' | 'collector' | 'any'

    // Get dispute items from profile
    const negativeItems = profile.negative_items || [];
    if (negativeItems.length === 0) {
      if (callback) {
        await callback({
          text: 'No negative items found on your credit profile to dispute. Use ANALYZE_CREDIT to update your profile with items to dispute.',
          source: message.content.source,
        });
      }
      return { success: false, text: 'No negative items to dispute' };
    }
    const disputeItems = negativeItems.slice(0, 3);

    try {
      // ── Bureau target path ──────────────────────────────────────────────
      if (targetType === 'bureau' || (targetType === 'any' && detectBureau(text))) {
        const sendAll = text.includes('all bureau') || text.includes('all 3') || text.includes('all three');
        let bureau: BureauName = detectBureau(text) || 'equifax';

        let records;
        if (sendAll) {
          if (callback) {
            await callback({
              text: `Sending **${info.name}** to all 3 bureaus as USPS Certified Mail with Return Receipt...\n\nLetter type: #${info.id}\nLegal basis: ${info.legal_basis}\nCost: ~$27 (3 x ~$9)\n\nProcessing...`,
              source: message.content.source,
            });
          }
          records = await lobService.sendToAllBureaus(profile, letterType, disputeItems);
          for (const r of records) {
            await profileService.addDispute(userId, r);
          }

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
              text: `Sending **${info.name}** to **${bureau}** as USPS Certified Mail with Return Receipt...\n\nLetter type: #${info.id}\nLegal basis: ${info.legal_basis}\nCost: ~$9\n\nProcessing...`,
              source: message.content.source,
            });
          }
          const record = await lobService.sendDispute(profile, letterType, bureau, disputeItems);
          await profileService.addDispute(userId, record);
          records = [record];

          if (callback) {
            await callback({
              text: `**Dispute sent!**\n\n- **Target:** ${bureau}\n- **Letter:** ${info.name}\n- **Letter ID:** ${record.lob_letter_id}\n- **Tracking:** ${record.tracking_number || 'pending'}\n- **30-day deadline:** ${new Date(record.response_deadline).toLocaleDateString()}\n\nI'll track the response deadline. If they don't respond in 30 days, the item must be deleted by law.${lobService.isTest ? '\n\n⚠️ TEST MODE — no real mail was sent' : ''}`,
              actions: ['SEND_DISPUTE'],
              source: message.content.source,
            });
          }
        }

        return { success: true, text: 'Dispute(s) sent successfully', data: { records } };
      }

      // ── "any" target without bureau mentioned — ask the user ────────────
      if (targetType === 'any') {
        if (callback) {
          await callback({
            text: `**${info.name}** can be sent to a credit bureau or a specific creditor/collector.\n\nWho should I send this to? Name a bureau (Equifax, Experian, TransUnion) or a creditor/collector name from your report.`,
            actions: ['SEND_DISPUTE'],
            source: message.content.source,
          });
        }
        return { success: true, text: 'Awaiting target selection for "any" letter type' };
      }

      // ── Creditor / Collector target path ────────────────────────────────
      const entityType = targetType as 'creditor' | 'collector';
      const rawText = message.content.text || '';

      // Try to parse an address from the message (user providing address directly)
      const parsed = parseCreditorAddress(rawText.trim(), entityType);
      if (parsed) {
        await profileService.saveCreditorAddress(userId, parsed);
        if (callback) {
          await callback({
            text: `Address saved for **${parsed.creditor_name}**:\n${parsed.address_line1}, ${parsed.city}, ${parsed.state} ${parsed.zip}\n\nNow say "send ${letterType.replace(/_/g, ' ')} to ${parsed.creditor_name}" to send the letter.`,
            source: message.content.source,
          });
        }
        return { success: true, text: `Creditor address saved for ${parsed.creditor_name}` };
      }

      // Try to extract creditor name from the message
      const creditorName = extractCreditorName(rawText, negativeItems);

      if (!creditorName) {
        const knownCreditors = [...new Set(negativeItems.map(i => i.creditor_name))].filter(Boolean);
        const creditorList = knownCreditors.length > 0
          ? `\n\nCreditors/collectors on your report:\n${knownCreditors.map(c => `- ${c}`).join('\n')}`
          : '';

        if (callback) {
          await callback({
            text: `**${info.name}** needs to be sent to a specific ${entityType}. Which one should I send it to?${creditorList}`,
            actions: ['SEND_DISPUTE'],
            source: message.content.source,
          });
        }
        return { success: true, text: `Awaiting ${entityType} name for ${letterType}` };
      }

      // Creditor name found — look up stored address
      const storedAddress = await profileService.getCreditorAddress(userId, creditorName);

      if (!storedAddress) {
        if (callback) {
          await callback({
            text: `I don't have a mailing address for **${creditorName}**. Please provide their address in this format:\n\n\`${creditorName}, 123 Street Address, City, ST 12345\`\n\nYou can usually find this on your credit report, a bill, or the ${entityType}'s website.`,
            actions: ['SEND_DISPUTE'],
            source: message.content.source,
          });
        }
        return { success: true, text: `Awaiting address for ${creditorName}` };
      }

      // Address found — send the letter
      const letterAddress: LetterAddress = {
        name: storedAddress.name,
        address_line1: storedAddress.address_line1,
        city: storedAddress.city,
        state: storedAddress.state,
        zip: storedAddress.zip,
      };

      if (callback) {
        await callback({
          text: `Sending **${info.name}** to **${creditorName}** at ${storedAddress.address_line1}, ${storedAddress.city}, ${storedAddress.state} ${storedAddress.zip}...\n\nLetter type: #${info.id}\nLegal basis: ${info.legal_basis}\nCost: ~$9\n\nProcessing...`,
          source: message.content.source,
        });
      }

      // Filter dispute items to those from this creditor (bidirectional substring match)
      const creditorLower = creditorName.toLowerCase();
      const creditorItems = negativeItems.filter(i => {
        const itemLower = i.creditor_name.toLowerCase();
        return itemLower.includes(creditorLower) || creditorLower.includes(itemLower);
      });
      const itemsToDispute = creditorItems.length > 0 ? creditorItems : disputeItems;

      const record = await lobService.sendDispute(profile, letterType, letterAddress, itemsToDispute);
      await profileService.addDispute(userId, record);

      if (callback) {
        await callback({
          text: `**Dispute sent!**\n\n- **Target:** ${creditorName}\n- **Letter:** ${info.name}\n- **Letter ID:** ${record.lob_letter_id}\n- **Tracking:** ${record.tracking_number || 'pending'}\n- **30-day deadline:** ${new Date(record.response_deadline).toLocaleDateString()}\n\nI'll track the response deadline.${lobService.isTest ? '\n\n⚠️ TEST MODE — no real mail was sent' : ''}`,
          actions: ['SEND_DISPUTE'],
          source: message.content.source,
        });
      }

      return { success: true, text: 'Dispute sent successfully', data: { records: [record] } };
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
    [
      { name: '{{user}}', content: { text: 'Send goodwill letter to Capital One' } },
      { name: '{{agent}}', content: { text: 'Sending Goodwill Removal Letter to Capital One...', actions: ['SEND_DISPUTE'] } },
    ],
    [
      { name: '{{user}}', content: { text: 'Midland Credit Management, 350 Camino de la Reina, San Diego, CA 92108' } },
      { name: '{{agent}}', content: { text: 'Address saved for Midland Credit Management. Now say "send debt validation to Midland Credit Management" to send.', actions: ['SEND_DISPUTE'] } },
    ],
  ],
};
