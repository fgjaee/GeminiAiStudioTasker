import { describe, expect, it } from 'vitest';
import { parsePdfMeijerKronos } from './pdfMeijerKronos';
import {
  kronosClassicTextContents,
  kronosBrokenHeadersTextContents,
  kronosOffsetTextContents,
} from '../__mocks__/kronosPdfFixtures';
import { generateChecksum } from '../../utils/helpers';

const encoder = new TextEncoder();

const toBuffer = (value: string): ArrayBuffer => encoder.encode(value).buffer;

describe('parsePdfMeijerKronos', () => {
  it('parses classic fixture and extracts shifts with correct times', async () => {
    const buffer = toBuffer('classic fixture sample');
    const result = await parsePdfMeijerKronos(buffer, { textContents: kronosClassicTextContents });

    expect(result.shifts).toHaveLength(6);
    const aliceMonday = result.shifts.find(
      shift => shift.memberName === 'Johnson Alice' && shift.day === 'Mon',
    );
    expect(aliceMonday?.start).toBe('08:00');
    expect(aliceMonday?.end).toBe('16:00');

    const bobWednesday = result.shifts.find(
      shift => shift.memberName === 'Smith Bob' && shift.day === 'Wed',
    );
    expect(bobWednesday?.start).toBe('14:00');
    expect(bobWednesday?.end).toBe('22:00');

    expect(result.diagnostics?.columnsDetected).toBeGreaterThanOrEqual(3);
    expect(result.diagnostics?.mode).toBe('pdfjs');
  });

  it('parses offset multi-page fixture with seven day columns', async () => {
    const buffer = toBuffer('offset multi-page sample');
    const result = await parsePdfMeijerKronos(buffer, {
      textContents: kronosOffsetTextContents,
    });

    expect(result.shifts).toHaveLength(7);
    expect(result.diagnostics?.columnsDetected).toBe(7);
    expect(result.diagnostics?.pagesProcessed).toBe(kronosOffsetTextContents.length);

    const danaFriday = result.shifts.find(
      shift => shift.memberName === 'Anderson Dana' && shift.day === 'Fri',
    );
    expect(danaFriday?.start).toBe('06:30');
    expect(danaFriday?.end).toBe('14:30');
  });

  it('returns diagnostics when headers cannot be found', async () => {
    const buffer = toBuffer('broken headers sample');
    const result = await parsePdfMeijerKronos(buffer, {
      textContents: kronosBrokenHeadersTextContents,
    });

    expect(result.shifts).toHaveLength(0);
    expect(result.diagnostics?.reason).toMatch(/No schedule day headers/i);
    expect(result.diagnostics?.warnings?.[0]).toMatch(/Day headers were not detected/i);
  });

  it('generates deterministic checksum for the source buffer', async () => {
    const fileA = 'checksum sample A';
    const bufferA = toBuffer(fileA);
    const resultA = await parsePdfMeijerKronos(bufferA, { textContents: kronosClassicTextContents });

    const expectedChecksumA = await generateChecksum(fileA);
    expect(resultA.flags?.checksum).toBe(expectedChecksumA);

    const bufferB = toBuffer('checksum sample B');
    const resultB = await parsePdfMeijerKronos(bufferB, { textContents: kronosClassicTextContents });
    expect(resultA.flags?.checksum).not.toBe(resultB.flags?.checksum);
  });
});
