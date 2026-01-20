import { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Row, Col } from 'react-bootstrap';
import { Save, Bot, Bell, ShieldCheck, Palette, Check, Moon } from 'lucide-react';
import axios from 'axios';
import type { Settings } from '../types';
import { useTheme, type ThemeColor } from '../context/ThemeContext';

export default function SettingsView() {
  const [config, setConfig] = useState<Settings>({
    groqApiKey: '',
    gotifyUrl: '',
    gotifyToken: '',
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPass: '',
    smtpFrom: '',
    testRecipient: '',
    mainCurrency: 'INR',
    notificationsEnabled: true,
    dailyCheckTime: '09:00',
    lastDailyCheck: null,
  });
  const [testing, setTesting] = useState<string | null>(null);
  const { color, setColor, mode, toggleMode } = useTheme();

  const colors: { id: ThemeColor; value: string; label: string }[] = [
    { id: 'purple', value: '#6366f1', label: 'Purple' },
    { id: 'blue', value: '#3b82f6', label: 'Blue' },
    { id: 'green', value: '#10b981', label: 'Green' },
    { id: 'orange', value: '#f97316', label: 'Orange' },
    { id: 'red', value: '#ef4444', label: 'Red' },
    { id: 'slate', value: '#64748b', label: 'Slate' },
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/settings');
      if (res.data && Object.keys(res.data).length > 0) {
        setConfig(prev => ({ ...prev, ...res.data }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    try {
      await axios.post('/api/settings', config);
      localStorage.setItem('rem_app_config', JSON.stringify(config));
      alert('Settings saved successfully!');
    } catch (err) {
      alert('Error saving settings');
    }
  };

  const testGotify = async () => {
    setTesting('gotify');
    try {
      await axios.post('/api/test/gotify', config);
      alert('Test notification sent!');
    } catch (err: any) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setTesting(null);
    }
  };

  const testEmail = async () => {
    setTesting('email');
    try {
      await axios.post('/api/test/email', config);
      alert('Test email sent!');
    } catch (err: any) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setTesting(null);
    }
  };

  const triggerDailyCheck = async () => {
    setTesting('reminders');
    try {
      const res = await axios.post('/api/test/reminders');
      alert(res.data.message);
    } catch (err: any) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setTesting(null);
    }
  };

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0 fw-bold">Settings</h4>
        <Button 
          variant="outline-primary" 
          onClick={triggerDailyCheck} 
          disabled={!!testing}
          className="rounded-pill px-4 shadow-sm"
        >
          {testing === 'reminders' ? 'Checking...' : 'Run Daily Check Now'}
        </Button>
      </div>
      
      <Form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        {/* Master Notification Toggle */}
        <Card className="shadow-sm mb-4 border-primary border-opacity-25">
          <Card.Body className="py-3 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-3">
              <div className="bg-primary bg-opacity-10 p-2 rounded">
                <Bell className="text-primary" size={24} />
              </div>
              <div>
                <h6 className="mb-0 fw-bold">Daily Reminders</h6>
                <small className="text-muted">Send notifications for reminders due in the next 3 days.</small>
              </div>
            </div>
            <Form.Check 
              type="switch"
              id="notifications-enabled"
              checked={config.notificationsEnabled}
              onChange={(e) => setConfig({...config, notificationsEnabled: e.target.checked})}
              className="fs-4"
            />
          </Card.Body>
        </Card>

        {/* Scheduler Settings */}
        <Card className="shadow-sm mb-4">
          <Card.Header className="bg-transparent py-3 border-bottom-0 d-flex align-items-center gap-2">
            <Bot className="text-primary" size={20} />
            <h6 className="mb-0 fw-bold">Scheduler</h6>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Daily Check Time</Form.Label>
                  <Form.Control 
                    type="time" 
                    value={config.dailyCheckTime}
                    onChange={(e) => setConfig({...config, dailyCheckTime: e.target.value})}
                    className="bg-body border-secondary border-opacity-25"
                  />
                  <Form.Text className="text-muted">
                    The time of day to run the daily reminder check.
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Last Run</Form.Label>
                  <p className="form-control-plaintext">
                    {config.lastDailyCheck 
                      ? new Date(config.lastDailyCheck).toLocaleString() 
                      : 'Never'}
                  </p>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Groq AI Settings */}
        <Card className="shadow-sm mb-4">
          <Card.Header className="bg-transparent py-3 border-bottom-0 d-flex align-items-center gap-2">
            <Bot className="text-primary" size={20} />
            <h6 className="mb-0 fw-bold">Groq AI</h6>
          </Card.Header>
          <Card.Body>
            <Form.Group className="mb-3">
              <Form.Label>Groq API Key</Form.Label>
              <Form.Control 
                type="password" 
                placeholder="Enter your Groq API Key"
                value={config.groqApiKey}
                onChange={(e) => setConfig({...config, groqApiKey: e.target.value})}
                className="bg-body border-secondary border-opacity-25"
              />
              <Form.Text className="text-muted">
                Used for generating reminder insights and cost-cutting tips with <strong>llama-3.3-70b-versatile</strong>.
              </Form.Text>
            </Form.Group>
          </Card.Body>
        </Card>

        {/* Gotify Settings */}
        <Card className="shadow-sm mb-4">
          <Card.Header className="bg-transparent py-3 border-bottom-0 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <Bell className="text-warning" size={20} />
              <h6 className="mb-0 fw-bold">Notifications (Gotify)</h6>
            </div>
            <Button 
              variant="outline-warning" 
              size="sm" 
              onClick={testGotify} 
              disabled={!!testing}
              className="rounded-pill"
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
                    className="bg-body border-secondary border-opacity-25"
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
                    className="bg-body border-secondary border-opacity-25"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Email Settings */}
        <Card className="shadow-sm mb-4">
          <Card.Header className="bg-transparent py-3 border-bottom-0 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <Bell className="text-danger" size={20} />
              <h6 className="mb-0 fw-bold">Email Notifications (SMTP)</h6>
            </div>
            <Button 
              variant="outline-danger" 
              size="sm" 
              onClick={testEmail} 
              disabled={!!testing}
              className="rounded-pill"
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
                    className="bg-body border-secondary border-opacity-25"
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
                    className="bg-body border-secondary border-opacity-25"
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
                    className="bg-body border-secondary border-opacity-25"
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
                    className="bg-body border-secondary border-opacity-25"
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
                    className="bg-body border-secondary border-opacity-25"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Test Recipient Email</Form.Label>
                  <Form.Control 
                    type="email" 
                    placeholder="recipient@outlook.com"
                    value={config.testRecipient}
                    onChange={(e) => setConfig({...config, testRecipient: e.target.value})}
                    className="bg-body border-secondary border-opacity-25"
                  />
                  <Form.Text className="text-muted">
                    Test emails will be sent here instead of your SMTP username.
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Appearance Settings */}
        <Card className="shadow-sm mb-4">
          <Card.Header className="bg-transparent py-3 border-bottom-0 d-flex align-items-center gap-2">
            <Palette className="text-primary" size={20} />
            <h6 className="mb-0 fw-bold">Appearance</h6>
          </Card.Header>
          <Card.Body>
            <Form.Group className="mb-4">
              <Form.Label className="d-flex align-items-center gap-2">
                <Moon size={16} className="text-muted" /> Theme Mode
              </Form.Label>
              <Form.Check 
                type="switch"
                id="dark-mode-switch"
                label={mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
                checked={mode === 'dark'}
                onChange={toggleMode}
                className="fs-5"
              />
            </Form.Group>

            <Form.Group>
              <Form.Label>Accent Color</Form.Label>
              <div className="d-flex gap-3 flex-wrap">
                {colors.map((c) => (
                  <div 
                    key={c.id}
                    onClick={() => setColor(c.id)}
                    className="rounded-circle d-flex align-items-center justify-content-center transition-all position-relative"
                    style={{ 
                      width: 40, 
                      height: 40, 
                      backgroundColor: c.value,
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      transform: color === c.id ? 'scale(1.1)' : 'scale(1)',
                      border: color === c.id ? `3px solid var(--bs-body-bg)` : 'none',
                      outline: color === c.id ? `2px solid ${c.value}` : 'none',
                    }}
                    title={c.label}
                  >
                     {color === c.id && <Check size={20} className="text-white" />}
                  </div>
                ))}
              </div>
            </Form.Group>
          </Card.Body>
        </Card>

        {/* General Settings */}
        <Card className="shadow-sm mb-4">
          <Card.Header className="bg-transparent py-3 border-bottom-0 d-flex align-items-center gap-2">
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
                className="bg-body border-secondary border-opacity-25"
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
          <Button variant="primary" type="remmit" className="d-flex align-items-center gap-2 px-4 rounded-pill shadow-sm">
            <Save size={18} /> Save Settings
          </Button>
        </div>
      </Form>
    </Container>
  );

}