import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Container, Nav, Navbar, Offcanvas, Button } from 'react-bootstrap';
import { LayoutDashboard, Calendar, Settings, Menu, CreditCard, Sun, Moon } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Reminders from './pages/Reminders';
import CalendarView from './pages/CalendarView';
import SettingsView from './pages/SettingsView';
import { useTheme } from './context/ThemeContext';

function AppLayout({ children }: { children: React.ReactNode }) {
  const [showMenu, setShowMenu] = useState(false);
  const { mode: theme, toggleMode: toggleTheme } = useTheme();

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
                Reminders
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
            <NavLink 
              to="/" 
              className={({ isActive }) => `nav-link d-flex align-items-center gap-3 px-3 py-3 rounded mb-1 ${isActive ? 'bg-primary text-white' : 'hover-bg-theme'}`}
              onClick={() => setShowMenu(false)}
            >
              <LayoutDashboard size={20} /> Dashboard
            </NavLink>
            <NavLink 
              to="/reminders" 
              className={({ isActive }) => `nav-link d-flex align-items-center gap-3 px-3 py-3 rounded mb-1 ${isActive ? 'bg-primary text-white' : 'hover-bg-theme'}`}
              onClick={() => setShowMenu(false)}
            >
              <CreditCard size={20} /> All Reminders
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
        <Route path="/" element={
            <AppLayout>
              <Dashboard />
            </AppLayout>
        } />
        
        <Route path="/reminders" element={
            <AppLayout>
              <Reminders />
            </AppLayout>
        } />
        
        <Route path="/calendar" element={
            <AppLayout>
              <CalendarView />
            </AppLayout>
        } />
        
        <Route path="/settings" element={
            <AppLayout>
              <SettingsView />
            </AppLayout>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;


