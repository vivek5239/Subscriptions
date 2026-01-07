import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Container, Nav, Navbar, Offcanvas } from 'react-bootstrap';
import { LayoutDashboard, Calendar, Settings, Menu, CreditCard, PieChart } from 'lucide-react';
import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Subscriptions from './pages/Subscriptions';
import CalendarView from './pages/CalendarView';
import SettingsView from './pages/SettingsView';
import StatsView from './pages/StatsView';

function App() {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <BrowserRouter>
      <div className="bg-light min-vh-100 d-flex flex-column">
        {/* Navigation Bar */}
        <Navbar bg="primary" variant="dark" expand="lg" className="shadow-sm sticky-top">
          <Container fluid>
            <div className="d-flex align-items-center gap-3">
              <button 
                className="btn btn-link text-white p-0 border-0" 
                onClick={() => setShowMenu(true)}
              >
                <Menu size={24} />
              </button>
              <Navbar.Brand className="d-flex align-items-center gap-2 fw-bold" href="/">
                <CreditCard size={24} />
                Subscriptions
              </Navbar.Brand>
            </div>
          </Container>
        </Navbar>

        {/* Sidebar Menu */}
        <Offcanvas show={showMenu} onHide={() => setShowMenu(false)} className="bg-white" style={{ width: 280 }}>
          <Offcanvas.Header closeButton>
            <Offcanvas.Title className="fw-bold text-primary">Menu</Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body className="p-0">
            <Nav className="flex-column p-2">
              <NavLink 
                to="/" 
                className={({ isActive }) => `nav-link d-flex align-items-center gap-3 px-3 py-3 rounded mb-1 ${isActive ? 'bg-primary text-white' : 'text-dark hover-bg-light'}`}
                onClick={() => setShowMenu(false)}
              >
                <LayoutDashboard size={20} /> Dashboard
              </NavLink>
              <NavLink 
                to="/subscriptions" 
                className={({ isActive }) => `nav-link d-flex align-items-center gap-3 px-3 py-3 rounded mb-1 ${isActive ? 'bg-primary text-white' : 'text-dark hover-bg-light'}`}
                onClick={() => setShowMenu(false)}
              >
                <CreditCard size={20} /> All Subscriptions
              </NavLink>
              <NavLink 
                to="/stats" 
                className={({ isActive }) => `nav-link d-flex align-items-center gap-3 px-3 py-3 rounded mb-1 ${isActive ? 'bg-primary text-white' : 'text-dark hover-bg-light'}`}
                onClick={() => setShowMenu(false)}
              >
                <PieChart size={20} /> Statistics
              </NavLink>
              <NavLink 
                to="/calendar" 
                className={({ isActive }) => `nav-link d-flex align-items-center gap-3 px-3 py-3 rounded mb-1 ${isActive ? 'bg-primary text-white' : 'text-dark hover-bg-light'}`}
                onClick={() => setShowMenu(false)}
              >
                <Calendar size={20} /> Calendar
              </NavLink>
              <hr className="my-2" />
              <NavLink 
                to="/settings" 
                className={({ isActive }) => `nav-link d-flex align-items-center gap-3 px-3 py-3 rounded mb-1 ${isActive ? 'bg-primary text-white' : 'text-dark hover-bg-light'}`}
                onClick={() => setShowMenu(false)}
              >
                <Settings size={20} /> Settings
              </NavLink>
            </Nav>
          </Offcanvas.Body>
        </Offcanvas>

        {/* Main Content */}
        <div className="flex-grow-1 w-100">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/stats" element={<StatsView />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/settings" element={<SettingsView />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
