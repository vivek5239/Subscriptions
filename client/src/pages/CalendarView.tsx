import { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Card, Row, Col, ListGroup, Spinner } from 'react-bootstrap';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, parseISO, isSameDay } from 'date-fns';
import type { Subscription } from '../types';
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
      const res = await axios.get('/api/subscriptions');
      setSubscriptions(res.data.subscriptions);
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

            <div className="calendar-tile-content">

              {daySubs.map(sub => (

                <div key={sub.id} className="tile-subscription-item">

                  <span className="tile-sub-name text-truncate">{sub.Name}</span>

                  <span className="tile-sub-price small">{sub.Price.split(' ')[0]}</span>

                </div>

              ))}

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

          <Col lg={8}>

            <Card className="border-0 shadow-sm p-3 overflow-hidden">

              <Calendar 

                onChange={(val) => setSelectedDate(val as Date)} 

                value={selectedDate}

                tileContent={getTileContent}

                className="w-100 border-0"

              />

            </Card>

          </Col>

          <Col lg={4}>

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

                          <span className="fw-medium text-truncate" style={{ maxWidth: '120px' }}>{sub.Name}</span>

                        </div>

                        <span className="fw-bold small">{sub.Price}</span>

                      </div>

                    </ListGroup.Item>

                  ))

                ) : (

                  <div className="p-4 text-center text-muted">

                    No payments scheduled.

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

            border: none !important;

          }

          .react-calendar__month-view__days__day {

            height: 100px !important;

            display: flex !important;

            flex-direction: column !important;

            align-items: flex-start !important;

            justify-content: flex-start !important;

            padding: 8px !important;

            border: 1px solid #f0f0f0 !important;

          }

          .react-calendar__tile--active {

            background: #e7f1ff !important;

            color: #0d6efd !important;

            font-weight: bold;

          }

          .react-calendar__tile--now {

            background: #fff9db !important;

          }

          .calendar-tile-content {

            width: 100%;

            overflow: hidden;

            margin-top: 4px;

          }

          .tile-subscription-item {

            background: #0d6efd;

            color: white;

            font-size: 10px;

            padding: 2px 4px;

            border-radius: 4px;

            margin-bottom: 2px;

            display: flex;

            justify-content: space-between;

            align-items: center;

            white-space: nowrap;

            overflow: hidden;

          }

          .tile-sub-name {

            flex: 1;

            margin-right: 4px;

          }

          .tile-sub-price {

            font-weight: bold;

            opacity: 0.9;

          }

          .react-calendar__navigation button {

            font-weight: bold;

            font-size: 1.1rem;

          }

          .react-calendar__month-view__weekdays {

            text-transform: uppercase;

            font-weight: bold;

            font-size: 0.75rem;

            color: #6c757d;

          }

          .react-calendar__month-view__weekdays__weekday {

            padding: 10px 0;

          }

        `}</style>

      </Container>

    );

  }

  