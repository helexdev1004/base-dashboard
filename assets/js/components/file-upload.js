'use strict';

// Reading uploaded CSV / Excel files.

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
// A first row that looks like a column header (code, link, url, ip, respondent id, uid...) gets dropped.
const HEADER_RE = /^(unique[\s_-]*)?codes?$|^(custom[\s_-]*)?links?$|^urls?$|^ip(s|[\s_-]*address(es)?)?$|^resp(ondent)?[\s_-]*ids?$|^(panelist[\s_-]*)?(pu)?u?ids?$/i;
let xlsxLoading = null;

// The spreadsheet reader is only needed for .xlsx files, so it loads the first time one is uploaded.
function loadXlsx() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  xlsxLoading = xlsxLoading || new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = XLSX_URL;
    script.onload = () => resolve(window.XLSX);
    script.onerror = () => {
      xlsxLoading = null;
      script.remove();
      reject(new Error("Couldn't load the spreadsheet reader. Check your connection and try again."));
    };
    document.head.append(script);
  });
  return xlsxLoading;
}

function firstCsvField(line) {
  const s = line.trim();
  if (!s) return '';
  if (s[0] !== '"') return s.split(/[,;\t]/)[0].trim();
  let out = '';
  for (let i = 1; i < s.length; i++) {
    if (s[i] === '"') {
      if (s[i + 1] !== '"') break; // closing quote
      i += 1; // "" is an escaped quote
    }
    out += s[i];
  }
  return out.trim();
}

// First non-empty value of every row in a CSV or Excel file; a header row is dropped.
async function readFileValues(file) {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('That file is larger than 5 MB.');
  let values;
  if (/\.xlsx?$/i.test(file.name)) {
    const XLSX = await loadXlsx();
    const book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const rows = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1, blankrows: false });
    values = rows.map((row) => String(row.find((c) => c != null && String(c).trim() !== '') ?? '').trim());
  } else {
    // strip a leading UTF-8 BOM (the character in the regex is invisible)
    values = (await file.text()).replace(/^﻿/, '').split(/\r?\n/).map(firstCsvField);
  }
  values = values.filter(Boolean);
  if (values.length && HEADER_RE.test(values[0])) values.shift();
  return values;
}

async function withBusyButton(form, task) {
  const btn = form.querySelector('[type="submit"]');
  const label = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Working…';
  try {
    await task();
  } catch (err) {
    showToast(err.message || 'Something went wrong reading that file.', 'info');
  } finally {
    btn.disabled = false;
    btn.innerHTML = label;
  }
}

const listNotes = (dupes, invalid) => [
  dupes && `${plural(dupes, 'duplicate')} skipped`,
  invalid && `${fmtInt(invalid)} not valid`,
].filter(Boolean).join(', ');
