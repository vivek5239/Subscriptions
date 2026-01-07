import { useEffect, useState } from 'react';
import axios from 'axios';
import { Container, Card, Row, Col, Spinner } from 'react-bootstrap';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Legend, CartesianGrid } from 'recharts';
import type { DashboardData } from '../types';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export default function StatsView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <Spinner animation="border" className="m-5" />;
  if (!data) return <Container className="py-4">No data available.</Container>;

  const pieData = Object.entries(data.stats.categoryStats).map(([name, value]) => ({
    name,
    value: Math.round(value)
  }));

  // Mock monthly trend data based on current data
  // In a real app, this would come from historical records
  const monthlyTrendData = [
    { month: 'Jan', amount: data.stats.totalMonthlyINR },
    { month: 'Feb', amount: data.stats.totalMonthlyINR * 0.95 },
    { month: 'Mar', amount: data.stats.totalMonthlyINR * 1.05 },
    { month: 'Apr', amount: data.stats.totalMonthlyINR },
    { month: 'May', amount: data.stats.totalMonthlyINR * 1.1 },
    { month: 'Jun', amount: data.stats.totalMonthlyINR },
  ];

  return (
    <Container className="py-4">
      <h4 className="mb-4 fw-bold">Expense Statistics</h4>

      <Row className="g-4">
        {/* Category Breakdown Pie Chart */}
        <Col lg={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white py-3 border-bottom-0">
              <h6 className="mb-0 fw-bold">Spending by Category (Monthly)</h6>
            </Card.Header>
            <Card.Body style={{ height: '350px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `₹${value}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>

        {/* Bar Chart for Monthly Projections */}
        <Col lg={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white py-3 border-bottom-0">
              <h6 className="mb-0 fw-bold">Monthly Spending Trend (Projected)</h6>
            </Card.Header>
            <Card.Body style={{ height: '350px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => `₹${value.toLocaleString()}`} />
                  <Bar dataKey="amount" fill="#0088FE" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>

        {/* Additional KPI Cards */}
        <Col md={4}>
          <Card className="border-0 shadow-sm bg-primary text-white">
            <Card.Body className="p-4">
              <h6 className="opacity-75 small text-uppercase mb-2">Yearly Forecast</h6>
              <h2 className="mb-0">₹{data.stats.totalYearlyINR.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h2>
              <p className="mt-2 mb-0 small opacity-75 text-white">Projected total for next 12 months</p>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="border-0 shadow-sm bg-success text-white">
            <Card.Body className="p-4">
              <h6 className="opacity-75 small text-uppercase mb-2">Daily Average</h6>
              <h2 className="mb-0">₹{(data.stats.totalMonthlyINR / 30).toFixed(0)}</h2>
              <p className="mt-2 mb-0 small opacity-75 text-white">Estimated cost per day</p>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="border-0 shadow-sm bg-info text-white">
            <Card.Body className="p-4">
              <h6 className="opacity-75 small text-uppercase mb-2">Subscription Count</h6>
              <h2 className="mb-0">{data.subscriptions.length}</h2>
              <p className="mt-2 mb-0 small opacity-75 text-white">{data.subscriptions.filter(s => s.Active === 'Yes').length} Active, {data.subscriptions.filter(s => s.Active === 'No').length} Inactive</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}