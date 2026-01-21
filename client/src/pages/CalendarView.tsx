import { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Card, Row, Col, ListGroup, Spinner } from 'react-bootstrap';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, parseISO, isSameDay } from 'date-fns';
import type { Reminder } from '../types';

export default function CalendarView() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get('/api/reminders');
      setReminders(res.data.reminders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

    const getTileContent = ({ date, view }: { date: Date, view: string }) => {

      if (view === 'month') {

        const daySubs = reminders.filter(rem => 

          rem['Next Payment'] && isSameDay(parseISO(rem['Next Payment']), date)

        );

        if (daySubs.length > 0) {

          return (

            <div className="calendar-tile-content">

              {daySubs.map(rem => (

                <div key={rem.id} className="tile-reminder-item">

                  <span className="tile-rem-name text-truncate">{rem.Name}</span>

                </div>

              ))}

            </div>

          );

        }

      }

      return null;

    };

  
    const selectedDaySubs = reminders.filter(rem => 

      rem['Next Payment'] && isSameDay(parseISO(rem['Next Payment']), selectedDate)

    );

  
    if (loading) return <Spinner animation="border" className="m-5" />;

  
    return (
      <Container className="py-4">
        <h4 className="mb-4 fw-bold">Reminder Calendar</h4>
        <Row className="g-4">
          <Col lg={8}>
            <Card className="shadow-sm p-3 overflow-hidden">
              <Calendar 
                onChange={(val) => setSelectedDate(val as Date)} 
                value={selectedDate}
                tileContent={getTileContent}
                className="w-100 border-0"
              />
            </Card>
          </Col>
          <Col lg={4}>
            <Card className="shadow-sm h-100">
              <Card.Header className="bg-transparent py-3 border-bottom-0">
                <h6 className="mb-0 fw-bold">Reminders on {format(selectedDate, 'MMMM dd, yyyy')}</h6>
              </Card.Header>
              <ListGroup variant="flush">
                {selectedDaySubs.length > 0 ? (
                  selectedDaySubs.map(rem => (
                    <ListGroup.Item key={rem.id} className="py-3 bg-transparent border-0 border-bottom">
                      <div className="d-flex flex-column align-items-start">
                        <span className="fw-medium fs-5 text-primary mb-1">{rem.Name}</span>
                        <small className="text-muted mb-1">
                          <strong>Date:</strong> {format(parseISO(rem['Next Payment']), 'MMM dd, yyyy')}
                        </small>
                        <small className="text-muted mb-1">
                          <strong>Category:</strong> {rem.Category}
                        </small>
                        {rem.Notes && (
                          <small className="text-muted">
                            <strong>Notes:</strong> {rem.Notes}
                          </small>
                        )}
                      </div>
                    </ListGroup.Item>
                  ))
                ) : (
                  <div className="p-4 text-center text-muted">
                    No reminders scheduled for this date.
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
            background: transparent !important;
          }
          .react-calendar__month-view__days__day {
            height: 100px !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            justify-content: flex-start !important;
            padding: 8px !important;
            border: 1px solid var(--bs-border-color-translucent) !important;
          }
          .react-calendar__tile--active {
            background: var(--bs-primary-bg-remtle) !important;
            color: var(--bs-primary-text-emphasis) !important;
            font-weight: bold;
          }
          .react-calendar__tile--now {
            background: var(--bs-warning-bg-remtle) !important;
          }
          .calendar-tile-content {
            width: 100%;
            overflow: hidden;
            margin-top: 4px;
          }
          .tile-reminder-item {
            background: var(--bs-primary);
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
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          }
          .tile-rem-name {
            flex: 1;
            margin-right: 4px;
          }
          .react-calendar__navigation button {
            font-weight: bold;
            font-size: 1.1rem;
            color: var(--bs-body-color);
          }
          .react-calendar__month-view__weekdays {
            text-transform: uppercase;
            font-weight: bold;
            font-size: 0.75rem;
            color: var(--bs-secondary-color);
          }
          .react-calendar__month-view__weekdays__weekday {
            padding: 10px 0;
          }
          .react-calendar__tile:disabled {
            background-color: var(--bs-tertiary-bg) !important;
            opacity: 0.5;
          }
          [data-bs-theme='dark'] .react-calendar__tile:enabled:hover,
          [data-bs-theme='dark'] .react-calendar__tile:enabled:focus {
            background-color: var(--bs-tertiary-bg) !important;
          }
        `}</style>
      </Container>
    );

  }

  