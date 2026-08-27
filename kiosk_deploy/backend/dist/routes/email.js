import { Router } from 'express';
import { z } from 'zod';
import QRCode from 'qrcode';
import { config } from '../config.js';
import { once } from '../lib/idempotency.js';
/**
 * Emails the customer their **digital** ticket(s) + И-Баримт receipt.
 *
 * This is the paperless kiosk's "keep your ticket" path: the browser can't send
 * mail (no credentials on a public box), so it posts the ticket data here and
 * the bridge renders an HTML email with scannable QR images and sends it via
 * Resend (https://resend.com).
 *
 * Idempotent on orderRef+recipient so a double-tap never sends twice. With no
 * RESEND_API_KEY set the route still validates + renders but returns
 * `{ simulated: true }` without sending — so dev works without a key.
 */
export const emailRouter = Router();
const TicketItem = z.object({
    code: z.string().min(1), // gate-validation QR payload
    zone: z.string().default(''),
});
const EmailBody = z.object({
    to: z.string().email(),
    lang: z.enum(['mn', 'en']).default('mn'),
    orderRef: z.string().min(1),
    event: z.string().min(1),
    startsAt: z.string(), // ISO-8601
    venue: z.string().default(''),
    total: z.number().int().nonnegative(),
    tickets: z.array(TicketItem).min(1),
    ebarimt: z
        .object({ qrData: z.string().default(''), lottery: z.string().default('') })
        .optional(),
});
emailRouter.post('/ticket', async (req, res) => {
    const parsed = EmailBody.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'invalid_body', detail: parsed.error.flatten() });
    }
    const data = parsed.data;
    try {
        const result = await once(`email:ticket:${data.orderRef}:${data.to}`, () => sendTicketEmail(data));
        res.json(result);
    }
    catch (e) {
        res.status(502).json({ error: 'email_failed', detail: String(e) });
    }
});
/** A QR rendered to a PNG, ready to inline in the email as a `cid:` image. */
async function qrAttachment(id, payload) {
    const png = await QRCode.toBuffer(payload, { width: 360, margin: 1, errorCorrectionLevel: 'M' });
    return { filename: `${id}.png`, content: png.toString('base64'), content_id: id };
}
async function sendTicketEmail(data) {
    const t = labels(data.lang);
    // Build the inline QR images: one per ticket, plus the И-Баримт.
    const attachments = [];
    for (let i = 0; i < data.tickets.length; i++) {
        attachments.push(await qrAttachment(`ticket-${i}`, data.tickets[i].code));
    }
    const hasEbarimt = !!data.ebarimt?.qrData;
    if (hasEbarimt) {
        attachments.push(await qrAttachment('ebarimt', data.ebarimt.qrData));
    }
    const html = renderHtml(data, t);
    const subject = `${t.subject} — ${data.event}`;
    // No key configured → simulate (dev / pre-provisioning) so the flow works.
    if (!config.resendApiKey) {
        return { sent: true, simulated: true, to: data.to, orderRef: data.orderRef };
    }
    const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${config.resendApiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: config.emailFrom,
            to: [data.to],
            subject,
            html,
            attachments,
            ...(config.emailReplyTo ? { reply_to: config.emailReplyTo } : {}),
        }),
    });
    if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`resend ${resp.status}: ${body}`);
    }
    const json = (await resp.json());
    return { sent: true, simulated: false, id: json.id ?? null, to: data.to, orderRef: data.orderRef };
}
// ---- presentation -----------------------------------------------------------
function labels(lang) {
    const mn = lang === 'mn';
    return {
        subject: mn ? 'Таны тасалбар' : 'Your ticket',
        heading: mn ? 'Тасалбар баталгаажлаа' : 'Your ticket is confirmed',
        intro: mn
            ? 'Хаалган дээр доорх QR кодыг үзүүлнэ үү.'
            : 'Show the QR code(s) below at the gate.',
        when: mn ? 'Хэзээ' : 'When',
        venue: mn ? 'Газар' : 'Venue',
        order: mn ? 'Захиалга' : 'Order',
        total: mn ? 'Нийт дүн' : 'Total',
        ticket: mn ? 'Тасалбар' : 'Ticket',
        ebarimt: mn ? 'И-Баримт' : 'И-Баримт fiscal receipt',
        ebarimtSub: mn
            ? 'НӨАТ-ын баримтыг И-Баримт аппаараа уншуулна уу.'
            : 'Scan with the И-Баримт app to claim your fiscal receipt.',
        lottery: mn ? 'Сугалааны дугаар' : 'Lottery number',
        footer: mn
            ? 'Энэ имэйлийг Үндэсний цэнгэлдэх хүрээлэнгийн тасалбарын киоскоос илгээв.'
            : 'Sent by the National Stadium ticket kiosk.',
    };
}
function esc(s) {
    return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function fmtMnt(n) {
    return `${n.toLocaleString('en-US')}₮`;
}
function fmtDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return iso;
    return d.toLocaleString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}
