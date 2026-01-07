import { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import { Save, Bot, Bell, ShieldCheck } from 'lucide-react';
import axios from 'axios';

export default function SettingsView() {
  const [config, setConfig] = useState({
    groqApiKey: '',
    gotifyUrl: '',
    gotifyToken: '',
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPass: '',
    smtpFrom: '',
    testRecipient: '',
    mainCurrency: 'INR'
  });
  const [status, setStatus] = useState<{ type: 'success' | 'danger', msg: string } | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/settings');
      if (res.data) setConfig({ ...config, ...res.data });
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/settings', config);
      localStorage.setItem('sub_app_config', JSON.stringify(config));
      setStatus({ type: 'success', msg: 'Settings saved successfully!' });
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus({ type: 'danger', msg: 'Failed to save settings.' });
    }
  };

  const testGotify = async () => {
    if (!config.gotifyUrl || !config.gotifyToken) return alert('Please save Gotify settings first.');
    setTesting('gotify');
    try {
      await axios.post('http://localhost:5000/api/test/gotify', config);
      alert('Test notification sent successfully!');
    } catch (err: any) {
      alert('Gotify test failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setTesting(null);
    }
  };

  const testEmail = async () => {
    if (!config.smtpHost || !config.smtpUser) return alert('Please save SMTP settings first.');
    setTesting('email');
    try {
      await axios.post('http://localhost:5000/api/test/email', config);
      alert('Test email sent successfully!');
    } catch (err: any) {
      alert('Email test failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setTesting(null);
    }
  };

  return (
    <Container className="py-4">
      <h4 className="mb-4 fw-bold">Settings</h4>
      
      {status && <Alert variant={status.type} className="border-0 shadow-sm">{status.msg}</Alert>}

      <Form onSubmit={handleSave}>
        {/* Groq AI Settings */}
        <Card className="border-0 shadow-sm mb-4">
          <Card.Header className="bg-white py-3 border-bottom-0 d-flex align-items-center gap-2">
            <Bot className="text-primary" size={20} />
            <h6 className="mb-0 fw-bold">Groq AI</h6>
          </Card.Header>
          <Card.Body>
            <Form.Group className="mb-3">
              <Form.Label>API Key</Form.Label>
              <Form.Control 
                type="password" 
                placeholder="Enter your Groq API Key"
                value={config.groqApiKey}
                onChange={(e) => setConfig({...config, groqApiKey: e.target.value})}
              />
              <Form.Text className="text-muted">
                Used for generating subscription insights and cost-cutting tips with <strong>llama-3.3-70b-versatile</strong>.
              </Form.Text>
            </Form.Group>
          </Card.Body>
        </Card>

        {/* Gotify Settings */}
        <Card className="border-0 shadow-sm mb-4">
          <Card.Header className="bg-white py-3 border-bottom-0 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <Bell className="text-warning" size={20} />
              <h6 className="mb-0 fw-bold">Notifications (Gotify)</h6>
            </div>
            <Button 
              variant="outline-warning" 
              size="sm" 
              onClick={testGotify} 
              disabled={!!testing}
            >
              {testing === 'gotify' ? 'Testing...' : 'Test Gotify'}
            </Button>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={8}>
                <Form.Group className="mb-3">
                  <Form.Label>Gotify Server URL</Form.Label>
                  <Form.Control 
                    type="url" 
                    placeholder="https://gotify.example.com"
                    value={config.gotifyUrl}
                    onChange={(e) => setConfig({...config, gotifyUrl: e.target.value})}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>App Token</Form.Label>
                  <Form.Control 
                    type="password" 
                    placeholder="Enter Token"
                    value={config.gotifyToken}
                    onChange={(e) => setConfig({...config, gotifyToken: e.target.value})}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Email Settings */}
        <Card className="border-0 shadow-sm mb-4">
          <Card.Header className="bg-white py-3 border-bottom-0 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <Bell className="text-danger" size={20} />
              <h6 className="mb-0 fw-bold">Email Notifications (SMTP)</h6>
            </div>
            <Button 
              variant="outline-danger" 
              size="sm" 
              onClick={testEmail} 
              disabled={!!testing}
            >
              {testing === 'email' ? 'Testing...' : 'Test Email'}
            </Button>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={8}>
                <Form.Group className="mb-3">
                  <Form.Label>SMTP Host</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="smtp.gmail.com"
                    value={config.smtpHost}
                    onChange={(e) => setConfig({...config, smtpHost: e.target.value})}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Port</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="587"
                    value={config.smtpPort}
                    onChange={(e) => setConfig({...config, smtpPort: e.target.value})}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Username / Email</Form.Label>
                  <Form.Control 
                    type="email" 
                    placeholder="user@example.com"
                    value={config.smtpUser}
                    onChange={(e) => setConfig({...config, smtpUser: e.target.value})}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Password / App Password</Form.Label>
                  <Form.Control 
                    type="password" 
                    placeholder="Enter Password"
                    value={config.smtpPass}
                    onChange={(e) => setConfig({...config, smtpPass: e.target.value})}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>From Address (Optional)</Form.Label>
                  <Form.Control 
                    type="email" 
                    placeholder="no-reply@example.com"
                    value={config.smtpFrom}
                    onChange={(e) => setConfig({...config, smtpFrom: e.target.value})}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Test Recipient Email (e.g. your Outlook ID)</Form.Label>
                  <Form.Control 
                    type="email" 
                    placeholder="recipient@outlook.com"
                    value={config.testRecipient}
                    onChange={(e) => setConfig({...config, testRecipient: e.target.value})}
                  />
                  <Form.Text className="text-muted">
                    Test emails will be sent here instead of your SMTP username.
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* General Settings */}
        <Card className="border-0 shadow-sm mb-4">
          <Card.Header className="bg-white py-3 border-bottom-0 d-flex align-items-center gap-2">
            <ShieldCheck className="text-success" size={20} />
            <h6 className="mb-0 fw-bold">General Configuration</h6>
          </Card.Header>
          <Card.Body>
            <Form.Group className="mb-3">
              <Form.Label>Main Currency</Form.Label>
              <Form.Select 
                value={config.mainCurrency}
                onChange={(e) => setConfig({...config, mainCurrency: e.target.value})}
                style={{ width: '200px' }}
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </Form.Select>
              <Form.Text className="text-muted">
                All statistics and Dashboard KPIs will be displayed in this currency.
              </Form.Text>
            </Form.Group>
          </Card.Body>
        </Card>

        <div className="d-flex justify-content-end">
          <Button variant="primary" type="submit" className="d-flex align-items-center gap-2 px-4 rounded-pill">
            <Save size={18} /> Save Settings
          </Button>
        </div>
      </Form>
    </Container>
  );
}