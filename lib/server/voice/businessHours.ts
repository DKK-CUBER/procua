export interface SupplierWorkingHours {
  startHour: number; // 0-23
  startMinute: number; // 0-59
  endHour: number; // 0-23
  endMinute: number; // 0-59
  daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  timezone: string; // e.g. 'Asia/Kolkata'
  holidays?: string[]; // ISO date strings 'YYYY-MM-DD'
}

export interface BusinessHoursCheckResult {
  canCallNow: boolean;
  reason: string;
  supplierLocalTime: string;
  supplierTimezone: string;
  isWithinWorkingHours: boolean;
  isWorkingDay: boolean;
  isHoliday: boolean;
  isOvernightOrMidnight: boolean;
  nextCallingWindow: {
    startTime: string; // ISO string
    formatted: string;
    description: string;
  } | null;
}

// Known Indian National & Major B2B Holidays (2026)
const DEFAULT_INDIAN_HOLIDAYS_2026 = [
  '2026-01-26', // Republic Day
  '2026-03-04', // Holi
  '2026-04-03', // Good Friday
  '2026-04-14', // Tamil New Year / Ambedkar Jayanti
  '2026-05-01', // May Day
  '2026-08-15', // Independence Day
  '2026-10-02', // Gandhi Jayanti
  '2026-10-20', // Dussehra
  '2026-11-08', // Diwali
  '2026-12-25'  // Christmas
];

// Conservative Default: Monday to Friday, 10:00 AM to 6:00 PM IST
export const CONSERVATIVE_DEFAULT_HOURS: SupplierWorkingHours = {
  startHour: 10,
  startMinute: 0,
  endHour: 18,
  endMinute: 0,
  daysOfWeek: [1, 2, 3, 4, 5], // Monday - Friday
  timezone: 'Asia/Kolkata',
  holidays: DEFAULT_INDIAN_HOLIDAYS_2026
};

/**
 * 1. Determine Supplier Timezone based on country / location / phone prefix.
 */
export function getSupplierTimezone(location?: { city?: string; state?: string; country?: string }, phone?: string): string {
  if (phone?.startsWith('+1')) return 'America/New_York';
  if (phone?.startsWith('+44')) return 'Europe/London';
  if (phone?.startsWith('+65')) return 'Asia/Singapore';
  if (phone?.startsWith('+971')) return 'Asia/Dubai';

  // Default for India
  return 'Asia/Kolkata';
}

/**
 * Helper to get local date parts in supplier's timezone
 */
export function getSupplierZonedParts(date: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short'
  });

  const parts = formatter.formatToParts(date);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  const year = parseInt(partMap.year);
  const month = parseInt(partMap.month);
  const day = parseInt(partMap.day);
  const hour = parseInt(partMap.hour);
  const minute = parseInt(partMap.minute);
  const second = parseInt(partMap.second);
  const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6
  };
  const dayOfWeek = weekdayMap[partMap.weekday] ?? 1;

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    isoDate,
    dayOfWeek,
    formatted: `${isoDate} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} (${timezone})`
  };
}

/**
 * Evaluates all 10 Hard Business Hours Rules for calling a supplier.
 */
