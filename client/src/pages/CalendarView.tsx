import { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Row, Col, Spinner, Button, Badge } from 'react-bootstrap';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, parseISO, isSameDay } from 'date-fns';
import { Calendar as CalendarIcon, CheckCircle } from 'lucide-react';
import type { Subscription } from '../types';
import { Logo } from '../components/Logo';

export default function CalendarView() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const res = await axios.get('/api/subscriptions');
      setSubscriptions(res.data.subscriptions || []);
    } catch (err) {
      console.error('[Calendar] Error fetching:', err);
    } finally {
      setLoading(false);
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

  const getTileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const daySubs = subscriptions.filter(sub => {
        if (!sub['Next Payment'] || sub.Active !== 'Yes') return false;
        try {
          return isSameDay(parseISO(sub['Next Payment']), date);
        } catch {
          return false;
        }
      });

      if (daySubs.length > 0) {
        return (
          <div className="calendar-tile-content">
            {daySubs.slice(0, 2).map(sub => (
              <div key={sub.id} className="tile-subscription-item">
                <span className="text-truncate">{sub.Name}</span>
                <span className="fw-bold">{sub.Price}</span>
              </div>
            ))}
            {daySubs.length > 2 && (
              <div className="small text-muted text-center" style={{ fontSize: '0.6rem' }}>
                +{daySubs.length - 2} more
              </div>
            )}
          </div>
        );
      }
    }
    return null;
  };

  const selectedDaySubs = subscriptions.filter(sub => {
    if (!sub['Next Payment']) return false;
    try {
      return isSameDay(parseISO(sub['Next Payment']), selectedDate);
    } catch {
      return false;
    }
  });

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <div className="mt-3 text-muted">Loading calendar...</div>
      </Container>
    );
  }

  return (
    <Container fluid="xl" className="py-4 px-3 px-sm-4">
      {/* Title */}
      <div className="mb-4">
        <h3 className="fw-bold mb-1 tracking-tight">Payment Calendar</h3>
        <p className="text-muted small mb-0">
          Monthly timeline of upcoming and scheduled recurring payments.
        </p>
      </div>

      <Row className="g-4">
        {/* Calendar Grid */}
        <Col lg={8}>
          <div className="glass-panel p-3 p-md-4">
            <Calendar 
              onChange={(val) => setSelectedDate(val as Date)} 
              value={selectedDate}
              tileContent={getTileContent}
              className="w-100"
            />
          </div>
        </Col>

        {/* Selected Date Details Panel */}
        <Col lg={4}>
          <div className="glass-panel p-4 h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex align-items-center justify-content-between border-bottom pb-3 mb-3">
                <div className="d-flex align-items-center gap-2">
                  <CalendarIcon size={18} className="text-primary" />
                  <h6 className="fw-bold mb-0">
                    {format(selectedDate, 'MMMM dd, yyyy')}
                  </h6>
                </div>
                <Badge bg="primary-subtle" className="text-primary rounded-pill">
                  {selectedDaySubs.length} due
                </Badge>
              </div>

              {selectedDaySubs.length === 0 ? (
                <div className="text-center py-5 text-muted small">
                  <p className="mb-1">No payments due on this date.</p>
                  <span className="text-secondary opacity-75">Click on a date to see scheduled payments.</span>
                </div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {selectedDaySubs.map(sub => (
                    <div 
                      key={sub.id} 
                      className="p-3 rounded-3 border bg-body-tertiary d-flex align-items-center justify-content-between shadow-sm"
                    >
                      <div className="d-flex align-items-center gap-2 text-truncate me-2">
                        <Logo name={sub.Name} url={sub.URL} manualLogo={sub.ManualLogo} size={32} />
                        <div className="text-truncate">
                          <div className="fw-semibold text-truncate">{sub.Name}</div>
                          <div className="small text-muted">{sub.Category} • {sub['Payment Cycle']}</div>
                        </div>
                      </div>

                      <div className="d-flex align-items-center gap-2">
                        <span className="fw-bold fs-6">{sub.Price}</span>
                        {sub.Active === 'Yes' && (
                          <Button
                            variant="outline-success"
                            size="sm"
                            className="p-1 rounded-circle d-flex align-items-center justify-content-center"
                            style={{ width: 24, height: 24 }}
                            title="Mark as Paid"
                            onClick={() => handleMarkPaid(sub.id)}
                          >
                            <CheckCircle size={13} />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-top text-muted small">
              Total for selected date:{' '}
              <span className="fw-bold text-body">
                ₹{selectedDaySubs.reduce((acc, s) => acc + (s.valueINR || 0), 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </Col>
      </Row>

      <style>{`
        .react-calendar__month-view__days__day {
          height: 90px !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: flex-start !important;
          justify-content: flex-start !important;
          padding: 6px !important;
          border: 1px solid var(--bs-border-color-translucent) !important;
          border-radius: 8px !important;
          margin: 1px;
        }
      `}</style>
    </Container>
  );
}
