import { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, Table, Container, Badge, Spinner } from 'react-bootstrap';
import { Subscription } from '../types';
import { Logo } from '../components/Logo';

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/subscriptions');
      setSubscriptions(res.data.subscriptions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spinner animation="border" className="m-5" />;

  return (
    <Container className="py-4">
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white py-3">
          <h5 className="mb-0">All Subscriptions</h5>
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
            {subscriptions.map((sub) => (
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
    </Container>
  );
}
