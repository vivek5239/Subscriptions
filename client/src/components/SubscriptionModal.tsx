import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
import type { Subscription } from '../types';
import { Logo } from './Logo';

interface SubscriptionModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (sub: Partial<Subscription>) => void;
  subscription?: Subscription | null;
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

export default function SubscriptionModal({ show, onHide, onSave, subscription }: SubscriptionModalProps) {
  const [formData, setFormData] = useState<Partial<Subscription>>({
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

  useEffect(() => {
    if (subscription) {
      setFormData({
        ...subscription,
        ManualLogo: subscription.ManualLogo || ''
      });
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
    }
  }, [subscription, show]);

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
        <Modal.Title>{subscription ? 'Edit Subscription' : 'Add New Subscription'}</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Row className="mb-3">
            <Form.Group as={Col} md={6}>
              <Form.Label>Subscription Name</Form.Label>
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
              </Form.Select>
            </Form.Group>
            <Form.Group as={Col} md={6}>
              <Form.Label>Next Payment Date</Form.Label>
              <Form.Control
                required
                type="date"
                value={formData['Next Payment']}
                onChange={(e) => setFormData({ ...formData, 'Next Payment': e.target.value })}
              />
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
            label="Active Subscription"
            checked={formData.Active === 'Yes'}
            onChange={(e) => setFormData({ ...formData, Active: e.target.checked ? 'Yes' : 'No' })}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide}>Cancel</Button>
          <Button variant="primary" type="submit">
            {subscription ? 'Save Changes' : 'Create Subscription'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
