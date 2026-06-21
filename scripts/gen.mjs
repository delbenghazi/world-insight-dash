import * as XLSX from 'xlsx';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseCodebook, buildCodebookSection } from '/dev-server/src/lib/codebook.ts';
const wb = XLSX.read(readFileSync('/dev-server/public/templates/master.xlsx'), { type: 'buffer' });
const out = buildCodebookSection(parseCodebook(wb.Sheets['Codebook']));
writeFileSync('/tmp/codebook.txt', out);
console.log(out.slice(0, 500));
console.log('---LEN', out.length);
