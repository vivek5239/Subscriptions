import { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import { Save, Bot, Bell, ShieldCheck } from 'lucide-react';

export default function SettingsView() {
  const [config, setConfig] = useState({
    geminiApiKey: '',
    gotifyUrl: '',
    gotifyToken: '',
    mainCurrency: 'INR'
  });
  const [status, setStatus] = useState<{ type: 'success' | 'danger', msg: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/settings');
      if (res.data.geminiApiKey) setConfig(res.data);
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/settings', config);
      localStorage.setItem('sub_app_config', JSON.stringify(config)); // Keep in local for UI sync
      setStatus({ type: 'success', msg: 'Settings saved successfully!' });
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus({ type: 'danger', msg: 'Failed to save settings.' });
    }
  };

  return (
    <Container className="py-4">
      <h4 className="mb-4 fw-bold">Settings</h4>
      
      {status && <Alert variant={status.type} className="border-0 shadow-sm">{status.msg}</Alert>}

      <Form onSubmit={handleSave}>
        {/* Google AI Settings */}
        <Card className="border-0 shadow-sm mb-4">
          <Card.Header className="bg-white py-3 border-bottom-0 d-flex align-items-center gap-2">
            <Bot className="text-primary" size={20} />
            <h6 className="mb-0 fw-bold">Google Gemini AI</h6>
          </Card.Header>
          <Card.Body>
            <Form.Group className="mb-3">
              <Form.Label>API Key</Form.Label>
              <Form.Control 
                type="password" 
                placeholder="Enter your Gemini API Key"
                value={config.geminiApiKey}
                onChange={(e) => setConfig({...config, geminiApiKey: e.target.value})}
              />
              <Form.Text className="text-muted">
                Used for generating subscription insights and cost-cutting tips with <strong>gemini-2.5-pro</strong>.
              </Form.Text>
            </Form.Group>
          </Card.Body>
        </Card>

        {/* Gotify Settings */}
        <Card className="border-0 shadow-sm mb-4">
          <Card.Header className="bg-white py-3 border-bottom-0 d-flex align-items-center gap-2">
            <Bell className="text-warning" size={20} />
            <h6 className="mb-0 fw-bold">Notifications (Gotify)</h6>
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