'use strict';

// Unique codes and Custom Link tabs. Same screen for both, POOL_CFG holds the differences.

const POOL_CFG = {
  codes: {
    noun: 'code', nouns: 'codes', column: 'Code', slug: 'unique-codes',
    variable: '{UNIQUE_CODES}', variableFor: 'the unique codes', showPct: true,
    accept: '.csv,text/csv', fileHelp: 'Select a CSV file to upload, one code per row.',
    valid: (v) => /^[\w-]{3,64}$/.test(v),
  },
  links: {
    noun: 'link', nouns: 'links', column: 'Link', slug: 'custom-links',
    variable: '{CUSTOM_LINK}', variableFor: 'the custom link', showPct: false,
    accept: '.csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel',
    fileHelp: 'Select a CSV or XLSX file to upload, one link per row.',
    valid: (v) => /^https?:\/\/\S+$/i.test(v),
  },
};

function renderPool(el, kind) {
  const cfg = POOL_CFG[kind];
  const items = pv.project.detail[kind];
  const used = items.filter((i) => i.usedAt).length;
  const pct = items.length ? Math.round(ratio(used, items.length)) : 0;
  el.innerHTML = `
    <div class="pv-callout">
      <i class="bi bi-info-circle-fill"></i>
      <span>Variable to use for ${cfg.variableFor}: <strong class="mono">${cfg.variable}</strong></span>
      <button type="button" class="btn btn-ghost btn-xs ms-auto" data-action="copy-var" data-value="${cfg.variable}"><i class="bi bi-clipboard"></i> Copy</button>
    </div>
    <div class="sum-tiles">
      <div class="sum-tile"><div class="sum-label">Total</div><div class="sum-value">${fmtInt(items.length)}</div></div>
      <div class="sum-tile">
        <div class="sum-label">Used</div>
        <div class="sum-value">${fmtInt(used)}${cfg.showPct ? `<span class="sum-pct">${pct}%</span>` : ''}</div>
      </div>
      <div class="sum-tile"><div class="sum-label">Left</div><div class="sum-value">${fmtInt(items.length - used)}</div></div>
    </div>
    <section class="pv-card">
      <form data-form="pool-upload" data-kind="${kind}" novalidate>
        <label class="form-label" for="file-${kind}">Upload ${cfg.nouns}</label>
        <div class="upload-row">
          <input class="form-control" type="file" id="file-${kind}" name="file" accept="${cfg.accept}">
          <button type="submit" class="btn btn-primary-grad"><i class="bi bi-upload"></i> Upload</button>
        </div>
        <div class="field-help">${cfg.fileHelp} Duplicates are skipped.</div>
      </form>
      ${items.length ? `
        <div class="upload-foot">
          <span>Download every ${cfg.noun} with its status and the respondent who used it.</span>
          <button type="button" class="btn btn-ghost btn-sm-h" data-action="pool-export" data-kind="${kind}"><i class="bi bi-download"></i> Download list</button>
        </div>` : ''}
    </section>`;
}

function addToPool(kind, values) {
  const cfg = POOL_CFG[kind];
  const items = pv.project.detail[kind];
  const existing = new Set(items.map((i) => i.value));
  const result = { added: 0, dupes: 0, invalid: 0 };
  values.forEach((value) => {
    if (!cfg.valid(value)) result.invalid += 1;
    else if (existing.has(value)) result.dupes += 1;
    else {
      existing.add(value);
      items.push({ value, mrid: null, usedAt: null });
      result.added += 1;
    }
  });
  return result;
}

async function uploadPool(form) {
  const kind = form.dataset.kind;
  const cfg = POOL_CFG[kind];
  const file = form.elements.file.files[0];
  if (!file) {
    showToast('Choose a file first.', 'info');
    return;
  }
  await withBusyButton(form, async () => {
    const { added, dupes, invalid } = addToPool(kind, await readFileValues(file));
    if (!added && !dupes && !invalid) {
      showToast(`No ${cfg.nouns} found in ${file.name}.`, 'info');
      return;
    }
    renderPanel(kind);
    const notes = listNotes(dupes, invalid);
    showToast(`Uploaded ${plural(added, cfg.noun, cfg.nouns)} from ${file.name}.${notes ? ` (${notes})` : ''}`, added ? 'success' : 'info');
  });
}

function exportPool(kind) {
  const p = pv.project;
  const cfg = POOL_CFG[kind];
  const items = p.detail[kind];
  downloadCsv(`project-${p.jobNo}-${cfg.slug}-${today()}.csv`, [
    [cfg.column, 'Status', 'MFID', 'Used at'],
    ...items.map((i) => [i.value, i.usedAt ? 'Used' : 'Available', i.mrid || '', i.usedAt ? new Date(i.usedAt).toISOString() : '']),
  ]);
  showToast(`Downloaded ${plural(items.length, cfg.noun, cfg.nouns)}.`);
}