function renderHtml(data, t) {
    const ticketBlocks = data.tickets
        .map((tk, i) => `
      <div style="text-align:center;margin:24px 0;">
        <img src="cid:ticket-${i}" width="220" height="220" alt="${t.ticket} ${i + 1}"
             style="display:block;margin:0 auto;border:8px solid #ffffff;border-radius:12px;background:#fff;"/>
        <div style="margin-top:8px;font:600 15px/1.4 Arial,sans-serif;color:#1c1a22;">
          ${esc(tk.zone)}${data.tickets.length > 1 ? ` · ${t.ticket} ${i + 1}/${data.tickets.length}` : ''}
        </div>
        <div style="font:400 12px/1.4 Arial,sans-serif;color:#938e9c;">${esc(tk.code)}</div>
      </div>`)
        .join('');
    const ebarimtBlock = data.ebarimt?.qrData
        ? `
      <hr style="border:none;border-top:1px solid #e6e1d6;margin:28px 0;"/>
      <div style="text-align:center;">
        <div style="font:700 13px/1 Arial,sans-serif;letter-spacing:1.5px;color:#0028c8;text-transform:uppercase;">${t.ebarimt}</div>
        <p style="font:400 14px/1.5 Arial,sans-serif;color:#5a5664;margin:8px 0 16px;">${t.ebarimtSub}</p>
        <img src="cid:ebarimt" width="200" height="200" alt="${t.ebarimt}"
             style="display:block;margin:0 auto;border:8px solid #ffffff;border-radius:12px;background:#fff;"/>
        ${data.ebarimt.lottery
            ? `<div style="margin-top:10px;font:600 16px/1.4 Arial,sans-serif;color:#1c1a22;">${t.lottery}: ${esc(data.ebarimt.lottery)}</div>`
            : ''}
      </div>`
        : '';
    return `<!doctype html>
<html><body style="margin:0;background:#e7e2d7;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;">
    <div style="background:#0028c8;padding:24px 28px;">
      <div style="font:800 20px/1.2 Arial,sans-serif;color:#ffffff;letter-spacing:0.5px;">${t.heading}</div>
    </div>
    <div style="padding:24px 28px;">
      <div style="font:700 22px/1.3 Arial,sans-serif;color:#1c1a22;">${esc(data.event)}</div>
      <table style="width:100%;margin-top:16px;border-collapse:collapse;font:400 14px/1.6 Arial,sans-serif;color:#5a5664;">
        <tr><td style="color:#938e9c;">${t.when}</td><td style="text-align:right;color:#1c1a22;">${esc(fmtDate(data.startsAt))}</td></tr>
        ${data.venue
        ? `<tr><td style="color:#938e9c;">${t.venue}</td><td style="text-align:right;color:#1c1a22;">${esc(data.venue)}</td></tr>`
        : ''}
        <tr><td style="color:#938e9c;">${t.order}</td><td style="text-align:right;color:#1c1a22;">${esc(data.orderRef)}</td></tr>
        <tr><td style="color:#938e9c;">${t.total}</td><td style="text-align:right;font-weight:700;color:#1c1a22;">${fmtMnt(data.total)}</td></tr>
      </table>
      <hr style="border:none;border-top:1px solid #e6e1d6;margin:24px 0;"/>
      <p style="font:400 14px/1.5 Arial,sans-serif;color:#5a5664;margin:0 0 8px;">${t.intro}</p>
      ${ticketBlocks}
      ${ebarimtBlock}
    </div>
    <div style="padding:16px 28px;background:#f3f0e9;font:400 12px/1.5 Arial,sans-serif;color:#938e9c;text-align:center;">
      ${t.footer}
    </div>
  </div>
</body></html>`;
}
//# sourceMappingURL=email.js.map