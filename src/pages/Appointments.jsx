import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getPatients,
  getProfessionals,
  registerAppointmentGpsEvent
} from '../services/api';
import './Pages.css';

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    patientId: '',
    professionalId: '',
    appointmentDate: '',
    appointmentTime: '',
    reason: '',
    status: 'scheduled'
  });

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
    fetchProfessionals();
  }, []);

  const fetchAppointments = async () => {
    try {
      setError('');
      const res = await getAppointments();
      setAppointments(res.data);
    } catch (err) {
      console.error('Error:', err);
      setError('Error al cargar las citas. Revisa la consola para más detalles.');
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
      setProfessionals(res.data);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const APPOINTMENTS_PER_PAGE = 6;
  const sortedAppointments = [...appointments].sort((a, b) => {
    const dateA = new Date(`${a.appointmentDate}T${a.appointmentTime || '00:00'}`);
    const dateB = new Date(`${b.appointmentDate}T${b.appointmentTime || '00:00'}`);
    return dateB - dateA;
  });
  const totalPages = Math.max(1, Math.ceil(sortedAppointments.length / APPOINTMENTS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pageAppointments = sortedAppointments.slice((currentPage - 1) * APPOINTMENTS_PER_PAGE, currentPage * APPOINTMENTS_PER_PAGE);

  const resetForm = () => {
    setEditing(null);
    setForm({
      patientId: '',
      professionalId: '',
      appointmentDate: '',
      appointmentTime: '',
      reason: '',
      status: 'scheduled'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateAppointment(editing, form);
      } else {
        await createAppointment(form);
      }
      resetForm();
      setShowForm(false);
      fetchAppointments();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleEdit = (appointment) => {
    setEditing(appointment.id);
    setForm({
      patientId: appointment.patientId,
      professionalId: appointment.professionalId || '',
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime,
      reason: appointment.reason,
      status: appointment.status
    });
    setShowForm(true);
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateAppointment(id, { status });
      fetchAppointments();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const navigate = useNavigate();
  const { user } = useAuth();

  const [gpsMessage, setGpsMessage] = useState('');
  const [gpsLoadingId, setGpsLoadingId] = useState(null);
  const [gpsPermission, setGpsPermission] = useState('unknown'); // 'granted' | 'denied' | 'prompt' | 'unsupported' | 'unknown'
  const [gpsValidation, setGpsValidation] = useState({});

  const updateGpsValidation = (id, updates) => {
    setGpsValidation((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        ...updates
      }
    }));
  };

  const clearGpsValidation = (id) => {
    setGpsValidation((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const getPatientAddressLabel = (appointment) => {
    if (appointment.patientAddress) {
      return `${appointment.patientAddress}${appointment.patientCity ? ', ' + appointment.patientCity : ''}${appointment.patientState ? ' / ' + appointment.patientState : ''}`.trim();
    }
    if (appointment.patientCity || appointment.patientState) {
      return `${appointment.patientCity || ''}${appointment.patientCity && appointment.patientState ? ', ' : ''}${appointment.patientState || ''}`.trim();
    }
    return '';
  };

  const getDistanceFromLatLonInMeters = (lat1, lon1, lat2, lon2) => {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371000; // Earth radius in meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar cita?')) {
      try {
        await deleteAppointment(id);
        fetchAppointments();
      } catch (err) {
        console.error('Error:', err);
      }
    }
  };

  const handleRegisterGps = async (id, eventType = 'arrival') => {
    const appointment = appointments.find((appt) => appt.id === id);
    const patientAddressLabel = appointment ? getPatientAddressLabel(appointment) : '';

    if (!navigator.geolocation) {
      setGpsMessage('Geolocalización no está disponible en este navegador');
      return;
    }

    setGpsMessage(`Validando llegada al punto de atención${patientAddressLabel ? `: ${patientAddressLabel}` : ''}`);
    setGpsLoadingId(id);
    updateGpsValidation(id, { progress: 0, validating: true, message: 'Iniciando validación...', targetAddress: patientAddressLabel });

    const progressInterval = setInterval(() => {
      setGpsValidation((prev) => {
        const current = prev[id] || {};
        const nextProgress = Math.min(100, (current.progress || 0) + 15);
        return {
          ...prev,
          [id]: {
            ...current,
            progress: nextProgress,
            validating: true,
            message: 'Validando llegada...'
          }
        };
      });
    }, 250);

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        clearInterval(progressInterval);
        try {
          await registerAppointmentGpsEvent(id, {
            latitude: coords.latitude,
            longitude: coords.longitude,
            eventType,
            timestamp: new Date().toISOString(),
            notes: `Registro GPS ${eventType} desde frontend`
          });

          const patientCoordsAvailable = Number.isFinite(Number(appointment?.patientAddressLatitude)) && Number.isFinite(Number(appointment?.patientAddressLongitude));
          let validationMessage = `Evento GPS ${eventType} registrado: ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;

          if (eventType === 'arrival') {
            if (patientAddressLabel) {
              if (patientCoordsAvailable) {
                const distanceMeters = getDistanceFromLatLonInMeters(
                  coords.latitude,
                  coords.longitude,
                  Number(appointment.patientAddressLatitude),
                  Number(appointment.patientAddressLongitude)
                );
                validationMessage = distanceMeters <= 100
                  ? `Llegada validada dentro del radio de 100 m del domicilio del paciente (${distanceMeters.toFixed(0)} m).`
                  : `Ubicación registrada, pero estás a ${distanceMeters.toFixed(0)} m del domicilio del paciente (radio permitido: 100 m).`;
              } else {
                validationMessage = `Llegada registrada. Direccion de referencia: ${patientAddressLabel}.`;
              }
            }
          }

          setGpsMessage(validationMessage);
          updateGpsValidation(id, { progress: 100, validating: false, message: validationMessage, result: 'completed' });
          fetchAppointments();
        } catch (err) {
          console.error('Error:', err);
          setGpsMessage('Error al registrar la ubicación GPS');
          updateGpsValidation(id, { progress: 100, validating: false, message: 'Error al registrar la ubicación GPS', result: 'error' });
        } finally {
          setGpsLoadingId(null);
          setTimeout(() => clearGpsValidation(id), 4000);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        clearInterval(progressInterval);
        let errorMessage = 'Error al obtener la ubicación GPS';
        if (error.code === 1) {
          setGpsPermission('denied');
          errorMessage = 'Permiso denegado para geolocalización';
        } else if (error.code === 2) {
          errorMessage = 'No se pudo obtener la ubicación';
        }
        setGpsMessage(errorMessage);
        updateGpsValidation(id, { progress: 100, validating: false, message: errorMessage, result: 'error' });
        setGpsLoadingId(null);
        setTimeout(() => clearGpsValidation(id), 4000);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const formatAppointmentDateTime = (appointmentDate, appointmentTime) => {
    if (!appointmentDate) return 'Fecha no disponible';

    let dateString;
    if (appointmentDate instanceof Date) {
      const year = appointmentDate.getFullYear();
      const month = String(appointmentDate.getMonth() + 1).padStart(2, '0');
      const day = String(appointmentDate.getDate()).padStart(2, '0');
      dateString = `${year}-${month}-${day}`;
    } else {
      dateString = String(appointmentDate);
    }

    const timeString = appointmentTime ? String(appointmentTime).trim() : '00:00';
    const isoString = `${dateString}T${timeString}`;
    const parsed = new Date(isoString);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
    }

    const fallbackDate = new Date(dateString);
    if (!Number.isNaN(fallbackDate.getTime())) {
      return `${fallbackDate.toLocaleDateString('es-ES', { dateStyle: 'short' })} ${timeString}`;
    }

    return 'Fecha inválida';
  };

  const getAppointmentAttendanceLogs = (appointment) => {
    const logs = [];

    if (appointment.arrivalLatitude && appointment.arrivalLongitude) {
      logs.push({
        id: 'arrival',
        label: 'Llegada',
        timestamp: appointment.arrivalTimestamp,
        latitude: appointment.arrivalLatitude,
        longitude: appointment.arrivalLongitude,
        notes: appointment.gpsEventType === 'arrival' ? appointment.gpsNotes : appointment.gpsNotes
      });
    }

    if (appointment.startLatitude && appointment.startLongitude) {
      logs.push({
        id: 'start',
        label: 'Inicio',
        timestamp: appointment.startTimestamp,
        latitude: appointment.startLatitude,
        longitude: appointment.startLongitude,
        notes: appointment.gpsEventType === 'start' ? appointment.gpsNotes : appointment.gpsNotes
      });
    }

    return logs;
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>📋 Citas</h2>
        {user?.role === 'admin' && (
          <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn-primary">
            {showForm ? 'Cancelar' : editing ? 'Editar Cita' : '+ Nueva Cita'}
          </button>
        )}
      </div>

      {error && (
        <div className="status-message error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {gpsMessage && (
        <div className="status-message info" style={{ marginBottom: '1rem' }}>
          <div style={{ marginBottom: '6px' }}>{gpsMessage}</div>
          {gpsPermission === 'denied' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-secondary" onClick={() => setGpsMessage('')}>Reintentar</button>
              <a href="#" onClick={(e) => { e.preventDefault(); alert('Abre la configuración de tu navegador y permite el uso de la ubicación para este sitio (o usa HTTPS/localhost).'); }} style={{ color: '#0645AD', textDecoration: 'underline', alignSelf: 'center' }}>¿Cómo permito la ubicación?</a>
            </div>
          )}
        </div>
      )}

      {showForm && user?.role === 'admin' && (
        <form onSubmit={handleSubmit} className="form-container">
          <div className="patient-select-row">
            <select
              value={form.patientId}
              onChange={(e) => setForm({ ...form, patientId: e.target.value })}
              required
            >
              <option value="">Selecciona paciente</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
              ))}
            </select>
            {user?.role === 'admin' && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate('/patients')}
              >
                Registrar paciente
              </button>
            )}
          </div>
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
          <select
            value={form.professionalId}
            onChange={(e) => setForm({ ...form, professionalId: e.target.value })}
          >
            <option value="">Selecciona profesional (opcional)</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName} ({p.role})
              </option>
            ))}
          </select>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="scheduled">Agendada</option>
            <option value="completed">Completada</option>
            <option value="cancelled">Cancelada</option>
          </select>
          <button type="submit" className="btn-success">
            {editing ? 'Actualizar' : 'Crear'}
          </button>
        </form>
      )}

      <div className="cards-container">
        {pageAppointments.length === 0 && !error ? (
          <div className="empty-state" style={{ padding: '2rem', textAlign: 'center', width: '100%' }}>
            No hay citas para mostrar.
          </div>
        ) : (
          <>
            {pageAppointments.map((appointment) => {
              const appointmentLogs = getAppointmentAttendanceLogs(appointment);
              return (
                <div className="appointment-card" key={appointment.id}>
                  <div className="card-header">
                    <div>
                      <h3>{formatAppointmentDateTime(appointment.appointmentDate, appointment.appointmentTime)}</h3>
                      <p>{appointment.patientName} {appointment.patientLastName}</p>
                    </div>
                  <span className={`status-badge status-${appointment.status}`}>{appointment.status === 'scheduled' ? 'Agendada' : appointment.status === 'completed' ? 'Completada' : 'Cancelada'}</span>
                </div>

            <div className="card-details">
              <div className="card-row">
                <strong>Profesional:</strong>
                <span>{appointment.professionalFirstName ? `${appointment.professionalFirstName} ${appointment.professionalLastName}` : 'Sin asignar'}</span>
              </div>
              <div className="card-row">
                <strong>Especialidad:</strong>
                <span>{appointment.professionalRole || 'General'}</span>
              </div>
              <div className="card-row">
                <strong>Motivo:</strong>
                <span>{appointment.reason || '-'}</span>
              </div>
              {appointment.patientAddress && (
                <div className="card-row">
                  <strong>Dirección paciente:</strong>
                  <span>{getPatientAddressLabel(appointment)}</span>
                </div>
              )}
              {/* Mostrar coordenadas si existen (útil para admin verificar llegada) */}
              {appointment.arrivalLatitude && appointment.arrivalLongitude && (
                <div className="card-row">
                  <strong>Llegada:</strong>
                  <span>{Number(appointment.arrivalLatitude).toFixed(6)}, {Number(appointment.arrivalLongitude).toFixed(6)}</span>
                </div>
              )}
              {appointment.startLatitude && appointment.startLongitude && (
                <div className="card-row">
                  <strong>Inicio:</strong>
                  <span>{Number(appointment.startLatitude).toFixed(6)}, {Number(appointment.startLongitude).toFixed(6)}</span>
                </div>
              )}
              <div className="card-row">
                <strong>Estado:</strong>
                <select
                  value={appointment.status}
                  onChange={(e) => handleStatusChange(appointment.id, e.target.value)}
                >
                  <option value="scheduled">Agendada</option>
                  <option value="completed">Completada</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </div>
            </div>

            <div className="card-section">
              <h4>Registros de la Atención</h4>
              {appointmentLogs.length === 0 ? (
                <>
                  <p>No hay registros cargados aún.</p>
                  <button className="btn-secondary" type="button">Agregar registro</button>
                </>
              ) : (
                <div className="attendance-logs">
                  {appointmentLogs.map((log) => (
                    <div key={log.id} className="attendance-log-row">
                      <div>
                        <strong>{log.label}</strong>
                        <div>{log.timestamp ? new Date(log.timestamp).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : 'Fecha no disponible'}</div>
                      </div>
                      <div>
                        {Number(log.latitude).toFixed(6)}, {Number(log.longitude).toFixed(6)}
                      </div>
                      {log.notes && <div className="log-notes">{log.notes}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {gpsValidation[appointment.id] && (
              <div className="gps-validation-panel" style={{ marginBottom: '1rem' }}>
                <div style={{ marginBottom: '8px', fontSize: '0.95rem' }}>{gpsValidation[appointment.id].message}</div>
                <div style={{ background: '#e6f7ff', borderRadius: '10px', overflow: 'hidden', height: '10px' }}>
                  <div style={{ width: `${gpsValidation[appointment.id].progress}%`, height: '100%', background: '#38a169', transition: 'width 0.2s ease' }} />
                </div>
              </div>
            )}

            <div className="card-actions">
              {/* Edit/Delete sólo para admin */}
              {user?.role === 'admin' && (
                <>
                  <button className="btn-primary" onClick={() => handleEdit(appointment)}>Editar</button>
                  <button className="btn-danger" onClick={() => handleDelete(appointment.id)}>Eliminar</button>
                </>
              )}
              {/* Botones GPS para todos los profesionales */}
              {['medico', 'kinesiologo', 'quiropractico', 'enfermera'].includes(user?.role) && (
                <>
                  <button className="btn-secondary" onClick={() => handleRegisterGps(appointment.id, 'arrival')} disabled={gpsLoadingId === appointment.id}>
                    {gpsLoadingId === appointment.id ? 'Registrando...' : 'Registrar llegada GPS'}
                  </button>
                  <button className="btn-secondary" onClick={() => handleRegisterGps(appointment.id, 'start')} disabled={gpsLoadingId === appointment.id}>
                    {gpsLoadingId === appointment.id ? 'Registrando...' : 'Registrar inicio GPS'}
                  </button>
                </>
              )}
            </div>
          </div>
                );
              })}
          </>
        )}
      </div>

      {sortedAppointments.length > APPOINTMENTS_PER_PAGE && (
        <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
          <button
            className="btn-secondary"
            type="button"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Anterior
          </button>
          <span>Página {currentPage} de {totalPages}</span>
          <button
            className="btn-secondary"
            type="button"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
