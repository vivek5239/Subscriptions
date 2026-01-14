import { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, Table, Container, Row, Col, Badge, Spinner, Button } from 'react-bootstrap';
import { Bell, Bot, Sparkles, CheckCircle } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import type { DashboardData } from '../types';
import { Logo } from '../components/Logo';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get('/api/subscriptions');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await axios.post(`/api/subscriptions/${id}/pay`);
      fetchData();
    } catch (err) {
      console.error('Error marking as paid:', err);
    }
  };

  const runAiAnalysis = async () => {
    const config = JSON.parse(localStorage.getItem('sub_app_config') || '{}');
    if (!config.groqApiKey) {
      alert('Please set your Groq API Key in Settings first!');
      return;
    }

    setAiLoading(true);
    setAiResponse(null);
    try {
      const res = await axios.post('/api/ai/analyze', { 
        apiKey: config.groqApiKey 
      });
      setAiResponse(res.data.analysis);
    } catch (err: any) {
      alert(err.response?.data?.error || 'AI Analysis failed');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) return <Spinner animation="border" className="m-5" />;

  const upcomingPayments = data?.subscriptions
    .filter(s => {
      if (s.Active !== 'Yes' || !s['Next Payment']) return false;
      
      // Direct Debit Logic: Don't show past due direct debits
      if (s['Payment Method'] === 'Direct Debit') {
         const daysLeft = differenceInDays(parseISO(s['Next Payment']), new Date());
         if (daysLeft < 0) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(a['Next Payment']).getTime() - new Date(b['Next Payment']).getTime())
    .slice(0, 5);

  return (
    <Container className="py-4">
        {/* KPI Cards Row 1 */}
        <Row className="mb-4 g-3">
          <Col md={4} lg={2}>
            <Card className="shadow-sm h-100">
              <Card.Body className="p-3">
                <h6 className="text-muted small text-uppercase mb-2">Monthly Cost</h6>
                <h4 className="mb-0">₹{data?.stats.totalMonthlyINR.toFixed(0)}</h4>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4} lg={2}>
            <Card className="shadow-sm h-100">
              <Card.Body className="p-3">
                <h6 className="text-muted small text-uppercase mb-2">Yearly Cost</h6>
                <h4 className="mb-0">₹{data?.stats.totalYearlyINR.toFixed(0)}</h4>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4} lg={2}>
            <Card className="shadow-sm h-100">
              <Card.Body className="p-3">
                <h6 className="text-muted small text-uppercase mb-2">Due This Month</h6>
                <h4 className="mb-0 text-danger">₹{data?.stats.dueThisMonthINR.toFixed(0)}</h4>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4} lg={2}>
            <Card className="shadow-sm h-100">
              <Card.Body className="p-3">
                <h6 className="text-muted small text-uppercase mb-2">Avg Monthly</h6>
                <h4 className="mb-0">₹{data?.stats.averageMonthlyINR.toFixed(0)}</h4>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4} lg={2}>
            <Card className="shadow-sm h-100">
              <Card.Body className="p-3">
                <h6 className="text-muted small text-uppercase mb-2">Most Expensive</h6>
                <div className="d-flex align-items-center">
                   {data?.stats.mostExpensive && (
                     <Logo 
                       name={data.stats.mostExpensive.Name} 
                       url={data.stats.mostExpensive.URL} 
                       manualLogo={data.stats.mostExpensive.ManualLogo}
                       size={24} 
                     />
                   )}
                   <div className="d-flex flex-column text-truncate">
                      <span className="fw-bold text-truncate" title={data?.stats.mostExpensive?.Name}>
                        {data?.stats.mostExpensive?.Name || '-'}
                      </span>
                      <span className="small text-muted">₹{data?.stats.mostExpensive?.valueINR.toFixed(0)}</span>
                   </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4} lg={2}>
            <Card className="shadow-sm h-100">
              <Card.Body className="p-3">
                <h6 className="text-muted small text-uppercase mb-2">Active Subs</h6>
                <h4 className="mb-0">{data?.subscriptions.filter(s => s.Active === 'Yes').length}</h4>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* AI Insights Section */}
        <Card className="shadow-sm mb-4 bg-gradient-primary text-white border-0">
          <Card.Body className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0 d-flex align-items-center gap-2">
                <Bot size={24} />
                AI Financial Insights
              </h5>
              <Button 
                variant="light" 
                size="sm" 
                className="rounded-pill px-3 d-flex align-items-center gap-2 shadow-sm"
                onClick={runAiAnalysis}
                disabled={aiLoading}
              >
                {aiLoading ? <Spinner size="sm" /> : <Sparkles size={16} />}
                {aiLoading ? 'Analyzing...' : 'Generate Insights'}
              </Button>
            </div>
            {aiResponse ? (
              <div className="bg-body text-body p-3 rounded shadow-sm border" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', marginBottom: 0 }}>{aiResponse}</pre>
              </div>
            ) : (
              <p className="mb-0 opacity-75">Click the button above to have Groq AI analyze your subscriptions and suggest savings.</p>
            )}
          </Card.Body>
        </Card>

        <Row className="g-4">
          {/* Upcoming Payments */}
          <Col lg={4}>
            <Card className="shadow-sm h-100">
              <Card.Header className="bg-transparent py-3 border-bottom-0 d-flex justify-content-between align-items-center">
                <h6 className="mb-0 fw-bold d-flex align-items-center gap-2">
                  <Bell size={18} className="text-warning" />
                  Upcoming Payments
                </h6>
              </Card.Header>
              <div className="list-group list-group-flush">
                {upcomingPayments?.map(sub => {
                  const daysLeft = differenceInDays(parseISO(sub['Next Payment']), new Date());
                  const isOverdue = daysLeft < 0;
                  const isToday = daysLeft === 0;

                  return (
                    <div key={sub.id} className="list-group-item px-3 py-3 bg-transparent border-0 border-bottom">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <div className="d-flex align-items-center">
                           <Logo name={sub.Name} url={sub.URL} manualLogo={sub.ManualLogo} />
                           <span className="fw-medium">{sub.Name}</span>
                        </div>
                        <span className="fw-bold">{sub.Price}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center small mt-2">
                        <span className="text-muted">{format(parseISO(sub['Next Payment']), 'MMM dd, yyyy')}</span>
                        <div className="d-flex align-items-center gap-2">
                          <Badge bg={isOverdue ? 'danger' : isToday ? 'warning' : 'info'} className="rounded-pill">
                            {isOverdue ? `Overdue ${Math.abs(daysLeft)}d` : isToday ? 'Today' : `In ${daysLeft} days`}
                          </Badge>
                          <Button 
                            variant="outline-success" 
                            size="sm" 
                            className="rounded-circle p-1 d-flex align-items-center justify-content-center"
                            style={{ width: 24, height: 24 }}
                            title="Mark as Paid"
                            onClick={() => handleMarkPaid(sub.id)}
                          >
                            <CheckCircle size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(!upcomingPayments || upcomingPayments.length === 0) && (
                   <div className="p-4 text-center text-muted">No upcoming payments found.</div>
                )}
              </div>
            </Card>
          </Col>

          {/* Main List */}
          <Col lg={8}>
            <Card className="shadow-sm h-100">
              <Card.Header className="bg-transparent py-3 border-bottom-0">
                <h6 className="mb-0 fw-bold">All Subscriptions</h6>
              </Card.Header>
              <Table responsive hover className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4 py-3 text-muted small text-uppercase">Name</th>
                    <th className="py-3 text-muted small text-uppercase">Cost</th>
                    <th className="py-3 text-muted small text-uppercase">Cycle</th>
                    <th className="py-3 text-muted small text-uppercase">Next Payment</th>
                    <th className="py-3 text-muted small text-uppercase">Category</th>
                    <th className="py-3 text-muted small text-uppercase text-end pe-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.subscriptions.map((sub) => (
                    <tr key={sub.id} className="bg-transparent">
                      <td className="ps-4">
                        <div className="d-flex align-items-center">
                          <Logo name={sub.Name} url={sub.URL} />
                          <span className="fw-medium">{sub.Name}</span>
                        </div>
                      </td>
                      <td className="fw-medium">{sub.Price}</td>
                      <td>
                        <Badge className="bg-primary-subtle text-primary-emphasis border border-primary-subtle rounded-pill fw-medium px-3">
                          {sub['Payment Cycle']}
                        </Badge>
                      </td>
                      <td className="small text-muted">{sub['Next Payment']}</td>
                      <td>
                        <Badge className="bg-info-subtle text-info-emphasis border border-info-subtle rounded-pill fw-medium px-3">
                           {sub.Category}
                        </Badge>
                      </td>
                      <td className="text-end pe-4">
                        <div className={`d-inline-block rounded-circle ${sub.Active === 'Yes' ? 'bg-success shadow-sm' : 'bg-secondary opacity-50'}`} style={{ width: 10, height: 10 }}></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          </Col>
        </Row>
    </Container>
  );

}
