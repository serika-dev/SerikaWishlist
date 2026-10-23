/**
 * Serika's email layout, ported from serika.moe (src/lib/server/email-layout.ts)
 * so wishlist emails look like every other Serika email: Twitter banner, "Hey,
 * I'm Serika," greeting, Outfit black italic headings, a sharp gradient button,
 * and flowing text with no boxed or pill-shaped containers.
 *
 * Tables and inline styles only, so it holds together in Gmail and Outlook.
 */

import { config } from '../config';

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export const DISCORD_INVITE_URL = 'https://discord.gg/5s2zgwn35y';
const SITE_URL = config.BASE_URL;
const SITE_LABEL = SITE_URL.replace(/^https?:\/\//, '');

const COLORS = {
  page: '#07040d',
  text: '#e9e1fb',
  muted: '#8b7fa3',
  accent: '#c084fc',
  accentStrong: '#a855f7',
  button: '#7c3aed',
  hairline: 'rgba(192,132,252,0.18)',
};

const BODY_FONT = "Outfit, 'Segoe UI', Aptos, Calibri, Arial, Helvetica, sans-serif";
const DISPLAY_FONT = "Outfit, 'Arial Black', 'Segoe UI Black', Arial, Helvetica, sans-serif";
const BANNER_URL = 'https://pbs.twimg.com/profile_banners/2035306328575668225/1774090527/600x200';

export function emailHeading(text: string): string {
  return `<h2 style="margin:32px 0 10px 0; font-family:${DISPLAY_FONT}; font-size:19px; line-height:24px; font-weight:900; font-style:italic; text-transform:uppercase; letter-spacing:0.2px; color:#ffffff;">${escapeHtml(text)}</h2>`;
}

/** A paragraph. `html` is trusted markup; escape user data before passing it. */
export function emailParagraph(html: string, options: { last?: boolean; muted?: boolean } = {}): string {
  return `<p style="margin:0 0 ${options.last ? 0 : 16}px 0; font-family:${BODY_FONT}; font-size:16px; line-height:26px; color:${options.muted ? COLORS.muted : COLORS.text};">${html}</p>`;
}

export function emailLink(url: string, text: string): string {
  return `<a href="${escapeHtml(url)}" style="color:${COLORS.accent}; font-weight:700; text-decoration:underline;">${escapeHtml(text)}</a>`;
}

/** A name in the accent colour, for "X replied". */
export function emailName(text: string): string {
  return `<span style="color:${COLORS.accent}; font-weight:700;">${escapeHtml(text)}</span>`;
}

export interface BrandEmail {
  eyebrow: string;
  title: string;
  preheader?: string;
  /** Trusted HTML shown after the greeting. */
  introHtml: string;
  /** Trusted HTML after the intro. */
  bodyHtml?: string;
  cta?: { url: string; label: string };
  closingHtml?: string;
  /** Why the reader got this email. Escaped. */
  reason?: string;
  unsubscribeUrl?: string;
}

export function renderBrandEmail(email: BrandEmail): string {
  const title = escapeHtml(email.title);

  const preheader = email.preheader
    ? `<div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:${COLORS.page}; opacity:0;">${escapeHtml(email.preheader)}${'&nbsp;&zwnj;'.repeat(60)}</div>`
    : '';

  const cta = email.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0 6px 0;"><tr>
        <td bgcolor="${COLORS.button}" style="background-color:${COLORS.button}; background-image:linear-gradient(90deg, #5b21b6 0%, #7c3aed 100%); border-radius:2px;">
          <a href="${escapeHtml(email.cta.url)}" style="display:inline-block; padding:15px 30px; font-family:${DISPLAY_FONT}; font-size:15px; line-height:18px; font-weight:900; font-style:italic; letter-spacing:1px; text-transform:uppercase; color:#ffffff; text-decoration:none;">${escapeHtml(email.cta.label)}</a>
        </td>
      </tr></table>`
    : '';

  const closing = email.closingHtml ?? '';

  const footerLinks = [
    `<a href="${SITE_URL}" style="color:#a78bfa; text-decoration:none;">${SITE_LABEL}</a>`,
    `<a href="https://serika.moe" style="color:#a78bfa; text-decoration:none;">serika.moe</a>`,
    `<a href="${DISCORD_INVITE_URL}" style="color:#a78bfa; text-decoration:none;">Discord</a>`,
    ...(email.unsubscribeUrl
      ? [`<a href="${escapeHtml(email.unsubscribeUrl)}" style="color:#a78bfa; text-decoration:underline;">Unsubscribe</a>`]
      : []),
  ].join(`<span style="color:${COLORS.muted};">&nbsp;&nbsp;·&nbsp;&nbsp;</span>`);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<link href="https://fonts.googleapis.com/css2?family=Outfit:ital,wght@0,400;0,700;0,900;1,900&display=swap" rel="stylesheet">
<title>${title}</title>
</head>
<body style="margin:0; padding:0; background-color:${COLORS.page};">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.page}" style="background-color:${COLORS.page};">
  <tr>
    <td align="center" style="padding:0;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px;">
        <tr>
          <td style="line-height:0; font-size:0;">
            <img src="${BANNER_URL}" alt="Serika" width="600" style="display:block; width:100%; max-width:600px; height:auto; border:0;">
          </td>
        </tr>
        <tr>
          <td height="3" bgcolor="${COLORS.accentStrong}" style="height:3px; line-height:3px; font-size:0; background-color:${COLORS.accentStrong}; background-image:linear-gradient(90deg, #5b21b6 0%, #a855f7 50%, #7c3aed 100%);">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:40px 36px 8px 36px; background-color:#09050f; background-image:radial-gradient(circle at top right, rgba(168,85,247,0.16) 0%, rgba(168,85,247,0) 40%), linear-gradient(180deg, #0b0614 0%, #07040d 100%);">
            <div style="margin:0 0 12px 0; font-family:${BODY_FONT}; font-size:12px; line-height:16px; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:${COLORS.accent};">${escapeHtml(email.eyebrow)}</div>
            <h1 style="margin:0 0 26px 0; font-family:${DISPLAY_FONT}; font-size:30px; line-height:35px; font-weight:900; font-style:italic; text-transform:uppercase; letter-spacing:-0.5px; color:#ffffff;">${title}</h1>
            ${emailParagraph(`Hey, I'm <span style="color:${COLORS.accent}; font-weight:700;">Serika</span>,`)}
            <div style="font-family:${BODY_FONT}; font-size:16px; line-height:26px; color:${COLORS.text};">${email.introHtml}</div>
            ${email.bodyHtml ?? ''}
            ${cta}
            <div style="margin:30px 0 0 0;">
              ${closing ? emailParagraph(closing) : ''}
              ${emailParagraph(`Kind regards,<br><span style="color:#d8b4fe; font-weight:700;">Serika</span>`, { last: true })}
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 36px 40px 36px; background-color:${COLORS.page};">
            <div style="border-top:1px solid ${COLORS.hairline}; padding-top:24px;">
              <a href="${SITE_URL}" style="text-decoration:none; font-family:${DISPLAY_FONT}; font-size:22px; line-height:26px; font-weight:800; color:#ffffff;">Serika<span style="color:#8b5cf6;">Wishlist</span></a>
              <div style="margin:12px 0 0 0; font-family:${BODY_FONT}; font-size:13px; line-height:20px;">${footerLinks}</div>
              ${email.reason ? `<div style="margin:10px 0 0 0; font-family:${BODY_FONT}; font-size:12px; line-height:18px; color:${COLORS.muted};">${escapeHtml(email.reason)}</div>` : ''}
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/**
 * A short run of wishlists as plain lines (linked title, item count),
 * in keeping with the no-boxes rule above.
 */
export function emailListLines(lists: { title: string; url: string; itemCount: number }[]): string {
  if (lists.length === 0) return '';
  const lines = lists
    .map(
      (list) =>
        `<div style="margin:0 0 8px 0; font-family:${BODY_FONT}; font-size:16px; line-height:24px; color:${COLORS.text};"><a href="${escapeHtml(list.url)}" style="color:#ffffff; font-weight:700; text-decoration:none;">${escapeHtml(list.title)}</a><span style="color:${COLORS.muted};">&nbsp;&nbsp;·&nbsp;&nbsp;${list.itemCount} ${list.itemCount === 1 ? 'wish' : 'wishes'}</span></div>`
    )
    .join('');
  return `<div style="margin:22px 0 0 0; padding:4px 0 0 14px; border-left:2px solid ${COLORS.accentStrong};">${lines}</div>`;
}
