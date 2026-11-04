import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Link, Navigate } from 'react-router-dom';
import { Container, Navbar, Offcanvas, Dropdown } from 'react-bootstrap';
import { 
  LayoutDashboard, 
  CreditCard, 
  Calendar, 
  PieChart, 
  Settings as SettingsIcon, 
  Menu, 
  Sun, 
  Moon, 
  Sparkles,
  Palette
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Subscriptions from './pages/Subscriptions';
import CalendarView from './pages/CalendarView';
import StatsView from './pages/StatsView';
import SettingsView from './pages/SettingsView';
import { useTheme, type ThemeColor } from './context/ThemeContext';

function AppLayout({ children }: { children: React.ReactNode }) {
  const [showMenu, setShowMenu] = useState(false);
  const { mode: theme, toggleMode: toggleTheme, color: currentColor, setColor } = useTheme();

  const colorOptions: { id: ThemeColor; label: string; bg: string }[] = [
    { id: 'purple', label: 'Indigo / Purple', bg: '#6366f1' },
    { id: 'blue', label: 'Sky Blue', bg: '#3b82f6' },
    { id: 'green', label: 'Emerald Green', bg: '#10b981' },
    { id: 'orange', label: 'Sunset Orange', bg: '#f97316' },
    { id: 'red', label: 'Crimson Red', bg: '#ef4444' },
    { id: 'slate', label: 'Cool Slate', bg: '#64748b' },
  ];

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ background: 'var(--bs-body-bg)' }}>
      {/* Modern Sticky Navigation Bar */}
      <Navbar 
        expand="lg" 
        className="sticky-top border-bottom py-2 shadow-sm"
        style={{ 
          backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderColor: 'var(--bs-border-color)'
        }}
      >
        <Container fluid="xl" className="px-3 px-sm-4">
          <div className="d-flex align-items-center justify-content-between w-100">
            {/* Left: Brand & Mobile Toggle */}
            <div className="d-flex align-items-center gap-3">
              <button 
                className="btn btn-link text-body p-1 d-lg-none border-0 shadow-none" 
                onClick={() => setShowMenu(true)}
                aria-label="Open navigation menu"
              >
                <Menu size={24} />
              </button>

              <Link to="/" className="text-decoration-none d-flex align-items-center gap-2">
                <div 
                  className="d-flex align-items-center justify-content-center rounded-3 p-2" 
                  style={{
                    background: 'var(--primary-gradient)',
                    color: '#fff',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)'
                  }}
                >
                  <CreditCard size={20} className="text-white" />
                </div>
                <div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-bold fs-5 text-body tracking-tight">Subscriptions</span>
                    <span 
                      className="badge rounded-pill text-white" 
                      style={{ background: 'var(--primary-gradient)', fontSize: '0.65rem' }}
                    >
                      v2.2
                    </span>
                  </div>
                  <div className="d-none d-sm-flex align-items-center gap-1 text-muted" style={{ fontSize: '0.7rem' }}>
                    <Sparkles size={11} className="text-primary" />
                    <span>Powered by Gemini AI</span>
                  </div>
                </div>
              </Link>
            </div>

            {/* Center: Desktop Navigation Links */}
            <div className="d-none d-lg-flex align-items-center gap-1 bg-body-tertiary p-1 rounded-pill border">
              <NavLink 
                to="/" 
                end
                className={({ isActive }) => 
                  `btn btn-sm rounded-pill px-3 py-1 fw-medium text-decoration-none d-flex align-items-center gap-2 transition-all ${
                    isActive 
                      ? 'btn-primary text-white shadow-sm' 
                      : 'text-body-secondary btn-link text-decoration-none'
                  }`
                }
              >
                <LayoutDashboard size={16} />
                <span>Dashboard</span>
              </NavLink>

              <NavLink 
                to="/subscriptions" 
                className={({ isActive }) => 
                  `btn btn-sm rounded-pill px-3 py-1 fw-medium text-decoration-none d-flex align-items-center gap-2 transition-all ${
                    isActive 
                      ? 'btn-primary text-white shadow-sm' 
                      : 'text-body-secondary btn-link text-decoration-none'
                  }`
                }
              >
                <CreditCard size={16} />
                <span>All Subscriptions</span>
              </NavLink>

              <NavLink 
                to="/calendar" 
                className={({ isActive }) => 
                  `btn btn-sm rounded-pill px-3 py-1 fw-medium text-decoration-none d-flex align-items-center gap-2 transition-all ${
                    isActive 
                      ? 'btn-primary text-white shadow-sm' 
                      : 'text-body-secondary btn-link text-decoration-none'
                  }`
                }
              >
                <Calendar size={16} />
                <span>Calendar</span>
              </NavLink>

              <NavLink 
                to="/stats" 
                className={({ isActive }) => 
                  `btn btn-sm rounded-pill px-3 py-1 fw-medium text-decoration-none d-flex align-items-center gap-2 transition-all ${
                    isActive 
                      ? 'btn-primary text-white shadow-sm' 
                      : 'text-body-secondary btn-link text-decoration-none'
                  }`
                }
              >
                <PieChart size={16} />
                <span>Analytics</span>
              </NavLink>

              <NavLink 
                to="/settings" 
                className={({ isActive }) => 
                  `btn btn-sm rounded-pill px-3 py-1 fw-medium text-decoration-none d-flex align-items-center gap-2 transition-all ${
                    isActive 
                      ? 'btn-primary text-white shadow-sm' 
                      : 'text-body-secondary btn-link text-decoration-none'
                  }`
                }
              >
                <SettingsIcon size={16} />
                <span>Settings</span>
              </NavLink>
            </div>

            {/* Right: Quick Actions & Appearance Tools */}
            <div className="d-flex align-items-center gap-2">
              {/* Color Accent Picker */}
              <Dropdown align="end">
                <Dropdown.Toggle 
                  variant="link" 
                  className="btn btn-sm btn-icon text-body p-2 border-0 shadow-none d-flex align-items-center"
                  id="dropdown-theme-color"
                  title="Change Theme Accent Color"
                >
                  <Palette size={18} />
                </Dropdown.Toggle>
                <Dropdown.Menu className="shadow-lg border p-2" style={{ minWidth: '180px' }}>
                  <div className="px-2 py-1 small fw-bold text-muted text-uppercase" style={{ fontSize: '0.7rem' }}>
                    Accent Color
                  </div>
                  {colorOptions.map(opt => (
                    <Dropdown.Item 
                      key={opt.id}
                      onClick={() => setColor(opt.id)}
                      className={`d-flex align-items-center justify-content-between rounded px-2 py-1 small ${
                        currentColor === opt.id ? 'active' : ''
                      }`}
                    >
                      <div className="d-flex align-items-center gap-2">
                        <span 
                          className="rounded-circle border" 
                          style={{ width: 12, height: 12, backgroundColor: opt.bg }}
                        />
                        <span>{opt.label}</span>
                      </div>
                      {currentColor === opt.id && <span className="small">✓</span>}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>

              {/* Light/Dark Toggle */}
              <button 
                className="btn btn-sm btn-icon text-body p-2 rounded-circle hover-bg-theme border-0 shadow-none"
                onClick={toggleTheme}
                title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
                aria-label="Toggle dark mode"
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} className="text-warning" />}
              </button>
            </div>
          </div>
        </Container>
      </Navbar>

      {/* Mobile Offcanvas Drawer */}
      <Offcanvas 
        show={showMenu} 
        onHide={() => setShowMenu(false)} 
        placement="start"
        style={{ width: 290 }}
      >
        <Offcanvas.Header closeButton className="border-bottom">
          <div className="d-flex align-items-center gap-2">
            <div 
              className="d-flex align-items-center justify-content-center rounded-3 p-2" 
              style={{ background: 'var(--primary-gradient)', color: '#fff' }}
            >
              <CreditCard size={18} />
            </div>
            <div>
              <div className="fw-bold fs-6">Subscriptions</div>
              <div className="small text-muted" style={{ fontSize: '0.7rem' }}>Gemini AI Edition</div>
            </div>
          </div>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-3 d-flex flex-column justify-content-between">
          <div className="d-flex flex-column gap-1">
            <NavLink 
              to="/" 
              end
              className={({ isActive }) => 
                `nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-3 text-decoration-none ${
                  isActive ? 'bg-primary text-white fw-bold shadow-sm' : 'text-body hover-bg-theme'
                }`
              }
              onClick={() => setShowMenu(false)}
            >
              <LayoutDashboard size={18} /> 
              <span>Dashboard</span>
            </NavLink>

            <NavLink 
              to="/subscriptions" 
              className={({ isActive }) => 
                `nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-3 text-decoration-none ${
                  isActive ? 'bg-primary text-white fw-bold shadow-sm' : 'text-body hover-bg-theme'
                }`
              }
              onClick={() => setShowMenu(false)}
            >
              <CreditCard size={18} /> 
              <span>All Subscriptions</span>
            </NavLink>

            <NavLink 
              to="/calendar" 
              className={({ isActive }) => 
                `nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-3 text-decoration-none ${
                  isActive ? 'bg-primary text-white fw-bold shadow-sm' : 'text-body hover-bg-theme'
                }`
              }
              onClick={() => setShowMenu(false)}
            >
              <Calendar size={18} /> 
              <span>Calendar</span>
            </NavLink>

            <NavLink 
              to="/stats" 
              className={({ isActive }) => 
                `nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-3 text-decoration-none ${
                  isActive ? 'bg-primary text-white fw-bold shadow-sm' : 'text-body hover-bg-theme'
                }`
              }
              onClick={() => setShowMenu(false)}
            >
              <PieChart size={18} /> 
              <span>Analytics</span>
            </NavLink>

            <hr className="my-2" />

            <NavLink 
              to="/settings" 
              className={({ isActive }) => 
                `nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-3 text-decoration-none ${
                  isActive ? 'bg-primary text-white fw-bold shadow-sm' : 'text-body hover-bg-theme'
                }`
              }
              onClick={() => setShowMenu(false)}
            >
              <SettingsIcon size={18} /> 
              <span>Settings</span>
            </NavLink>
          </div>

          <div className="pt-3 border-top">
            <div className="d-flex align-items-center justify-content-between p-2 rounded-3 bg-body-tertiary">
              <span className="small text-muted">Theme</span>
              <button 
                className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2 rounded-pill px-3"
                onClick={toggleTheme}
              >
                {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
                <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
              </button>
            </div>
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      {/* Main App Content Viewport */}
      <main className="flex-grow-1 w-100">
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
        <Route path="/subscriptions" element={<AppLayout><Subscriptions /></AppLayout>} />
        <Route path="/calendar" element={<AppLayout><CalendarView /></AppLayout>} />
        <Route path="/stats" element={<AppLayout><StatsView /></AppLayout>} />
        <Route path="/settings" element={<AppLayout><SettingsView /></AppLayout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
