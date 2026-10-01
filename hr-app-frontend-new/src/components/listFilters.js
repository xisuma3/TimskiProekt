// Date-range and person filters for DataPage lists. Pure functions so they're testable.
//
// dateFilter config, one of:
//   { label, field }                 single date (e.g. hireDate)
//   { label, startField, endField }  a span; the item shows if it overlaps [from, to]
//   { label, yearField }             a whole year (e.g. allowance year)
// personFilter config:
//   { label, field, emptyLabel? }    emptyLabel names items with no person ("In stock")
//
// Dates are compared as "YYYY-MM-DD" strings (what <input type="date"> gives), taking the
// date part of API values so time and timezone can't move an item across a boundary.

const day = (value) => (value ? String(value).slice(0, 10) : null);

export const matchesDate = (item, cfg, from, to) => {
  if (!cfg || (!from && !to)) return true;
  let start;
  let end;
  if (cfg.yearField) {
    const year = item[cfg.yearField];
    if (year === undefined || year === null || year === '') return false;
    start = `${year}-01-01`;
    end = `${year}-12-31`;
  } else if (cfg.startField) {
    start = day(item[cfg.startField]);
    end = day(item[cfg.endField]) || start;
  } else {
    start = day(item[cfg.field]);
    end = start;
  }
  if (!start) return false; // no date: it can't fall inside a chosen range
  if (from && end < from) return false;
  if (to && start > to) return false;
  return true;
};

const personOf = (item, cfg) => {
  const value = item[cfg.field];
  return value === undefined || value === null || String(value).trim() === ''
    ? (cfg.emptyLabel || null)
    : String(value);
};

export const personOptions = (items, cfg) => {
  if (!cfg) return [];
  const set = new Set();
  items.forEach((item) => {
    const p = personOf(item, cfg);
    if (p) set.add(p);
  });
  const list = [...set].sort((a, b) => a.localeCompare(b));
  // Keep the "nobody" bucket (e.g. In stock) at the end of the list.
  if (cfg.emptyLabel && set.has(cfg.emptyLabel)) {
    return [...list.filter((p) => p !== cfg.emptyLabel), cfg.emptyLabel];
  }
  return list;
};

export const matchesPerson = (item, cfg, person) => !cfg || !person || personOf(item, cfg) === person;
