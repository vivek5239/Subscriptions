import { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Row, Col, Stack, Alert } from 'react-bootstrap';
import { Save, Bot, Bell, Palette, Check, Moon, Calendar } from 'lucide-react';
import axios from 'axios';
import type { Settings, Reminder } from '../types';
import { useTheme, type ThemeColor } from '../context/ThemeContext';

export default function SettingsView() {
  const [config, setConfig] = useState<Settings>({
    groqApiKey: '',
    groqModel: '',
    calendarificApiKey: '',
    gotifyUrl: '',
    gotifyToken: '',
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPass: '',
    smtpFrom: '',
    testRecipient: '',
    notificationsEnabled: true,
    dailyCheckTime: '09:00',
    lastDailyCheck: null,
  });
  const [testing, setTesting] = useState<string | null>(null);
  const { color, setColor, mode, toggleMode } = useTheme();
  const [icsFile, setIcsFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);

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
    fetchGroqModels();
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

  const fetchGroqModels = async () => {
    setFetchingModels(true);
    try {
      const res = await axios.get('/api/groq/models');
      setAvailableModels(res.data.models);
    } catch (err) {
      console.error('Error fetching Groq models:', err);
      // Optionally show an alert or message to the user
    } finally {
      setFetchingModels(false);
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

  const handleIcsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIcsFile(e.target.files[0]);
      setImportStatus('idle');
      setImportMessage('');
    }
  };

  const parseIcsContent = (icsContent: string): Reminder[] => {
    const reminders: Reminder[] = [];
    const events = icsContent.split('BEGIN:VEVENT');

    events.forEach(event => {
      if (event.includes('END:VEVENT')) {
        const summaryMatch = event.match(/SUMMARY:(.*)/);
        const dtstartMatch = event.match(/DTSTART(?:;TZID=[^:]+)?:(\d{8}(?:T\d{6})?)/);
        const descriptionMatch = event.match(/DESCRIPTION:(.*)/);

        if (summaryMatch && dtstartMatch) {
          const name = summaryMatch[1].trim();
          const dtStart = dtstartMatch[1];
          const nextPayment = dtStart.length === 8 
                  ? `${dtStart.substring(0, 4)}-${dtStart.substring(4, 6)}-${dtStart.substring(6, 8)}` 
                  : (() => {
                      // Convert YYYYMMDDTHHMMSS to YYYY-MM-DDTHH:MM:SS for reliable Date parsing
                      const year = dtStart.substring(0, 4);
                      const month = dtStart.substring(4, 6);
                      const day = dtStart.substring(6, 8);
                      const time = dtStart.substring(9, 15); // HHMMSS part
                      const formattedTime = `${time.substring(0, 2)}:${time.substring(2, 4)}:${time.substring(4, 6)}`;
                      const isoDateString = `${year}-${month}-${day}T${formattedTime}`;
                      return new Date(isoDateString).toISOString().split('T')[0];
                    })();
          const notes = descriptionMatch ? descriptionMatch[1].trim() : '';

          reminders.push({
            id: '', // Will be generated by backend
            Name: name,
            'Next Payment': nextPayment,
            Category: 'Imported',
            Active: 'Yes',
            Notes: notes,
            remindBefore: 0, // Default to remind on the day
            Source: 'API',
          });
        }
      }
    });
    return reminders;
  };

  const handleImportIcs = async () => {
    if (!icsFile) {
      setImportStatus('error');
      setImportMessage('Please select an .ics file to import.');
      return;
    }

    setImportStatus('loading');
    setImportMessage('Importing...');

    try {
      const fileContent = await icsFile.text();
      const parsedReminders = parseIcsContent(fileContent);

      if (parsedReminders.length === 0) {
        setImportStatus('error');
        setImportMessage('No events found in the .ics file or failed to parse.');
        return;
      }

      for (const reminder of parsedReminders) {
        await axios.post('/api/reminders', reminder);
      }

      setImportStatus('success');
      setImportMessage(`Successfully imported ${parsedReminders.length} reminders!`);
      setIcsFile(null); // Clear file input
      // Optionally refresh reminders view, but not required for settings page
    } catch (error: any) {
      console.error('Error importing .ics file:', error);
      setImportStatus('error');
      setImportMessage(`Error importing .ics file: ${error.message}`);
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
                Used for generating reminder insights and for natural language reminder creation.
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Groq AI Model</Form.Label>
              <Form.Select 
                value={config.groqModel || ''} // Handle undefined
                onChange={(e) => setConfig({...config, groqModel: e.target.value})}
                className="bg-body border-secondary border-opacity-25"
                disabled={fetchingModels} // Disable while loading models
              >
                <option value="">
                  {fetchingModels ? 'Loading models...' : 'Use default model (llama3-70b-8192)'}
                </option>
                {availableModels.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                Select a specific model or leave blank to use the recommended default.
              </Form.Text>
            </Form.Group>
                                  </Card.Body>
                                </Card>
                      
                                {/* Holiday API Settings (Calendarific) */}
                                <Card className="shadow-sm mb-4">
                                  <Card.Header className="bg-transparent py-3 border-bottom-0 d-flex align-items-center gap-2">
                                    <Calendar className="text-success" size={20} />
                                    <h6 className="mb-0 fw-bold">Holiday API (Calendarific)</h6>
                                  </Card.Header>
                                  <Card.Body>
                                    <Form.Group className="mb-3">
                                      <Form.Label>Calendarific API Key</Form.Label>
                                      <Form.Control 
                                        type="password" 
                                        placeholder="Enter your Calendarific API Key"
                                        value={config.calendarificApiKey}
                                        onChange={(e) => setConfig({...config, calendarificApiKey: e.target.value})}
                                        className="bg-body border-secondary border-opacity-25"
                                      />
                                      <Form.Text className="text-muted">
                                        Used to get accurate dates for holidays like Diwali, correcting AI suggestions.
                                        Get a key from <a href="https://calendarific.com/" target="_blank" rel="noopener noreferrer">calendarific.com</a>.
                                      </Form.Text>
                                    </Form.Group>
                                  </Card.Body>
                                </Card>
                      
                                {/* Gotify Settings */}
                                <Card className="shadow-sm mb-4">          <Card.Header className="bg-transparent py-3 border-bottom-0 d-flex justify-content-between align-items-center">
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

        {/* Calendar Import Settings */}
        <Card className="shadow-sm mb-4">
          <Card.Header className="bg-transparent py-3 border-bottom-0 d-flex align-items-center gap-2">
            <Calendar className="text-primary" size={20} />
            <h6 className="mb-0 fw-bold">Calendar Import</h6>
          </Card.Header>
          <Card.Body>
            <p className="text-muted">
              Import events from your favorite calendar services to quickly turn them into reminders.
            </p>
            {importStatus !== 'idle' && (
              <Alert variant={importStatus === 'success' ? 'success' : 'danger'} className="mb-3">
                {importMessage}
              </Alert>
            )}
            <Stack gap={3}>
              <Button variant="outline-secondary" onClick={() => alert('Google Calendar Import: Not yet implemented.')}>Import from Google Calendar</Button>
              <Button variant="outline-secondary" onClick={() => alert('Outlook Calendar Import: Not yet implemented.')}>Import from Outlook Calendar</Button>
              
              <Form.Group>
                <Form.Label>Import from .ics file</Form.Label>
                <Form.Control type="file" accept=".ics" onChange={handleIcsFileChange} />
                {icsFile && (
                  <Button 
                    variant="primary" 
                    className="mt-2" 
                    onClick={handleImportIcs}
                    disabled={importStatus === 'loading'}
                  >
                    {importStatus === 'loading' ? 'Importing...' : 'Upload & Import'}
                  </Button>
                )}
              </Form.Group>
            </Stack>
            <hr />
            <p className="small text-muted mb-0">
              <strong>Information Required:</strong> To import from Google or Outlook, you will be asked to grant this application read-only access to your calendar events. We will not store your login credentials. We will only process the events you choose to import and will not modify your calendar in any way.
            </p>
          </Card.Body>
        </Card>

        <div className="d-flex justify-content-end">
          <Button variant="primary" type="submit" className="d-flex align-items-center gap-2 px-4 rounded-pill shadow-sm">
            <Save size={18} /> Save Settings
          </Button>
        </div>
      </Form>
    </Container>
  );

}