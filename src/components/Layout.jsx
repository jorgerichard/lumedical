import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import './Layout.css';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  // Definir roles de profesionales
  const isProfessional = user?.role && ['medico', 'kinesiologo', 'quiropractico', 'enfermera'].includes(user.role);
  const isAdmin = user?.role === 'admin';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMobileMenu = () => {
    setMenuOpen(false);
  };

  return (
    <div className="app-shell">
      {menuOpen && <div className="sidebar-overlay" onClick={closeMobileMenu}></div>}
      <aside className={`sidebar ${menuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-top">
          <div className="brand">
            <span>🩺</span>
            <div>
              <strong>Medical Agenda</strong>
              <small>Sistema clínico</small>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" onClick={closeMobileMenu}>Dashboard</NavLink>
          <NavLink to="/calendar" onClick={closeMobileMenu}>Calendario</NavLink>
          <NavLink to="/appointments" onClick={closeMobileMenu}>Citas</NavLink>

          {/* Pacientes: visible para admin y profesionales */}
          {(isAdmin || isProfessional) && (
            <NavLink to="/patients" onClick={closeMobileMenu}>Pacientes</NavLink>
          )}

          {/* Profesionales solo para admin */}
          {isAdmin && <NavLink to="/professionals" onClick={closeMobileMenu}>Profesionales</NavLink>}

          {/* Evolución clínica disponible para profesionales y admin */}
          {(isAdmin || isProfessional) && (
            <NavLink to="/evolution" onClick={closeMobileMenu}>Evolución Clínica</NavLink>
          )}

          {/* Pagos: profesional ve solo sus pagos, admin ve todo */}
          {(isAdmin || isProfessional) && (
            <NavLink to="/payments" onClick={closeMobileMenu}>Pagos</NavLink>
          )}

          {/* Reportes y mensajería para admin */}
          {isAdmin && <NavLink to="/reports" onClick={closeMobileMenu}>Reportes</NavLink>}
          {isAdmin && <NavLink to="/treatments" onClick={closeMobileMenu}>Tratamientos</NavLink>}
          {isAdmin && <NavLink to="/categories" onClick={closeMobileMenu}>Categorías</NavLink>}
          {(isAdmin || isProfessional) && <NavLink to="/messages" onClick={closeMobileMenu}>Mensajería</NavLink>}

          {/* Configuración solo admin */}
          {isAdmin && <NavLink to="/configuration" onClick={closeMobileMenu}>Configuración</NavLink>}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span>{user?.firstName ? `${user.firstName.charAt(0)}${user.lastName?.charAt(0)}` : '--'}</span>
            <div>
              <strong>{user?.firstName || 'Usuario'}</strong>
              <small>{user?.role || 'Invitado'}</small>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </aside>

      <div className="content-wrapper">
        <header className="topbar">
          <div className="topbar-left">
            <button className="hamburger-btn" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
            <h1>Medical Agenda</h1>
          </div>
          <div className="topbar-right">
            <button className="topbar-action" onClick={() => navigate('/dashboard')}>Inicio</button>
          </div>
        </header>
        <main className="content-main" onClick={closeMobileMenu}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
