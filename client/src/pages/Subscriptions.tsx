import { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, Table, Container, Badge, Spinner, Button, Stack, Row, Col } from 'react-bootstrap';
import { Plus, Edit2, Trash2, LayoutGrid, List } from 'lucide-react';
import type { Subscription } from '../types';
import { Logo } from '../components/Logo';
import SubscriptionModal from '../components/SubscriptionModal';

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get('/api/subscriptions');
      setSubscriptions(res.data.subscriptions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (subData: Partial<Subscription>) => {
    try {
      await axios.post('/api/subscriptions', subData);
      fetchData();
    } catch (err) {
      console.error('Error saving subscription:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this subscription?')) return;
    try {
      await axios.delete(`/api/subscriptions/${id}`);
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
        <div className="ms-auto d-flex gap-2">
          <div className="btn-group shadow-sm rounded-pill overflow-hidden">
            <Button 
              variant={viewMode === 'table' ? 'primary' : 'light'} 
              size="sm" 
              onClick={() => setViewMode('table')}
              className="px-3"
            >
              <List size={18} />
            </Button>
            <Button 
              variant={viewMode === 'grid' ? 'primary' : 'light'} 
              size="sm" 
              onClick={() => setViewMode('grid')}
              className="px-3"
            >
              <LayoutGrid size={18} />
            </Button>
          </div>
          <Button variant="primary" className="d-flex align-items-center gap-2 rounded-pill shadow-sm" onClick={openAddModal}>
            <Plus size={18} /> <span className="d-none d-sm-inline">Add Subscription</span>
          </Button>
        </div>
      </Stack>

      {viewMode === 'table' ? (
        <Card className="shadow-sm">
          <Table responsive hover className="mb-0 align-middle">
            <thead className="table-light">
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
                <tr key={sub.id} className="bg-transparent">
                  <td className="ps-4">
                    <div className="d-flex align-items-center">
                      <Logo name={sub.Name} url={sub.URL} manualLogo={sub.ManualLogo} />
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
                                  <td>
                  
                    <Badge bg={sub.Active === 'Yes' ? 'success' : 'secondary'} className="rounded-pill">
                      {sub.Active === 'Yes' ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="text-end pe-4">
                    <Stack direction="horizontal" gap={2} className="justify-content-end">
                      <Button variant="link" className="text-muted p-0 hover-opacity-75" onClick={() => openEditModal(sub)}>
                        <Edit2 size={16} />
                      </Button>
                      <Button variant="link" className="text-danger p-0 hover-opacity-75" onClick={() => handleDelete(sub.id)}>
                        <Trash2 size={16} />
                      </Button>
                    </Stack>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ) : (
        <Row className="g-4">
          {subscriptions.map((sub) => (
            <Col key={sub.id} xs={12} sm={6} md={4} lg={3}>
              <Card className="shadow-sm h-100 border-0 hover-shadow transition-all">
                <Card.Body className="p-4 text-center d-flex flex-column align-items-center">
                  <div className="mb-3">
                    <Logo name={sub.Name} url={sub.URL} manualLogo={sub.ManualLogo} size={64} />
                  </div>
                  <h5 className="fw-bold mb-1 text-truncate w-100">{sub.Name}</h5>
                  <div className="text-primary fw-bold fs-4 mb-2">{sub.Price}</div>
                  <div className="mb-3 d-flex gap-1 justify-content-center">
                    <Badge className="bg-info-subtle text-info-emphasis border border-info-subtle rounded-pill fw-medium px-2">
                        {sub.Category}
                    </Badge>
                    <Badge bg={sub.Active === 'Yes' ? 'success' : 'secondary'} className="rounded-pill">
                      {sub.Active === 'Yes' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="mt-auto pt-3 border-top w-100 d-flex justify-content-between align-items-center">
                    <div className="text-start">
                      <div className="text-muted small text-uppercase">Next Due</div>
                      <div className="small fw-medium">{sub['Next Payment'] || 'N/A'}</div>
                    </div>
                    <Stack direction="horizontal" gap={2}>
                      <Button variant="outline-secondary" size="sm" className="rounded-circle p-2" onClick={() => openEditModal(sub)}>
                        <Edit2 size={14} />
                      </Button>
                      <Button variant="outline-danger" size="sm" className="rounded-circle p-2" onClick={() => handleDelete(sub.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </Stack>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <SubscriptionModal 
        show={showModal} 
        onHide={() => setShowModal(false)} 
        onSave={handleSave} 
        subscription={selectedSub}
      />

      <style>{`
        .hover-shadow:hover {
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
          transform: translateY(-5px);
        }
        .transition-all {
          transition: all 0.3s ease-in-out;
        }
        .hover-bg-theme:hover {
          background-color: var(--bs-tertiary-bg);
        }
      `}</style>
    </Container>
  );
}
