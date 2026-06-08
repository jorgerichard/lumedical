import React, { useState, useEffect } from 'react';
import {
  getAppointments,
  getPatients,
  getProfessionals,
  createAppointment,
} from '../services/api';
import './Pages.css';
import './Appointments.css';

const weekdayLabels = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

function formatDateKey(date) {
  const parsed = typeof date === 'string' ? new Date(date) : date;
  const d = new Date(parsed);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getWeekStart(date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

export default function Calendar() {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    patientId: '',
    professionalId: '',
    appointmentDate: '',
    appointmentTime: '',
    reason: ''
  });
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedProfessionals, setSelectedProfessionals] = useState([]);

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
    fetchProfessionals();
  }, []);

  const fetchAppointments = async () => {
    try {
      const res = await getAppointments();
      setAppointments(res.data);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await getPatients();
      setPatients(res.data);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const fetchProfessionals = async () => {
    try {
      const res = await getProfessionals();
      setProfessionals(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.patientId || !form.professionalId || !form.appointmentDate || !form.appointmentTime || !form.reason) {
      return;
    }

    try {
      await createAppointment({
        patientId: form.patientId,
        professionalId: form.professionalId,
        appointmentDate: form.appointmentDate,
        appointmentTime: form.appointmentTime,
        reason: form.reason
      });
      setForm({
        patientId: '',
        professionalId: '',
        appointmentDate: '',
        appointmentTime: '',
        reason: ''
      });
      setShowForm(false);
      fetchAppointments();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const appointmentsByDate = appointments.reduce((acc, appointment) => {
    const key = formatDateKey(appointment.appointmentDate);
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(appointment);
    return acc;
  }, {});

  const getProfessionalsForDate = (dateKey) => {
    const items = appointmentsByDate[dateKey] || [];
    const professionalMap = {};

    items.forEach((item) => {
      const professionalId = item.professionalId || `no-id-${item.id}`;
      const professionalName = item.professionalFirstName
        ? `${item.professionalFirstName} ${item.professionalLastName}`.trim()
        : item.doctorName || 'Profesional sin nombre';
      const professionalRole = item.professionalRole || item.specialty || 'Sin especialidad';
      const key = `${professionalId}-${professionalName}-${professionalRole}`;

      if (!professionalMap[key]) {
        professionalMap[key] = {
          professionalId,
          professionalName,
          professionalRole,
          appointments: []
        };
      }

      professionalMap[key].appointments.push({
        id: item.id,
        time: item.appointmentTime,
        patient: `${item.patientName || ''} ${item.patientLastName || ''}`.trim() || `Paciente ${item.patientId || 'desconocido'}`,
        reason: item.notes || item.reason || 'No hay registro detallado.'
      });
    });

    return Object.values(professionalMap);
  };

  const openDateProfessionals = (date) => {
    const dateKey = formatDateKey(date);
    setSelectedDay(dateKey);
    setSelectedProfessionals(getProfessionalsForDate(dateKey));
  };

  const closeSelectedDay = () => {
    setSelectedDay(null);
    setSelectedProfessionals([]);
  };

  const handleChangeView = (nextView) => {
    setView(nextView);
    setCurrentDate(new Date());
  };

  const handlePrevious = () => {
    const next = new Date(currentDate);
    if (view === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else if (view === 'week') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setDate(next.getDate() - 1);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (view === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else if (view === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setDate(next.getDate() + 1);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const renderMonthGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
    const gridStartDate = new Date(firstDayOfMonth);
    gridStartDate.setDate(gridStartDate.getDate() - startOffset);
    const cells = Array.from({ length: 42 }).map((_, idx) => {
      const date = new Date(gridStartDate);
      date.setDate(gridStartDate.getDate() + idx);
      const key = formatDateKey(date);
      const items = appointmentsByDate[key] || [];
      const isCurrentMonth = date.getMonth() === month;
      const isToday = isSameDay(date, new Date());
      return (
        <div
          key={key}
          className={`calendar-cell ${isCurrentMonth ? '' : 'outside'} ${isToday ? 'today' : ''}`}
          onClick={() => openDateProfessionals(date)}
          style={{ cursor: 'pointer' }}
        >
          <div className="calendar-cell-header">
            <span className={isToday ? 'current' : ''}>{date.getDate()}</span>
            {items.length > 0 && <small>{items.length} cita{items.length > 1 ? 's' : ''}</small>}
          </div>
          <div className="calendar-events">
            {items.slice(0, 2).map((item) => (
              <div key={item.id} className="calendar-event">
                {item.patientName || 'Paciente'} {item.patientLastName || ''}
              </div>
            ))}
            {items.length > 2 && <div className="calendar-event more">+{items.length - 2} más</div>}
          </div>
        </div>
      );
    });

    return (
      <div className="calendar-grid">
        <div className="calendar-weekdays">
          {weekdayLabels.map((label) => (
            <div key={label} className="calendar-weekday">
              {label}
            </div>
          ))}
        </div>
        {cells}
      </div>
    );
  };

  const renderWeekView = () => {
    const start = getWeekStart(currentDate);
    const days = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = formatDateKey(date);
      const items = appointmentsByDate[key] || [];
      return (
        <div
          key={key}
          className="calendar-list-item"
          onClick={() => openDateProfessionals(date)}
          style={{ cursor: 'pointer' }}
        >
          <div>
            <strong>{weekdayLabels[index]} {date.getDate()}</strong>
            <div>{date.toLocaleDateString('es-ES', { month: 'short' })}</div>
          </div>
          <div>
            {items.length > 0 ? `${items.length} cita${items.length > 1 ? 's' : ''}` : 'Sin citas'}
          </div>
        </div>
      );
    });

    return (
      <div className="calendar-list">
        <h3>Semana del {formatDateKey(start)}</h3>
        {days}
      </div>
    );
  };

  const renderDayView = () => {
    const date = new Date(currentDate);
    const key = formatDateKey(date);
    const items = appointmentsByDate[key] || [];

    return (
      <div className="calendar-list">
        <h3>{date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
        {items.length === 0 ? (
          <div className="calendar-empty">No hay citas para este día.</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="calendar-list-item">
              <div>
                <strong>{item.patientName} {item.patientLastName}</strong>
                <div>{item.reason}</div>
              </div>
              <div>{item.appointmentTime}</div>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="page appointments-page">
      <div className="calendar-header">
        <div className="calendar-title">
          <span className="badge">📅</span>
          <h2>Calendario</h2>
        </div>
        <p className="calendar-description">Controla tus citas, alterna entre mes, semana o día y crea sesiones médicas rápidamente.</p>
      </div>

      <div className="calendar-actions-row">
        <div className="calendar-controls">
          <div className="calendar-nav">
            <button onClick={handlePrevious}>‹</button>
            <button onClick={handleNext}>›</button>
            <button className="today-button" onClick={handleToday}>Hoy</button>
          </div>

          <div className="calendar-title-text">
            {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </div>

          <div className="calendar-view">
            <button className={view === 'month' ? 'active' : ''} onClick={() => handleChangeView('month')}>Mes</button>
            <button className={view === 'week' ? 'active' : ''} onClick={() => handleChangeView('week')}>Semana</button>
            <button className={view === 'day' ? 'active' : ''} onClick={() => handleChangeView('day')}>Día</button>
          </div>
        </div>

        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancelar' : '+ Nueva Cita'}
        </button>
      </div>

      <div className="calendar-panel">
        <div className="calendar-card">
          {view === 'month' && renderMonthGrid()}
          {view === 'week' && renderWeekView()}
          {view === 'day' && renderDayView()}
        </div>
      </div>

      {selectedDay && (
        <div className="calendar-card" style={{ marginTop: '20px' }}>
          <div className="calendar-list">
            <div className="calendar-title-text">
              Profesionales que atendieron el {new Date(selectedDay).toLocaleDateString('es-ES', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
              })}
            </div>
            {selectedProfessionals.length === 0 ? (
              <div className="calendar-empty">No hay profesionales para ese día.</div>
            ) : (
              selectedProfessionals.map((professional) => (
                <div key={professional.professionalId || professional.professionalName} className="calendar-list-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{professional.professionalName}</strong>
                      <div>{professional.professionalRole}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {professional.appointments.length} cita{professional.appointments.length > 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ marginTop: '10px', paddingLeft: '12px' }}>
                    {professional.appointments.map((appt) => (
                      <div key={appt.id} className="calendar-list-item" style={{ marginBottom: '8px', padding: '10px', background: '#f9fafb', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                          <div>
                            <strong>{appt.time || 'Hora no definida'}</strong>
                            <div>{appt.patient || 'Paciente no definido'}</div>
                          </div>
                          <div style={{ textAlign: 'right', color: '#475569' }}>{appt.reason || 'Sin motivo registrado'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
            <button type="button" className="btn-secondary" onClick={closeSelectedDay} style={{ marginTop: '12px' }}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="form-container" style={{ marginTop: '20px' }}>
          <select
            value={form.patientId}
            onChange={(e) => setForm({ ...form, patientId: e.target.value })}
            required
          >
            <option value="">Selecciona paciente</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName}
              </option>
            ))}
          </select>
          <select
            value={form.professionalId}
            onChange={(e) => setForm({ ...form, professionalId: e.target.value })}
            required
          >
            <option value="">Selecciona profesional</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName} ({p.role})
              </option>
            ))}
          </select>
          <input
            type="date"
            value={form.appointmentDate}
            onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })}
            required
          />
          <input
            type="time"
            value={form.appointmentTime}
            onChange={(e) => setForm({ ...form, appointmentTime: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Razón"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            required
          />
          <button type="submit" className="btn-success">Crear</button>
        </form>
      )}
    </div>
  );
}
