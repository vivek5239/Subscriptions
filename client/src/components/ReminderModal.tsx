import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Stack, Spinner } from 'react-bootstrap';
import { Calendar } from 'lucide-react';
import axios from 'axios';
import { addYears, format } from 'date-fns';
import type { Reminder } from '../types';

interface ReminderModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (rem: Partial<Reminder>) => void;
  reminder?: Reminder | null;
}

const CATEGORIES = [
  'General',
  'Work',
  'Personal',
  'Health',
  'Finance',
  'Appointments',
  'Study',
  'Travel',
  'Shopping',
  'Other'
];

const TAMIL_MONTHS = [
  { name: 'Chithirai', days: 31 }, { name: 'Vaikasi', days: 31 },
  { name: 'Aani', days: 32 }, { name: 'Aadi', days: 31 },
  { name: 'Avani', days: 31 }, { name: 'Purattasi', days: 31 },
  { name: 'Aippasi', days: 30 }, { name: 'Karthigai', days: 29 },
  { name: 'Margazhi', days: 29 }, { name: 'Thai', days: 30 },
  { name: 'Maasi', days: 30 }, { name: 'Panguni', days: 30 }
];

export default function ReminderModal({ show, onHide, onSave, reminder }: ReminderModalProps) {
  const [formData, setFormData] = useState<Partial<Reminder>>({
    Name: '',
    'Next Payment': new Date().toISOString().split('T')[0],
    Time: '09:00', // Default to 9 AM
    Category: 'General',
    Active: 'Yes',
    Notes: '',
    remindBefore: 3, // Default to 3 days before
    Repeat: 'One-Time', // Default to One-Time
  });
  const [useTamilDate, setUseTamilDate] = useState(false);
  const [tamilMonth, setTamilMonth] = useState(0); // Index of TAMIL_MONTHS
  const [tamilDay, setTamilDay] = useState(1);
  const [fetchingNextHolidayDate, setFetchingNextHolidayDate] = useState(false); // For holiday date button
  
  useEffect(() => {    if (reminder) {
      setFormData({
        ...reminder,
        remindBefore: typeof reminder.remindBefore === 'number' ? reminder.remindBefore : 3,
        Repeat: reminder.Repeat || 'One-Time', // Set existing repeat or default
        Time: reminder.Time || '09:00', // Set existing time or default
      });
      // If editing a reminder with Tamil date info, set the switch and values
      if (reminder.tamilMonthIndex !== undefined && reminder.tamilDay !== undefined) {
        setUseTamilDate(true);
        setTamilMonth(reminder.tamilMonthIndex);
        setTamilDay(reminder.tamilDay);
      } else {
        setUseTamilDate(false); 
      }
    } else {
      // For new reminders
      setFormData({
        Name: '',
        'Next Payment': new Date().toISOString().split('T')[0],
        Time: '09:00',
        Category: 'General',
        Active: 'Yes',
        Notes: '',
        remindBefore: 3,
        Repeat: 'One-Time',
      });
      setUseTamilDate(false);
      setTamilMonth(0);
      setTamilDay(1);
    }
  }, [reminder, show]);

  useEffect(() => {
    const convertTamilDate = async () => {
      if (useTamilDate) {
        try {
          const res = await axios.post('/api/convert-tamil-date', {
            tamilMonthIndex: tamilMonth,
            tamilDay: tamilDay,
            currentGregorianDate: formData['Next Payment'] // Pass current Gregorian date from form for better year inference
          });
          setFormData(prev => ({ ...prev, 'Next Payment': res.data.gregorianDate, tamilMonthIndex: tamilMonth, tamilDay: tamilDay }));
        } catch (error) {
          console.error('Error converting Tamil date:', error);
          alert('Failed to convert Tamil date. Please check the date or use Gregorian.');
          setFormData(prev => ({ ...prev, 'Next Payment': new Date().toISOString().split('T')[0], tamilMonthIndex: undefined, tamilDay: undefined }));
          setUseTamilDate(false); // Switch back to Gregorian if conversion fails
        }
      } else {
        // If switching back to Gregorian, clear tamil date fields from formData
        setFormData(prev => {
          const newState = { ...prev };
          delete newState.tamilMonthIndex;
          delete newState.tamilDay;
          return newState;
        });
      }
    };
    convertTamilDate();
  }, [useTamilDate, tamilMonth, tamilDay, formData['Next Payment']]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onHide();
    };
    
const onFetchNextHolidayDate = async () => {
  if (!formData.HolidayType || formData.Repeat !== 'Yearly') return;
  setFetchingNextHolidayDate(true);
  try {
    if (formData.Source === 'API') { // Only use API for 'API' sourced holiday reminders
      const currentYear = new Date(formData['Next Payment'] || new Date()).getFullYear();
      const nextYear = currentYear + 1;
      const res = await axios.get('/api/holiday-date', {
        params: {
          holidayName: formData.HolidayType,
          year: nextYear,
        },
      });
      if (res.data.date) {
        setFormData(prev => ({ ...prev, 'Next Payment': res.data.date }));
        alert(`Fetched next ${formData.HolidayType} date: ${res.data.date}`);
      } else {
        alert(`Could not find next ${formData.HolidayType} date for ${nextYear}.`);
      }
    } else { // For AI, Manual, or unspecified source, just add a year
      const currentNextPayment = new Date(formData['Next Payment'] || new Date());
      const nextYearDate = addYears(currentNextPayment, 1);
      const formattedNextYearDate = format(nextYearDate, 'yyyy-MM-dd');
      setFormData(prev => ({ ...prev, 'Next Payment': formattedNextYearDate }));
      alert(`Updated 'Next Payment' to ${formattedNextYearDate} for next year.`);
    }
  } catch (error: any) {
    console.error('Error fetching/calculating next holiday date:', error);
    alert(`Failed to update next holiday date: ${error.response?.data?.error || error.message}`);
  } finally {
    setFetchingNextHolidayDate(false);
  }
};
  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>{reminder ? 'Edit Reminder' : 'Add New Reminder'}</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Row className="mb-3">
            <Form.Group as={Col} md={12}>
              <Form.Label>Reminder Name</Form.Label>
              <Form.Control
                required
                type="text"
                placeholder="e.g. Call Mom"
                value={formData.Name}
                onChange={(e) => setFormData({ ...formData, Name: e.target.value })}
              />
            </Form.Group>
          </Row>
          {formData.HolidayType && (
            <Row className="mb-3">
              <Form.Group as={Col} md={12}>
                <Form.Label>Holiday Type</Form.Label>
                <Form.Control
                  readOnly
                  type="text"
                  value={formData.HolidayType}
                  className="bg-body-secondary"
                />
              </Form.Group>
            </Row>
          )}
            <Row className="mb-3">
              <Form.Group as={Col} md={12}>
                <Form.Label>Source</Form.Label>
                <Form.Select
                  value={formData.Source || 'Manual'} // Default to 'Manual' if not set
                  onChange={(e) => setFormData({ ...formData, Source: e.target.value as 'API' | 'AI' | 'Manual' })}
                >
                  <option value="Manual">Manual</option>
                  <option value="AI">AI</option>
                  <option value="API">API</option>
                </Form.Select>
              </Form.Group>
            </Row>

          <Row className="mb-3">
            <Form.Group as={Col} md={6}>
              <Form.Label className="d-flex justify-content-between align-items-center">
                Next Reminder Date
                <Form.Check 
                  type="switch"
                  id="custom-switch"
                  label="Tamil Date"
                  checked={useTamilDate}
                  onChange={(e) => setUseTamilDate(e.target.checked)}
                />
              </Form.Label>
              {useTamilDate ? (
                <Row>
                  <Col>
                    <Form.Select
                      value={tamilMonth}
                      onChange={(e) => setTamilMonth(parseInt(e.target.value))}
                    >
                      {TAMIL_MONTHS.map((month, index) => (
                        <option key={month.name} value={index}>{month.name}</option>
                      ))}
                    </Form.Select>
                  </Col>
                  <Col>
                    <Form.Select
                      value={tamilDay}
                      onChange={(e) => setTamilDay(parseInt(e.target.value))}
                    >
                      {Array.from({ length: TAMIL_MONTHS[tamilMonth].days }, (_, i) => i + 1).map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </Form.Select>
                  </Col>
                </Row>
              ) : (
                <Stack direction="horizontal" gap={2}>
                  <Form.Control
                    required
                    type="date"
                    value={formData['Next Payment']}
                    onChange={(e) => setFormData({ ...formData, 'Next Payment': e.target.value })}
                  />
                  {formData.HolidayType && formData.Repeat === 'Yearly' && (
                    <Button 
                      variant="outline-secondary" 
                      size="sm"
                      onClick={onFetchNextHolidayDate}
                      disabled={fetchingNextHolidayDate}
                      title="Fetch next year's holiday date"
                    >
                      {fetchingNextHolidayDate ? <Spinner size="sm" animation="border" /> : <Calendar size={16} />}
                    </Button>
                  )}
                </Stack>
              )}
            </Form.Group>
            <Form.Group as={Col} md={6}>
              <Form.Label>Category</Form.Label>
              <Form.Select
                value={formData.Category}
                onChange={(e) => setFormData({ ...formData, Category: e.target.value })}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Row>

          <Row className="mb-3">
            <Form.Group as={Col} md={6}>
              <Form.Label>Time</Form.Label>
              <Form.Control
                type="time"
                value={formData.Time}
                onChange={(e) => setFormData({ ...formData, Time: e.target.value })}
              />
            </Form.Group>
          </Row>

          <Row className="mb-3">
            <Form.Group as={Col} md={6}>
              <Form.Label>Remind Me Before</Form.Label>
              <Form.Select
                value={formData.remindBefore}
                onChange={(e) => setFormData({ ...formData, remindBefore: parseInt(e.target.value) })}
              >
                <option value={0}>On the day</option>
                <option value={1}>1 day before</option>
                <option value={2}>2 days before</option>
                <option value={3}>3 days before</option>
                <option value={7}>7 days before</option>
              </Form.Select>
            </Form.Group>
            <Form.Group as={Col} md={6}>
              <Form.Label>Repeat</Form.Label>
              <Form.Select
                value={formData.Repeat}
                onChange={(e) => setFormData({ ...formData, Repeat: e.target.value as 'One-Time' | 'Daily' | 'Weekly' | 'Monthly' | 'Yearly' })}
              >
                <option value="One-Time">One-Time</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly</option>
              </Form.Select>
            </Form.Group>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Notes</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={formData.Notes}
              onChange={(e) => setFormData({ ...formData, Notes: e.target.value })}
            />
          </Form.Group>

          <Form.Check 
            type="switch"
            label="Active Reminder"
            checked={formData.Active === 'Yes'}
            onChange={(e) => setFormData({ ...formData, Active: e.target.checked ? 'Yes' : 'No' })}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide}>Cancel</Button>
          <Button variant="primary" type="submit">
            {reminder ? 'Save Changes' : 'Create Reminder'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
