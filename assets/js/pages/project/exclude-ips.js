'use strict';

// Exclude IPs tab. Edits go into pv.ipDraft and only reach the project on Save.

// IPv4 with an optional /0-32 mask. IPv6 just gets a loose shape check below.
const IPV4 = /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\/(3[0-2]|[12]?\d))?$/;
function isValidIp(value) {
  if (IPV4.test(value)) return true;
  const [addr, mask, ...rest] = value.split('/');
  if (rest.length || !addr.includes(':') || !/^[0-9a-f:]+$/i.test(addr)) return false;
  if ((addr.match(/::/g) || []).length > 1 || addr.split(':').length > 8) return false;
  return mask === undefined || (/^\d{1,3}$/.test(mask) && Number(mask) <= 128);
}

function ipsDirty() {
  const saved = pv.project.detail.ips.map((x) => x.ip).join('\n');
  return pv.ipDraft.map((x) => x.ip).join('\n') !== saved;
}

function addIps(values) {
  const known = new Set(pv.ipDraft.map((x) => x.ip));
  const result = { added: 0, dupes: 0, invalid: [] };
  values.forEach((raw) => {
    const ip = raw.trim();
    if (!isValidIp(ip)) result.invalid.push(ip);
    else if (known.has(ip)) result.dupes += 1;
    else {
      known.add(ip);
      pv.ipDraft.unshift({ ip, addedAt: Date.now() });
      result.added += 1;
    }
  });
  return result;
}

function renderIps(el) {
  if (!pv.ipDraft) pv.ipDraft = pv.project.detail.ips.map((x) => ({ ...x }));
  const list = pv.ipDraft;
  const dirty = ipsDirty();
  if (dirty) pv.unsaved.add('ips');
  else pv.unsaved.delete('ips');

  el.innerHTML = `
    <section class="pv-card ips-card">
      <form data-form="ips-file" novalidate>
        <label class="form-label" for="ipFile">Import from a file</label>
        <div class="upload-row">
          <input class="form-control" type="file" id="ipFile" name="file" accept=".csv,text/csv">
          <button type="submit" class="btn btn-ghost">Process</button>
        </div>
        <div class="field-help">Select a CSV file to process, one IP address or range per row.</div>
      </form>

      <form class="ips-add" data-form="ips-add" novalidate>
        <label class="form-label" for="ipInput">Add an address</label>
        <div class="input-group">
          <input class="form-control mono" id="ipInput" name="ip" placeholder="IPv4 or IPv6 address" autocomplete="off" spellcheck="false">
          <button class="btn btn-ghost" type="submit" title="Add address" aria-label="Add address"><i class="bi bi-plus-circle"></i></button>
        </div>
        <div class="field-help">Ranges in CIDR form, such as 198.51.100.0/24, work too.</div>
      </form>

      <div class="ips-table">
        <table class="pv-table">
          <thead><tr><th>IPs</th><th><span class="visually-hidden">Remove</span></th></tr></thead>
          <tbody>
            ${list.length ? list.map((x, i) => `
              <tr>
                <td class="mono">${escapeHtml(x.ip)}${x.ip.includes('/') ? ' <span class="pill pill-muted">range</span>' : ''}</td>
                <td><button type="button" class="icon-btn-sm danger" data-action="ips-remove" data-index="${i}" aria-label="Remove ${escapeHtml(x.ip)}"><i class="bi bi-trash3"></i></button></td>
              </tr>`).join('') : emptyRow(2, 'No excluded IPs', 'Add addresses above or import a CSV file.')}
          </tbody>
        </table>
      </div>

      <div class="pv-form-actions">
        <button type="button" class="btn btn-primary-grad" data-action="ips-save" ${dirty ? '' : 'disabled'}><i class="bi bi-check2"></i> Save</button>
        ${dirty ? `
          <button type="button" class="btn btn-ghost" data-action="ips-discard">Discard changes</button>
          <span class="dirty-flag"><i class="bi bi-circle-fill"></i> Unsaved changes</span>` : ''}
        <span class="pv-toolbar-note ms-auto">${plural(list.length, 'address', 'addresses')} excluded</span>
      </div>
    </section>`;
}

async function processIpFile(form) {
  const file = form.elements.file.files[0];
  if (!file) {
    showToast('Choose a CSV file first.', 'info');
    return;
  }
  await withBusyButton(form, async () => {
    const { added, dupes, invalid } = addIps(await readFileValues(file));
    renderPanel('ips');
    const notes = listNotes(dupes, invalid.length);
    showToast(`Added ${plural(added, 'address', 'addresses')} from ${file.name}.${notes ? ` (${notes})` : ''}${added ? ' Save to apply.' : ''}`, added ? 'success' : 'info');
  });
}

function addOneIp(form) {
  const input = form.elements.ip;
  const ip = input.value.trim();
  if (!ip) {
    input.focus();
    return;
  }
  const { dupes, invalid } = addIps([ip]);
  if (invalid.length) {
    input.classList.add('is-invalid');
    input.focus();
    showToast(`${ip} isn't a valid IPv4 or IPv6 address.`, 'info');
    return;
  }
  if (dupes) {
    input.select();
    showToast(`${ip} is already on the list.`, 'info');
    return;
  }
  renderPanel('ips');
  $('#ipInput').focus();
}
