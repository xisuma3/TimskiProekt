import React, { useCallback, useDeferredValue, useEffect, useState } from 'react';
import { Row, Col, Alert, Form, Button, Modal } from 'react-bootstrap';
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

const DataPage = ({
  title,
  subtitle = null,
  apiEndpoint,
  searchFields = [],
  renderCard,
  searchPlaceholder = "Search...",
  showAddButton = false,
  onAddClick = null,
  createButtonText = "Add New",
  modalComponent: ModalComponent = null,
  modalItemProp = 'editingTemplate',
  onDelete = null,
  deleteConfirmText = "Are you sure you want to delete this item?",
  emptyIcon = 'bi-inbox',
  headerContent = null,
  // Optional third view: (filteredItems) => node. Adds a Calendar button to the toggle.
  renderCalendar = null,
  // Optional filters (see listFilters.js for the config shapes).
  dateFilter = null,
  personFilter = null,
}) => {
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
    authenticatedFetch(apiEndpoint)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch ${title.toLowerCase()}.`);
        }
        return response.json();
      })
      .then((data) => {
        // Ensure data is always an array for consistent handling
        const arrayData = Array.isArray(data) ? data : [data];
        setData(arrayData);
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
  }, [fetchData]);

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
      await fetchData(); // Refresh data
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
    fetchData(); // Refresh data
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
  const filteredData = data.filter(item => {
    if (deferredSearch) {
      const searchLower = deferredSearch.toLowerCase();
      const hit = searchFields.some(field => {
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
  const fmtDay = (s) => new Date(`${s}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  // Active filters as removable chips under the ribbon.
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

  return (
    <section aria-labelledby="data-page-title">
      <div className="page-header">
        <div>
          <h1 id="data-page-title">{title}</h1>
          {subtitle && <p>{subtitle}</p>}
          {!subtitle && !loading && !error && (
            <p>{`${data.length} ${data.length === 1 ? 'item' : 'items'}`}</p>
          )}
        </div>
      </div>

      {/* Ribbon: every way to find, narrow, view and add records, in one bar. Each group
          carries a visible caption, so no control relies on a placeholder as its label. */}
      <div className={`ribbon${(dateFilter || showPersonFilter) && !error ? ' ribbon-has-filters' : ''}`} role="toolbar" aria-label={`${title} tools`}>
        {hasSearch && (
          <div className="ribbon-group ribbon-group-grow">
            <div className="ribbon-controls page-search" role="search">
              <i className="bi bi-search" aria-hidden="true" />
              <Form.Control
                id={`${idBase}-search`}
                type="search"
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <label className="ribbon-caption" htmlFor={`${idBase}-search`}>Search</label>
          </div>
        )}

        {dateFilter && !error && (
          <div className="ribbon-group" role="group" aria-labelledby={`${idBase}-date-caption`}>
            <div className="ribbon-controls">
              <Form.Control
                type="date"
                className="ribbon-date"
                aria-label={`${dateFilter.label} from`}
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <span className="ribbon-range-sep" aria-hidden="true">→</span>
              <Form.Control
                type="date"
                className="ribbon-date"
                aria-label={`${dateFilter.label} to`}
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <span className="ribbon-caption" id={`${idBase}-date-caption`}>{dateFilter.label} dates</span>
          </div>
        )}

        {showPersonFilter && !error && (
          <div className="ribbon-group">
            <div className="ribbon-controls">
              <Form.Select
                id={`${idBase}-person`}
                className="ribbon-person"
                value={person}
                onChange={(e) => setPerson(e.target.value)}
              >
                <option value="">Everyone</option>
                {people.map((p) => <option key={p} value={p}>{p}</option>)}
              </Form.Select>
            </div>
            <label className="ribbon-caption" htmlFor={`${idBase}-person`}>{personFilter.label}</label>
          </div>
        )}

        <div className="ribbon-group ribbon-group-view">
          <div className="ribbon-controls view-toggle" role="group" aria-label="Layout">
            <button
              type="button"
              className={`view-toggle-btn ${view === 'grid' ? 'active' : ''}`}
              aria-pressed={view === 'grid'}
              aria-label="Grid view"
              title="Grid view"
              onClick={() => changeView('grid')}
            >
              <i className="bi bi-grid-3x3-gap" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${view === 'list' ? 'active' : ''}`}
              aria-pressed={view === 'list'}
              aria-label="List view"
              title="List view"
              onClick={() => changeView('list')}
            >
              <i className="bi bi-list-ul" aria-hidden="true" />
            </button>
            {renderCalendar && (
              <button
                type="button"
                className={`view-toggle-btn ${view === 'calendar' ? 'active' : ''}`}
                aria-pressed={view === 'calendar'}
                aria-label="Calendar view"
                title="Calendar view"
                onClick={() => changeView('calendar')}
              >
                <i className="bi bi-calendar3" aria-hidden="true" />
              </button>
            )}
          </div>
          <span className="ribbon-caption" aria-hidden="true">View</span>
        </div>

        {showCreate && (
          <div className="ribbon-group ribbon-group-create">
            <div className="ribbon-controls">
              <Button variant="primary" onClick={showAddButton ? onAddClick : handleCreate}>
                <i className="bi bi-plus-lg me-2" aria-hidden="true"></i>
                {createButtonText}
              </Button>
            </div>
            <span className="ribbon-caption" aria-hidden="true">Create</span>
          </div>
        )}
      </div>

      {chips.length > 0 && !loading && !error && (
        <div className="ribbon-chips" aria-live="polite">
          {chips.map((c) => (
            <span key={c.key} className="ribbon-chip">
              {c.label}
              <button type="button" onClick={c.clear} aria-label={`Remove filter ${c.label}`}>
                <i className="bi bi-x" aria-hidden="true" />
              </button>
            </span>
          ))}
          <span className="text-muted small">{filteredData.length} of {data.length} shown</span>
          <button type="button" className="ribbon-clear" onClick={clearAll}>Clear filters</button>
        </div>
      )}

      {headerContent}

      {error && (
        <Alert variant="danger" className="d-flex align-items-center justify-content-between gap-3">
          <span><i className="bi bi-exclamation-circle me-2" aria-hidden="true" />{error}</span>
          <Button size="sm" variant="light" onClick={fetchData}>Try again</Button>
        </Alert>
      )}

      {loading && (
        <Row className={view === 'list' ? 'g-3' : 'g-4'} aria-busy="true" aria-label={`Loading ${title.toLowerCase()}`}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <Col {...(view === 'list' ? { xs: 12 } : { md: 6, xl: 4 })} key={i}>
              <div className="skeleton" style={{ height: view === 'list' ? 76 : 180 }} />
            </Col>
          ))}
        </Row>
      )}

      {!loading && !error && view === 'calendar' && renderCalendar && renderCalendar(filteredData)}

      {!loading && !error && view !== 'calendar' && filteredData.length === 0 && (
        <div className="empty-state">
          <i className={`bi ${narrowed ? 'bi-search' : emptyIcon}`} aria-hidden="true" />
          <h3>{narrowed ? 'No matches' : `No ${title.toLowerCase()} yet`}</h3>
          <p className="mb-0">
            {search && !filtersActive && `Nothing matches “${search}”. Try a different search.`}
            {filtersActive && 'Nothing matches the current filters.'}
            {!narrowed && `No ${title.toLowerCase()} found.`}
          </p>
          {search && (
            <Button variant="light" className="mt-3" onClick={() => setSearch('')}>Clear search</Button>
          )}
          {filtersActive && (
            <Button variant="light" className="mt-3 ms-2" onClick={clearFilters}>Clear filters</Button>
          )}
        </div>
      )}

      {!loading && !error && view !== 'calendar' && filteredData.length > 0 && (
        <Row className={view === 'list' ? 'g-3 data-list' : 'g-4'}>
          {filteredData.map((item, index) => (
            // The record's own id comes first: employeeID repeats across one person's
            // leave requests, allowances and dossier, so it can't key those lists.
            <Col {...(view === 'list' ? { xs: 12 } : { md: 6, xl: 4 })} key={item.id || item.requestID || item.entitlementID || item.dossierID || item.assetID || item.documentID || item.templateID || item.departmentID || item.employeeID || index}>
              {/* Check if this is using the new modal system or old approach */}
              {usesManagedModal
                ? renderCard(item, handleEdit, handleDeleteClick) // New document modals
                : renderCard(item) // Existing pages that handle their own edit/delete
              }
            </Col>
          ))}
        </Row>
      )}

      {/* Modal Component - Only for new document modals */}
      {usesManagedModal && (
        <ModalComponent
          show={showModal}
          onHide={() => setShowModal(false)}
          onSave={handleModalSave}
          {...{ [modalItemProp]: editingItem }}
          onGenerate={handleModalSave}
        />
      )}

      {/* Delete Confirmation Modal - Only for new document modals */}
      {usesManagedModal && (
        <Modal show={showDeleteConfirm} onHide={closeDeleteConfirm} centered>
          <Modal.Header closeButton>
            <Modal.Title>Confirm Delete</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="mb-1">{deleteConfirmText}</p>
            <small className="text-muted">This action cannot be undone.</small>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeDeleteConfirm} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm} disabled={deleteLoading}>
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </section>
  );
};

export default DataPage;
