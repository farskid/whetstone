import type { ProblemMeta } from '../types';

export const meta: ProblemMeta = {
  id: 'd9-csv-parser',
  catalogId: 'D9',
  title: 'CSV parser',
  theme: 'Parsing',
  difficulty: 'Medium',
  inspiredBy: 'PapaParse',
  summary: 'An RFC 4180 CSV parser with quoting, CRLF, header rows, dynamic typing, delimiter detection, row-numbered errors and a streaming parser that handles any chunk split.',
  stages: [
    { title: 'Rows and fields', summary: 'Split rows on newlines and fields on commas.' },
    { title: 'RFC 4180 quoting', summary: 'Quoted delimiters and newlines, "" escapes, CRLF, BOM.' },
    { title: 'Headers and typing', summary: 'Header rows to objects, dynamic typing, delimiter detection, ragged-row errors.' },
    { title: 'Streaming', summary: 'createParser().write(chunk) with splits anywhere, even mid-quote or mid-CRLF.' },
  ],
};
