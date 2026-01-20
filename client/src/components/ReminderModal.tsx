import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
import axios from 'axios';
import type { Reminder } from '../types';
import { Logo } from './Logo';

interface ReminderModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (rem: Partial<Reminder>) => void;
  reminder?: Reminder | null;
}

const CATEGORIES = [
  'Entertainment',
  'Utilities',
  'Productivity',
  'Shopping',
  'Health & Fitness',
  'Food & Drink',
  'Education',
  'Transportation',
  'Housing',
  'Insurance',
  'Other'
];

const PAYMENT_METHODS = [
  'Credit Card',
  'Debit Card',
  'Direct Debit',
  'PayPal',
  'UPI',
  'Net Banking',
  'Cash',
  'Apple Pay',
  'Google Pay',
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
    Price: '',
    'Payment Cycle': 'Monthly',
    'Next Payment': new Date().toISOString().split('T')[0],
    Category: 'Utilities',
    Active: 'Yes',
    Renewal: 'Automatic',
    'Payment Method': 'Credit Card',
    Notes: '',
    URL: '',
    ManualLogo: ''
  });
  const [useTamilDate, setUseTamilDate] = useState(false);
  const [tamilMonth, setTamilMonth] = useState(0); // Index of TAMIL_MONTHS
  const [tamilDay, setTamilDay] = useState(1);

  useEffect(() => {
    if (reminder) {
      setFormData({
        ...reminder,
        ManualLogo: reminder.ManualLogo || ''
      });
      // Assuming 'Next Payment' is always Gregorian, if we ever stored Tamil dates
      // we'd need conversion logic here to set tamilMonth/tamilDay correctly.
      setUseTamilDate(false); // Default to English date view for existing reminders
    } else {
      setFormData({
        Name: '',
        Price: '',
        'Payment Cycle': 'Monthly',
        'Next Payment': new Date().toISOString().split('T')[0],
        Category: 'Utilities',
        Active: 'Yes',
        Renewal: 'Automatic',
        'Payment Method': 'Credit Card',
        Notes: '',
        URL: '',
        ManualLogo: ''
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


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, ManualLogo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

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
            <Form.Group as={Col} md={6}>
              <Form.Label>Reminder Name</Form.Label>
              <div className="d-flex align-items-center gap-2">
                {formData.Name && (
                  <Logo 
                    name={formData.Name} 
                    url={formData.URL} 
                    manualLogo={formData.ManualLogo} 
                    size={38} 
                  />
                )}
                <Form.Control
                  required
                  type="text"
                  placeholder="e.g. Netflix"
                  value={formData.Name}
                  onChange={(e) => setFormData({ ...formData, Name: e.target.value })}
                />
              </div>
            </Form.Group>
            <Form.Group as={Col} md={6}>
              <Form.Label>Price (with currency)</Form.Label>
              <Form.Control
                required
                type="text"
                placeholder="e.g. ₹499 or $9.99"
                value={formData.Price}
                onChange={(e) => setFormData({ ...formData, Price: e.target.value })}
              />
            </Form.Group>
          </Row>

          <Row className="mb-3">
            <Form.Group as={Col} md={6}>
              <Form.Label>Payment Cycle</Form.Label>
              <Form.Select
                value={formData['Payment Cycle']}
                onChange={(e) => setFormData({ ...formData, 'Payment Cycle': e.target.value })}
              >
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="One-time">One-time</option>
              </Form.Select>
            </Form.Group>
            <Form.Group as={Col} md={6}>
              <Form.Label className="d-flex justify-content-between align-items-center">
                Next Payment Date
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
          </Row>

          <Row className="mb-3">
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
            <Form.Group as={Col} md={6}>
              <Form.Label>Payment Method</Form.Label>
              <Form.Select
                value={formData['Payment Method']}
                onChange={(e) => setFormData({ ...formData, 'Payment Method': e.target.value })}
              >
                {PAYMENT_METHODS.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Row>

          <Row className="mb-3">
            <Form.Group as={Col} md={6}>
              <Form.Label>Website URL (for Auto Logo)</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. netflix.com"
                value={formData.URL}
                onChange={(e) => setFormData({ ...formData, URL: e.target.value })}
              />
            </Form.Group>
            <Form.Group as={Col} md={6}>
              <Form.Label>Manual Logo URL (Optional)</Form.Label>
              <Form.Control
                type="text"
                placeholder="https://example.com/logo.png"
                value={formData.ManualLogo}
                onChange={(e) => setFormData({ ...formData, ManualLogo: e.target.value })}
              />
            </Form.Group>
          </Row>

          <Row className="mb-3">
            <Form.Group as={Col} md={12}>
              <Form.Label>Or Upload Logo Image</Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
              <Form.Text className="text-muted">
                If provided, the manual logo (URL or Upload) will override the automatic one.
              </Form.Text>
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
