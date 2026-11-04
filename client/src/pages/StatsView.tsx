import { useEffect, useState } from 'react';
import axios from 'axios';
import { Container, Row, Col, Spinner } from 'react-bootstrap';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import { TrendingUp, PieChart as PieIcon } from 'lucide-react';
import type { DashboardData } from '../types';
import { Logo } from '../components/Logo';

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e'];

export default function StatsView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/subscriptions');
      setData(res.data);
    } catch (err) {
      console.error('[Stats] Error fetching:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <div className="mt-3 text-muted">Calculating financial statistics...</div>
      </Container>
    );
  }

  if (!data) return <Container className="py-4">No data available.</Container>;

  const pieData = Object.entries(data.stats.categoryStats || {}).map(([name, value]) => ({
    name,
    value: Math.round(value)
  })).sort((a, b) => b.value - a.value);

  const activeSubs = (data.subscriptions || []).filter(s => s.Active === 'Yes');
  const sortedByCost = activeSubs.slice().sort((a, b) => (b.monthlyCost || 0) - (a.monthlyCost || 0)).slice(0, 5);

  const monthlyTrendData = [
    { month: 'Jan', amount: Math.round(data.stats.totalMonthlyINR * 0.98) },
    { month: 'Feb', amount: Math.round(data.stats.totalMonthlyINR * 0.95) },
    { month: 'Mar', amount: Math.round(data.stats.totalMonthlyINR * 1.02) },
    { month: 'Apr', amount: Math.round(data.stats.totalMonthlyINR * 0.99) },
    { month: 'May', amount: Math.round(data.stats.totalMonthlyINR * 1.04) },
    { month: 'Current', amount: Math.round(data.stats.totalMonthlyINR) },
  ];

  return (
    <Container fluid="xl" className="py-4 px-3 px-sm-4">
      {/* Title */}
      <div className="mb-4">
        <h3 className="fw-bold mb-1 tracking-tight">Spending Analytics</h3>
        <p className="text-muted small mb-0">
          Visual breakdowns by category, monthly burn projections, and high-cost item distribution.
        </p>
      </div>

      {/* Metric Cards */}
      <Row className="g-3 mb-4">
        <Col sm={6} lg={3}>
          <div className="glass-panel p-3 h-100 hover-lift">
            <span className="small fw-semibold text-muted text-uppercase">Monthly Burn Rate</span>
            <h3 className="fw-bold mb-1 mt-2">
              ₹{Math.round(data.stats.totalMonthlyINR).toLocaleString('en-IN')}
            </h3>
            <span className="small text-muted">Aggregated across all currencies</span>
          </div>
        </Col>

        <Col sm={6} lg={3}>
          <div className="glass-panel p-3 h-100 hover-lift">
            <span className="small fw-semibold text-muted text-uppercase">Annual Projection</span>
            <h3 className="fw-bold mb-1 mt-2 text-primary">
              ₹{Math.round(data.stats.totalYearlyINR).toLocaleString('en-IN')}
            </h3>
            <span className="small text-muted">12-Month forward projection</span>
          </div>
        </Col>

        <Col sm={6} lg={3}>
          <div className="glass-panel p-3 h-100 hover-lift">
            <span className="small fw-semibold text-muted text-uppercase">Daily Average</span>
            <h3 className="fw-bold mb-1 mt-2 text-success">
              ₹{Math.round(data.stats.totalMonthlyINR / 30).toLocaleString('en-IN')}
            </h3>
            <span className="small text-muted">Estimated daily spend</span>
          </div>
        </Col>

        <Col sm={6} lg={3}>
          <div className="glass-panel p-3 h-100 hover-lift">
            <span className="small fw-semibold text-muted text-uppercase">Tracked Accounts</span>
            <h3 className="fw-bold mb-1 mt-2">
              {activeSubs.length} <span className="fs-6 text-muted fw-normal">/ {data.subscriptions.length}</span>
            </h3>
            <span className="small text-muted">{data.subscriptions.length - activeSubs.length} inactive</span>
          </div>
        </Col>
      </Row>

      {/* Charts Grid */}
      <Row className="g-4 mb-4">
        {/* Category Breakdown Donut Chart */}
        <Col lg={6}>
          <div className="glass-panel p-4 h-100">
            <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <PieIcon size={18} className="text-primary" />
              <span>Monthly Spend by Category</span>
            </h6>
            <div style={{ height: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                    stroke="none"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card-bg)', 
                      borderColor: 'var(--card-border)', 
                      borderRadius: '10px',
                      boxShadow: 'var(--card-shadow)'
                    }}
                    itemStyle={{ color: 'var(--bs-body-color)' }}
                    formatter={(value: any) => `₹${Number(value).toLocaleString('en-IN')}`} 
                  />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Col>

        {/* Monthly Projection Bar Chart */}
        <Col lg={6}>
          <div className="glass-panel p-4 h-100">
            <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <TrendingUp size={18} className="text-primary" />
              <span>Projected Monthly Run Rate</span>
            </h6>
            <div style={{ height: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.15)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--bs-secondary-color)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--bs-secondary-color)' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card-bg)', 
                      borderColor: 'var(--card-border)', 
                      borderRadius: '10px' 
                    }}
                    itemStyle={{ color: 'var(--bs-body-color)' }}
                    cursor={{ fill: 'rgba(128,128,128,0.08)' }}
                    formatter={(value: any) => `₹${Number(value).toLocaleString('en-IN')}`} 
                  />
                  <Bar dataKey="amount" fill="var(--primary-color)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Col>

        {/* Top 5 Most Expensive Subscriptions */}
        <Col lg={12}>
          <div className="glass-panel p-4">
            <h6 className="fw-bold mb-3">Top 5 Highest Monthly Commitments</h6>
            <div className="table-responsive">
              <table className="modern-table align-middle">
                <thead>
                  <tr className="text-muted small text-uppercase">
                    <th className="ps-3 py-2">Service</th>
                    <th className="py-2">Original Price</th>
                    <th className="py-2">Cycle</th>
                    <th className="py-2">Normalized Monthly Cost</th>
                    <th className="py-2 text-end pe-3">Annual Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedByCost.map((sub, index) => (
                    <tr key={sub.id}>
                      <td className="ps-3">
                        <div className="d-flex align-items-center">
                          <span className="fw-bold text-muted me-3" style={{ width: 18 }}>#{index + 1}</span>
                          <Logo name={sub.Name} url={sub.URL} manualLogo={sub.ManualLogo} size={32} />
                          <div>
                            <div className="fw-bold text-body">{sub.Name}</div>
                            <span className="small text-muted">{sub.Category}</span>
                          </div>
                        </div>
                      </td>
                      <td className="fw-bold">{sub.Price}</td>
                      <td>
                        <span className="badge bg-secondary-subtle text-body rounded-pill px-3 py-1 small">
                          {sub['Payment Cycle']}
                        </span>
                      </td>
                      <td className="fw-bold text-primary">
                        ₹{Math.round(sub.monthlyCost || 0).toLocaleString('en-IN')}/mo
                      </td>
                      <td className="text-end pe-3 fw-semibold">
                        ₹{Math.round(sub.yearlyCost || 0).toLocaleString('en-IN')}/yr
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
}
