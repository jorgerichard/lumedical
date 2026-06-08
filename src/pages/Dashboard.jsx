import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAppointments,
  getPatients,
  getPayments,
} from '../services/api';
import './Dashboard.css';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    patients: 0,
    appointmentsToday: 0,
    appointmentsWeek: 0,
    incomeMonth: 0,
  });
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
    } else {
      setUser(JSON.parse(userData));
    }
  }, [navigate]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [patientsRes, appointmentsRes, paymentsRes] = await Promise.all([
        getPatients(),
        getAppointments(),
        getPayments(),
      ]);

      const patients = patientsRes.data || [];
      const appointments = appointmentsRes.data || [];
      const payments = paymentsRes.data || [];

      console.log('=== APPOINTMENTS DEBUG ===');
      console.log('Total appointments:', appointments.length);
      console.log('First appointment:', appointments[0]);
      if (appointments[0]) {
        console.log('appointmentDate field:', appointments[0].appointmentDate);
        console.log('appointmentDate type:', typeof appointments[0].appointmentDate);
      }

      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const parseLocalDate = (dateStr) => {
        if (!dateStr) return null;
        const parts = String(dateStr).split('-');
        if (parts.length >= 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          return new Date(year, month, day);
        }
        return new Date(dateStr);
      };

      const appointmentsToday = appointments.filter((appointment) => {
        const appointmentDate = parseLocalDate(appointment.appointmentDate);
        return (
          appointmentDate &&
          appointmentDate.getFullYear() === today.getFullYear() &&
          appointmentDate.getMonth() === today.getMonth() &&
          appointmentDate.getDate() === today.getDate()
        );
      }).length;

      const appointmentsWeek = appointments.filter((appointment) => {
        const appointmentDate = parseLocalDate(appointment.appointmentDate);
        return appointmentDate && appointmentDate >= startOfWeek && appointmentDate <= endOfWeek;
      }).length;

      const incomeMonth = payments.reduce((sum, payment) => {
        if (!payment.paymentDate) return sum;
        const date = new Date(payment.paymentDate);
        if (
          date.getFullYear() === today.getFullYear() &&
          date.getMonth() === today.getMonth()
        ) {
          return sum + Number(payment.amount || 0);
        }
        return sum;
      }, 0);

      const upcomingAppointments = appointments
        .map((appointment) => ({
          ...appointment,
          _localDate: parseLocalDate(appointment.appointmentDate)
        }))
        .filter((appointment) => appointment._localDate && appointment._localDate >= new Date(today.getFullYear(), today.getMonth(), today.getDate()))
        .sort((a, b) => a._localDate - b._localDate)
        .slice(0, 5);

      setStats({
        patients: patients.length,
        appointmentsToday,
        appointmentsWeek,
        incomeMonth,
      });
      setUpcoming(upcomingAppointments);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    // Refrescar datos cada 30 segundos
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, [refreshKey]);

  if (!user) return <div className="loading">Cargando...</div>;

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h2>Dashboard</h2>
          <p className="dashboard-intro">Bienvenido al Control de Salud</p>
        </div>
        <div className="dashboard-welcome">
          <span>Bienvenido</span>
          <strong>{user.firstName}</strong>
          <button 
            onClick={() => setRefreshKey(prev => prev + 1)}
            style={{
              marginLeft: '20px',
              padding: '8px 16px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            disabled={loading}
          >
            {loading ? 'Actualizando...' : '🔄 Actualizar'}
          </button>
        </div>
      </div>

      <div className="hero-card">
        <div className="hero-text">
          <h3>Bienvenido al Control de Salud</h3>
          <p>Administra pacientes, citas y pagos desde un tablero moderno. Todo está pensado para darte visibilidad rápida y acceso inmediato.</p>
        </div>
        <div className="hero-actions">
          <button onClick={() => navigate('/calendar')}>Calendario</button>
          <button onClick={() => navigate('/appointments')}>Citas</button>
          <button onClick={() => navigate('/patients')}>Pacientes</button>
          <button onClick={() => navigate('/reports')}>Reportes</button>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <h4>Citas hoy</h4>
          <p>{loading ? '...' : stats.appointmentsToday}</p>
        </div>
        <div className="summary-card">
          <h4>Citas esta semana</h4>
          <p>{loading ? '...' : stats.appointmentsWeek}</p>
        </div>
        <div className="summary-card">
          <h4>Total pacientes</h4>
          <p>{loading ? '...' : stats.patients}</p>
        </div>
        <div className="summary-card">
          <h4>Ingresos del mes</h4>
          <p>${loading ? '...' : stats.incomeMonth.toFixed(2)}</p>
        </div>
      </div>

      <div className="section-panel">
        <div className="section-card">
          <h3>Próximas citas</h3>
          <ul className="upcoming-list">
            {loading ? (
              <li>Cargando...</li>
            ) : upcoming.length === 0 ? (
              <li>No hay citas próximas.</li>
            ) : (
              upcoming.map((appointment) => (
                <li key={appointment.id}>
                  <div className="appointment-info">
                    <strong>{appointment.reason || 'Consulta médica'}</strong>
                    <span>{(appointment._localDate ? appointment._localDate.toLocaleDateString() : new Date(appointment.appointmentDate).toLocaleDateString())} · {appointment.appointmentTime || 'Hora pendiente'}</span>
                    <span className="tag">{appointment.specialty || 'General'}</span>
                  </div>
                  <div>{appointment.doctorName || 'Dr. Sin asignar'}</div>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="section-card stat-box">
          <div className="stat-item">
            <h4>Pacientes registrados</h4>
            <p>{loading ? '...' : stats.patients}</p>
          </div>
          <div className="stat-item">
            <h4>Ingresos mensuales</h4>
            <p>${loading ? '...' : stats.incomeMonth.toFixed(2)}</p>
          </div>
          <div className="stat-item">
            <h4>Citas activas</h4>
            <p>{loading ? '...' : stats.appointmentsWeek}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
