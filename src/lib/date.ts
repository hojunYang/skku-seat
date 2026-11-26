export interface PyxisLocalDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?$/;
const TIME = /^(\d{2})(\d{2})$/;

/**
 * Pyxis sends wall-clock values in the library's Korean local time. Keeping
 * these as fields avoids platform-dependent `new Date("YYYY-MM-DD HH:mm")`.
 */
export function parsePyxisDateTime(value: string): PyxisLocalDateTime | null {
  const match = DATE_TIME.exec(value);
  if (!match) return null;

  const [year, month, day, hour, minute, second = "00"] = match.slice(1);
  const parts = [year, month, day, hour, minute, second].map(Number);
  if (parts.some(Number.isNaN)) return null;

  const [parsedYear, parsedMonth, parsedDay, parsedHour, parsedMinute, parsedSecond] = parts;
  if (
    parsedMonth < 1 ||
    parsedMonth > 12 ||
    parsedDay < 1 ||
    parsedDay > 31 ||
    parsedHour > 23 ||
    parsedMinute > 59 ||
    parsedSecond > 59
  ) {
    return null;
  }

  return {
    year: parsedYear,
    month: parsedMonth,
    day: parsedDay,
    hour: parsedHour,
    minute: parsedMinute,
    second: parsedSecond,
  };
}

export function formatPyxisTime(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const parsed = parsePyxisDateTime(value);
  if (!parsed) return undefined;
  return `${String(parsed.hour).padStart(2, "0")}:${String(parsed.minute).padStart(2, "0")}`;
}

export function formatPyxisOperatingHours(beginTime: string, endTime: string): string | undefined {
  const begin = TIME.exec(beginTime);
  const end = TIME.exec(endTime);
  if (!begin || !end) return undefined;

  const beginLabel = `${begin[1]}:${begin[2]}`;
  const endLabel = `${end[1]}:${end[2]}`;
  return Number(endTime) < Number(beginTime)
    ? `${beginLabel} ~ 익일 ${endLabel}`
    : `${beginLabel} ~ ${endLabel}`;
}

export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return "제한 없음";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder}분`;
  return remainder === 0 ? `${hours}시간` : `${hours}시간 ${remainder}분`;
}

export function isPyxisDateTimePast(value: string): boolean {
  const target = parsePyxisDateTime(value);
  if (!target) return false;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const fields = Object.fromEntries(
    formatter
      .formatToParts(new Date())
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  ) as Record<string, number>;
  const nowComparable =
    fields.year * 10_000_000_000 +
    fields.month * 100_000_000 +
    fields.day * 1_000_000 +
    fields.hour * 10_000 +
    fields.minute * 100 +
    fields.second;
  const targetComparable =
    target.year * 10_000_000_000 +
    target.month * 100_000_000 +
    target.day * 1_000_000 +
    target.hour * 10_000 +
    target.minute * 100 +
    target.second;
  return nowComparable >= targetComparable;
}
