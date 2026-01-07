import { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Card, Row, Col, ListGroup, Badge, Spinner } from 'react-bootstrap';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, parseISO, isSameDay } from 'date-fns';
import { Subscription } from '../types';
import { Logo } from '../components/Logo';

export default function CalendarView() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/subscriptions');
      setSubscriptions(res.data.subscriptions.filter((s: Subscription) => s.Active === 'Yes'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getTileContent = ({ date, view }: { date: Date, view: string }) => {
    if (view === 'month') {
      const daySubs = subscriptions.filter(sub => 
        sub['Next Payment'] && isSameDay(parseISO(sub['Next Payment']), date)
      );
      if (daySubs.length > 0) {
        return (
          <div className="d-flex justify-content-center mt-1">
            <div className="bg-primary rounded-circle" style={{ width: 6, height: 6 }}></div>
          </div>
        );
      }
    }
    return null;
  };

  const selectedDaySubs = subscriptions.filter(sub => 
    sub['Next Payment'] && isSameDay(parseISO(sub['Next Payment']), selectedDate)
  );

  if (loading) return <Spinner animation="border" className="m-5" />;

  return (
    <Container className="py-4">
      <h4 className="mb-4 fw-bold">Payment Calendar</h4>
      <Row className="g-4">
        <Col lg={7}>
          <Card className="border-0 shadow-sm p-3">
            <Calendar 
              onChange={(val) => setSelectedDate(val as Date)} 
              value={selectedDate}
              tileContent={getTileContent}
              className="w-100 border-0"
            />
          </Card>
        </Col>
        <Col lg={5}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white py-3 border-bottom-0">
              <h6 className="mb-0 fw-bold">Payments on {format(selectedDate, 'MMMM dd, yyyy')}</h6>
            </Card.Header>
            <ListGroup variant="flush">
              {selectedDaySubs.length > 0 ? (
                selectedDaySubs.map(sub => (
                  <ListGroup.Item key={sub.id} className="py-3 border-0 border-bottom">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <div className="d-flex align-items-center">
                        <Logo name={sub.Name} url={sub.URL} />
                        <span className="fw-medium">{sub.Name}</span>
                      </div>
                      <span className="fw-bold">{sub.Price}</span>
                    </div>
                    <div className="d-flex justify-content-between small text-muted">
                      <span>{sub.Category}</span>
                      <Badge bg="light" text="dark" className="border rounded-pill fw-normal">
                        {sub['Payment Cycle']}
                      </Badge>
                    </div>
                  </ListGroup.Item>
                ))
              ) : (
                <div className="p-5 text-center text-muted">
                  No payments scheduled for this day.
                </div>
              )}
            </ListGroup>
          </Card>
        </Col>
      </Row>

      <style>{`
        .react-calendar {
          width: 100% !important;
          font-family: inherit;
        }
        .react-calendar__tile--active {
          background: var(--bs-primary) !important;
          color: white !important;
          border-radius: 8px;
        }
        .react-calendar__tile--now {
          background: var(--bs-light) !important;
          border-radius: 8px;
        }
        .react-calendar__navigation button {
          font-weight: bold;
          font-size: 1.1rem;
        }
      `}</style>
    </Container>
  );
}