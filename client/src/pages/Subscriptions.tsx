import { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, Table, Container, Badge, Spinner, Button, Stack } from 'react-bootstrap';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Subscription } from '../types';
import { Logo } from '../components/Logo';
import SubscriptionModal from '../components/SubscriptionModal';

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);

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

  const handleSave = async (subData: Partial<Subscription>) => {
    try {
      await axios.post('http://localhost:5000/api/subscriptions', subData);
      fetchData();
    } catch (err) {
      console.error('Error saving subscription:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this subscription?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/subscriptions/${id}`);
      fetchData();
    } catch (err) {
      console.error('Error deleting subscription:', err);
    }
  };

  const openAddModal = () => {
    setSelectedSub(null);
    setShowModal(true);
  };

  const openEditModal = (sub: Subscription) => {
    setSelectedSub(sub);
    setShowModal(true);
  };

  if (loading) return <Spinner animation="border" className="m-5" />;

  return (
    <Container className="py-4">
      <Stack direction="horizontal" gap={3} className="mb-4">
        <h4 className="mb-0 fw-bold">Subscriptions</h4>
        <Button variant="primary" className="ms-auto d-flex align-items-center gap-2 rounded-pill" onClick={openAddModal}>
          <Plus size={18} /> Add Subscription
        </Button>
      </Stack>

      <Card className="border-0 shadow-sm">
        <Table responsive hover className="mb-0 align-middle table-borderless">
          <thead className="bg-light">
            <tr>
              <th className="ps-4 py-3 text-muted small text-uppercase">Name</th>
              <th className="py-3 text-muted small text-uppercase">Cost</th>
              <th className="py-3 text-muted small text-uppercase">Cycle</th>
              <th className="py-3 text-muted small text-uppercase">Next Payment</th>
              <th className="py-3 text-muted small text-uppercase">Category</th>
              <th className="py-3 text-muted small text-uppercase">Status</th>
              <th className="py-3 text-muted small text-uppercase text-end pe-4">Actions</th>
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
                <td>
                  <Badge bg={sub.Active === 'Yes' ? 'success' : 'secondary'} className="rounded-pill">
                    {sub.Active === 'Yes' ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="text-end pe-4">
                  <Stack direction="horizontal" gap={2} className="justify-content-end">
                    <Button variant="link" className="text-muted p-0" onClick={() => openEditModal(sub)}>
                      <Edit2 size={16} />
                    </Button>
                    <Button variant="link" className="text-danger p-0" onClick={() => handleDelete(sub.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </Stack>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <SubscriptionModal 
        show={showModal} 
        onHide={() => setShowModal(false)} 
        onSave={handleSave} 
        subscription={selectedSub}
      />
    </Container>
  );
}
