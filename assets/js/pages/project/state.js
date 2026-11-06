'use strict';

// State of the open project view.

const pv = {
  project: null,
  creating: false,
  tab: 'main',
  dirty: false,
  rendered: new Set(),
  draftLink: null,
  pmSelect: null,
  exDraft: null, // Project exclusions rows being edited
  vendorView: 'chart',
  vendorFilter: '',
  campStatus: 'Live',
  campPanel: '',
  campSort: 'desc',
  expanded: new Set(),
  chartIndex: -1,
  ipDraft: null,         // Exclude IPs edits wait for Save
  unsaved: new Set(),    // tabs other than Main with unsaved edits ('ips', 'screener', 'poll')
};
const UNSAVED_LABELS = { exclusions: 'Project exclusions', ips: 'Exclude IPs', screener: 'Screener', poll: 'Post Poll' };
let chartObserver = null;
