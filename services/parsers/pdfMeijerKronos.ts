// services/parsers/pdfMeijerKronos.ts
import { ParsedScheduleData, ParsedScheduleShift } from '../../types';
import { DATE_FORMAT, PDF_MOCK_TIMEOUT } from '../../constants';
import { uuid, normName, to24h, generateChecksum } from '../../utils/helpers';
import dayjs from 'dayjs';
import {
  kronosClassicTextContents,
  kronosBrokenHeadersTextContents,
  kronosOffsetTextContents,
  MockTextContent,
} from '../__mocks__/kronosPdfFixtures';

type PdfJsTextItem = {
  str: string;
  transform?: [number, number, number, number, number, number];
  width?: number;
  height?: number;
  fontName?: string;
  x?: number;
  y?: number;
};

type PdfJsTextContent = {
  items: PdfJsTextItem[];
};

type PositionedTextItem = {
  str: string;
  x: number;
  y: number;
};

type ParsePdfOptions = {
  textContents?: (PdfJsTextContent | MockTextContent)[];
  headerTolerance?: number;
  rowTolerance?: number;
  useBrokenFixture?: boolean;
  fixtureVariant?: 'classic' | 'offset';
};

const HEADER_TOLERANCE_DEFAULT = 18;
const ROW_TOLERANCE_DEFAULT = 6;