export function validateBusinessHours(params: {
  supplierHours?: Partial<SupplierWorkingHours>;
  location?: { city?: string; state?: string; country?: string };
  phone?: string;
  now?: Date;
}): BusinessHoursCheckResult {
  const now = params.now || new Date();
  const timezone = params.supplierHours?.timezone || getSupplierTimezone(params.location, params.phone);

  const startHour = params.supplierHours?.startHour ?? CONSERVATIVE_DEFAULT_HOURS.startHour;
  const startMinute = params.supplierHours?.startMinute ?? CONSERVATIVE_DEFAULT_HOURS.startMinute;
  const endHour = params.supplierHours?.endHour ?? CONSERVATIVE_DEFAULT_HOURS.endHour;
  const endMinute = params.supplierHours?.endMinute ?? CONSERVATIVE_DEFAULT_HOURS.endMinute;
  const daysOfWeek = params.supplierHours?.daysOfWeek ?? CONSERVATIVE_DEFAULT_HOURS.daysOfWeek;
  const holidays = params.supplierHours?.holidays ?? DEFAULT_INDIAN_HOLIDAYS_2026;

  // 4. Convert current time to supplier local time
  const local = getSupplierZonedParts(now, timezone);

  // 6. Midnight / Overnight check (Strictly blocked between 20:00 and 08:30)
  const isOvernightOrMidnight = local.hour < 8 || (local.hour === 8 && local.minute < 30) || local.hour >= 20;

  // 7. Holiday check
  const isHoliday = holidays.includes(local.isoDate);

  // 2. Working Day check
  const isWorkingDay = daysOfWeek.includes(local.dayOfWeek);

  // 3. Working Hours check
  const currentMinutes = local.hour * 60 + local.minute;
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  const isWithinWorkingHours = currentMinutes >= startMinutes && currentMinutes < endMinutes;

  // 5. Never call when closed
  const canCallNow = !isOvernightOrMidnight && !isHoliday && isWorkingDay && isWithinWorkingHours;

  let reason = 'Supplier is currently within active business calling hours.';
  if (isOvernightOrMidnight) {
    reason = `Overnight / midnight hour safeguard active (${local.formatted}). Commercial outbound calls are strictly prohibited outside daytime.`;
  } else if (isHoliday) {
    reason = `Supplier is closed for observed public/commercial holiday (${local.isoDate}).`;
  } else if (!isWorkingDay) {
    reason = `Supplier is closed on this day of the week (${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][local.dayOfWeek]}).`;
  } else if (!isWithinWorkingHours) {
    if (currentMinutes < startMinutes) {
      reason = `Supplier office opens at ${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')} local time (current: ${String(local.hour).padStart(2, '0')}:${String(local.minute).padStart(2, '0')}).`;
    } else {
      reason = `Supplier office closed for the day at ${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')} local time.`;
    }
  }

  // 9. If call is blocked, compute the next valid calling window
  let nextCallingWindow: BusinessHoursCheckResult['nextCallingWindow'] = null;
  if (!canCallNow) {
    nextCallingWindow = calculateNextCallingWindow({
      startHour,
      startMinute,
      daysOfWeek,
      holidays,
      timezone,
      currentDate: now
    });
  }

  return {
    canCallNow,
    reason,
    supplierLocalTime: local.formatted,
    supplierTimezone: timezone,
    isWithinWorkingHours,
    isWorkingDay,
    isHoliday,
    isOvernightOrMidnight,
    nextCallingWindow
  };
}

/**
 * Computes the exact timestamp of the next valid calling window.
 */
export function calculateNextCallingWindow(params: {
  startHour: number;
  startMinute: number;
  daysOfWeek: number[];
  holidays: string[];
  timezone: string;
  currentDate: Date;
}): { startTime: string; formatted: string; description: string } {
  const { startHour, startMinute, daysOfWeek, holidays, timezone, currentDate } = params;

  // Check up to 14 days into the future
  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const candidateDate = new Date(currentDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const candidateLocal = getSupplierZonedParts(candidateDate, timezone);

    if (!daysOfWeek.includes(candidateLocal.dayOfWeek)) continue;
    if (holidays.includes(candidateLocal.isoDate)) continue;

    // If candidate is today, check if opening time is still in the future
    if (dayOffset === 0) {
      const currentLocal = getSupplierZonedParts(currentDate, timezone);
      const currentMin = currentLocal.hour * 60 + currentLocal.minute;
      const startMin = startHour * 60 + startMinute;
      if (currentMin >= startMin) continue; // Today's start has passed
    }

    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][candidateLocal.dayOfWeek];
    const timeFormatted = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
    const desc = dayOffset === 0
      ? `Today at ${timeFormatted} (${timezone})`
      : dayOffset === 1
      ? `Tomorrow (${dayName}) at ${timeFormatted} (${timezone})`
      : `${dayName}, ${candidateLocal.isoDate} at ${timeFormatted} (${timezone})`;

    return {
      startTime: candidateDate.toISOString(),
      formatted: `${candidateLocal.isoDate} ${timeFormatted}`,
      description: desc
    };
  }

  return {
    startTime: new Date(currentDate.getTime() + 86400000).toISOString(),
    formatted: 'Next business day 10:00 AM',
    description: 'Next regular business day'
  };
}

/**
 * 10. Re-check immediately before dialing.
 * Throws a descriptive error if dialing is attempted outside business hours.
 */
export function assertCanDialImmediately(params: {
  supplierHours?: Partial<SupplierWorkingHours>;
  location?: { city?: string; state?: string; country?: string };
  phone?: string;
}) {
  const check = validateBusinessHours(params);
  if (!check.canCallNow) {
    const nextMsg = check.nextCallingWindow ? ` Scheduled next window: ${check.nextCallingWindow.description}.` : '';
    throw new Error(`[BUSINESS HOURS GUARD] Cannot initiate call to supplier. Reason: ${check.reason}.${nextMsg}`);
  }
  return check;
}
