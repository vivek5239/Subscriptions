import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { 
  Container, 
  Row, 
  Col, 
  Button, 
  Spinner, 
  Badge, 
  Form, 
  InputGroup 
} from 'react-bootstrap';
import { 
  Plus, 
  Search, 
  LayoutGrid, 
  List, 
  Edit2, 
  Trash2, 
  Copy, 
  CheckCircle, 
  RefreshCw, 
  ExternalLink
} from 'lucide-react';
import { differenceInDays } from 'date-fns';
import type { Subscription } from '../types';
import { Logo } from '../components/Logo';
import SubscriptionModal from '../components/SubscriptionModal';

const CATEGORIES = [
  'All',
  'Entertainment',
  'Utilities',
  'Productivity',
  'Health & Fitness',
  'Housing',
  'Insurance',
  'Shopping',
  'Food & Drink',
  'Finance',
  'Other'
];

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Overdue' | 'Inactive'>('All');
  const [cycleFilter, setCycleFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const res = await axios.get('/api/subscriptions');
      setSubscriptions(res.data.subscriptions || []);
    } catch (err) {
      console.error('[Subscriptions] Error fetching:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (subData: Partial<Subscription>) => {
    try {
      await axios.post('/api/subscriptions', subData);
      await fetchSubscriptions();
    } catch (err) {
      console.error('Error saving subscription:', err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await axios.delete(`/api/subscriptions/${id}`);
      await fetchSubscriptions();
    } catch (err) {
      console.error('Error deleting subscription:', err);
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await axios.post(`/api/subscriptions/${id}/pay`);
      await fetchSubscriptions();
    } catch (err) {
      console.error('Error marking as paid:', err);
    }
  };

  const handleClone = async (id: string) => {
    try {
      await axios.post(`/api/subscriptions/${id}/clone`);
      await fetchSubscriptions();
    } catch (err) {
      console.error('Error cloning subscription:', err);
    }
  };

  const handleSyncOverdue = async () => {
    if (!window.confirm('Roll forward all overdue recurring subscriptions to their next upcoming billing date in the current calendar cycle?')) {
      return;
    }
    setSyncing(true);
    try {
      const res = await axios.post('/api/subscriptions/sync-cycles');
      alert(res.data.message || 'Cycles synced successfully!');
      await fetchSubscriptions();
    } catch (err: any) {
      alert('Error syncing cycles: ' + (err.response?.data?.error || err.message));
    } finally {
      setSyncing(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filtered List
  const filtered = useMemo(() => {
    return subscriptions.filter(sub => {
      // Search text
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = sub.Name?.toLowerCase().includes(query);
        const matchesNotes = sub.Notes?.toLowerCase().includes(query);
        const matchesCategory = sub.Category?.toLowerCase().includes(query);
        const matchesMethod = sub['Payment Method']?.toLowerCase().includes(query);
        if (!matchesName && !matchesNotes && !matchesCategory && !matchesMethod) {
          return false;
        }
      }

      // Category
      if (categoryFilter !== 'All' && sub.Category !== categoryFilter) {
        return false;
      }

      // Cycle
      if (cycleFilter !== 'All' && sub['Payment Cycle'] !== cycleFilter) {
        return false;
      }

      // Status
      if (statusFilter === 'Active' && sub.Active !== 'Yes') return false;
      if (statusFilter === 'Inactive' && sub.Active === 'Yes') return false;
      if (statusFilter === 'Overdue') {
        if (sub.Active !== 'Yes' || !sub['Next Payment']) return false;
        const d = new Date(sub['Next Payment']);
        d.setHours(0, 0, 0, 0);
        if (d.getTime() >= today.getTime()) return false;
      }

      return true;
    });
  }, [subscriptions, search, categoryFilter, statusFilter, cycleFilter, today]);

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <div className="mt-3 text-muted">Loading subscriptions...</div>
      </Container>
    );
  }

  const overdueCount = subscriptions.filter(s => {
    if (s.Active !== 'Yes' || !s['Next Payment']) return false;
    const d = new Date(s['Next Payment']);
    d.setHours(0, 0, 0, 0);
    return d.getTime() < today.getTime();
  }).length;

  return (
    <Container fluid="xl" className="py-4 px-3 px-sm-4">
      {/* Header & Controls */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h3 className="fw-bold mb-1 tracking-tight">All Subscriptions</h3>
          <p className="text-muted small mb-0">
            Total of {subscriptions.length} recurring accounts tracked ({subscriptions.filter(s => s.Active === 'Yes').length} active).
          </p>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2">
          {/* Sync Overdue Button */}
          {overdueCount > 0 && (
            <Button 
              variant="outline-warning" 
              className="rounded-pill px-3 d-flex align-items-center gap-2 shadow-sm text-dark"
              onClick={handleSyncOverdue}
              disabled={syncing}
              title="Roll overdue recurring bills forward to upcoming dates in the current calendar cycle"
            >
              <RefreshCw size={15} className={syncing ? 'spinner-border spinner-border-sm' : ''} />
              <span>Sync {overdueCount} Overdue</span>
            </Button>
          )}

          {/* View Mode Switcher */}
          <div className="btn-group rounded-pill overflow-hidden border shadow-sm">
            <Button
              variant={viewMode === 'table' ? 'primary' : 'light'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="px-3"
              aria-label="Table view"
            >
              <List size={16} />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'light'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="px-3"
              aria-label="Grid view"
            >
              <LayoutGrid size={16} />
            </Button>
          </div>

          {/* Add Subscription Button */}
          <Button 
            variant="primary" 
            className="rounded-pill px-3 d-flex align-items-center gap-2 shadow-sm"
            onClick={() => { setSelectedSub(null); setShowModal(true); }}
          >
            <Plus size={16} />
            <span>Add Subscription</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="glass-panel p-3 mb-4">
        <Row className="g-2 align-items-center">
          {/* Search Box */}
          <Col md={5} lg={4}>
            <InputGroup size="sm" className="rounded-pill overflow-hidden border">
              <InputGroup.Text className="bg-transparent border-0 ps-3">
                <Search size={15} className="text-muted" />
              </InputGroup.Text>
              <Form.Control
                placeholder="Search name, notes, category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-0 shadow-none ps-2"
              />
              {search && (
                <Button 
                  variant="link" 
                  size="sm" 
                  className="text-muted pe-3 text-decoration-none"
                  onClick={() => setSearch('')}
                >
                  ✕
                </Button>
              )}
            </InputGroup>
          </Col>

          {/* Status Filter Dropdown / Pills */}
          <Col xs={6} md={3} lg={2}>
            <Form.Select 
              size="sm" 
              className="rounded-pill"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Overdue">Overdue Only ({overdueCount})</option>
              <option value="Inactive">Inactive Only</option>
            </Form.Select>
          </Col>

          {/* Cycle Filter */}
          <Col xs={6} md={3} lg={2}>
            <Form.Select 
              size="sm" 
              className="rounded-pill"
              value={cycleFilter}
              onChange={(e) => setCycleFilter(e.target.value)}
            >
              <option value="All">All Cycles</option>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Every 6 Months">Every 6 Months</option>
              <option value="Yearly">Yearly</option>
              <option value="Weekly">Weekly</option>
              <option value="One-Time">One-Time</option>
            </Form.Select>
          </Col>

          {/* Filter Stats */}
          <Col className="text-md-end text-muted small mt-2 mt-md-0">
            Showing {filtered.length} of {subscriptions.length} items
          </Col>
        </Row>

        {/* Category Pills Slider */}
        <div className="d-flex flex-wrap align-items-center gap-1 mt-3 pt-2 border-top">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              className={`chip-btn ${categoryFilter === cat ? 'active' : ''}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Subscriptions Content: Table or Grid */}
      {filtered.length === 0 ? (
        <div className="glass-panel p-5 text-center text-muted">
          <p className="fs-5 mb-2">No subscriptions matched your filters</p>
          <Button 
            variant="outline-primary" 
            size="sm" 
            className="rounded-pill px-3"
            onClick={() => { setSearch(''); setCategoryFilter('All'); setStatusFilter('All'); setCycleFilter('All'); }}
          >
            Reset Filters
          </Button>
        </div>
      ) : viewMode === 'table' ? (
        /* Modern Table View */
        <div className="glass-panel p-3">
          <div className="table-responsive">
            <table className="modern-table align-middle">
              <thead>
                <tr className="text-muted small text-uppercase">
                  <th className="ps-3 py-2">Service</th>
                  <th className="py-2">Price</th>
                  <th className="py-2">Cycle</th>
                  <th className="py-2">Next Due Date</th>
                  <th className="py-2">Category</th>
                  <th className="py-2">Payment Method</th>
                  <th className="py-2 text-center">Status</th>
                  <th className="py-2 text-end pe-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(sub => {
                  let daysLeft = 0;
                  let isOverdue = false;
                  let isToday = false;

                  if (sub['Next Payment']) {
                    const d = new Date(sub['Next Payment']);
                    d.setHours(0, 0, 0, 0);
                    if (!isNaN(d.getTime())) {
                      daysLeft = differenceInDays(d, today);
                      isOverdue = daysLeft < 0;
                      isToday = daysLeft === 0;
                    }
                  }

                  return (
                    <tr key={sub.id}>
                      <td className="ps-3">
                        <div className="d-flex align-items-center">
                          <Logo name={sub.Name} url={sub.URL} manualLogo={sub.ManualLogo} size={34} />
                          <div>
                            <div className="fw-bold text-body text-truncate d-flex align-items-center gap-1" style={{ maxWidth: '200px' }}>
                              <span>{sub.Name}</span>
                              {sub.URL && (
                                <a 
                                  href={sub.URL} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-muted" 
                                  title="Open website"
                                >
                                  <ExternalLink size={12} />
                                </a>
                              )}
                            </div>
                            {sub.Notes && (
                              <div className="small text-muted text-truncate" style={{ maxWidth: '200px', fontSize: '0.75rem' }}>
                                {sub.Notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="fw-bold fs-6">{sub.Price}</td>

                      <td>
                        <span className="badge bg-secondary-subtle text-body rounded-pill px-3 py-1 small fw-medium">
                          {sub['Payment Cycle']}
                        </span>
                      </td>

                      <td>
                        <div className="d-flex flex-column">
                          <span className="small text-body">{sub['Next Payment']}</span>
                          {sub.Active === 'Yes' && sub['Next Payment'] && (
                            <Badge 
                              bg={isOverdue ? 'danger' : isToday ? 'warning' : 'primary-subtle'} 
                              className={`rounded-pill align-self-start mt-1 ${isToday ? 'text-dark' : isOverdue ? 'text-white' : 'text-primary'}`}
                              style={{ fontSize: '0.65rem' }}
                            >
                              {isOverdue ? `Overdue ${Math.abs(daysLeft)}d` : isToday ? 'Due Today' : `In ${daysLeft}d`}
                            </Badge>
                          )}
                        </div>
                      </td>

                      <td>
                        <span className="badge bg-info-subtle text-info-emphasis rounded-pill px-3 py-1 small fw-medium">
                          {sub.Category}
                        </span>
                      </td>

                      <td className="small text-muted">
                        <div>{sub['Payment Method'] || 'Credit Card'}</div>
                        {sub.PaidBy && <div className="text-muted" style={{ fontSize: '0.7rem' }}>By: {sub.PaidBy}</div>}
                      </td>

                      <td className="text-center">
                        <div 
                          className={`status-dot ${sub.Active === 'Yes' ? 'status-dot-green' : 'status-dot-red'}`} 
                          title={sub.Active === 'Yes' ? 'Active' : 'Inactive'}
                        />
                      </td>

                      <td className="text-end pe-3">
                        <div className="d-flex align-items-center justify-content-end gap-1">
                          {sub.Active === 'Yes' && (
                            <Button
                              variant="outline-success"
                              size="sm"
                              className="p-1 rounded-circle d-flex align-items-center justify-content-center"
                              style={{ width: 28, height: 28 }}
                              title="Mark Paid (Roll forward)"
                              onClick={() => handleMarkPaid(sub.id)}
                            >
                              <CheckCircle size={14} />
                            </Button>
                          )}

                          <Button
                            variant="outline-secondary"
                            size="sm"
                            className="p-1 rounded-circle d-flex align-items-center justify-content-center"
                            style={{ width: 28, height: 28 }}
                            title="Clone Subscription"
                            onClick={() => handleClone(sub.id)}
                          >
                            <Copy size={14} />
                          </Button>

                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="p-1 rounded-circle d-flex align-items-center justify-content-center"
                            style={{ width: 28, height: 28 }}
                            title="Edit Subscription"
                            onClick={() => { setSelectedSub(sub); setShowModal(true); }}
                          >
                            <Edit2 size={14} />
                          </Button>

                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="p-1 rounded-circle d-flex align-items-center justify-content-center"
                            style={{ width: 28, height: 28 }}
                            title="Delete Subscription"
                            onClick={() => handleDelete(sub.id, sub.Name)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Modern Grid Cards View */
        <Row className="g-3">
          {filtered.map(sub => {
            let daysLeft = 0;
            let isOverdue = false;
            let isToday = false;

            if (sub['Next Payment']) {
              const d = new Date(sub['Next Payment']);
              d.setHours(0, 0, 0, 0);
              if (!isNaN(d.getTime())) {
                daysLeft = differenceInDays(d, today);
                isOverdue = daysLeft < 0;
                isToday = daysLeft === 0;
              }
            }

            return (
              <Col sm={6} lg={4} xl={3} key={sub.id}>
                <div className={`glass-panel p-3 h-100 hover-lift d-flex flex-column justify-content-between ${isOverdue ? 'border-danger border-opacity-50' : ''}`}>
                  <div>
                    {/* Header */}
                    <div className="d-flex align-items-start justify-content-between mb-2">
                      <div className="d-flex align-items-center gap-2 text-truncate">
                        <Logo name={sub.Name} url={sub.URL} manualLogo={sub.ManualLogo} size={36} />
                        <div className="text-truncate">
                          <h6 className="fw-bold mb-0 text-truncate">{sub.Name}</h6>
                          <span className="small text-muted">{sub.Category}</span>
                        </div>
                      </div>
                      <div 
                        className={`status-dot ${sub.Active === 'Yes' ? 'status-dot-green' : 'status-dot-red'} mt-1`}
                        title={sub.Active === 'Yes' ? 'Active' : 'Inactive'} 
                      />
                    </div>

                    {/* Price and Cycle */}
                    <div className="my-3">
                      <div className="d-flex align-items-baseline gap-2">
                        <span className="fs-4 fw-bold">{sub.Price}</span>
                        <span className="small text-muted">/ {sub['Payment Cycle']}</span>
                      </div>
                    </div>

                    {/* Next Payment Pill */}
                    <div className="d-flex align-items-center justify-content-between small py-2 px-3 rounded-3 bg-body-tertiary mb-3">
                      <span className="text-muted">Next Due:</span>
                      <div className="d-flex align-items-center gap-1">
                        <span className="fw-medium">{sub['Next Payment']}</span>
                        {sub.Active === 'Yes' && sub['Next Payment'] && (
                          <Badge 
                            bg={isOverdue ? 'danger' : isToday ? 'warning' : 'primary-subtle'} 
                            className={`rounded-pill ${isToday ? 'text-dark' : isOverdue ? 'text-white' : 'text-primary'}`}
                            style={{ fontSize: '0.65rem' }}
                          >
                            {isOverdue ? `${Math.abs(daysLeft)}d late` : isToday ? 'Today' : `${daysLeft}d`}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Notes preview */}
                    {sub.Notes && (
                      <p className="small text-muted text-truncate mb-3" style={{ fontSize: '0.8rem' }}>
                        {sub.Notes}
                      </p>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="d-flex align-items-center justify-content-between pt-2 border-top">
                    {sub.Active === 'Yes' ? (
                      <Button
                        variant="outline-success"
                        size="sm"
                        className="rounded-pill px-3 py-1 small d-flex align-items-center gap-1"
                        onClick={() => handleMarkPaid(sub.id)}
                      >
                        <CheckCircle size={13} />
                        <span>Paid</span>
                      </Button>
                    ) : (
                      <span className="small text-muted">Inactive</span>
                    )}

                    <div className="d-flex align-items-center gap-1">
                      <Button
                        variant="link"
                        size="sm"
                        className="p-1 text-muted hover-bg-theme rounded-circle"
                        title="Clone"
                        onClick={() => handleClone(sub.id)}
                      >
                        <Copy size={15} />
                      </Button>
                      <Button
                        variant="link"
                        size="sm"
                        className="p-1 text-primary hover-bg-theme rounded-circle"
                        title="Edit"
                        onClick={() => { setSelectedSub(sub); setShowModal(true); }}
                      >
                        <Edit2 size={15} />
                      </Button>
                      <Button
                        variant="link"
                        size="sm"
                        className="p-1 text-danger hover-bg-theme rounded-circle"
                        title="Delete"
                        onClick={() => handleDelete(sub.id, sub.Name)}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Subscription Modal */}
      <SubscriptionModal
        show={showModal}
        onHide={() => { setShowModal(false); setSelectedSub(null); }}
        onSave={handleSave}
        subscription={selectedSub}
      />
    </Container>
  );
}
