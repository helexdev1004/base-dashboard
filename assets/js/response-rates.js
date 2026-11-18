'use strict';

// Response rates (response-rates.html): the quotas table needs at least one country.
// With none picked, the "select a country" note shows instead.

document.addEventListener('DOMContentLoaded', () => {
  const chips = $('#rrCountriesBox .ms-chips');
  const sync = () => {
    const any = Boolean($('.ms-chip', chips));
    $('#rrNote').hidden = any;
    $('#rrQuotas').hidden = !any;
  };
  new MutationObserver(sync).observe(chips, { childList: true });
  sync();
});
