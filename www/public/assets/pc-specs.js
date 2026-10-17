const terminals = [...document.querySelectorAll('[data-pc-terminal]')];

async function loadSpecs() {
  if (!terminals.length) return;
  try {
    const response = await fetch('/pc-specs.json');
    if (!response.ok) throw new Error(`PC specs returned ${response.status}`);
    const specs = await response.json();
    if (!Array.isArray(specs.groups) || !/^\d{4}-\d{2}-\d{2}$/.test(specs.updatedAt)) {
      throw new Error('PC specs have an invalid format');
    }
    const fields = new Map();
    for (const group of [...specs.groups, ...(specs.details || [])]) {
      if (!Array.isArray(group.fields)) throw new Error('PC specs have an invalid group');
      for (const field of group.fields) {
        if (typeof field.id !== 'string' || typeof field.label !== 'string' || typeof field.value !== 'string') {
          throw new Error('PC specs have an invalid field');
        }
        fields.set(field.id, field);
      }
    }
    for (const terminal of terminals) {
      for (const row of terminal.querySelectorAll('[data-pc-field]')) {
        const field = fields.get(row.dataset.pcField);
        if (!field) continue;
        row.querySelector('dt').textContent = field.label;
        row.querySelector('dd').textContent = terminal.dataset.pcTerminal === 'summary'
          ? field.summary || field.value
          : field.value;
      }
    }
    const date = new Date(`${specs.updatedAt}T00:00:00Z`);
    if (!Number.isNaN(date.getTime())) {
      const label = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
      for (const time of document.querySelectorAll('[data-pc-updated]')) {
        time.dateTime = specs.updatedAt;
        time.textContent = label;
      }
    }
  } catch (error) {
    // Keep the complete static snapshot available if the data file cannot load.
    console.warn('PC specs could not be refreshed; showing the saved snapshot.', error);
  }
}

loadSpecs();
