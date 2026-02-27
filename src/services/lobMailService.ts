/**
 * Lob Certified Mail Service — Sends physical dispute letters via USPS
 */

import { logger } from '@elizaos/core';
import type { CreditProfile, NegativeItem, LetterType, DisputeRecord } from '../types';
import { LETTER_TYPE_INFO, BUREAU_ADDRESSES } from '../types';

export class LobMailService {
  private apiKey: string;
  private baseUrl = 'https://api.lob.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  get isTest(): boolean {
    return this.apiKey.startsWith('test_');
  }

  async verifyAddress(address: { address_line1: string; city: string; state: string; zip: string }): Promise<any> {
    const resp = await fetch(`${this.baseUrl}/us_verifications`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(this.apiKey + ':'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        primary_line: address.address_line1,
        city: address.city,
        state: address.state,
        zip_code: address.zip,
      }),
    });
    return resp.json();
  }

  async sendCertifiedLetter(
    from: { name: string; address_line1: string; city: string; state: string; zip: string },
    to: { name: string; address_line1: string; city: string; state: string; zip: string },
    html: string,
    description: string
  ): Promise<any> {
    const formData = new URLSearchParams();
    formData.append('description', description);
    formData.append('to[name]', to.name);
    formData.append('to[address_line1]', to.address_line1);
    formData.append('to[address_city]', to.city);
    formData.append('to[address_state]', to.state);
    formData.append('to[address_zip]', to.zip);
    formData.append('from[name]', from.name);
    formData.append('from[address_line1]', from.address_line1);
    formData.append('from[address_city]', from.city);
    formData.append('from[address_state]', from.state);
    formData.append('from[address_zip]', from.zip);
    formData.append('file', html);
    formData.append('color', 'false');
    formData.append('mail_type', 'usps_first_class');
    formData.append('extra_service', 'certified_return_receipt');
    formData.append('address_placement', 'top_first_page');

    const resp = await fetch(`${this.baseUrl}/letters`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(this.apiKey + ':'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Lob API error ${resp.status}: ${err}`);
    }

    return resp.json();
  }

  async checkStatus(letterId: string): Promise<any> {
    const resp = await fetch(`${this.baseUrl}/letters/${letterId}`, {
      headers: { 'Authorization': 'Basic ' + btoa(this.apiKey + ':') },
    });
    return resp.json();
  }

  async sendDispute(
    client: CreditProfile,
    letterType: LetterType,
    target: 'equifax' | 'experian' | 'transunion',
    disputeItems: NegativeItem[],
    extraContext?: Record<string, string>
  ): Promise<DisputeRecord> {
    const info = LETTER_TYPE_INFO[letterType];
    const bureau = BUREAU_ADDRESSES[target];
    const html = this.generateLetterHtml(letterType, client, bureau, disputeItems, extraContext);
    const description = `Credit Dispute #${info.id} - ${info.name} - ${target}`;

    const from = {
      name: client.name,
      address_line1: client.address_line1,
      city: client.city,
      state: client.state,
      zip: client.zip,
    };

    const to = {
      name: bureau.name,
      address_line1: bureau.address_line1,
      city: bureau.city,
      state: bureau.state,
      zip: bureau.zip,
    };

    logger.info(`[CreditBuilder] Sending ${info.name} to ${target} via certified mail...`);
    const result = await this.sendCertifiedLetter(from, to, html, description);

    const now = new Date();
    const record: DisputeRecord = {
      id: crypto.randomUUID(),
      letter_type: letterType,
      letter_name: info.name,
      target,
      recipient_name: bureau.name,
      items_disputed: disputeItems,
      sent_date: now.toISOString(),
      response_deadline: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      escalation_date: new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'sent',
      lob_letter_id: result.id,
      tracking_number: result.tracking_number,
      cost: result.price,
    };

    logger.info(`[CreditBuilder] Dispute sent! Letter ID: ${result.id}, Tracking: ${result.tracking_number}`);
    return record;
  }

  async sendToAllBureaus(
    client: CreditProfile,
    letterType: LetterType,
    disputeItems: NegativeItem[],
    extraContext?: Record<string, string>
  ): Promise<DisputeRecord[]> {
    const records: DisputeRecord[] = [];
    for (const bureau of ['equifax', 'experian', 'transunion'] as const) {
      const record = await this.sendDispute(client, letterType, bureau, disputeItems, extraContext);
      records.push(record);
    }
    return records;
  }

  private generateLetterHtml(
    letterType: LetterType,
    client: CreditProfile,
    recipient: { name: string; address_line1: string; city: string; state: string; zip: string },
    items: NegativeItem[],
    ctx?: Record<string, string>
  ): string {
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const context = ctx || {};

    const itemsBlock = items.map(item => `
      <p style="margin-left:20px">
        <strong>Account:</strong> ${item.creditor_name}<br>
        <strong>Account #:</strong> XXXX-${item.account_number_last4 || 'XXXX'}<br>
        <strong>Reason:</strong> ${item.dispute_reason || 'Information is inaccurate'}<br>
        <strong>Type:</strong> ${item.type}
      </p>
    `).join('');

    const header = `
      <div style="font-family:'Times New Roman',serif;font-size:12pt;line-height:1.6;max-width:6.5in;margin:0 auto">
        <p>${client.name}<br>${client.address_line1}<br>${client.city}, ${client.state} ${client.zip}<br>
        SSN (last 4): XXX-XX-${client.ssn_last4 || 'XXXX'}<br>DOB: ${client.dob || '[DOB]'}</p>
        <p>${today}</p>
        <p>${recipient.name}<br>${recipient.address_line1}<br>${recipient.city}, ${recipient.state} ${recipient.zip}</p>
    `;

    // Simplified body generation — full templates in production
    const info = LETTER_TYPE_INFO[letterType];
    const body = `
      <p><strong>RE: ${info.name}</strong></p>
      <p>Dear Sir/Madam:</p>
      <p>Pursuant to my rights under ${info.legal_basis}, I am writing regarding the following account(s):</p>
      ${itemsBlock}
      <p>I request that you investigate this matter and correct or delete the inaccurate information within 30 days as required by law.</p>
      <p>Please provide written confirmation of the results of your investigation.</p>
    `;

    const footer = `
        <p>Sincerely,</p><br><br>
        <p>${client.name}</p>
        <p style="font-size:10pt;color:#666;margin-top:30px"><em>SENT VIA USPS CERTIFIED MAIL — RETURN RECEIPT REQUESTED</em></p>
      </div>
    `;

    return `<html><body>${header}${body}${footer}</body></html>`;
  }
}
