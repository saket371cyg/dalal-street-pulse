import { getAllActiveAlerts, triggerAlert, createNotification, getUserSettings } from '@/lib/db/store';
import { getStockQuote } from '@/lib/market-data';
import { formatINR, formatPercent } from '@/lib/utils/indian-market';
import nodemailer from 'nodemailer';

/**
 * Evaluate all active price alerts against current Indian market prices
 */
export async function evaluatePriceAlerts(): Promise<{
  checkedCount: number;
  triggeredCount: number;
  results: { alertId: string; symbol: string; condition: string; currentPrice: number; triggered: boolean }[];
}> {
  const activeAlerts = await getAllActiveAlerts();
  const results: { alertId: string; symbol: string; condition: string; currentPrice: number; triggered: boolean }[] = [];
  let triggeredCount = 0;

  for (const alert of activeAlerts) {
    const quote = await getStockQuote(alert.symbol);
    if (!quote) continue;

    let shouldTrigger = false;
    let reasonMessage = '';

    switch (alert.condition) {
      case 'PRICE_ABOVE':
        if (quote.currentPrice >= alert.thresholdValue) {
          shouldTrigger = true;
          reasonMessage = `${quote.companyName} (${alert.symbol}) has crossed ABOVE target price of ${formatINR(alert.thresholdValue)} (Current: ${formatINR(quote.currentPrice)}).`;
        }
        break;

      case 'PRICE_BELOW':
        if (quote.currentPrice <= alert.thresholdValue) {
          shouldTrigger = true;
          reasonMessage = `${quote.companyName} (${alert.symbol}) has crossed BELOW target price of ${formatINR(alert.thresholdValue)} (Current: ${formatINR(quote.currentPrice)}).`;
        }
        break;

      case 'PCT_GAIN_ABOVE':
        if (quote.percentChange >= alert.thresholdValue) {
          shouldTrigger = true;
          reasonMessage = `${quote.companyName} (${alert.symbol}) is up ${formatPercent(quote.percentChange)}, exceeding your ${formatPercent(alert.thresholdValue)} alert threshold.`;
        }
        break;

      case 'PCT_LOSS_BELOW':
        if (quote.percentChange <= -alert.thresholdValue) {
          shouldTrigger = true;
          reasonMessage = `${quote.companyName} (${alert.symbol}) is down ${formatPercent(quote.percentChange)}, falling below your -${formatPercent(alert.thresholdValue)} alert threshold.`;
        }
        break;
    }

    if (shouldTrigger) {
      triggeredCount++;
      // 1. Mark alert as triggered in database
      await triggerAlert(alert.id, quote.currentPrice);

      // 2. Create in-app notification
      await createNotification({
        userId: alert.userId,
        title: `Price Alert Triggered: ${alert.symbol}`,
        message: reasonMessage,
        type: 'ALERT',
        link: `/stocks/${alert.symbol}`,
      });

      // 3. Attempt email dispatch if user settings enable it
      try {
        const userSettings = await getUserSettings(alert.userId);
        if (userSettings && process.env.SMTP_USER && process.env.SMTP_PASS) {
          await sendEmailNotification(userSettings.email, `Price Alert: ${alert.symbol} triggered`, reasonMessage);
        }
      } catch (err) {
        console.warn('Email dispatch skipped or failed:', (err as Error).message);
      }
    }

    results.push({
      alertId: alert.id,
      symbol: alert.symbol,
      condition: alert.condition,
      currentPrice: quote.currentPrice,
      triggered: shouldTrigger,
    });
  }

  return {
    checkedCount: activeAlerts.length,
    triggeredCount,
    results,
  };
}

/**
 * Deliver email notification via Nodemailer
 */
export async function sendEmailNotification(to: string, subject: string, body: string): Promise<boolean> {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || 'Dalal Street Pulse <no-reply@dalalstreetpulse.com>';

  if (!user || !pass) {
    // Graceful skip when SMTP credentials are not configured in local environment
    return false;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to,
    subject: `[Dalal Street Pulse] ${subject}`,
    text: body,
    html: `
      <div style="font-family: sans-serif; padding: 20px; background-color: #0b132b; color: #ffffff;">
        <h2 style="color: #60a5fa;">Dalal Street Pulse Alert</h2>
        <p style="font-size: 16px; line-height: 1.5;">${body}</p>
        <hr style="border-color: #1e293b; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">This is an automated alert from Dalal Street Pulse. Prioritizing Indian equities (NSE & BSE).</p>
      </div>
    `,
  });

  return true;
}
