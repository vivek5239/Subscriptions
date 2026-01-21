import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { Card, Table, Container, Badge, Spinner, Button, Stack, Row, Col, Form } from 'react-bootstrap';
import { Plus, Edit2, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { Reminder } from '../types';
import ReminderModal from '../components/ReminderModal';

const CATEGORIES = [
  'General', 'Work', 'Personal', 'Health', 'Finance', 'Appointments',
  'Study', 'Travel', 'Shopping', 'Other', 'Imported'
];

export default function Reminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Reminder | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const location = useLocation();
  const highlightedRef = useRef<HTMLTableRowElement>(null);
  const [selectedReminders, setSelectedReminders] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<keyof Reminder>('Next Payment');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Yes' | 'No'>('All');
  const [filterDate, setFilterDate] = useState<string>(''); // YYYY-MM-DD

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = reminders.map(rem => rem.id);
      setSelectedReminders(allIds);
    } else {
      setSelectedReminders([]);
    }
  };

  const handleSelectReminder = (id: string) => {
    setSelectedReminders(prev => 
      prev.includes(id) ? prev.filter(remId => remId !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedReminders.length} selected reminders?`)) return;
    try {
      await Promise.all(selectedReminders.map(id => axios.delete(`/api/reminders/${id}`)));
      setSelectedReminders([]);
      fetchData();
    } catch (err) {
      console.error('Error bulk deleting reminders:', err);
    }
  };

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

  // Sorting logic
  const handleSort = (columnKey: keyof Reminder) => {
    if (sortBy === columnKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnKey);
      setSortOrder('asc');
    }
  };

  const getFilteredAndSortedReminders = () => {
    let filtered = [...reminders];

    // Apply category filter
    if (filterCategory !== 'All') {
      filtered = filtered.filter(rem => rem.Category === filterCategory);
    }

    // Apply status filter
    if (filterStatus !== 'All') {
      filtered = filtered.filter(rem => rem.Active === filterStatus);
    }

    // Apply date filter
    if (filterDate) {
      filtered = filtered.filter(rem => rem['Next Payment'] === filterDate);
    }

    return filtered.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (sortBy === 'Next Payment') {
        const dateA = new Date(aValue as string).getTime();
        const dateB = new Date(bValue as string).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      // Fallback for types not explicitly handled or mixed types, just compare as strings
      return sortOrder === 'asc' 
        ? String(aValue).localeCompare(String(bValue)) 
        : String(bValue).localeCompare(String(aValue));
    });
  };

  const renderSortableHeader = (columnKey: keyof Reminder, label: string) => (
      <th 
        className="py-3 text-muted small text-uppercase cursor-pointer user-select-none" 
        onClick={() => handleSort(columnKey)}
      >
          {label}
          {sortBy === columnKey && (
              sortOrder === 'asc' ? <ArrowUp size={14} className="ms-1" /> : <ArrowDown size={14} className="ms-1" />
          )}
          {sortBy !== columnKey && <ArrowUpDown size={14} className="ms-1 text-muted" />}
      </th>
  );

  if (loading) return <Spinner animation="border" className="m-5" />;

  return (
    <Container className="py-4">
      <Stack direction="horizontal" gap={3} className="mb-4">
        <h4 className="mb-0 fw-bold">Reminders</h4>
        <div className="ms-auto d-flex gap-2">
          {selectedReminders.length > 0 && (
            <Button variant="danger" className="d-flex align-items-center gap-2 rounded-pill shadow-sm" onClick={handleBulkDelete}>
              <Trash2 size={18} /> <span className="d-none d-sm-inline">Delete Selected ({selectedReminders.length})</span>
            </Button>
          )}
          <Button variant="primary" className="d-flex align-items-center gap-2 rounded-pill shadow-sm" onClick={openAddModal}>
            <Plus size={18} /> <span className="d-none d-sm-inline">Add Reminder</span>
          </Button>
        </div>
      </Stack>

      {/* Filter Options */}
      <Row className="mb-3 g-3">
        <Col md={4}>
          <Form.Group>
            <Form.Label className="small text-muted">Filter by Category</Form.Label>
            <Form.Select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="All">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label className="small text-muted">Filter by Status</Form.Label>
            <Form.Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as 'All' | 'Yes' | 'No')}>
              <option value="All">All Statuses</option>
              <option value="Yes">Active</option>
              <option value="No">Inactive</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label className="small text-muted">Filter by Date</Form.Label>
            <Form.Control 
              type="date" 
              value={filterDate} 
              onChange={(e) => setFilterDate(e.target.value)} 
            />
          </Form.Group>
        </Col>
      </Row>

      <Card className="shadow-sm">
        <Table responsive hover className="mb-0 align-middle">
          <thead className="table-light">
            <tr>
              <th className="ps-4 py-3" style={{ width: '1%' }}>
                <Form.Check 
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={selectedReminders.length === reminders.length && reminders.length > 0}
                />
              </th>
              {renderSortableHeader('Name', 'Name')}
              {renderSortableHeader('Next Payment', 'Next Payment')}
              {renderSortableHeader('Category', 'Category')}
              <th className="py-3 text-muted small text-uppercase">Status</th>
              <th className="py-3 text-muted small text-uppercase text-end pe-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {getFilteredAndSortedReminders().map((rem) => (
              <tr 
                key={rem.id} 
                ref={rem.id === highlightedId ? highlightedRef : null}
                className={rem.id === highlightedId ? 'highlight' : ''}
              >
                <td>
                  <Form.Check 
                    type="checkbox"
                    checked={selectedReminders.includes(rem.id)}
                    onChange={() => handleSelectReminder(rem.id)}
                    className="ms-4"
                  />
                </td>
                <td className="ps-0">
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
