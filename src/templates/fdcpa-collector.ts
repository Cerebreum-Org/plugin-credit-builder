/**
 * FDCPA Collector Letter Templates (Letters 6-8)
 * Target: Debt collectors and collection agencies
 */

import type { LetterContext } from './layout';
import { buildLetter, formatDisputedItems } from './layout';

/** Letter 6: Debt Validation Letter — FDCPA Section 1692g */
export function debtValidation(ctx: LetterContext): string {
  const body = `
    <p><strong>RE: Demand for Debt Validation Pursuant to FDCPA &sect; 1692g</strong></p>
    <p>Dear Sir/Madam:</p>
    <p>I am writing in response to your attempt to collect a debt. Pursuant to 15 U.S.C.
    &sect; 1692g(b) of the Fair Debt Collection Practices Act, I am formally disputing this
    debt and requesting validation of the following account(s):</p>
    ${formatDisputedItems(ctx.items)}
    <p>Under 15 U.S.C. &sect; 1692g(b), upon receipt of this dispute, you must <strong>cease all
    collection activity</strong> until you provide adequate validation. Specifically, I demand
    that you provide:</p>
    <ol>
      <li>The <strong>amount of the debt</strong>, including an itemized accounting of principal,
      interest, fees, and any other charges;</li>
      <li>The <strong>name of the original creditor</strong> to whom the debt is owed;</li>
      <li>A <strong>copy of the original signed agreement</strong> or contract that created the
      obligation, bearing my signature;</li>
      <li>Proof that you are <strong>licensed to collect debts</strong> in my state of residence;</li>
      <li>Documentation establishing the <strong>chain of assignment</strong> or sale from the
      original creditor to your agency; and</li>
      <li>Proof that the <strong>statute of limitations</strong> has not expired on this debt.</li>
    </ol>
    <p><strong>Important notices:</strong></p>
    <ul>
      <li>Under 15 U.S.C. &sect; 1692g(b), you must cease collection until validation is provided.</li>
      <li>Under 15 U.S.C. &sect; 1692c(c), any communication other than to provide validation
      during this period constitutes a violation.</li>
      <li>Under 15 U.S.C. &sect; 1692e, reporting an unvalidated debt to credit bureaus is
      deceptive and a violation of the FDCPA.</li>
    </ul>
    <p>If you cannot provide the requested validation, you must:</p>
    <ol>
      <li>Cease all collection efforts immediately;</li>
      <li>Remove any negative reporting from all three credit bureaus; and</li>
      <li>Confirm in writing that this matter is resolved.</li>
    </ol>
    <p>Violations of the FDCPA carry penalties of up to <strong>$1,000 per violation</strong> in
    statutory damages (15 U.S.C. &sect; 1692k), plus actual damages and attorney fees.</p>
  `;

  return buildLetter(ctx, body, [
    'Copy of government-issued photo identification',
    'Proof of current address',
  ]);
}

/** Letter 7: Cease and Desist Letter — FDCPA Section 1692c(c) */
export function ceaseDesist(ctx: LetterContext): string {
  const body = `
    <p><strong>RE: Cease and Desist Communication &mdash; FDCPA &sect; 1692c(c)</strong></p>
    <p>Dear Sir/Madam:</p>
    <p>Pursuant to 15 U.S.C. &sect; 1692c(c) of the Fair Debt Collection Practices Act,
    I hereby demand that you <strong>immediately cease all communication</strong> with me regarding
    the following alleged debt(s):</p>
    ${formatDisputedItems(ctx.items)}
    <p>Under 15 U.S.C. &sect; 1692c(c), after receipt of this notice, you may only contact me to:</p>
    <ol>
      <li>Advise me that further collection efforts are being terminated;</li>
      <li>Notify me that you may invoke specific remedies ordinarily invoked by such debt collector; or</li>
      <li>Notify me that you intend to invoke a specified remedy.</li>
    </ol>
    <p><strong>Any other contact constitutes a violation of federal law.</strong></p>
    <p>Additionally, I demand that you:</p>
    <ol>
      <li>Stop all telephone calls, letters, emails, text messages, and other forms of
      communication regarding this alleged debt;</li>
      <li>Do not contact my employer, family members, neighbors, or any third party regarding
      this matter (15 U.S.C. &sect; 1692c(b));</li>
      <li>Do not report or continue to report this disputed debt to any credit reporting
      agency, as doing so while the debt is disputed and unvalidated constitutes a
      deceptive practice under 15 U.S.C. &sect; 1692e; and</li>
      <li>Provide written confirmation that you have received this cease and desist notice.</li>
    </ol>
    <p>Each violation of 15 U.S.C. &sect; 1692c(c) subjects you to statutory damages of up to
    <strong>$1,000</strong> per violation (15 U.S.C. &sect; 1692k), plus actual damages, attorney
    fees, and court costs. I am documenting all communications for potential legal action.</p>
  `;

  return buildLetter(ctx, body, [
    'Copy of government-issued photo identification',
    'Log of prior collection communications (if applicable)',
  ]);
}

/** Letter 8: Pay-for-Delete Negotiation Letter */
export function payForDelete(ctx: LetterContext): string {
  const totalAmount = ctx.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const parsed = parseInt(ctx.extra?.['offer_percent'] || '40');
  const rate = isNaN(parsed) ? 40 : parsed;
  const offerAmount = totalAmount > 0
    ? Math.round(totalAmount * (rate / 100))
    : '[AMOUNT]';

  const body = `
    <p><strong>RE: Settlement Offer &mdash; Conditional Upon Deletion of Trade Line</strong></p>
    <p>Dear Sir/Madam:</p>
    <p>I am writing regarding the following account(s) currently being reported on my
    credit file:</p>
    ${formatDisputedItems(ctx.items)}
    <p>I am prepared to resolve this matter with a settlement payment, <strong>conditional upon
    the complete deletion</strong> of the above account(s) from all three major credit bureaus
    (Equifax, Experian, and TransUnion).</p>
    <p><strong>Terms of this offer:</strong></p>
    <ol>
      <li>I will pay <strong>$${offerAmount}</strong> as settlement in full for the above account(s);</li>
      <li>Payment will be made via certified funds (cashier&rsquo;s check or money order) within
      <strong>10 business days</strong> of receiving your written acceptance;</li>
      <li>Upon receipt of payment, you will submit a Universal Data Form (AUD) to Equifax,
      Experian, and TransUnion requesting <strong>complete deletion</strong> of the trade line(s)
      &mdash; not an update to "paid" or "settled" status;</li>
      <li>Deletion must be completed within <strong>30 days</strong> of payment; and</li>
      <li>You will provide written confirmation that the deletion request has been submitted.</li>
    </ol>
    <p><strong>This offer is contingent upon deletion.</strong> If you are unwilling or unable to
    delete the trade line, this offer is withdrawn. I am not acknowledging the validity of this
    debt, and this letter does not restart any statute of limitations.</p>
    <p>Please respond in writing to accept or decline this offer within <strong>15 days</strong>.
    If accepted, I will remit payment promptly. If I do not receive a response, I will assume
    this offer has been declined and will pursue other remedies available to me under the FCRA
    and FDCPA.</p>
    <p>This letter is sent without prejudice to any rights I may have under applicable law.</p>
  `;

  return buildLetter(ctx, body, [
    'Copy of government-issued photo identification',
  ]);
}
