import { useState, useEffect } from 'react';
import { 
  Container, 
  Form, 
  Button, 
  Row, 
  Col, 
  Spinner, 
  Alert, 
  Badge, 
  Tab, 
  Nav 
} from 'react-bootstrap';
import { 
  Save, 
  Sparkles, 
  Bell, 
  Mail, 
  Clock, 
  Palette, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff,
  Download,
  Bot
} from 'lucide-react';
import axios from 'axios';
import type { Settings, GeminiModel } from '../types';
import { useTheme, type ThemeColor } from '../context/ThemeContext';

export default function SettingsView() {
  const [config, setConfig] = useState<Settings>({
    geminiApiKey: '',
    geminiModel: 'gemini-2.5-pro',
    gotifyUrl: 'https://gotify.rvitservices.uk/',
    gotifyToken: '',
    gotifyPriority: 5,
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    smtpFrom: '',
    testRecipient: '',
    mainCurrency: 'INR',
    notificationsEnabled: true,
    dailyCheckTime: '09:00',
    timezone: 'Asia/Kolkata',
    alertDaysAhead: 3,
    notifyOnOverdue: true,
    dailyDigest: false,
    lastDailyCheck: null,
    lastDailyCheckResult: null,
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ type: string; success: boolean; message: string } | null>(null);

  // Gemini Models
  const [models, setModels] = useState<GeminiModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);

  // Theme Context
  const { color, setColor, mode, toggleMode } = useTheme();

  const colors: { id: ThemeColor; value: string; label: string }[] = [
    { id: 'purple', value: '#6366f1', label: 'Indigo / Purple' },
    { id: 'blue', value: '#3b82f6', label: 'Sky Blue' },
    { id: 'green', value: '#10b981', label: 'Emerald Green' },
    { id: 'orange', value: '#f97316', label: 'Sunset Orange' },
    { id: 'red', value: '#ef4444', label: 'Crimson Red' },
    { id: 'slate', value: '#64748b', label: 'Cool Slate' },
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/settings');
      if (res.data) {
        setConfig(prev => ({ ...prev, ...res.data }));
        fetchModels(res.data.geminiApiKey);
      }
    } catch (err) {
      console.error('[Settings] Error fetching settings:', err);
    }
  };

  const fetchModels = async (key?: string) => {
    setModelsLoading(true);
    try {
      const res = await axios.get('/api/gemini/models', {
        params: { apiKey: key || config.geminiApiKey }
      });
      if (res.data?.models) {
        setModels(res.data.models);
      }
    } catch (err) {
      console.warn('[Settings] Failed to fetch models:', err);
    } finally {
      setModelsLoading(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await axios.post('/api/settings', config);
      if (res.data?.settings) {
        setConfig(res.data.settings);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      alert('Error saving settings: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleTestGemini = async () => {
    setTesting('gemini');
    setTestResult(null);
    try {
      const res = await axios.post('/api/test/gemini', {
        apiKey: config.geminiApiKey,
        model: config.geminiModel
      });
      setTestResult({
        type: 'gemini',
        success: true,
        message: `Success (${res.data.modelUsed}): ${res.data.message}`
      });
    } catch (err: any) {
      setTestResult({
        type: 'gemini',
        success: false,
        message: err.response?.data?.error || err.message || 'Gemini test failed'
      });
    } finally {
      setTesting(null);
    }
  };

  const handleTestGotify = async () => {
    setTesting('gotify');
    setTestResult(null);
    try {
      const res = await axios.post('/api/test/gotify', config);
      setTestResult({
        type: 'gotify',
        success: true,
        message: res.data.message || 'Test push notification delivered to Gotify successfully!'
      });
    } catch (err: any) {
      setTestResult({
        type: 'gotify',
        success: false,
        message: err.response?.data?.error || err.message || 'Gotify delivery failed'
      });
    } finally {
      setTesting(null);
    }
  };

  const handleTestEmail = async () => {
    setTesting('email');
    setTestResult(null);
    try {
      const res = await axios.post('/api/test/email', config);
      setTestResult({
        type: 'email',
        success: true,
        message: res.data.message || 'Test email dispatched successfully!'
      });
    } catch (err: any) {
      setTestResult({
        type: 'email',
        success: false,
        message: err.response?.data?.error || err.message || 'Email delivery failed'
      });
    } finally {
      setTesting(null);
    }
  };

  const handleTriggerDailyCheck = async () => {
    setTesting('reminders');
    setTestResult(null);
    try {
      const res = await axios.post('/api/test/reminders');
      setTestResult({
        type: 'reminders',
        success: res.data.success,
        message: res.data.message || 'Daily check execution complete.'
      });
      await fetchSettings();
    } catch (err: any) {
      setTestResult({
        type: 'reminders',
        success: false,
        message: err.response?.data?.error || err.message || 'Reminder check failed'
      });
    } finally {
      setTesting(null);
    }
  };

  const handleSyncCycles = async () => {
    if (!window.confirm('Sync and roll forward all past-due recurring subscriptions to their next upcoming date?')) {
      return;
    }
    setTesting('sync');
    try {
      const res = await axios.post('/api/subscriptions/sync-cycles');
      alert(res.data.message);
    } catch (err: any) {
      alert('Error syncing: ' + (err.response?.data?.error || err.message));
    } finally {
      setTesting(null);
    }
  };

  const handleExportData = async () => {
    try {
      const res = await axios.get('/api/subscriptions');
      const blob = new Blob([JSON.stringify(res.data.subscriptions, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subscriptions_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export data');
    }
  };

  return (
    <Container fluid="xl" className="py-4 px-3 px-sm-4">
      {/* Title & Save Controls */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h3 className="fw-bold mb-1 tracking-tight">System Settings</h3>
          <p className="text-muted small mb-0">
            Configure Gemini AI, Gotify push notifications, SMTP email, and daily scheduler.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          {saveSuccess && (
            <Badge bg="success-subtle" className="text-success border border-success-subtle py-2 px-3 rounded-pill d-flex align-items-center gap-1">
              <CheckCircle2 size={15} />
              <span>Settings Saved!</span>
            </Badge>
          )}

          <Button 
            variant="primary" 
            className="rounded-pill px-4 d-flex align-items-center gap-2 shadow-sm"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Spinner size="sm" animation="border" /> : <Save size={16} />}
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </Button>
        </div>
      </div>

      {/* Test Feedback Alert */}
      {testResult && (
        <Alert 
          variant={testResult.success ? 'success' : 'danger'} 
          dismissible 
          onClose={() => setTestResult(null)}
          className="rounded-3 shadow-sm d-flex align-items-center gap-2 mb-4"
        >
          {testResult.success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <div className="flex-grow-1 small">{testResult.message}</div>
        </Alert>
      )}

      {/* Tabbed Configuration Container */}
      <Tab.Container defaultActiveKey="gemini">
        <div className="glass-panel p-2 mb-4">
          <Nav variant="pills" className="gap-1 flex-nowrap overflow-x-auto">
            <Nav.Item>
              <Nav.Link eventKey="gemini" className="d-flex align-items-center gap-2 rounded-pill px-3 py-2 small fw-medium">
                <Bot size={16} />
                <span>Gemini AI</span>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="gotify" className="d-flex align-items-center gap-2 rounded-pill px-3 py-2 small fw-medium">
                <Bell size={16} />
                <span>Gotify Push</span>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="email" className="d-flex align-items-center gap-2 rounded-pill px-3 py-2 small fw-medium">
                <Mail size={16} />
                <span>SMTP Email</span>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="scheduler" className="d-flex align-items-center gap-2 rounded-pill px-3 py-2 small fw-medium">
                <Clock size={16} />
                <span>Daily Scheduler</span>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="data" className="d-flex align-items-center gap-2 rounded-pill px-3 py-2 small fw-medium">
                <RefreshCw size={16} />
                <span>Data & Cycles</span>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="appearance" className="d-flex align-items-center gap-2 rounded-pill px-3 py-2 small fw-medium">
                <Palette size={16} />
                <span>Appearance</span>
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </div>

        <Tab.Content>
          {/* TAB 1: GEMINI AI */}
          <Tab.Pane eventKey="gemini">
            <div className="glass-panel p-4 mb-4">
              <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-3">
                <div className="d-flex align-items-center gap-2">
                  <div 
                    className="d-flex align-items-center justify-content-center rounded-3 p-2" 
                    style={{ background: 'var(--primary-gradient)', color: '#fff' }}
                  >
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h5 className="fw-bold mb-0">Google Gemini AI Engine</h5>
                    <div className="small text-muted">
                      Powering natural language subscription creation, expense insights, and notification digests.
                    </div>
                  </div>
                </div>

                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  className="rounded-pill px-3 d-flex align-items-center gap-2"
                  onClick={handleTestGemini}
                  disabled={testing === 'gemini'}
                >
                  {testing === 'gemini' ? <Spinner size="sm" animation="border" /> : <Bot size={15} />}
                  <span>{testing === 'gemini' ? 'Testing...' : 'Test AI Connection'}</span>
                </Button>
              </div>

              <Row className="g-3">
                <Col md={12}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted text-uppercase">
                      Google Gemini API Key *
                    </Form.Label>
                    <div className="input-group">
                      <Form.Control
                        type={showApiKey ? 'text' : 'password'}
                        placeholder="AIzaSy..."
                        value={config.geminiApiKey || ''}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          setConfig({ ...config, geminiApiKey: val });
                        }}
                      />
                      <Button 
                        variant="outline-secondary" 
                        onClick={() => setShowApiKey(!showApiKey)}
                        aria-label="Toggle API Key visibility"
                      >
                        {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </Button>
                      <Button 
                        variant="outline-secondary" 
                        onClick={() => fetchModels()}
                        title="Reload models list"
                      >
                        <RefreshCw size={14} className={modelsLoading ? 'spinner-border spinner-border-sm' : ''} />
                      </Button>
                    </div>
                    <Form.Text className="text-muted small">
                      Obtain your API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Google AI Studio</a>.
                    </Form.Text>
                  </Form.Group>
                </Col>

                <Col md={12}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted text-uppercase">
                      Active Gemini Model
                    </Form.Label>
                    <Form.Select
                      value={config.geminiModel || 'gemini-2.5-pro'}
                      onChange={(e) => setConfig({ ...config, geminiModel: e.target.value })}
                    >
                      {models.length > 0 ? (
                        models.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.id})
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="gemini-2.5-pro">Gemini 2.5 Pro (Flagship Configured)</option>
                          <option value="gemini-flash-lite-latest">Gemini Flash-Lite Latest (Recommended Quota-Free)</option>
                          <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                          <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
                        </>
                      )}
                    </Form.Select>
                    <Form.Text className="text-muted small">
                      Configured for <strong>gemini-2.5-pro</strong> with automatic failover to <strong>gemini-flash-lite-latest</strong> if Google free tier quotas or transient outages occur.
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>
            </div>
          </Tab.Pane>

          {/* TAB 2: GOTIFY NOTIFICATIONS */}
          <Tab.Pane eventKey="gotify">
            <div className="glass-panel p-4 mb-4">
              <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-3">
                <div className="d-flex align-items-center gap-2">
                  <div 
                    className="d-flex align-items-center justify-content-center rounded-3 p-2" 
                    style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}
                  >
                    <Bell size={20} />
                  </div>
                  <div>
                    <h5 className="fw-bold mb-0">Gotify Push Notifications</h5>
                    <div className="small text-muted">
                      Send instant mobile & desktop alerts when bills are due or overdue.
                    </div>
                  </div>
                </div>

                <Button 
                  variant="outline-warning" 
                  size="sm" 
                  className="rounded-pill px-3 d-flex align-items-center gap-2 text-dark"
                  onClick={handleTestGotify}
                  disabled={testing === 'gotify'}
                >
                  {testing === 'gotify' ? <Spinner size="sm" animation="border" /> : <Bell size={15} />}
                  <span>{testing === 'gotify' ? 'Sending...' : 'Test Gotify'}</span>
                </Button>
              </div>

              <Row className="g-3">
                <Col md={8}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted text-uppercase">Gotify Server URL *</Form.Label>
                    <Form.Control
                      type="url"
                      placeholder="https://gotify.rvitservices.uk/"
                      value={config.gotifyUrl || ''}
                      onChange={(e) => setConfig({ ...config, gotifyUrl: e.target.value })}
                    />
                    <Form.Text className="text-muted small">Base URL of your Gotify push server.</Form.Text>
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted text-uppercase">Gotify Priority</Form.Label>
                    <Form.Select
                      value={config.gotifyPriority || 5}
                      onChange={(e) => setConfig({ ...config, gotifyPriority: parseInt(e.target.value) || 5 })}
                    >
                      <option value="1">1 - Min</option>
                      <option value="3">3 - Low</option>
                      <option value="5">5 - Normal (Recommended)</option>
                      <option value="7">7 - High</option>
                      <option value="9">9 - Urgent</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={12}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted text-uppercase">Gotify Application Token *</Form.Label>
                    <Form.Control
                      type="password"
                      placeholder="Enter Gotify App Token"
                      value={config.gotifyToken || ''}
                      onChange={(e) => setConfig({ ...config, gotifyToken: e.target.value.trim() })}
                    />
                    <Form.Text className="text-muted small">
                      Created in Gotify Web UI under <em>Apps</em>. Standard authentication uses <code>X-Gotify-Key</code>.
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>
            </div>
          </Tab.Pane>

          {/* TAB 3: SMTP EMAIL */}
          <Tab.Pane eventKey="email">
            <div className="glass-panel p-4 mb-4">
              <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-3">
                <div className="d-flex align-items-center gap-2">
                  <div 
                    className="d-flex align-items-center justify-content-center rounded-3 p-2" 
                    style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}
                  >
                    <Mail size={20} />
                  </div>
                  <div>
                    <h5 className="fw-bold mb-0">Email Notifications (SMTP)</h5>
                    <div className="small text-muted">
                      Dispatch daily digests or payment reminders directly to your inbox.
                    </div>
                  </div>
                </div>

                <Button 
                  variant="outline-danger" 
                  size="sm" 
                  className="rounded-pill px-3 d-flex align-items-center gap-2"
                  onClick={handleTestEmail}
                  disabled={testing === 'email'}
                >
                  {testing === 'email' ? <Spinner size="sm" animation="border" /> : <Mail size={15} />}
                  <span>{testing === 'email' ? 'Sending...' : 'Test Email'}</span>
                </Button>
              </div>

              <Row className="g-3">
                <Col md={8}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted text-uppercase">SMTP Host</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="smtp.gmail.com"
                      value={config.smtpHost || ''}
                      onChange={(e) => setConfig({ ...config, smtpHost: e.target.value.trim() })}
                    />
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted text-uppercase">SMTP Port</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="587"
                      value={config.smtpPort || ''}
                      onChange={(e) => setConfig({ ...config, smtpPort: e.target.value.trim() })}
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted text-uppercase">SMTP Username / Email</Form.Label>
                    <Form.Control
                      type="email"
                      placeholder="user@gmail.com"
                      value={config.smtpUser || ''}
                      onChange={(e) => setConfig({ ...config, smtpUser: e.target.value.trim() })}
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted text-uppercase">SMTP App Password</Form.Label>
                    <div className="input-group">
                      <Form.Control
                        type={showSmtpPass ? 'text' : 'password'}
                        placeholder="App password"
                        value={config.smtpPass || ''}
                        onChange={(e) => setConfig({ ...config, smtpPass: e.target.value })}
                      />
                      <Button variant="outline-secondary" onClick={() => setShowSmtpPass(!showSmtpPass)}>
                        {showSmtpPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </Button>
                    </div>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted text-uppercase">From Address</Form.Label>
                    <Form.Control
                      type="email"
                      placeholder="user@gmail.com"
                      value={config.smtpFrom || ''}
                      onChange={(e) => setConfig({ ...config, smtpFrom: e.target.value.trim() })}
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted text-uppercase">Recipient Email (Test)</Form.Label>
                    <Form.Control
                      type="email"
                      placeholder="vivek@outlook.com"
                      value={config.testRecipient || ''}
                      onChange={(e) => setConfig({ ...config, testRecipient: e.target.value.trim() })}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </div>
          </Tab.Pane>

          {/* TAB 4: DAILY SCHEDULER */}
          <Tab.Pane eventKey="scheduler">
            <div className="glass-panel p-4 mb-4">
              <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-3">
                <div className="d-flex align-items-center gap-2">
                  <div 
                    className="d-flex align-items-center justify-content-center rounded-3 p-2" 
                    style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}
                  >
                    <Clock size={20} />
                  </div>
                  <div>
                    <h5 className="fw-bold mb-0">Automated Daily Scheduler</h5>
                    <div className="small text-muted">
                      Evaluates active subscriptions daily and dispatches Gotify push & email summaries.
                    </div>
                  </div>
                </div>

                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  className="rounded-pill px-3 d-flex align-items-center gap-2"
                  onClick={handleTriggerDailyCheck}
                  disabled={testing === 'reminders'}
                >
                  {testing === 'reminders' ? <Spinner size="sm" animation="border" /> : <RefreshCw size={15} />}
                  <span>{testing === 'reminders' ? 'Checking...' : 'Run Daily Check Now'}</span>
                </Button>
              </div>

              {/* Master Toggle */}
              <div className="p-3 rounded-3 border bg-body-tertiary mb-3 d-flex align-items-center justify-content-between">
                <div>
                  <div className="fw-bold">Enable Daily Notifications</div>
                  <div className="small text-muted">When enabled, the automated cron job checks upcoming & overdue bills daily.</div>
                </div>
                <Form.Check
                  type="switch"
                  id="notifications-switch"
                  className="fs-4"
                  checked={config.notificationsEnabled !== false}
                  onChange={(e) => setConfig({ ...config, notificationsEnabled: e.target.checked })}
                />
              </div>

              <Row className="g-3">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted text-uppercase">Check Time (24h)</Form.Label>
                    <Form.Control
                      type="time"
                      value={config.dailyCheckTime || '09:00'}
                      onChange={(e) => setConfig({ ...config, dailyCheckTime: e.target.value })}
                    />
                    <Form.Text className="text-muted small">Time to run daily cron.</Form.Text>
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted text-uppercase">Timezone</Form.Label>
                    <Form.Select
                      value={config.timezone || 'Asia/Kolkata'}
                      onChange={(e) => setConfig({ ...config, timezone: e.target.value })}
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="Europe/London">Europe/London (GMT/BST)</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted text-uppercase">Alert Days Ahead</Form.Label>
                    <Form.Select
                      value={config.alertDaysAhead || 3}
                      onChange={(e) => setConfig({ ...config, alertDaysAhead: parseInt(e.target.value) || 3 })}
                    >
                      <option value="1">1 Day Ahead</option>
                      <option value="3">3 Days Ahead (Default)</option>
                      <option value="5">5 Days Ahead</option>
                      <option value="7">7 Days Ahead (1 Week)</option>
                      <option value="14">14 Days Ahead (2 Weeks)</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={12}>
                  <div className="d-flex align-items-center gap-4 mt-2">
                    <Form.Check
                      type="checkbox"
                      id="notify-overdue"
                      label="Include Overdue Subscriptions in notification alert"
                      checked={config.notifyOnOverdue !== false}
                      onChange={(e) => setConfig({ ...config, notifyOnOverdue: e.target.checked })}
                    />
                    <Form.Check
                      type="checkbox"
                      id="daily-digest"
                      label="Send Daily Digest even if 0 bills are due"
                      checked={config.dailyDigest === true}
                      onChange={(e) => setConfig({ ...config, dailyDigest: e.target.checked })}
                    />
                  </div>
                </Col>

                {/* Last Run Status Log */}
                <Col md={12}>
                  <div className="p-3 rounded-3 border bg-body-tertiary mt-2">
                    <div className="small fw-bold text-muted text-uppercase mb-1">Last Daily Execution Status</div>
                    <div className="small text-body">
                      {config.lastDailyCheck ? (
                        <>
                          <span className="fw-semibold">{new Date(config.lastDailyCheck).toLocaleString()}</span>
                          <div className="mt-1 text-muted">{config.lastDailyCheckResult || 'Completed'}</div>
                        </>
                      ) : (
                        <span className="text-muted">No scheduled check recorded yet.</span>
                      )}
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          </Tab.Pane>

          {/* TAB 5: DATA TOOLS */}
          <Tab.Pane eventKey="data">
            <div className="glass-panel p-4 mb-4">
              <h5 className="fw-bold mb-3 border-bottom pb-3">Data Maintenance & Cycle Sync</h5>

              <Row className="g-3">
                <Col md={6}>
                  <div className="p-3 rounded-3 border bg-body-tertiary h-100 d-flex flex-column justify-content-between">
                    <div>
                      <h6 className="fw-bold mb-1">Sync Overdue Cycles</h6>
                      <p className="small text-muted mb-3">
                        Advances all recurring subscriptions that have past-due dates to the next upcoming date in the current calendar cycle.
                      </p>
                    </div>
                    <Button 
                      variant="outline-warning" 
                      className="rounded-pill d-flex align-items-center justify-content-center gap-2 text-dark"
                      onClick={handleSyncCycles}
                      disabled={testing === 'sync'}
                    >
                      <RefreshCw size={15} className={testing === 'sync' ? 'spinner-border spinner-border-sm' : ''} />
                      <span>Sync Overdue Cycles Now</span>
                    </Button>
                  </div>
                </Col>

                <Col md={6}>
                  <div className="p-3 rounded-3 border bg-body-tertiary h-100 d-flex flex-column justify-content-between">
                    <div>
                      <h6 className="fw-bold mb-1">Export Backup</h6>
                      <p className="small text-muted mb-3">
                        Download a snapshot JSON backup of all your subscriptions, costs, payment methods, and notes.
                      </p>
                    </div>
                    <Button 
                      variant="outline-secondary" 
                      className="rounded-pill d-flex align-items-center justify-content-center gap-2"
                      onClick={handleExportData}
                    >
                      <Download size={15} />
                      <span>Export Subscriptions JSON</span>
                    </Button>
                  </div>
                </Col>
              </Row>
            </div>
          </Tab.Pane>

          {/* TAB 6: APPEARANCE */}
          <Tab.Pane eventKey="appearance">
            <div className="glass-panel p-4 mb-4">
              <h5 className="fw-bold mb-3 border-bottom pb-3">Appearance & Themes</h5>

              <Row className="g-4">
                <Col md={6}>
                  <Form.Label className="small fw-semibold text-muted text-uppercase mb-2">Color Scheme</Form.Label>
                  <div className="d-flex align-items-center gap-2">
                    <Button 
                      variant={mode === 'light' ? 'primary' : 'outline-secondary'} 
                      className="rounded-pill px-4"
                      onClick={() => mode !== 'light' && toggleMode()}
                    >
                      Light Mode
                    </Button>
                    <Button 
                      variant={mode === 'dark' ? 'primary' : 'outline-secondary'} 
                      className="rounded-pill px-4"
                      onClick={() => mode !== 'dark' && toggleMode()}
                    >
                      Dark Mode
                    </Button>
                  </div>
                </Col>

                <Col md={12}>
                  <Form.Label className="small fw-semibold text-muted text-uppercase mb-2">Accent Color Palette</Form.Label>
                  <Row className="g-3">
                    {colors.map(c => (
                      <Col xs={6} sm={4} md={2} key={c.id}>
                        <div 
                          className={`p-3 rounded-3 border text-center cursor-pointer hover-lift ${
                            color === c.id ? 'border-primary shadow-sm bg-body-tertiary' : ''
                          }`}
                          onClick={() => setColor(c.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div 
                            className="rounded-circle mx-auto mb-2 shadow-sm"
                            style={{ width: 28, height: 28, backgroundColor: c.value }}
                          />
                          <div className="small fw-semibold">{c.label}</div>
                          {color === c.id && <span className="small text-primary fw-bold">Active</span>}
                        </div>
                      </Col>
                    ))}
                  </Row>
                </Col>
              </Row>
            </div>
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    </Container>
  );
}
