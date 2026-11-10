// Page frame: left menu + top bar + the current page.
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Nav, Navbar, Button, Badge, Offcanvas } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import SosButton from './SosButton';

// Menu items, and which roles can see them (null = everyone)
const MENU = [
  { to: '/', label: 'Dashboard', roles: null },
  { to: '/inventory', label: 'Inventory', roles: ['hospital', 'organization'] },
  { to: '/requests', label: 'Requests', roles: ['patient', 'donor', 'hospital', 'organization'] },
  { to: '/donations', label: 'Donations', roles: ['donor', 'hospital', 'organization'] },
  { to: '/chat', label: 'Messages', roles: ['patient', 'donor', 'hospital', 'organization'] },
  { to: '/admin', label: 'Admin', roles: ['admin'] },
];

function Menu({ onClick, onLogout, items }) {
  return (
    <div className="sidebar d-flex flex-column p-3">
      <h4 className="text-white mb-4">🩸 LifeFlow</h4>
      <Nav className="flex-column flex-grow-1">
        {items.map((item) => (
          <Nav.Link key={item.to} as={NavLink} to={item.to} end={item.to === '/'} onClick={onClick}>
            {item.label}
          </Nav.Link>
        ))}
      </Nav>
      <Button variant="outline-light" size="sm" onClick={onLogout}>
        Logout
      </Button>
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false); // menu on mobile

  const items = MENU.filter((item) => item.roles === null || item.roles.includes(user.role));

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="d-flex">
      {/* Desktop menu (hidden on small screens) */}
      <div className="d-none d-lg-block">
        <Menu items={items} onLogout={handleLogout} />
      </div>

      {/* Mobile menu (slides in) */}
      <Offcanvas show={showMenu} onHide={() => setShowMenu(false)} style={{ width: 230 }}>
        <Menu items={items} onLogout={handleLogout} onClick={() => setShowMenu(false)} />
      </Offcanvas>

      <div className="flex-grow-1" style={{ minWidth: 0 }}>
        <Navbar bg="white" className="border-bottom px-3 gap-2">
          <Button variant="light" className="d-lg-none" onClick={() => setShowMenu(true)}>
            ☰
          </Button>
          <h5 className="mb-0 flex-grow-1">Hi, {user.name.split(' ')[0]}</h5>

          {['patient', 'hospital'].includes(user.role) && <SosButton />}

          {user.role === 'donor' && (
            <Badge bg={user.availability === 'Active' ? 'success' : 'secondary'}>
              {user.bloodGroup} · {user.availability}
            </Badge>
          )}
          <Badge bg="light" text="dark" className="text-capitalize border">
            {user.role}
          </Badge>
        </Navbar>

        <main className="container-fluid p-3 p-md-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
