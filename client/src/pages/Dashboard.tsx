import { useEffect, useState } from 'react';
import axios from 'axios';
import { Container, Row, Col, Button, Spinner, Badge, Modal, InputGroup, Form } from 'react-bootstrap';
import { 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Bot, 
  Plus, 
  Calendar, 
  ChevronRight,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import type { DashboardData, Subscription } from '../types';
import { Logo } from '../components/Logo';
import SubscriptionModal from '../components/SubscriptionModal';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Gemini AI Quick Add
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // AI Financial Insights Modal
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsContent, setInsightsContent] = useState<string | null>(null);
  const [insightsModelUsed, setInsightsModelUsed] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await axios.get('/api/subscriptions');
      setData(res.data);
    } catch (err) {
      console.error('[Dashboard] Error fetching subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await axios.post(`/api/subscriptions/${id}/pay`);
      await fetchDashboard();
    } catch (err) {
      console.error('Error marking as paid:', err);
    }
  };

  const handleAiParse = async (promptOverride?: string) => {
    const textToUse = promptOverride || aiText;
    if (!textToUse.trim()) return;

    setAiLoading(true);
    setAiError(null);

    try {
      const res = await axios.post('/api/ai/create-subscription', { text: textToUse });
      if (res.data?.subscription) {
        setSelectedSub(res.data.subscription);
        setModalOpen(true);
        setAiText('');
      }
    } catch (err: any) {
      setAiError(err.response?.data?.error || err.message || 'Gemini AI parsing failed.');
    } finally {
      setAiLoading(false);
    }
  };

  const runAiAnalysis = async () => {
    setShowInsightsModal(true);
    if (insightsContent) return; // Already loaded

    setInsightsLoading(true);
    try {
      const res = await axios.post('/api/ai/analyze');
      setInsightsContent(res.data.analysis);
      setInsightsModelUsed(res.data.modelUsed);
    } catch (err: any) {
      setInsightsContent('Error generating analysis: ' + (err.response?.data?.error || err.message));
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleSaveSubscription = async (sub: Partial<Subscription>) => {
    try {
      await axios.post('/api/subscriptions', sub);
      await fetchDashboard();
    } catch (err) {
      console.error('Error saving subscription:', err);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <div className="mt-3 text-muted">Loading your subscription portfolio...</div>
      </Container>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Classify upcoming and overdue
  const activeSubs = (data?.subscriptions || []).filter(s => s.Active === 'Yes');

  const overdueList = activeSubs.filter(s => {
    if (!s['Next Payment']) return false;
    const d = new Date(s['Next Payment']);
    d.setHours(0, 0, 0, 0);
    return d.getTime() < today.getTime();
  }).sort((a, b) => new Date(a['Next Payment']).getTime() - new Date(b['Next Payment']).getTime());

  const upcomingList = activeSubs.filter(s => {
    if (!s['Next Payment']) return false;
    const d = new Date(s['Next Payment']);
    d.setHours(0, 0, 0, 0);
    return d.getTime() >= today.getTime();
  }).sort((a, b) => new Date(a['Next Payment']).getTime() - new Date(b['Next Payment']).getTime()).slice(0, 6);

  return (
    <Container fluid="xl" className="py-4 px-3 px-sm-4">
      {/* Page Title & Top Action Bar */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h3 className="fw-bold mb-1 tracking-tight">Financial Dashboard</h3>
          <p className="text-muted small mb-0">
            Real-time recurring bill tracking, cycle management, and AI financial recommendations.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Button 
            variant="outline-primary"
            className="rounded-pill px-3 d-flex align-items-center gap-2 shadow-sm"
            onClick={runAiAnalysis}
          >
            <Sparkles size={16} />
            <span>AI Insights</span>
          </Button>
          <Button 
            variant="primary"
            className="rounded-pill px-3 d-flex align-items-center gap-2 shadow-sm"
            onClick={() => { setSelectedSub(null); setModalOpen(true); }}
          >
            <Plus size={16} />
            <span>Add Subscription</span>
          </Button>
        </div>
      </div>

      {/* Metric KPI Cards Grid */}
      <Row className="g-3 mb-4">
        {/* Monthly Cost */}
        <Col sm={6} lg={3}>
          <div className="glass-panel p-3 h-100 hover-lift">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="small fw-semibold text-muted text-uppercase tracking-wider">Monthly Spend</span>
              <div 
                className="stat-card-icon" 
                style={{ background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary-color)' }}
              >
                <TrendingUp size={20} />
              </div>
            </div>
            <h3 className="fw-bold mb-1">
              ₹{(data?.stats.totalMonthlyINR || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </h3>
            <div className="small text-muted d-flex align-items-center gap-1">
              <span>Annual:</span>
              <span className="fw-semibold text-body">
                ₹{(data?.stats.totalYearlyINR || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </Col>

        {/* Due This Month */}
        <Col sm={6} lg={3}>
          <div className="glass-panel p-3 h-100 hover-lift">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="small fw-semibold text-muted text-uppercase tracking-wider">Due This Month</span>
              <div 
                className="stat-card-icon" 
                style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}
              >
                <Clock size={20} />
              </div>
            </div>
            <h3 className="fw-bold mb-1">
              ₹{(data?.stats.dueThisMonthINR || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </h3>
            <div className="small text-muted">
              Active tracking: {data?.stats.activeCount || 0} subscriptions
            </div>
          </div>
        </Col>

        {/* Overdue Alert Card */}
        <Col sm={6} lg={3}>
          <div className={`glass-panel p-3 h-100 hover-lift ${overdueList.length > 0 ? 'border-danger border-opacity-50 pulse-overdue' : ''}`}>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="small fw-semibold text-muted text-uppercase tracking-wider">Overdue Bills</span>
              <div 
                className="stat-card-icon" 
                style={{ 
                  background: overdueList.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.12)', 
                  color: overdueList.length > 0 ? '#ef4444' : '#10b981' 
                }}
              >
                {overdueList.length > 0 ? <ShieldAlert size={20} /> : <CheckCircle size={20} />}
              </div>
            </div>
            <h3 className={`fw-bold mb-1 ${overdueList.length > 0 ? 'text-danger' : 'text-success'}`}>
              {overdueList.length}
            </h3>
            <div className="small text-muted">
              {overdueList.length > 0 ? 'Requires attention / sync' : 'All subscriptions up to date'}
            </div>
          </div>
        </Col>

        {/* Top Expense */}
        <Col sm={6} lg={3}>
          <div className="glass-panel p-3 h-100 hover-lift">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="small fw-semibold text-muted text-uppercase tracking-wider">Highest Expense</span>
              {data?.stats.mostExpensive && (
                <Logo 
                  name={data.stats.mostExpensive.Name} 
                  url={data.stats.mostExpensive.URL} 
                  manualLogo={data.stats.mostExpensive.ManualLogo}
                  size={32} 
                />
              )}
            </div>
            <h5 className="fw-bold mb-0 text-truncate" title={data?.stats.mostExpensive?.Name || ''}>
              {data?.stats.mostExpensive?.Name || 'None'}
            </h5>
            <div className="small text-muted mt-1">
              {data?.stats.mostExpensive ? (
                <>
                  <span className="fw-semibold text-body">{data.stats.mostExpensive.Price}</span>
                  <span className="ms-1">({data.stats.mostExpensive['Payment Cycle']})</span>
                </>
              ) : 'No expenses recorded'}
            </div>
          </div>
        </Col>
      </Row>

      {/* Gemini AI Natural Language Command Bar */}
      <div className="glass-panel p-4 mb-4" style={{ borderLeft: '4px solid var(--primary-color)' }}>
        <div className="d-flex align-items-center gap-2 mb-2">
          <div 
            className="d-flex align-items-center justify-content-center rounded-circle p-1" 
            style={{ background: 'var(--primary-gradient)', color: '#fff', width: 26, height: 26 }}
          >
            <Bot size={16} />
          </div>
          <span className="fw-bold small text-body text-uppercase tracking-wider">
            Gemini AI Fast Assistant
          </span>
          <Badge bg="primary-subtle" className="text-primary border border-primary-subtle rounded-pill">
            gemini-2.5-pro
          </Badge>
        </div>

        <InputGroup className="shadow-sm rounded-pill overflow-hidden border">
          <Form.Control
            placeholder="Tell Gemini what to add, e.g. 'Add Netflix 4K for ₹649 monthly on 15th' or 'Gym £24 monthly on 10th'..."
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAiParse(); } }}
            className="border-0 px-4 py-2"
            disabled={aiLoading}
          />
          <Button 
            variant="primary" 
            className="px-4 fw-medium d-flex align-items-center gap-2"
            onClick={() => handleAiParse()}
            disabled={aiLoading || !aiText.trim()}
          >
            {aiLoading ? <Spinner size="sm" animation="border" /> : <Sparkles size={16} />}
            <span>{aiLoading ? 'Thinking...' : 'Add with AI'}</span>
          </Button>
        </InputGroup>

        {aiError && (
          <div className="text-danger small mt-2 d-flex align-items-center gap-1">
            <AlertTriangle size={14} />
            <span>{aiError}</span>
          </div>
        )}

        {/* Quick Example Suggestion Chips */}
        <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
          <span className="small text-muted me-1">Try prompt:</span>
          {[
            'Netflix Premium ₹649/mo on 15th',
            'Broadband ₹707 monthly on 2nd',
            'Prime Video ₹1499 yearly on 24 Aug',
            'Council Tax £144 monthly on 25th'
          ].map(example => (
            <button
              key={example}
              type="button"
              className="chip-btn"
              onClick={() => { setAiText(example); handleAiParse(example); }}
              disabled={aiLoading}
            >
              <Sparkles size={12} className="text-primary" />
              <span>{example}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Dual Grid: Overdue & Upcoming */}
      <Row className="g-4 mb-4">
        {/* Overdue Payments Section */}
        {overdueList.length > 0 && (
          <Col lg={12}>
            <div className="glass-panel p-4 border-danger border-opacity-25">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="d-flex align-items-center gap-2">
                  <ShieldAlert className="text-danger" size={20} />
                  <h6 className="fw-bold mb-0 text-danger">
                    Overdue Bills ({overdueList.length})
                  </h6>
                </div>
                <Link to="/subscriptions" className="small text-decoration-none d-flex align-items-center gap-1">
                  <span>Manage in Subscriptions</span>
                  <ChevronRight size={14} />
                </Link>
              </div>

              <Row className="g-2">
                {overdueList.slice(0, 6).map(sub => {
                  const daysLate = Math.abs(differenceInDays(parseISO(sub['Next Payment']), today));
                  return (
                    <Col md={6} lg={4} key={sub.id}>
                      <div className="p-3 rounded-3 border bg-body-tertiary d-flex align-items-center justify-content-between shadow-sm">
                        <div className="d-flex align-items-center gap-2 text-truncate me-2">
                          <Logo name={sub.Name} url={sub.URL} manualLogo={sub.ManualLogo} size={30} />
                          <div className="text-truncate">
                            <div className="fw-semibold text-truncate small">{sub.Name}</div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                              Due {sub['Next Payment']} ({daysLate}d ago)
                            </div>
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-bold small">{sub.Price}</span>
                          <Button 
                            variant="outline-success" 
                            size="sm" 
                            className="rounded-pill py-0 px-2 small d-flex align-items-center gap-1"
                            title="Mark as Paid & Advance to next cycle"
                            onClick={() => handleMarkPaid(sub.id)}
                          >
                            <CheckCircle size={12} />
                            <span>Paid</span>
                          </Button>
                        </div>
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </div>
          </Col>
        )}

        {/* Upcoming in Next 7-30 Days */}
        <Col lg={5}>
          <div className="glass-panel p-4 h-100">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="d-flex align-items-center gap-2">
                <Calendar className="text-primary" size={20} />
                <h6 className="fw-bold mb-0">Upcoming Schedule</h6>
              </div>
              <Badge bg="secondary-subtle" className="text-body rounded-pill small">
                {upcomingList.length} items
              </Badge>
            </div>

            {upcomingList.length === 0 ? (
              <div className="text-center py-5 text-muted small">
                No upcoming payments in this window.
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {upcomingList.map(sub => {
                  const daysLeft = differenceInDays(parseISO(sub['Next Payment']), today);
                  const isToday = daysLeft === 0;
                  const isTomorrow = daysLeft === 1;

                  return (
                    <div 
                      key={sub.id} 
                      className="p-3 rounded-3 border bg-body-tertiary d-flex align-items-center justify-content-between hover-lift shadow-sm"
                    >
                      <div className="d-flex align-items-center gap-3 text-truncate me-2">
                        <Logo name={sub.Name} url={sub.URL} manualLogo={sub.ManualLogo} size={34} />
                        <div className="text-truncate">
                          <div className="fw-semibold text-truncate">{sub.Name}</div>
                          <div className="small text-muted">
                            {format(parseISO(sub['Next Payment']), 'MMM dd, yyyy')} • {sub.Category}
                          </div>
                        </div>
                      </div>

                      <div className="d-flex flex-column align-items-end gap-1 flex-shrink-0">
                        <span className="fw-bold">{sub.Price}</span>
                        <div className="d-flex align-items-center gap-1">
                          <Badge 
                            bg={isToday ? 'warning' : isTomorrow ? 'info' : 'primary-subtle'} 
                            className={`rounded-pill ${isToday || isTomorrow ? 'text-dark' : 'text-primary'}`}
                            style={{ fontSize: '0.65rem' }}
                          >
                            {isToday ? 'Due Today' : isTomorrow ? 'Tomorrow' : `In ${daysLeft} days`}
                          </Badge>
                          <Button
                            variant="outline-success"
                            size="sm"
                            className="p-1 rounded-circle d-flex align-items-center justify-content-center"
                            style={{ width: 22, height: 22 }}
                            title="Mark Paid & Advance"
                            onClick={() => handleMarkPaid(sub.id)}
                          >
                            <CheckCircle size={13} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Col>

        {/* All Subscriptions Quick Preview Table */}
        <Col lg={7}>
          <div className="glass-panel p-4 h-100">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h6 className="fw-bold mb-0">Active Subscriptions ({activeSubs.length})</h6>
              <Link 
                to="/subscriptions" 
                className="btn btn-sm btn-outline-secondary rounded-pill px-3 d-flex align-items-center gap-1 text-decoration-none"
              >
                <span>View All & Manage</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>

            <div className="table-responsive">
              <table className="modern-table align-middle">
                <thead>
                  <tr className="text-muted small text-uppercase">
                    <th className="ps-3 py-2">Service</th>
                    <th className="py-2">Cost</th>
                    <th className="py-2">Cycle</th>
                    <th className="py-2">Next Due</th>
                    <th className="py-2 text-end pe-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSubs.slice(0, 7).map(sub => (
                    <tr key={sub.id}>
                      <td className="ps-3">
                        <div className="d-flex align-items-center">
                          <Logo name={sub.Name} url={sub.URL} manualLogo={sub.ManualLogo} size={28} />
                          <div>
                            <div className="fw-semibold text-truncate" style={{ maxWidth: '160px' }}>
                              {sub.Name}
                            </div>
                            <span className="small text-muted">{sub.Category}</span>
                          </div>
                        </div>
                      </td>
                      <td className="fw-semibold">{sub.Price}</td>
                      <td>
                        <span className="badge bg-secondary-subtle text-body rounded-pill px-2 py-1 small">
                          {sub['Payment Cycle']}
                        </span>
                      </td>
                      <td className="small text-muted">{sub['Next Payment']}</td>
                      <td className="text-end pe-3">
                        <Button 
                          variant="outline-success" 
                          size="sm" 
                          className="rounded-pill px-2 py-0 small d-inline-flex align-items-center gap-1"
                          onClick={() => handleMarkPaid(sub.id)}
                          title="Advance cycle"
                        >
                          <CheckCircle size={12} />
                          <span>Paid</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Col>
      </Row>

      {/* AI Financial Insights Modal */}
      <Modal 
        show={showInsightsModal} 
        onHide={() => setShowInsightsModal(false)} 
        size="lg" 
        centered
      >
        <Modal.Header closeButton className="border-bottom">
          <div className="d-flex align-items-center gap-2">
            <div 
              className="d-flex align-items-center justify-content-center rounded-circle p-2" 
              style={{ background: 'var(--primary-gradient)', color: '#fff', width: 34, height: 34 }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <Modal.Title className="fs-5 fw-bold mb-0">Gemini AI Financial Strategist</Modal.Title>
              <div className="small text-muted">
                Analyzed via {insightsModelUsed || 'gemini-2.5-pro'}
              </div>
            </div>
          </div>
        </Modal.Header>
        <Modal.Body className="p-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {insightsLoading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <div className="mt-3 text-muted">Gemini is analyzing your subscription spending, duplicates, and savings potential...</div>
            </div>
          ) : (
            <div className="bg-body-tertiary p-3 rounded-3 border">
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0, fontSize: '0.9rem', lineHeight: 1.6 }}>
                {insightsContent}
              </pre>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="border-top px-4 py-2 d-flex justify-content-between">
          <Button 
            variant="outline-primary" 
            size="sm" 
            className="rounded-pill"
            onClick={() => { setInsightsContent(null); runAiAnalysis(); }}
            disabled={insightsLoading}
          >
            Regenerate Insights
          </Button>
          <Button variant="secondary" size="sm" className="rounded-pill px-4" onClick={() => setShowInsightsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Subscription Edit/Add Modal */}
      <SubscriptionModal
        show={modalOpen}
        onHide={() => { setModalOpen(false); setSelectedSub(null); }}
        onSave={handleSaveSubscription}
        subscription={selectedSub}
      />
    </Container>
  );
}
