// services/__mocks__/kronosPdfFixtures.ts
// Fixtures that emulate pdf.js TextContent payloads for the Kronos wall schedule layout.

export type MockTextContent = {
  items: MockTextItem[];
};

export type MockTextItem = {
  str: string;
  transform?: [number, number, number, number, number, number];
  width?: number;
  height?: number;
  fontName?: string;
  x?: number;
  y?: number;
};

const makeItem = (str: string, x: number, y: number): MockTextItem => ({
  str,
  transform: [1, 0, 0, 1, x, y],
  width: Math.max(str.length * 4.5, 20),
  height: 12,
});

export const kronosClassicTextContents: MockTextContent[] = [
  {
    items: [
      // Header row
      makeItem('Sun 10/19', 150, 720),
      makeItem('Mon 10/20', 250, 720),
      makeItem('Tue 10/21', 350, 720),
      makeItem('Wed 10/22', 450, 720),

      // Employees
      makeItem('Johnson, Alice', 20, 672),
      makeItem('8:00AM - 4:00PM', 245, 672),
      makeItem('7:00AM - 3:00PM', 345, 672),

      makeItem('Smith, Bob', 20, 644),
      makeItem('2:00PM - 10:00PM', 348, 644),
      makeItem('2:00PM - 10:00PM', 452, 644),

      makeItem('Brown, Charlie', 20, 616),
      makeItem('10:00AM - 6:00PM', 251, 616),
      makeItem('10:00AM - 6:00PM', 449, 616),
    ],
  },
];

export const kronosOffsetTextContents: MockTextContent[] = [
  {
    items: [
      makeItem('Sun 12/14', 135, 724),
      makeItem('Mon 12/15', 255, 722),
      makeItem('Tue 12/16', 375, 720),
      makeItem('Wed 12/17', 495, 724),
      makeItem('Thu 12/18', 615, 722),

      makeItem('Anderson, Dana', 18, 676),
      makeItem('6:30 AM - 2:30 PM', 260, 674),
      makeItem('6:45 AM - 2:45 PM', 372, 676),

      makeItem('Lopez, Emilio', 18, 648),
      makeItem('1:15 PM - 9:15 PM', 496, 646),

      makeItem('Nguyen, Fiona', 18, 620),
      makeItem('11:00 AM - 7:00 PM', 616, 618),
    ],
  },
  {
    items: [
      makeItem('Fri 12/19', 255, 722),
      makeItem('Sat 12/20', 375, 722),

      makeItem('Anderson, Dana', 18, 674),
      makeItem('6:30 AM - 2:30 PM', 258, 674),

      makeItem('Lopez, Emilio', 18, 646),
      makeItem('1:15 PM - 9:15 PM', 376, 646),

      makeItem('Nguyen, Fiona', 18, 618),
      makeItem('11:00 AM - 7:00 PM', 496, 618),
    ],
  },
];

export const kronosBrokenHeadersTextContents: MockTextContent[] = [
  {
    items: [
      makeItem('Anderson, Dana', 22, 88),
      makeItem('6:30 AM - 2:30 PM', 248, 90),
    ],
  },
];

