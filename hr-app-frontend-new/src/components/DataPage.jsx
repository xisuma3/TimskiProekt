import { useCallback, useDeferredValue, useEffect, useId, useState } from 'react';
import { AlertCircle, CalendarDays, Inbox, LayoutGrid, List, Plus, Search, SearchX, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import ConfirmDialog from './app/ConfirmDialog';
import EmptyState from './app/EmptyState';
import { authenticatedFetch } from '../services/authService';
import { matchesDate, matchesPerson, personOptions } from './listFilters';

const SKELETON_COUNT = 6;

// Grid/list preference, remembered per page in this browser.
const viewKey = (title) => `dataPage:view:${title}`;
const readView = (title, allowCalendar) => {
  try {
    const saved = localStorage.getItem(viewKey(title));
    if (saved === 'list' || (saved === 'calendar' && allowCalendar)) return saved;
  } catch {
    // Storage blocked: fall through to the default.
  }
  return 'grid';
};

const VIEWS = [
  { id: 'grid', label: 'Grid view', icon: LayoutGrid },
  { id: 'list', label: 'List view', icon: List },
  { id: 'calendar', label: 'Calendar view', icon: CalendarDays },
];

const DataPage = ({
  title,
  subtitle = null,
  apiEndpoint,
  searchFields = [],
  renderCard,
  searchPlaceholder = 'Search...',
  showAddButton = false,
  onAddClick = null,
  createButtonText = 'Add New',
  modalComponent: ModalComponent = null,
  modalItemProp = 'editingTemplate',
  onDelete = null,
  deleteConfirmText = 'Are you sure you want to delete this item?',
  // A lucide icon component shown when the list is empty.
  emptyIcon = Inbox,
  headerContent = null,
  // Optional third view: (filteredItems) => node. Adds a Calendar button to the toggle.
  renderCalendar = null,
  // Optional filters (see listFilters.js for the config shapes).
  dateFilter = null,
  personFilter = null,
  // 2 when the page is a section of a larger page (e.g. the team list above My Leave).
  headingLevel = 1,
  // Change it to refetch, e.g. after the page saved or deleted a record itself.
  refreshKey = 0,
}) => {
  const headingId = useId();
  const Heading = headingLevel === 2 ? 'h2' : 'h1';
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [view, setView] = useState(() => readView(title, Boolean(renderCalendar)));
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [person, setPerson] = useState('');

  const changeView = (next) => {
    setView(next);
    try {
      localStorage.setItem(viewKey(title), next);
    } catch {
      // Storage blocked: the choice lasts for this visit only.
    }
  };

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    return authenticatedFetch(apiEndpoint)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch ${title.toLowerCase()}.`);
        }
        return response.json();
      })
      .then((result) => {
        // Ensure data is always an array for consistent handling
        setData(Array.isArray(result) ? result : [result]);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [apiEndpoint, title]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const handleCreate = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleDeleteClick = (item) => {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    if (deleteLoading) return;
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!onDelete || !itemToDelete) return;

    setDeleteLoading(true);
    try {
      const token = localStorage.getItem('token');
      await onDelete(itemToDelete, token);
      await fetchData();
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleModalSave = () => {
    setShowModal(false);
    setEditingItem(null);
    fetchData();
  };

  // A person filter is only useful when the list holds more than one person (an
  // employee's own lists hold just them).
  const people = personOptions(data, personFilter);
  const showPersonFilter = Boolean(personFilter) && people.length > 1;
  const filtersActive = Boolean(dateFrom || dateTo || (showPersonFilter && person));
  const narrowed = Boolean(search) || filtersActive;
  const clearFilters = () => { setDateFrom(''); setDateTo(''); setPerson(''); };
  const idBase = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // Search, then date range, then person. Filtering reads a deferred copy of the search so
  // typing stays responsive on long lists.
  const deferredSearch = useDeferredValue(search);
  const filteredData = data.filter((item) => {
    if (deferredSearch) {
      const searchLower = deferredSearch.toLowerCase();
      const hit = searchFields.some((field) => {
        const value = item[field];
        return value && value.toString().toLowerCase().includes(searchLower);
      });
      if (!hit) return false;
    }
    if (!matchesDate(item, dateFilter, dateFrom, dateTo)) return false;
    return !showPersonFilter || matchesPerson(item, personFilter, person);
  });

  const usesManagedModal = ModalComponent && onDelete;
  const showCreate = showAddButton || ModalComponent;
  const hasSearch = searchFields.length > 0;
  const views = VIEWS.filter((v) => v.id !== 'calendar' || renderCalendar);
  const EmptyIcon = typeof emptyIcon === 'string' || !emptyIcon ? Inbox : emptyIcon;
  const fmtDay = (s) => new Date(`${s}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  // Active filters as removable chips under the toolbar.
  const chips = [];
  if (search) chips.push({ key: 'search', label: `“${search}”`, clear: () => setSearch('') });
  if (dateFilter && (dateFrom || dateTo)) {
    const range = dateFrom && dateTo ? `${fmtDay(dateFrom)} – ${fmtDay(dateTo)}`
      : dateFrom ? `from ${fmtDay(dateFrom)}` : `until ${fmtDay(dateTo)}`;
    chips.push({ key: 'date', label: `${dateFilter.label}: ${range}`, clear: () => { setDateFrom(''); setDateTo(''); } });
  }
  if (showPersonFilter && person) {
    chips.push({ key: 'person', label: `${personFilter.label}: ${person}`, clear: () => setPerson('') });
  }
  const clearAll = () => { setSearch(''); clearFilters(); };

  const cardGrid = view === 'list' ? 'grid gap-3' : 'grid gap-4 md:grid-cols-2 xl:grid-cols-3';

  return (
    <section aria-labelledby={headingId} className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Heading id={headingId} className={headingLevel === 2 ? 'text-xl font-semibold tracking-tight' : 'text-2xl font-semibold tracking-tight'}>{title}</Heading>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          {!subtitle && !loading && !error && (
            <p className="mt-1 text-sm text-muted-foreground">{`${data.length} ${data.length === 1 ? 'item' : 'items'}`}</p>
          )}
        </div>
        {showCreate && (
          <Button onClick={showAddButton ? onAddClick : handleCreate}>
            <Plus aria-hidden="true" />
            {createButtonText}
          </Button>
        )}
      </div>

      {/* Toolbar: every way to find, narrow and view records, in one bar. */}
      <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label={`${title} tools`}>
        {hasSearch && (
          <div className="relative min-w-[14rem] flex-1" role="search">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id={`${idBase}-search`}
              type="search"
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        )}

        {dateFilter && !error && (
          // On a phone the two dates share the row; from sm up they take a fixed width.
          <div className="flex w-full items-center gap-1.5 sm:w-auto" role="group" aria-labelledby={`${idBase}-date-caption`}>
            <span id={`${idBase}-date-caption`} className="text-sm text-muted-foreground">{dateFilter.label}</span>
            <Input
              type="date"
              className="min-w-0 flex-1 sm:w-[9.5rem] sm:flex-none"
              aria-label={`${dateFilter.label} from`}
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <span className="text-muted-foreground" aria-hidden="true">–</span>
            <Input
              type="date"
              className="min-w-0 flex-1 sm:w-[9.5rem] sm:flex-none"
              aria-label={`${dateFilter.label} to`}
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        )}

        {showPersonFilter && !error && (
          <div className="flex items-center gap-1.5">
            <label className="text-sm text-muted-foreground" htmlFor={`${idBase}-person`}>{personFilter.label}</label>
            <NativeSelect id={`${idBase}-person`} value={person} onChange={(e) => setPerson(e.target.value)} className="min-w-[10rem]">
              <NativeSelectOption value="">Everyone</NativeSelectOption>
              {people.map((p) => <NativeSelectOption key={p} value={p}>{p}</NativeSelectOption>)}
            </NativeSelect>
          </div>
        )}

        <div className="ml-auto flex items-center rounded-md border bg-background p-0.5 shadow-xs" role="group" aria-label="Layout">
          {views.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              type="button"
              variant="ghost"
              size="icon-sm"
              className={cn('size-7', view === id && 'bg-muted text-foreground')}
              aria-pressed={view === id}
              aria-label={label}
              title={label}
              onClick={() => changeView(id)}
            >
              <Icon aria-hidden="true" />
            </Button>
          ))}
        </div>
      </div>

      {chips.length > 0 && !loading && !error && (
        <div className="flex flex-wrap items-center gap-2" aria-live="polite">
          {chips.map((c) => (
            <Badge key={c.key} variant="secondary" className="gap-1 pr-1">
              {c.label}
              <button
                type="button"
                onClick={c.clear}
                aria-label={`Remove filter ${c.label}`}
                className="rounded-sm p-0.5 hover:bg-foreground/10"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </Badge>
          ))}
          <span className="text-sm text-muted-foreground">{filteredData.length} of {data.length} shown</span>
          <Button variant="link" size="sm" className="h-auto px-1" onClick={clearAll}>Clear filters</Button>
        </div>
      )}

      {headerContent}

      {error && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={fetchData}>Try again</Button>
          </AlertDescription>
        </Alert>
      )}

      {loading && (
        <div className={cardGrid} aria-busy="true" aria-label={`Loading ${title.toLowerCase()}`}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <Skeleton key={i} className={view === 'list' ? 'h-20' : 'h-44'} />
          ))}
        </div>
      )}

      {!loading && !error && view === 'calendar' && renderCalendar && renderCalendar(filteredData)}

      {!loading && !error && view !== 'calendar' && filteredData.length === 0 && (
        <EmptyState
          icon={narrowed ? SearchX : EmptyIcon}
          title={narrowed ? 'No matches' : `No ${title.toLowerCase()} yet`}
          description={
            (search && !filtersActive && `Nothing matches “${search}”. Try a different search.`)
            || (filtersActive && 'Nothing matches the current filters.')
            || `No ${title.toLowerCase()} found.`
          }
        >
          {search && <Button variant="outline" onClick={() => setSearch('')}>Clear search</Button>}
          {filtersActive && <Button variant="outline" onClick={clearFilters}>Clear filters</Button>}
        </EmptyState>
      )}

      {!loading && !error && view !== 'calendar' && filteredData.length > 0 && (
        <div className={cn(cardGrid, view === 'list' && 'data-list')}>
          {filteredData.map((item, index) => (
            // The record's own id must win over any foreign key it carries. employeeID
            // repeats across one person's leave requests, allowances and dossier, so those
            // own ids come first; departmentID repeats across an employee list, so
            // employeeID has to come before it.
            <div key={item.id || item.requestID || item.entitlementID || item.dossierID || item.assetID || item.documentID || item.templateID || item.employeeID || item.departmentID || index} className="min-w-0">
              {usesManagedModal
                ? renderCard(item, handleEdit, handleDeleteClick) // DataPage owns edit/delete
                : renderCard(item) // The page handles its own edit/delete
              }
            </div>
          ))}
        </div>
      )}

      {/* The modal contract every *Modal component follows: show / onHide / onSave. */}
      {usesManagedModal && (
        <ModalComponent
          show={showModal}
          onHide={() => setShowModal(false)}
          onSave={handleModalSave}
          {...{ [modalItemProp]: editingItem }}
          onGenerate={handleModalSave}
        />
      )}

      {usesManagedModal && (
        <ConfirmDialog
          open={showDeleteConfirm}
          onOpenChange={(open) => { if (!open) closeDeleteConfirm(); }}
          title="Confirm delete"
          description={`${deleteConfirmText} This action cannot be undone.`}
          busy={deleteLoading}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </section>
  );
};

export default DataPage;
