import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { Card, Table, Container, Badge, Spinner, Button, Stack } from 'react-bootstrap';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import type { Reminder } from '../types';
import ReminderModal from '../components/ReminderModal';

export default function Reminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Reminder | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const location = useLocation();
  const highlightedRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (location.state?.newReminderId) {
      setHighlightedId(location.state.newReminderId);
      // Remove the highlight after the animation
      const timer = setTimeout(() => {
        setHighlightedId(null);
        // Clean up location state to prevent re-highlighting on refresh
        window.history.replaceState({}, document.title)
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [location.state]);

  useEffect(() => {
    if (highlightedId && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedId, reminders]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/reminders');
      setReminders(res.data.reminders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (remData: Partial<Reminder>) => {
    try {
      await axios.post('/api/reminders', remData);
      fetchData();
    } catch (err) {
      console.error('Error saving reminder:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this reminder?')) return;
    try {
      await axios.delete(`/api/reminders/${id}`);
      fetchData();
    } catch (err) {
      console.error('Error deleting reminder:', err);
    }
  };

  const openAddModal = () => {
    setSelectedSub(null);
    setShowModal(true);
  };

  const openEditModal = (rem: Reminder) => {
    setSelectedSub(rem);
    setShowModal(true);
  };

  if (loading) return <Spinner animation="border" className="m-5" />;

  return (
    <Container className="py-4">
      <Stack direction="horizontal" gap={3} className="mb-4">
        <h4 className="mb-0 fw-bold">Reminders</h4>
        <div className="ms-auto d-flex gap-2">
          <Button variant="primary" className="d-flex align-items-center gap-2 rounded-pill shadow-sm" onClick={openAddModal}>
            <Plus size={18} /> <span className="d-none d-sm-inline">Add Reminder</span>
          </Button>
        </div>
      </Stack>

      <Card className="shadow-sm">
        <Table responsive hover className="mb-0 align-middle">
          <thead className="table-light">
            <tr>
              <th className="ps-4 py-3 text-muted small text-uppercase">Name</th>
              <th className="py-3 text-muted small text-uppercase">Next Payment</th>
              <th className="py-3 text-muted small text-uppercase">Category</th>
              <th className="py-3 text-muted small text-uppercase">Status</th>
              <th className="py-3 text-muted small text-uppercase text-end pe-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reminders.map((rem) => (
              <tr 
                key={rem.id} 
                ref={rem.id === highlightedId ? highlightedRef : null}
                className={rem.id === highlightedId ? 'highlight' : ''}
              >
                <td className="ps-4">
                  <div className="d-flex align-items-center">
                    <span className="fw-medium">{rem.Name}</span>
                  </div>
                </td>
                <td className="small text-muted">{rem['Next Payment']}</td>
                <td>
                  <Badge className="bg-info-remtle text-info-emphasis border border-info-remtle rounded-pill fw-medium px-3">
                    {rem.Category}
                  </Badge>
                </td>
                <td>
                  <Badge bg={rem.Active === 'Yes' ? 'success' : 'secondary'} className="rounded-pill">
                    {rem.Active === 'Yes' ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="text-end pe-4">
                  <Stack direction="horizontal" gap={2} className="justify-content-end">
                    <Button variant="link" className="text-muted p-0 hover-opacity-75" onClick={() => openEditModal(rem)}>
                      <Edit2 size={16} />
                    </Button>
                    <Button variant="link" className="text-danger p-0 hover-opacity-75" onClick={() => handleDelete(rem.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </Stack>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <ReminderModal 
        show={showModal} 
        onHide={() => setShowModal(false)} 
        onSave={handleSave} 
        reminder={selectedSub}
      />
    </Container>
  );
}
