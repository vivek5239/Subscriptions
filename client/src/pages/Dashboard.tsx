import { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, Table, Container, Row, Col, Badge, Spinner } from 'react-bootstrap';
import { Bell } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { DashboardData } from '../types';
import { Logo } from '../components/Logo';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/subscriptions');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spinner animation="border" className="m-5" />;

  const upcomingPayments = data?.subscriptions
    .filter(s => s.Active === 'Yes' && s['Next Payment'])
    .sort((a, b) => new Date(a['Next Payment']).getTime() - new Date(b['Next Payment']).getTime())
    .slice(0, 5);

  return (
    <Container className="py-4">
        {/* KPI Cards Row 1 */}
        <Row className="mb-4 g-3">
          <Col md={4} lg={2}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="p-3">
                <h6 className="text-muted small text-uppercase mb-2">Monthly Cost</h6>
                <h4 className="mb-0">₹{data?.stats.totalMonthlyINR.toFixed(0)}</h4>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4} lg={2}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="p-3">
                <h6 className="text-muted small text-uppercase mb-2">Yearly Cost</h6>
                <h4 className="mb-0">₹{data?.stats.totalYearlyINR.toFixed(0)}</h4>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4} lg={2}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="p-3">
                <h6 className="text-muted small text-uppercase mb-2">Due This Month</h6>
                <h4 className="mb-0 text-danger">₹{data?.stats.dueThisMonthINR.toFixed(0)}</h4>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4} lg={2}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="p-3">
                <h6 className="text-muted small text-uppercase mb-2">Avg Monthly</h6>
                <h4 className="mb-0">₹{data?.stats.averageMonthlyINR.toFixed(0)}</h4>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4} lg={2}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="p-3">
                <h6 className="text-muted small text-uppercase mb-2">Most Expensive</h6>
                <div className="d-flex flex-column">
                   <span className="fw-bold text-truncate" title={data?.stats.mostExpensive?.Name}>
                     {data?.stats.mostExpensive?.Name || '-'}
                   </span>
                   <span className="small text-muted">₹{data?.stats.mostExpensive?.valueINR.toFixed(0)}</span>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4} lg={2}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="p-3">
                <h6 className="text-muted small text-uppercase mb-2">Active Subs</h6>
                <h4 className="mb-0">{data?.subscriptions.filter(s => s.Active === 'Yes').length}</h4>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="g-4">
          {/* Upcoming Payments */}
          <Col lg={4}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Header className="bg-white py-3 border-bottom-0 d-flex justify-content-between align-items-center">
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
                    <div key={sub.id} className="list-group-item px-3 py-3 border-0 border-bottom">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <div className="d-flex align-items-center">
                           <Logo name={sub.Name} url={sub.URL} />
                           <span className="fw-medium">{sub.Name}</span>
                        </div>
                        <span className="fw-bold">{sub.Price}</span>
                      </div>
                      <div className="d-flex justify-content-between small">
                        <span className="text-muted">{format(parseISO(sub['Next Payment']), 'MMM dd, yyyy')}</span>
                        <Badge bg={isOverdue ? 'danger' : isToday ? 'warning' : 'info'}>
                          {isOverdue ? `Overdue ${Math.abs(daysLeft)}d` : isToday ? 'Today' : `In ${daysLeft} days`}
                        </Badge>
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
            <Card className="border-0 shadow-sm h-100">
              <Card.Header className="bg-white py-3 border-bottom-0">
                <h6 className="mb-0 fw-bold">All Subscriptions</h6>
              </Card.Header>
              <Table responsive hover className="mb-0 align-middle table-borderless">
                <thead className="bg-light">
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
                    <tr key={sub.id} className="border-bottom">
                      <td className="ps-4">
                        <div className="d-flex align-items-center">
                          <Logo name={sub.Name} url={sub.URL} />
                          <span className="fw-medium">{sub.Name}</span>
                        </div>
                      </td>
                      <td className="fw-medium">{sub.Price}</td>
                      <td>
                        <Badge bg="light" text="dark" className="border rounded-pill fw-normal">
                          {sub['Payment Cycle']}
                        </Badge>
                      </td>
                      <td className="small text-muted">{sub['Next Payment']}</td>
                      <td>
                        <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-10 rounded-pill fw-normal">
                           {sub.Category}
                        </span>
                      </td>
                      <td className="text-end pe-4">
                        <div className={`d-inline-block rounded-circle ${sub.Active === 'Yes' ? 'bg-success' : 'bg-secondary'}`} style={{ width: 8, height: 8 }}></div>
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
