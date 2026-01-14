import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { Container, Nav, Navbar, Offcanvas, Button } from 'react-bootstrap';
import { LayoutDashboard, Calendar, Settings, Menu, CreditCard, PieChart, Sun, Moon, LogOut } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Subscriptions from './pages/Subscriptions';
import CalendarView from './pages/CalendarView';
import SettingsView from './pages/SettingsView';
import StatsView from './pages/StatsView';
import AuthPage from './pages/Auth';
import { useTheme } from './context/ThemeContext';
import { useAuth } from './context/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="d-flex justify-content-center align-items-center min-vh-100">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return children;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const [showMenu, setShowMenu] = useState(false);
  const { mode: theme, toggleMode: toggleTheme } = useTheme();
  const { logout, user } = useAuth();

  return (
    <div className="min-vh-100 d-flex flex-column">
      {/* Navigation Bar */}
      <Navbar expand="lg" className="shadow sticky-top bg-gradient-primary navbar-dark py-3">
        <Container fluid>
          <div className="d-flex align-items-center justify-content-between w-100">
            <div className="d-flex align-items-center gap-3">
              <button 
                className="btn btn-link text-white p-0 border-0" 
                onClick={() => setShowMenu(true)}
              >
                <Menu size={28} />
              </button>
              <Navbar.Brand className="d-flex align-items-center gap-2 fw-bold fs-4" href="/">
                <CreditCard size={28} />
                Subscriptions
              </Navbar.Brand>
            </div>
            
            <div className="d-flex align-items-center gap-3">
              <Button 
                variant="link" 
                className="text-white p-0 border-0 shadow-none d-flex align-items-center gap-2 text-decoration-none fw-medium" 
                onClick={toggleTheme}
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                <span className="d-none d-sm-inline">{theme === 'light' ? 'Dark' : 'Light'} Mode</span>
              </Button>
            </div>
          </div>
        </Container>
      </Navbar>

      {/* Sidebar Menu */}
      <Offcanvas show={showMenu} onHide={() => setShowMenu(false)} style={{ width: 280 }}>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title className="fw-bold text-primary">Menu</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-0 d-flex flex-column">
          <Nav className="flex-column p-2 flex-grow-1">
            <div className="px-3 py-2 mb-2 text-muted small">
              Signed in as <br/> <strong>{user?.email}</strong>
            </div>
            <NavLink 
              to="/" 
              className={({ isActive }) => `nav-link d-flex align-items-center gap-3 px-3 py-3 rounded mb-1 ${isActive ? 'bg-primary text-white' : 'hover-bg-theme'}`}
              onClick={() => setShowMenu(false)}
            >
              <LayoutDashboard size={20} /> Dashboard
            </NavLink>
            <NavLink 
              to="/subscriptions" 
              className={({ isActive }) => `nav-link d-flex align-items-center gap-3 px-3 py-3 rounded mb-1 ${isActive ? 'bg-primary text-white' : 'hover-bg-theme'}`}
              onClick={() => setShowMenu(false)}
            >
              <CreditCard size={20} /> All Subscriptions
            </NavLink>
            <NavLink 
              to="/stats" 
              className={({ isActive }) => `nav-link d-flex align-items-center gap-3 px-3 py-3 rounded mb-1 ${isActive ? 'bg-primary text-white' : 'hover-bg-theme'}`}
              onClick={() => setShowMenu(false)}
            >
              <PieChart size={20} /> Statistics
            </NavLink>
            <NavLink 
              to="/calendar" 
              className={({ isActive }) => `nav-link d-flex align-items-center gap-3 px-3 py-3 rounded mb-1 ${isActive ? 'bg-primary text-white' : 'hover-bg-theme'}`}
              onClick={() => setShowMenu(false)}
            >
              <Calendar size={20} /> Calendar
            </NavLink>
            <hr className="my-2" />
            <NavLink 
              to="/settings" 
              className={({ isActive }) => `nav-link d-flex align-items-center gap-3 px-3 py-3 rounded mb-1 ${isActive ? 'bg-primary text-white' : 'hover-bg-theme'}`}
              onClick={() => setShowMenu(false)}
            >
              <Settings size={20} /> Settings
            </NavLink>
          </Nav>
          <div className="p-2 border-top">
            <Button 
              variant="outline-danger" 
              className="w-100 d-flex align-items-center justify-content-center gap-2"
              onClick={() => { logout(); setShowMenu(false); }}
            >
              <LogOut size={18} /> Logout
            </Button>
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      {/* Main Content */}
      <div className="flex-grow-1 w-100 bg-body-tertiary">
        {children}
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/subscriptions" element={
          <ProtectedRoute>
            <AppLayout>
              <Subscriptions />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/stats" element={
          <ProtectedRoute>
            <AppLayout>
              <StatsView />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/calendar" element={
          <ProtectedRoute>
            <AppLayout>
              <CalendarView />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/settings" element={
          <ProtectedRoute>
            <AppLayout>
              <SettingsView />
            </AppLayout>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;


