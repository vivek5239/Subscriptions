import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, Container, Row, Col, Badge, Spinner, Button, Form, InputGroup } from 'react-bootstrap';
import { CheckCircle, PlusCircle, Clock, CalendarX } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import type { DashboardData, Reminder } from '../types';

interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [nlReminderText, setNlReminderText] = useState('');
  const [nlReminderLoading, setNlReminderLoading] = useState(false);
  const [aiConversation, setAiConversation] = useState<ConversationTurn[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get('/api/reminders');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      // For a non-financial reminder app, "Mark as Paid" is now "Mark as Done"
      // which can be implemented by simply deleting the reminder.
      // A more sophisticated approach could be to move it to a "completed" list.
      if (window.confirm('Mark this reminder as done? This will remove it from the list.')) {
        await axios.delete(`/api/reminders/${id}`);
        fetchData();
      }
    } catch (err) {
      console.error('Error marking as done:', err);
    }
  };

  const handleNlReminderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlReminderText.trim()) return;

    const config = JSON.parse(localStorage.getItem('rem_app_config') || '{}');
    if (!config.groqApiKey) {
      alert('Please set your Groq API Key in Settings first!');
      return;
    }

    setNlReminderLoading(true);

    const userTurn: ConversationTurn = { role: 'user', content: nlReminderText };
    const updatedConversation = [...aiConversation, userTurn];
    
    // Construct the full text for the AI
    const textForAi = updatedConversation.map(turn => `${turn.role}: ${turn.content}`).join('\n');

    try {
      const res = await axios.post('/api/ai/create-reminder', {
        text: textForAi,
        apiKey: config.groqApiKey
      });

      if (res.data.question) {
        // AI is asking a question
        setAiConversation([...updatedConversation, { role: 'assistant', content: res.data.question }]);
        setNlReminderText('');
      } else {
        // AI created a reminder
        const newReminder = res.data;
        alert('AI has successfully created your reminder!');
        setAiConversation([]);
        setNlReminderText('');
        navigate('/reminders', { state: { newReminderId: newReminder.id } });
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create reminder via AI');
      // Optionally reset conversation on error
      // setAiConversation([]);
    } finally {
      setNlReminderLoading(false);
    }
  };

  if (loading) return <Spinner animation="border" className="m-5" />;

  const allReminders = data?.reminders || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingReminders = allReminders
    .filter(rem => {
      if (rem.Active !== 'Yes' || !rem['Next Payment']) return false;
      const dueDate = parseISO(rem['Next Payment']);
      return dueDate >= today;
    })
    .sort((a, b) => parseISO(a['Next Payment']).getTime() - parseISO(b['Next Payment']).getTime());

  const pastReminders = allReminders
    .filter(rem => {
      if (rem.Active !== 'Yes' || !rem['Next Payment']) return false;
      const dueDate = parseISO(rem['Next Payment']);
      return dueDate < today;
    })
    .sort((a, b) => parseISO(b['Next Payment']).getTime() - parseISO(a['Next Payment']).getTime()); // Sort by most recent past reminder first

  const renderReminderList = (reminders: Reminder[], isPast: boolean = false) => (
    <div className="list-group list-group-flush">
      {reminders.length > 0 ? (
        reminders.map(rem => {
          const daysLeft = differenceInDays(parseISO(rem['Next Payment']), new Date());
          const isOverdue = daysLeft < 0;
          const isToday = daysLeft === 0;

          return (
            <div key={rem.id} className="list-group-item px-3 py-3 bg-transparent border-0 border-bottom">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <div className="d-flex align-items-center">
                   <span className="fw-medium">{rem.Name}</span>
                </div>
              </div>
              <div className="d-flex justify-content-between align-items-center small mt-2">
                <span className="text-muted">{format(parseISO(rem['Next Payment']), 'MMM dd, yyyy')}</span>
                {!isPast && (
                  <div className="d-flex align-items-center gap-2">
                    <Badge bg={isOverdue ? 'danger' : isToday ? 'warning' : 'info'} className="rounded-pill">
                      {isOverdue ? `Overdue ${Math.abs(daysLeft)}d` : isToday ? 'Today' : `In ${daysLeft} days`}
                    </Badge>
                    <Button
                      variant="outline-success"
                      size="sm"
                      className="rounded-circle p-1 d-flex align-items-center justify-content-center"
                      style={{ width: 24, height: 24 }}
                      title="Mark as Done"
                      onClick={() => handleMarkPaid(rem.id)}
                    >
                      <CheckCircle size={14} />
                    </Button>
                  </div>
                )}
                 {isPast && (
                    <Badge bg="secondary" className="rounded-pill">
                        Past
                    </Badge>
                 )}
              </div>
            </div>
          );
        })
      ) : (
        <div className="p-4 text-center text-muted">No reminders found.</div>
      )}
    </div>
  );

  return (
    <Container className="py-4">
        {/* Groq AI Natural Language Input */}
        <Card className="shadow-sm mb-4">
            <Card.Body className="p-3">
                {aiConversation.length > 0 && (
                  <div className="mb-3 p-3 bg-light rounded">
                    {aiConversation.map((turn, index) => (
                      <div key={index} className={`d-flex flex-column ${turn.role === 'user' ? 'align-items-end' : 'align-items-start'}`}>
                        <div className={`p-2 rounded mb-2 ${turn.role === 'user' ? 'bg-primary text-white' : 'bg-secondary text-white'}`}>
                          {turn.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Form onSubmit={handleNlReminderSubmit}>
                    <InputGroup>
                        <Form.Control
                            type="text"
                            placeholder={aiConversation.length > 0 ? "Answer the AI's question..." : "Create a reminder... e.g., 'Pay electricity bill on the 25th of every month'"}
                            value={nlReminderText}
                            onChange={(e) => setNlReminderText(e.target.value)}
                            disabled={nlReminderLoading}
                        />
                        <Button variant="primary" type="submit" disabled={nlReminderLoading}>
                            {nlReminderLoading ? <Spinner size="sm" animation="border" /> : <PlusCircle size={20} />}
                            <span className="d-none d-sm-inline ms-2">Create Reminder</span>
                        </Button>
                    </InputGroup>
                </Form>
            </Card.Body>
        </Card>

        <Row className="g-4">
          {/* Upcoming Reminders */}
          <Col lg={6}>
            <Card className="shadow-sm h-100">
              <Card.Header className="bg-transparent py-3 border-bottom-0">
                <h6 className="mb-0 fw-bold d-flex align-items-center gap-2">
                  <Clock size={18} className="text-primary" />
                  Upcoming Reminders
                </h6>
              </Card.Header>
              {renderReminderList(upcomingReminders)}
            </Card>
          </Col>

          {/* Past Reminders */}
          <Col lg={6}>
            <Card className="shadow-sm h-100">
              <Card.Header className="bg-transparent py-3 border-bottom-0">
                <h6 className="mb-0 fw-bold d-flex align-items-center gap-2">
                  <CalendarX size={18} className="text-secondary" />
                  Past Reminders
                </h6>
              </Card.Header>
              {renderReminderList(pastReminders, true)}
            </Card>
          </Col>
        </Row>
    </Container>
  );

}
