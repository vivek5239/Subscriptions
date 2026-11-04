import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Spinner, InputGroup, Alert, Dropdown } from 'react-bootstrap';
import { Sparkles, CreditCard } from 'lucide-react';
import axios from 'axios';
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
  'Health & Fitness',
  'Housing',
  'Insurance',
  'Shopping',
  'Food & Drink',
  'Transportation',
  'Education',
  'Finance',
  'Other'
];

const PAYMENT_METHODS = [
  'Credit Card',
  'Debit Card',
  'Direct Debit',
  'UPI',
  'PayPal',
  'Bank Transfer',
  'Apple Pay',
  'Google Pay',
  'Cash',
  'Other'
];

const CYCLES = [
  'Monthly',
  'Quarterly',
  'Every 6 Months',
  'Yearly',
  'Weekly',
  'Bi-Weekly',
  'One-Time'
];

const CURRENCIES = ['₹', '$', '£', '€'];

export default function SubscriptionModal({ show, onHide, onSave, subscription }: SubscriptionModalProps) {
  const [formData, setFormData] = useState<Partial<Subscription>>({
    Name: '',
    Price: '₹',
    'Payment Cycle': 'Monthly',
    'Next Payment': new Date().toISOString().split('T')[0],
    Category: 'Entertainment',
    Active: 'Yes',
    Renewal: 'Automatic',
    'Payment Method': 'Credit Card',
    PaidBy: '',
    Notes: '',
    URL: '',
    ManualLogo: ''
  });

  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiBar, setShowAiBar] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (subscription) {
      setFormData({
        ...subscription,
        ManualLogo: subscription.ManualLogo || ''
      });
    } else {
      setFormData({
        Name: '',
        Price: '₹',
        'Payment Cycle': 'Monthly',
        'Next Payment': new Date().toISOString().split('T')[0],
        Category: 'Entertainment',
        Active: 'Yes',
        Renewal: 'Automatic',
        'Payment Method': 'Credit Card',
        PaidBy: '',
        Notes: '',
        URL: '',
        ManualLogo: ''
      });
    }
    setShowAiBar(false);
    setAiError(null);
  }, [subscription, show]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, ManualLogo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAiParse = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError(null);

    try {
      const res = await axios.post('/api/ai/create-subscription', { text: aiPrompt });
      if (res.data?.subscription) {
        setFormData(prev => ({
          ...prev,
          ...res.data.subscription
        }));
        setShowAiBar(false);
        setAiPrompt('');
      }
    } catch (err: any) {
      setAiError(err.response?.data?.error || err.message || 'Gemini AI parsing failed.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.Name?.trim()) {
      alert('Subscription Name is required.');
      return;
    }
    onSave(formData);
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered backdrop="static">
      <Modal.Header closeButton className="border-bottom">
        <div className="d-flex align-items-center gap-2">
          {formData.Name ? (
            <Logo name={formData.Name} url={formData.URL} manualLogo={formData.ManualLogo} size={32} />
          ) : (
            <div 
              className="d-flex align-items-center justify-content-center rounded-circle p-2" 
              style={{ background: 'var(--primary-gradient)', color: '#fff', width: 34, height: 34 }}
            >
              <CreditCard size={18} />
            </div>
          )}
          <div>
            <Modal.Title className="fs-5 fw-bold mb-0">
              {subscription?.id ? 'Edit Subscription' : 'Add New Subscription'}
            </Modal.Title>
            <div className="small text-muted" style={{ fontSize: '0.75rem' }}>
              {subscription?.id ? `ID: ${subscription.id.substring(0, 8)}...` : 'Track payment cycles, costs, and renewal dates'}
            </div>
          </div>
        </div>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body className="p-4">
          {/* AI Autofill Banner Toggle */}
          {!subscription?.id && (
            <div className="mb-4">
              {!showAiBar ? (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary d-flex align-items-center gap-2 rounded-pill px-3 py-1 shadow-sm"
                  onClick={() => setShowAiBar(true)}
                >
                  <Sparkles size={14} />
                  <span>✨ Autofill Details with Gemini AI</span>
                </button>
              ) : (
                <div className="p-3 rounded-3 border bg-body-tertiary shadow-sm">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div className="d-flex align-items-center gap-2 small fw-bold text-primary">
                      <Sparkles size={14} />
                      <span>Gemini Natural Language Autofill</span>
                    </div>
                    <button 
                      type="button" 
                      className="btn-close" 
                      style={{ fontSize: '0.7rem' }} 
                      onClick={() => setShowAiBar(false)} 
                    />
                  </div>
                  <InputGroup size="sm">
                    <Form.Control
                      placeholder="e.g. Netflix Premium ₹649 monthly on 15th via Credit Card"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAiParse(); } }}
                      disabled={aiLoading}
                    />
                    <Button 
                      variant="primary" 
                      onClick={handleAiParse}
                      disabled={aiLoading || !aiPrompt.trim()}
                    >
                      {aiLoading ? <Spinner size="sm" animation="border" /> : 'Autofill'}
                    </Button>
                  </InputGroup>
                  {aiError && (
                    <Alert variant="danger" className="mt-2 py-1 px-2 small mb-0">
                      {aiError}
                    </Alert>
                  )}
                </div>
              )}
            </div>
          )}

          <Row className="g-3">
            {/* Service Name */}
            <Col md={7}>
              <Form.Group>
                <Form.Label className="small fw-semibold text-muted text-uppercase">Subscription Name *</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g., Netflix, GitHub, Broadband"
                  value={formData.Name || ''}
                  onChange={(e) => setFormData({ ...formData, Name: e.target.value })}
                  required
                />
              </Form.Group>
            </Col>

            {/* Price with Currency */}
            <Col md={5}>
              <Form.Group>
                <Form.Label className="small fw-semibold text-muted text-uppercase">Price / Bill Amount *</Form.Label>
                <InputGroup>
                  <Dropdown>
                    <Dropdown.Toggle variant="outline-secondary" id="dropdown-currency" style={{ fontSize: '0.9rem' }}>
                      {CURRENCIES.find(c => formData.Price?.startsWith(c)) || '₹'}
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      {CURRENCIES.map(curr => (
                        <Dropdown.Item 
                          key={curr} 
                          onClick={() => {
                            const raw = (formData.Price || '').replace(/^[^\d.]+/, '');
                            setFormData({ ...formData, Price: `${curr}${raw}` });
                          }}
                        >
                          {curr}
                        </Dropdown.Item>
                      ))}
                    </Dropdown.Menu>
                  </Dropdown>
                  <Form.Control
                    type="text"
                    placeholder="e.g., ₹649 or $14.99"
                    value={formData.Price || ''}
                    onChange={(e) => setFormData({ ...formData, Price: e.target.value })}
                    required
                  />
                </InputGroup>
              </Form.Group>
            </Col>

            {/* Payment Cycle */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold text-muted text-uppercase">Payment Cycle</Form.Label>
                <Form.Select
                  value={formData['Payment Cycle'] || 'Monthly'}
                  onChange={(e) => setFormData({ ...formData, 'Payment Cycle': e.target.value })}
                >
                  {CYCLES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Next Payment Date */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold text-muted text-uppercase">Next Payment Date *</Form.Label>
                <Form.Control
                  type="date"
                  value={formData['Next Payment'] || ''}
                  onChange={(e) => setFormData({ ...formData, 'Next Payment': e.target.value })}
                  required
                />
              </Form.Group>
            </Col>

            {/* Category */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold text-muted text-uppercase">Category</Form.Label>
                <Form.Select
                  value={formData.Category || 'Entertainment'}
                  onChange={(e) => setFormData({ ...formData, Category: e.target.value })}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Payment Method */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold text-muted text-uppercase">Payment Method</Form.Label>
                <Form.Select
                  value={formData['Payment Method'] || 'Credit Card'}
                  onChange={(e) => setFormData({ ...formData, 'Payment Method': e.target.value })}
                >
                  {PAYMENT_METHODS.map(pm => (
                    <option key={pm} value={pm}>{pm}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            {/* URL / Website */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold text-muted text-uppercase">Website / URL</Form.Label>
                <Form.Control
                  type="url"
                  placeholder="https://service.com"
                  value={formData.URL || ''}
                  onChange={(e) => setFormData({ ...formData, URL: e.target.value })}
                />
              </Form.Group>
            </Col>

            {/* Paid By */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold text-muted text-uppercase">Paid By (Optional)</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g., Vivek, Shared, Work"
                  value={formData.PaidBy || ''}
                  onChange={(e) => setFormData({ ...formData, PaidBy: e.target.value })}
                />
              </Form.Group>
            </Col>

            {/* Custom Logo Upload */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold text-muted text-uppercase">Custom Logo (File)</Form.Label>
                <Form.Control
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </Form.Group>
            </Col>

            {/* Active Status & Renewal */}
            <Col md={6}>
              <Form.Label className="small fw-semibold text-muted text-uppercase">Status & Renewal</Form.Label>
              <div className="d-flex align-items-center gap-4 mt-1">
                <Form.Check
                  type="switch"
                  id="active-switch"
                  label={formData.Active === 'Yes' ? 'Active Subscription' : 'Inactive'}
                  checked={formData.Active === 'Yes'}
                  onChange={(e) => setFormData({ ...formData, Active: e.target.checked ? 'Yes' : 'No' })}
                />
                <Form.Check
                  type="checkbox"
                  id="auto-renewal-check"
                  label="Auto Renewal"
                  checked={formData.Renewal === 'Automatic'}
                  onChange={(e) => setFormData({ ...formData, Renewal: e.target.checked ? 'Automatic' : 'Manual' })}
                />
              </div>
            </Col>

            {/* Notes */}
            <Col md={12}>
              <Form.Group>
                <Form.Label className="small fw-semibold text-muted text-uppercase">Notes & Account Details</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="Additional plan notes, account number, or cancellation terms..."
                  value={formData.Notes || ''}
                  onChange={(e) => setFormData({ ...formData, Notes: e.target.value })}
                />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>

        <Modal.Footer className="border-top px-4 py-3">
          <Button variant="outline-secondary" className="rounded-pill px-4" onClick={onHide}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" className="rounded-pill px-4 shadow-sm">
            {subscription?.id ? 'Save Changes' : 'Create Subscription'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
