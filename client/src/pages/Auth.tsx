import { useState } from 'react';
import { Container, Card, Form, Button, Tab, Tabs, Alert } from 'react-bootstrap';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CreditCard } from 'lucide-react';

export default function AuthPage() {
  const [key, setKey] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      let res;
      if (key === 'login') {
        res = await axios.post('/api/auth/login', { email, password });
      } else {
        res = await axios.post('/api/auth/register', { name, email, password });
      }

      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed');
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const res = await axios.post('/api/auth/google', { token: credentialResponse.credential });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Google authentication failed');
    }
  };

  return (
    <Container className="d-flex align-items-center justify-content-center min-vh-100 bg-body-tertiary">
      <Card className="shadow-lg border-0" style={{ maxWidth: '400px', width: '100%' }}>
        <Card.Body className="p-4">
          <div className="text-center mb-4">
            <div className="bg-primary bg-gradient d-inline-flex p-3 rounded-circle mb-3">
              <CreditCard className="text-white" size={32} />
            </div>
            <h4 className="fw-bold">Welcome</h4>
            <p className="text-muted">Manage your subscriptions efficiently</p>
          </div>

          {error && <Alert variant="danger">{error}</Alert>}

          <Tabs
            id="auth-tabs"
            activeKey={key}
            onSelect={(k) => setKey(k || 'login')}
            className="mb-3 nav-justified"
          >
            <Tab eventKey="login" title="Sign In">
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control 
                    type="email" 
                    placeholder="name@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <Form.Control 
                    type="password" 
                    placeholder="Password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </Form.Group>
                <Button variant="primary" type="submit" className="w-100 mb-3 rounded-pill fw-bold">
                  Sign In
                </Button>
              </Form>
            </Tab>
            <Tab eventKey="register" title="Sign Up">
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Full Name</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="John Doe" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control 
                    type="email" 
                    placeholder="name@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <Form.Control 
                    type="password" 
                    placeholder="Create a password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </Form.Group>
                <Button variant="success" type="submit" className="w-100 mb-3 rounded-pill fw-bold">
                  Create Account
                </Button>
              </Form>
            </Tab>
          </Tabs>

          <div className="position-relative my-4">
            <hr />
            <span className="position-absolute top-50 start-50 translate-middle px-2 bg-white text-muted small">
              OR
            </span>
          </div>

          <div className="d-flex justify-content-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google Login Failed')}
              useOneTap
            />
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}
