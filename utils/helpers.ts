import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import 'dayjs/locale/en'; // Import a locale if needed

dayjs.extend(weekOfYear);

export const generateChecksum = async (str: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hexHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hexHash;
};

/**
 * Generates a UUID (Universally Unique Identifier).
 * Prioritizes crypto.randomUUID() for security and uniqueness, falls back to a Math.random() based one.
 * @returns A unique ID string.
 */
export const uuid = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments where crypto.randomUUID is not available
  // This simple UUID is not cryptographically secure but sufficient for unique keys
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0,
      v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Utility for development to assert unique keys.
 * @param keys An array of keys to check for uniqueness.
 * @param hint A string to provide context for the assertion.
 */
export const assertUniqueKeys = (keys: (string | number)[], hint: string) => {
  if (process.env.NODE_ENV === "production") return;
  const s = new Set(keys);
  if (s.size !== keys.length) {
    console.warn("Duplicate/unstable keys detected in", hint, "Keys:", keys);
  }
};


/**
 * Converts HH:mm string to total minutes from midnight.
 * @param timeString - Time in HH:mm format.
 * @returns Total minutes from midnight.
 */
export const timeToMinutes = (timeString: string): number => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Converts total minutes from midnight to HH:mm string.
 * @param totalMinutes - Total minutes from midnight.
 * @returns Time in HH:mm format.
 */
export const minutesToTime = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Calculates duration between two HH:mm time strings in minutes.
 * Assumes end time is after start time or on the next day if earlier.
 * @param startTime - Start time in HH:mm.
 * @param endTime - End time in HH:mm.
 * @returns Duration in minutes.
 */
export const calculateDuration = (startTime: string, endTime: string): number => {
  let startMinutes = timeToMinutes(startTime);
  let endMinutes = timeToMinutes(endTime);
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60; // Assume it spans into the next day
  }
  return endMinutes - startMinutes;
};

/**
 * Formats a date string to a readable format.
 * @param dateString - Date in YYYY-MM-DD format.
 * @param format - Output format (e.g., "MMM D, YYYY", "dddd").
 * @returns Formatted date string.
 */
export const formatDate = (dateString: string, format: string = 'YYYY-MM-DD'): string => {
  return dayjs(dateString).format(format);
};

/**
 * Get a list of dates for the current week starting from a given date.
 * @param startDateString - Any date string within the desired week (e.g., '2024-07-22').
 * @returns An array of YYYY-MM-DD strings for the week (Monday to Sunday).
 */
export const getWeekDays = (startDateString: string): string[] => {
  const startOfWeek = dayjs(startDateString).startOf('week').add(1, 'day'); // Start on Monday
  if (startOfWeek.day() === 0) { // If it's still Sunday because of locale, adjust
    startOfWeek.add(1, 'day');
  }
  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    weekDates.push(startOfWeek.add(i, 'day').format('YYYY-MM-DD'));
  }
  return weekDates;
};

/**
 * Get a list of dates for the next X days from a given start date.
 * @param startDateString - The starting date (YYYY-MM-DD).
 * @param numberOfDays - How many days to include.
 * @returns An array of YYYY-MM-DD strings.
 */
export const getNextNDays = (startDateString: string, numberOfDays: number): string[] => {
  const startDate = dayjs(startDateString);
  const dates: string[] = [];
  for (let i = 0; i < numberOfDays; i++) {
    dates.push(startDate.add(i, 'day').format('YYYY-MM-DD'));
  }
  return dates;
};

/**
 * Simple base64 encode/decode for audio data
 */
export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}