import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
import axios from 'axios';
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
    Category: 'General',
    Active: 'Yes',
    Notes: '',
    remindBefore: 3, // Default to 3 days before
  });
  const [useTamilDate, setUseTamilDate] = useState(false);
  const [tamilMonth, setTamilMonth] = useState(0); // Index of TAMIL_MONTHS
  const [tamilDay, setTamilDay] = useState(1);

  useEffect(() => {
    if (reminder) {
      setFormData({
        ...reminder,
        remindBefore: typeof reminder.remindBefore === 'number' ? reminder.remindBefore : 3,
      });
      setUseTamilDate(false); 
    } else {
      setFormData({
        Name: '',
        'Next Payment': new Date().toISOString().split('T')[0],
        Category: 'General',
        Active: 'Yes',
        Notes: '',
        remindBefore: 3,
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
          });
          setFormData(prev => ({ ...prev, 'Next Payment': res.data.gregorianDate }));
        } catch (error) {
          console.error('Error converting Tamil date:', error);
          alert('Failed to convert Tamil date. Please check the date or use Gregorian.');
          setFormData(prev => ({ ...prev, 'Next Payment': new Date().toISOString().split('T')[0] }));
        }
      }
    };
    convertTamilDate();
  }, [useTamilDate, tamilMonth, tamilDay]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onHide();
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
                <Form.Control
                  required
                  type="date"
                  value={formData['Next Payment']}
                  onChange={(e) => setFormData({ ...formData, 'Next Payment': e.target.value })}
                />
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
