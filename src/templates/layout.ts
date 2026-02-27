/**
 * Shared HTML layout utilities for dispute letter templates
 */

import type { CreditProfile, NegativeItem, LetterAddress } from '../types';

export type { LetterAddress };

export function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface LetterContext {
  letterType: string;
  client: CreditProfile;
  recipient: LetterAddress;
  items: NegativeItem[];
  extra?: Record<string, string>;
}

export function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function letterHeader(ctx: LetterContext): string {
  const { client, recipient } = ctx;
  return `
    <div style="font-family:'Times New Roman',serif;font-size:12pt;line-height:1.6;max-width:6.5in;margin:0 auto;padding:0.5in">
      <p>${esc(client.name)}<br>
      ${esc(client.address_line1)}<br>
      ${esc(client.city)}, ${esc(client.state)} ${esc(client.zip)}<br>
      SSN (last 4): XXX-XX-${esc(client.ssn_last4 || 'XXXX')}<br>
      DOB: ${esc(client.dob || '[DOB]')}</p>
      <p>${formatDate()}</p>
      <p>${esc(recipient.name)}<br>
      ${esc(recipient.address_line1)}<br>
      ${esc(recipient.city)}, ${esc(recipient.state)} ${esc(recipient.zip)}</p>
  `;
}

export function formatDisputedItems(items: NegativeItem[]): string {
  if (items.length === 0) return '';
  return items.map((item, i) => `
    <div style="margin:10px 0 10px 20px;padding:8px;border-left:2px solid #333">
      <strong>Item ${i + 1}:</strong><br>
      <strong>Creditor/Furnisher:</strong> ${esc(item.creditor_name)}<br>
      <strong>Account Number:</strong> XXXX-${esc(item.account_number_last4 || 'XXXX')}<br>
      <strong>Type:</strong> ${esc(item.type.replace(/_/g, ' '))}<br>
      ${item.amount ? `<strong>Amount:</strong> $${item.amount.toLocaleString()}<br>` : ''}
      ${item.date_reported ? `<strong>Date Reported:</strong> ${esc(item.date_reported)}<br>` : ''}
      <strong>Reason for Dispute:</strong> ${esc(item.dispute_reason || 'Information is inaccurate, incomplete, or unverifiable')}
    </div>
  `).join('');
}

export function letterFooter(
  client: CreditProfile,
  enclosures: string[] = [],
): string {
  const enclosureBlock = enclosures.length > 0
    ? `<p style="margin-top:20px"><strong>Enclosures:</strong></p>
       <ol style="margin-left:20px">
         ${enclosures.map(e => `<li>${e}</li>`).join('\n')}
       </ol>`
    : '';

  return `
    <p style="margin-top:30px">Sincerely,</p>
    <br><br>
    <p style="border-top:1px solid #000;width:250px;padding-top:4px">${esc(client.name)}</p>
    ${enclosureBlock}
    <p style="font-size:10pt;color:#444;margin-top:30px;border-top:1px solid #ccc;padding-top:10px">
      <em>SENT VIA USPS CERTIFIED MAIL &mdash; RETURN RECEIPT REQUESTED</em>
    </p>
    </div>
  `;
}

export function wrapHtml(header: string, body: string, footer: string): string {
  return `<html><body>${header}${body}${footer}</body></html>`;
}

export function buildLetter(
  ctx: LetterContext,
  body: string,
  enclosures: string[] = [],
): string {
  return wrapHtml(letterHeader(ctx), body, letterFooter(ctx.client, enclosures));
}
