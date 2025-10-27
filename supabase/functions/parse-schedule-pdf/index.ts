
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import * as pdfjs from 'npm:pdfjs-dist@4.5.136';

// Helper function to normalize text
const normName = (s) => (s || '').replace(',', ' ').replace(/\s+/g, ' ').trim();

// Helper function to convert time to 24h format
const to24h = (t) => {
  if (!t) return '';
  const m = t.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!m) return t;
  let [_, hh, mm, ap] = m;
  let H = parseInt(hh, 10);
  if (ap) {
    ap = ap.toUpperCase();
    if (ap === 'PM' && H !== 12) H += 12;
    if (ap === 'AM' && H === 12) H = 0;
  }
  return `${String(H).padStart(2, '0')}:${mm}`;
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const pdfBuffer = await req.arrayBuffer();
    const doc = await pdfjs.getDocument(pdfBuffer).promise;
    const numPages = doc.numPages;
    let allTextItems = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      allTextItems.push(...textContent.items);
    }
    
    // 1. Find Day Headers and their X-coordinates
    const dayHeaders = allTextItems.filter(item =>
      item.str.match(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)/i) && item.transform[5] < 100 // Y-coord near top
    ).sort((a, b) => a.transform[4] - b.transform[4]);

    if (dayHeaders.length === 0) {
      throw new Error("No day headers (e.g., 'Sun', 'Mon') found in the top section of the PDF.");
    }
    
    // 2. Define column boundaries based on header positions
    const columnBoundaries = dayHeaders.map((header, i) => {
      const nextHeader = dayHeaders[i + 1];
      const headerX = header.transform[4];
      const endX = nextHeader ? (headerX + nextHeader.transform[4]) / 2 : headerX + 150; // Assume 150px width for last column
      return {
        day: header.str.substring(0, 3),
        startX: i === 0 ? 0 : (dayHeaders[i - 1].transform[4] + headerX) / 2,
        endX: endX
      };
    });

    // 3. Group remaining text items by row (Y-coordinate)
    const rows = new Map();
    allTextItems.filter(item => !dayHeaders.includes(item)).forEach(item => {
      const y = Math.round(item.transform[5]);
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y).push(item);
    });

    // 4. Process each row to extract shifts
    const shifts = [];
    for (const rowItems of rows.values()) {
      rowItems.sort((a, b) => a.transform[4] - b.transform[4]);
      const nameItem = rowItems.find(item => item.transform[4] < (columnBoundaries[0]?.startX || 100));
      if (!nameItem) continue;
      
      const memberName = normName(nameItem.str);
      const timeItems = rowItems.filter(item => item !== nameItem);

      for (const timeItem of timeItems) {
        const timeMatch = timeItem.str.match(/(\d{1,2}:\d{2}(?:\s*am|pm)?)\s*-\s*(\d{1,2}:\d{2}(?:\s*am|pm)?)/i);
        if (!timeMatch) continue;

        const start = to24h(timeMatch[1]);
        const end = to24h(timeMatch[2]);
        const itemX = timeItem.transform[4];
        
        const column = columnBoundaries.find(col => itemX >= col.startX && itemX < col.endX);
        if (column) {
          shifts.push({
            id: crypto.randomUUID(),
            memberName: memberName,
            day: column.day,
            start: start,
            end: end,
          });
        }
      }
    }

    return new Response(
      JSON.stringify(shifts), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
      }
    );
  }
});
