import { MarketSessionStatus } from '@/types';

/**
 * Format a number into standard Indian Rupee currency format (₹1,23,456.78)
 */
export function formatINR(value: number, decimals: number = 2): string {
  if (isNaN(value) || value === null || value === undefined) return '₹0.00';
  
  const isNegative = value < 0;
  const absVal = Math.abs(value);
  const parts = absVal.toFixed(decimals).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1] ? `.${parts[1]}` : '';

  // Indian numbering system: last 3 digits, then groups of 2 digits
  if (integerPart.length > 3) {
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherDigits = integerPart.substring(0, integerPart.length - 3);
    const withCommas = otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    integerPart = `${withCommas},${lastThree}`;
  }

  return `${isNegative ? '-' : ''}₹${integerPart}${decimalPart}`;
}

/**
 * Format large amounts in ₹ Lakhs or ₹ Crores
 * e.g., 2000000 Cr -> ₹20.00 Lakh Cr
 * 45000 Cr -> ₹45,000 Cr
 */
export function formatCrores(crores: number): string {
  if (isNaN(crores) || crores === null || crores === undefined) return '₹0 Cr';
  
  const isNegative = crores < 0;
  const absVal = Math.abs(crores);

  if (absVal >= 100000) {
    // 1 Lakh Crore = 1,00,000 Crore
    const lakhCr = absVal / 100000;
    return `${isNegative ? '-' : ''}₹${lakhCr.toFixed(2)} Lakh Cr`;
  }
  
  // Format as Crores with Indian digit grouping
  const parts = absVal.toFixed(0).split('.');
  let integerPart = parts[0];
  if (integerPart.length > 3) {
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherDigits = integerPart.substring(0, integerPart.length - 3);
    const withCommas = otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    integerPart = `${withCommas},${lastThree}`;
  }
  
  return `${isNegative ? '-' : ''}₹${integerPart} Cr`;
}

/**
 * Format percentage with explicit +/- sign
 */
export function formatPercent(value: number): string {
  if (isNaN(value) || value === null || value === undefined) return '0.00%';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}%`;
}

/**
 * Format Indian stock volume into readable Indian units (Lakhs, Crores, K)
 */
export function formatVolume(volume: number): string {
  if (!volume || isNaN(volume)) return '0';
  if (volume >= 10000000) {
    return `${(volume / 10000000).toFixed(2)} Cr`;
  }
  if (volume >= 100000) {
    return `${(volume / 100000).toFixed(2)} L`;
  }
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)} K`;
  }
  return volume.toLocaleString('en-IN');
}

/**
 * Get current time in Asia/Kolkata (IST, UTC+05:30)
 */
export function getISTTime(date: Date = new Date()): {
  hours: number;
  minutes: number;
  seconds: number;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  dateString: string;
  timeString: string;
  isoString: string;
} {
  const istDateStr = date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const istDate = new Date(istDateStr);
  
  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const seconds = istDate.getSeconds();
  const dayOfWeek = istDate.getDay();

  const timeString = date.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const dateString = date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return {
    hours,
    minutes,
    seconds,
    dayOfWeek,
    dateString,
    timeString,
    isoString: date.toISOString()
  };
}

/**
 * List of known official NSE/BSE holidays (Month-Day format, or full dates)
 */
const INDIAN_MARKET_HOLIDAYS_2026 = [
  '2026-01-26', // Republic Day
  '2026-03-03', // Holi
  '2026-03-20', // Id-Ul-Fitr
  '2026-04-03', // Good Friday
  '2026-04-14', // Dr. Baba Saheb Ambedkar Jayanti
  '2026-05-01', // Maharashtra Day
  '2026-05-27', // Bakri Id
  '2026-08-15', // Independence Day
  '2026-08-26', // Milad-un-Nabi
  '2026-10-02', // Mahatma Gandhi Jayanti
  '2026-10-20', // Dussehra
  '2026-11-08', // Diwali Laxmi Pujan (Muhurat Trading only in evening)
  '2026-11-10', // Diwali Balipratipada
  '2026-11-24', // Guru Nanak Jayanti
  '2026-12-25', // Christmas
];

/**
 * Calculate Indian stock market session status according to official NSE/BSE operating hours
 */
export function getMarketSessionStatus(date: Date = new Date()): {
  status: MarketSessionStatus;
  statusLabel: string;
  nextSessionText: string;
  isHoliday: boolean;
  istTime: string;
} {
  const ist = getISTTime(date);
  const isoDate = date.toISOString().split('T')[0];
  const isWeekend = ist.dayOfWeek === 0 || ist.dayOfWeek === 6;
  const isHoliday = INDIAN_MARKET_HOLIDAYS_2026.includes(isoDate);

  if (isHoliday) {
    return {
      status: 'HOLIDAY',
      statusLabel: 'Market Closed (Exchange Holiday)',
      nextSessionText: 'Next trading session opens at 09:15 AM IST on next business day',
      isHoliday: true,
      istTime: `${ist.timeString} IST`
    };
  }

  if (isWeekend) {
    return {
      status: 'CLOSED',
      statusLabel: 'Market Closed (Weekend)',
      nextSessionText: 'Opens Monday at 09:00 AM IST (Pre-open session)',
      isHoliday: false,
      istTime: `${ist.timeString} IST`
    };
  }

  const currentMinutes = ist.hours * 60 + ist.minutes;
  const preOpenStart = 9 * 60; // 09:00 AM
  const preOpenEnd = 9 * 60 + 15; // 09:15 AM
  const regularClose = 15 * 60 + 30; // 03:30 PM
  const postCloseEnd = 16 * 60; // 04:00 PM

  if (currentMinutes >= preOpenStart && currentMinutes < preOpenEnd) {
    return {
      status: 'PRE_OPEN',
      statusLabel: 'Pre-Open Session (09:00 - 09:15 IST)',
      nextSessionText: 'Regular equity trading starts at 09:15 AM IST',
      isHoliday: false,
      istTime: `${ist.timeString} IST`
    };
  }

  if (currentMinutes >= preOpenEnd && currentMinutes < regularClose) {
    return {
      status: 'REGULAR',
      statusLabel: 'Market Open (NSE / BSE)',
      nextSessionText: 'Regular session closes at 03:30 PM IST',
      isHoliday: false,
      istTime: `${ist.timeString} IST`
    };
  }

  if (currentMinutes >= regularClose && currentMinutes < postCloseEnd) {
    return {
      status: 'POST_CLOSING',
      statusLabel: 'Post-Market Closing Session',
      nextSessionText: 'Post-market session ends at 04:00 PM IST',
      isHoliday: false,
      istTime: `${ist.timeString} IST`
    };
  }

  return {
    status: 'CLOSED',
    statusLabel: 'Market Closed',
    nextSessionText: 'Re-opens tomorrow at 09:00 AM IST',
    isHoliday: false,
    istTime: `${ist.timeString} IST`
  };
}

/**
 * Clean & normalize Indian stock tickers between NSE, BSE, and symbol aliases
 */
export function normalizeIndianSymbol(symbol: string): {
  cleanSymbol: string;
  nseSymbol: string;
  bseSymbol: string;
} {
  const upper = symbol.trim().toUpperCase();
  const stripped = upper.replace(/\.(NS|BO|BSE|NSE)$/i, '');
  return {
    cleanSymbol: stripped,
    nseSymbol: `${stripped}.NS`,
    bseSymbol: `${stripped}.BO`
  };
}