const dayHeaderRegex = /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\b/i;
const timeRangeRegex = /(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*[-–]\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i;

const selectFixture = (
  variant?: ParsePdfOptions['fixtureVariant'],
  broken = false,
): MockTextContent[] => {
  if (broken) return kronosBrokenHeadersTextContents;
  if (variant === 'offset') return kronosOffsetTextContents;
  return kronosClassicTextContents;
};

const normalizeYAxis = (items: PositionedTextItem[]): PositionedTextItem[] => {
  if (items.length === 0) return items;

  const headerItems = items.filter(item => dayHeaderRegex.test(item.str));
  if (headerItems.length === 0) return items;

  const yValues = items.map(item => item.y);
  const maxY = Math.max(...yValues);
  const minY = Math.min(...yValues);
  const midpoint = (maxY + minY) / 2;
  const headerAverage = headerItems.reduce((sum, item) => sum + item.y, 0) / headerItems.length;

  // pdf.js coordinates originate from the bottom-left corner. When working with
  // real TextContent payloads the header row tends to have the largest Y
  // values. Our geometry logic assumes "top" rows have the smallest Y values,
  // so flip the axis when we detect that orientation.
  if (headerAverage <= midpoint) {
    return items;
  }

  const flipped = items.map(item => ({
    ...item,
    y: maxY - (item.y - minY),
  }));
  const flippedMinY = Math.min(...flipped.map(item => item.y));
  return flipped.map(item => ({
    ...item,
    y: item.y - flippedMinY,
  }));
};

const toPositionedItems = (
  textContents: (PdfJsTextContent | MockTextContent)[],
): PositionedTextItem[] => {
  const items: PositionedTextItem[] = [];
  textContents.forEach(content => {
    content.items.forEach(item => {
      if (!item.str?.trim()) return;
      const [, , , , tx, ty] = item.transform ?? [1, 0, 0, 1, item.x ?? 0, item.y ?? 0];
      items.push({
        str: item.str.trim(),
        x: typeof tx === 'number' ? tx : 0,
        y: typeof ty === 'number' ? ty : 0,
      });
    });
  });
  const normalized = normalizeYAxis(items);
  return normalized.sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
};

const clusterByY = (
  items: PositionedTextItem[],
  tolerance: number,
): Map<number, PositionedTextItem[]> => {
  const rows = new Map<number, PositionedTextItem[]>();
  for (const item of items) {
    let targetKey: number | undefined;
    for (const key of rows.keys()) {
      if (Math.abs(key - item.y) <= tolerance) {
        targetKey = key;
        break;
      }
    }
    const key = targetKey ?? item.y;
    if (!rows.has(key)) {
      rows.set(key, []);
    }
    rows.get(key)!.push(item);
  }
  return rows;
};

const findDayHeaders = (
  items: PositionedTextItem[],
  tolerance: number,
) => {
  const headerCandidates = items.filter(item => dayHeaderRegex.test(item.str));
  if (headerCandidates.length === 0) return [] as PositionedTextItem[];

  const topY = Math.min(...headerCandidates.map(item => item.y));
  return headerCandidates
    .filter(item => Math.abs(item.y - topY) <= tolerance)
    .sort((a, b) => a.x - b.x);
};

const deriveColumnBoundaries = (headers: PositionedTextItem[]) => {
  return headers.map((header, index) => {
    const prev = headers[index - 1];
    const next = headers[index + 1];
    const startX = prev ? (prev.x + header.x) / 2 : header.x - 90;
    const endX = next ? (header.x + next.x) / 2 : header.x + 90;
    return {
      day: header.str.substring(0, 3) as ParsedScheduleShift['day'],
      startX,
      endX,
      header,
    };
  });
};

/**
 * A more sophisticated mock function to simulate parsing a PDF schedule
 * using geometry-based text extraction, similar to what a Supabase Edge Function
 * with pdf.js would do.
 *
 * @param fileBuffer - The ArrayBuffer content of the PDF file.
 * @returns A promise that resolves with the parsed schedule data.
 */
export const parsePdfMeijerKronos = async (
  fileBuffer: ArrayBuffer,
  options: ParsePdfOptions = {},
): Promise<ParsedScheduleData> => {
  console.log(`PDF Parser Service: Simulating geometry-based parsing for Kronos/UKG.`);
  await new Promise(resolve => setTimeout(resolve, PDF_MOCK_TIMEOUT));

  const headerTolerance = options.headerTolerance ?? HEADER_TOLERANCE_DEFAULT;
  const rowTolerance = options.rowTolerance ?? ROW_TOLERANCE_DEFAULT;

  const textContents = options.textContents ?? selectFixture(options.fixtureVariant, options.useBrokenFixture);
  const positionedItems = toPositionedItems(textContents);
  const dayHeaders = findDayHeaders(positionedItems, headerTolerance);

  if (dayHeaders.length === 0) {
    const fallbackData: ParsedScheduleData = {
      date: dayjs().format(DATE_FORMAT),
      shifts: [],
      diagnostics: {
        reason: "No schedule day headers found (e.g., 'Sun 10/19').",
        rowsParsed: 0,
        shiftsCreated: 0,
        membersResolved: 0,
        membersCreated: 0,
        rowsDiscarded: positionedItems.length,
        parser: 'parsePdfMeijerKronos',
        mode: options.textContents ? 'pdfjs' : 'fixture',
        pagesProcessed: textContents.length,
        textItemCount: positionedItems.length,
        warnings: ['Day headers were not detected in the provided PDF payload.'],
      },
    };
    return fallbackData;
  }

  const columns = deriveColumnBoundaries(dayHeaders);
  const headerBaseline = Math.min(...dayHeaders.map(h => h.y));
  const rows = clusterByY(
    positionedItems.filter(item => item.y > headerBaseline + rowTolerance),
    rowTolerance,
  );

  const parsedShifts: ParsedScheduleShift[] = [];
  let rowsDiscarded = 0;
  const nameColumnThreshold = columns[0]?.startX ?? (dayHeaders[0]?.x ?? 100) - 40;

  for (const [, rowItems] of rows.entries()) {
    const sorted = [...rowItems].sort((a, b) => a.x - b.x);
    const nameItem = sorted.find(item => item.x < nameColumnThreshold);
    if (!nameItem) {
      rowsDiscarded += 1;
      continue;
    }
    const memberName = normName(nameItem.str);
    const timeItems = sorted.filter(item => item !== nameItem);

    let shiftCreated = false;
    for (const item of timeItems) {
      const match = item.str.match(timeRangeRegex);
      if (!match) continue;

      const [, startStr, endStr] = match;
      const start = to24h(startStr);
      const end = to24h(endStr);

      const column = columns.find(col => item.x >= col.startX && item.x < col.endX);
      if (!column) continue;

      parsedShifts.push({
        id: uuid(),
        memberName,
        day: column.day,
        start,
        end,
        confidence: 0.98,
        rawText: `${memberName} ${item.str}`,
      });
      shiftCreated = true;
    }

    if (!shiftCreated) {
      rowsDiscarded += 1;
    }
  }

  const decoder = new TextDecoder();
  const fileChecksum = await generateChecksum(decoder.decode(new Uint8Array(fileBuffer)));

  const parsedData: ParsedScheduleData = {
    date: dayjs().startOf('week').format(DATE_FORMAT),
    shifts: parsedShifts,
    flags: {
      source: 'mock_pdf_kronos_parser',
      timestamp: new Date().toISOString(),
      checksum: fileChecksum,
    },
    diagnostics: {
      rowsParsed: rows.size,
      shiftsCreated: parsedShifts.length,
      membersResolved: 0,
      membersCreated: 0,
      rowsDiscarded,
      parser: 'parsePdfMeijerKronos',
      mode: options.textContents ? 'pdfjs' : options.useBrokenFixture ? 'fixture-broken' : 'fixture',
      pagesProcessed: textContents.length,
      columnsDetected: columns.length,
      textItemCount: positionedItems.length,
    },
  };

  return parsedData;
};

// Legacy mock for compatibility if needed elsewhere
export const parseSchedulePdfMock = async (
  fileChecksum: string,
  fileContent: string,
): Promise<ParsedScheduleData> => {
  const buffer = new TextEncoder().encode(fileContent);
  return parsePdfMeijerKronos(buffer.buffer);
};
