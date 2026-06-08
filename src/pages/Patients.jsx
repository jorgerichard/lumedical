import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPatients, getProfessionals, getAppointments, createPatient, updatePatient, deletePatient, searchPatients, createAppointment, getAssignedPatientsByProfessional } from '../services/api';
import PatientProfessionalManager from '../components/PatientProfessionalManager';
import './Pages.css';

const formatPhoneInput = (value) => value.replace(/\D/g, '').slice(0, 9);
const formatRutInput = (value) => value.replace(/\D/g, '').slice(0, 12);
const formatDate = (dateValue) => {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? dateValue : date.toLocaleDateString('es-CL');
};

const formatDateToInput = (dateStr) => {
  if (!dateStr) return { year: '', month: '', day: '' };
  const parts = String(dateStr).split('-');
  return {
    year: parts[0] || '',
    month: parts[1] || '',
    day: parts[2] || ''
  };
};

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const formatInputToDate = (year, month, day) => {
  if (!year || !month || !day) return '';
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const validatePatientForm = ({ rut, firstName, lastName, birthDate, phone }) => {
  if (!rut || !firstName || !lastName || !birthDate || !phone) {
    return 'Todos los campos obligatorios deben estar completos.';
  }
  if (!/^[0-9]{4,12}$/.test(rut)) {
    return 'RUT inválido. Debe contener solo dígitos, sin espacios ni letras.';
  }
  if (!/^[0-9]{9}$/.test(phone)) {
    return 'Teléfono inválido. Debe contener exactamente 9 dígitos.';
  }
  return null;
};

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    rut: '',
    firstName: '',
    lastName: '',
    birthDate: '',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    phone: '',
    address: '',
    city: '',
    comuna: ''
  });
  const [professionals, setProfessionals] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryFilter, setCategoryFilter] = useState('todo');
  const [professionalAssignments, setProfessionalAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [schedulingPatient, setSchedulingPatient] = useState(null);
  const [appointmentForm, setAppointmentForm] = useState({ professionalId: '', appointmentDate: '', appointmentTime: '', reason: '' });
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [managingPatient, setManagingPatient] = useState(null);
  const [previousCategoryFilter, setPreviousCategoryFilter] = useState('todo');

  const professionalCategories = [
    { value: 'todo', label: 'Todas' },
    { value: 'medico', label: 'Médico' },
    { value: 'kinesiologo', label: 'Kinesiólogo' },
    { value: 'enfermera', label: 'Enfermería' },
    { value: 'quiropractico', label: 'Quiropráctico' }
  ];

  useEffect(() => {
    fetchPatients();
    fetchProfessionals();
    fetchAppointments();
  }, []);

  const { user } = useAuth();

  // When user changes or loads, reset filter to user's role if not admin
  useEffect(() => {
    if (user && user.role && user.role !== 'admin') {
      // Non-admin users should see their own category
      setCategoryFilter(user.role);
    }
  }, [user]);

  useEffect(() => {
    if (professionals.length > 0) {
      fetchProfessionalAssignments();
    }
  }, [professionals, categoryFilter, user]);

  const fetchProfessionals = async () => {
    try {
      const res = await getProfessionals();
      setProfessionals(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error al cargar profesionales:', err.response?.data || err.message);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await getPatients();
      const normalizedPatients = Array.isArray(res.data)
        ? res.data.map((patient) => ({
            ...patient,
            firstName: patient.firstName || patient.nombre || '',
            lastName: patient.lastName || patient.apellido || '',
            phone: patient.phone || patient.telefono || '',
            city: patient.city || patient.ciudad || '',
            comuna: patient.state || patient.comuna || '',
            createdAt: patient.createdAt || patient.created_at || ''
          }))
        : [];
      setPatients(normalizedPatients);
      setStatusMessage({ type: '', text: '' });
    } catch (err) {
      console.error('Error al cargar pacientes:', err.response?.data || err.message);
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.mensaje || 'No se pueden cargar los pacientes. Vuelve a iniciar sesión si es necesario.'
      });
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await getAppointments();
      setAppointments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error al cargar citas:', err.response?.data || err.message);
    }
  };

  const fetchProfessionalAssignments = async () => {
    let visibleProfessionals = professionals.filter((p) =>
      categoryFilter === 'todo' || normalizeText(p.role) === normalizeText(categoryFilter)
    );

    // If the logged-in user is not admin, only show assignments for the logged-in professional
    if (user && user.role && user.role !== 'admin') {
      visibleProfessionals = visibleProfessionals.filter((p) => p.userId === user.id);
    }

    console.log('fetchProfessionalAssignments: user.id:', user?.id, 'visibleProfessionals:', visibleProfessionals);

    if (visibleProfessionals.length === 0) {
      setProfessionalAssignments([]);
      return;
    }

    setAssignmentsLoading(true);
    try {
      const assignmentResults = await Promise.all(
        visibleProfessionals.map(async (professional) => {
          try {
            const res = await getAssignedPatientsByProfessional(professional.id);
            console.log(`Pacientes asignados a ${professional.firstName} ${professional.lastName}:`, res.data);
            return {
              professional,
              patients: Array.isArray(res.data) ? res.data : []
            };
          } catch (err) {
            console.error(`Error obteniendo pacientes para ${professional.firstName}:`, err);
            return {
              professional,
              patients: []
            };
          }
        })
      );
      console.log('assignmentResults:', assignmentResults);
      setProfessionalAssignments(assignmentResults);
    } catch (err) {
      console.error('Error al cargar asignaciones de profesionales:', err.response?.data || err.message);
      setProfessionalAssignments([]);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!search) {
      fetchPatients();
      return;
    }
    try {
      const res = await searchPatients(search);
      const normalizedPatients = Array.isArray(res.data)
        ? res.data.map((patient) => ({
            ...patient,
            firstName: patient.firstName || patient.nombre || '',
            lastName: patient.lastName || patient.apellido || '',
            phone: patient.phone || patient.telefono || '',
            city: patient.city || patient.ciudad || '',
            comuna: patient.state || patient.comuna || '',
            createdAt: patient.createdAt || patient.created_at || ''
          }))
        : [];
      setPatients(normalizedPatients);
      setStatusMessage({ type: '', text: '' });
    } catch (err) {
      console.error('Error buscando pacientes:', err.response?.data || err.message);
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.mensaje || 'No se pudo buscar pacientes.'
      });
    }
  };

  const resetForm = () => {
    setEditing(null);
    setForm({
      rut: '',
      firstName: '',
      lastName: '',
      birthDate: '',
      birthYear: '',
      birthMonth: '',
      birthDay: '',
      phone: '',
      address: '',
      city: '',
      comuna: ''
    });
  };

  const startScheduling = (patient) => {
    setPreviousCategoryFilter(categoryFilter);
    setSchedulingPatient(patient);
    setAppointmentForm({ professionalId: '', appointmentDate: '', appointmentTime: '', reason: '' });
    setCategoryFilter('todo');
    setStatusMessage({ type: '', text: '' });
  };

  const cancelScheduling = () => {
    setSchedulingPatient(null);
    setAppointmentForm({ professionalId: '', appointmentDate: '', appointmentTime: '', reason: '' });
    setCategoryFilter(previousCategoryFilter);
  };

  const assignedProfessionalsByPatient = professionalAssignments.reduce((acc, { professional, patients }) => {
    patients.forEach((patient) => {
      const patientId = patient.id || patient.patId || patient.patientId;
      if (!patientId) return;
      if (!acc[patientId]) acc[patientId] = [];
      acc[patientId].push(professional);
    });
    return acc;
  }, {});

  const filteredProfessionals = professionals.filter((p) =>
    categoryFilter === 'todo' || normalizeText(p.role) === normalizeText(categoryFilter)
  );
  const selectedProfessional = professionals.find((p) => p.id === appointmentForm.professionalId);

  const dailyAppointmentsByProfessional = appointments
    .filter((appt) => appt.appointmentDate === scheduleDate)
    .filter((appt) => categoryFilter === 'todo' || normalizeText(appt.professionalRole) === normalizeText(categoryFilter))
    .reduce((group, appt) => {
      const professionalName = appt.professionalFirstName && appt.professionalLastName
        ? `${appt.professionalFirstName} ${appt.professionalLastName}`
        : 'Profesional sin nombre';
      const key = `${professionalName} – ${appt.professionalRole ? appt.professionalRole.charAt(0).toUpperCase() + appt.professionalRole.slice(1) : 'Sin categoría'}`;
      group[key] = group[key] || [];
      group[key].push(appt);
      return group;
    }, {});

  const handleAppointmentSubmit = async (e) => {
    e.preventDefault();
    if (!appointmentForm.professionalId || !appointmentForm.appointmentDate || !appointmentForm.appointmentTime || !appointmentForm.reason) {
      setStatusMessage({ type: 'error', text: 'Completa todos los campos de la cita y selecciona un profesional.' });
      return;
    }

    try {
      await createAppointment({
        patientId: schedulingPatient.id,
        professionalId: appointmentForm.professionalId,
        appointmentDate: appointmentForm.appointmentDate,
        appointmentTime: appointmentForm.appointmentTime,
        reason: appointmentForm.reason
      });
      setStatusMessage({ type: 'success', text: 'Cita creada correctamente para el paciente.' });
      cancelScheduling();
      fetchAppointments();
      fetchProfessionalAssignments(); // Refresh assignments so auto-assigned patients appear
    } catch (err) {
      console.error('Error creando cita:', err);
      setStatusMessage({ type: 'error', text: err.response?.data?.mensaje || 'No se pudo crear la cita.' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Combinar año, mes, día en un solo campo
    const birthDate = formatInputToDate(form.birthYear, form.birthMonth, form.birthDay);
    
    const validationError = validatePatientForm({ 
      rut: form.rut,
      firstName: form.firstName,
      lastName: form.lastName,
      birthDate: birthDate,
      phone: form.phone
    });
    if (validationError) {
      setStatusMessage({ type: 'error', text: validationError });
      return;
    }

    try {
      const payload = {
        rut: form.rut.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        birthDate: birthDate,
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.comuna?.trim() || '',
        postalCode: form.postalCode?.trim() || ''
      };

      if (editing) {
        await updatePatient(editing, payload);
        setStatusMessage({ type: 'success', text: 'Paciente actualizado correctamente.' });
      } else {
        await createPatient(payload);
        setStatusMessage({ type: 'success', text: 'Paciente creado correctamente.' });
      }

      resetForm();
      setShowForm(false);
      fetchPatients();
      setTimeout(() => setStatusMessage({ type: '', text: '' }), 4000);
    } catch (err) {
      console.error('Error:', err);
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.mensaje || 'Error al guardar paciente. Revisa los datos e intenta de nuevo.'
      });
    }
  };

  const handleEdit = (patient) => {
    const dateObj = formatDateToInput(patient.birthDate || '');
    setEditing(patient.id);
    setForm({
      rut: patient.rut,
      firstName: patient.firstName,
      lastName: patient.lastName,
      birthDate: patient.birthDate || '',
      birthYear: dateObj.year,
      birthMonth: dateObj.month,
      birthDay: dateObj.day,
      phone: patient.phone,
      address: patient.address || '',
      city: patient.city || '',
      comuna: patient.comuna || patient.state || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro?')) {
      try {
        await deletePatient(id);
        fetchPatients();
      } catch (err) {
        console.error('Error:', err);
      }
    }
  };

  const openProfessionalManager = (patient) => {
    setManagingPatient(patient);
  };

  const closeProfessionalManager = () => {
    setManagingPatient(null);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>👥 Gestión de Pacientes</h2>
        {user && user.role === 'admin' && (
          <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn-primary">
            {showForm ? 'Cancelar' : editing ? 'Editar Paciente' : '+ Nuevo Paciente'}
          </button>
        )}
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Buscar paciente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button type="button" onClick={handleSearch}>Buscar</button>
      </div>

      <div className="schedule-summary" style={{ marginBottom: '20px' }}>
        <div className="page-header" style={{ alignItems: 'flex-start' }}>
          <div>
            <h3>Citas del día</h3>
            <p style={{ marginTop: '6px', color: '#526a85' }}>Selecciona la fecha y categoría para ver los pacientes agendados por profesional.</p>
            <p style={{ marginTop: '6px', color: '#7a868f', fontSize: '0.9rem' }}>Recuerda: asignar un profesional al paciente no crea una cita automáticamente. Usa el botón <strong>Agendar</strong> para crear la cita.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
            />
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              {professionalCategories.map((category) => (
                <option key={category.value} value={category.value}>{category.label}</option>
              ))}
            </select>
          </div>
        </div>
        {Object.keys(dailyAppointmentsByProfessional).length > 0 ? (
          Object.entries(dailyAppointmentsByProfessional).map(([professional, appointments]) => (
            <div key={professional} className="calendar-group" style={{ marginBottom: '16px' }}>
              <h4>{professional}</h4>
              {appointments.map((appt) => (
                <div key={appt.id} className="calendar-list-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #eee' }}>
                  <div>
                    <strong>{appt.patientName} {appt.patientLastName}</strong>
                    <div style={{ fontSize: '0.95rem', color: '#555' }}>{appt.reason || 'Sin motivo'}</div>
                  </div>
                  <span>{appt.appointmentTime || 'Sin hora'}</span>
                </div>
              ))}
            </div>
          ))
        ) : (
          <div className="calendar-empty">No hay citas para esta fecha.</div>
        )}
      </div>

      <div className="schedule-summary" style={{ marginBottom: '20px' }}>
        <div className="page-header" style={{ alignItems: 'flex-start' }}>
          <div>
            <h3>Asignaciones de profesionales</h3>
            <p style={{ marginTop: '6px', color: '#526a85' }}>Muestra qué pacientes están asignados a cada profesional según categoría.</p>
          </div>
          <div>
            <p style={{ margin: 0, color: '#7a868f', fontSize: '0.9rem' }}>Las asignaciones existen aunque no haya una cita agendada.</p>
          </div>
        </div>

        {assignmentsLoading ? (
          <div className="calendar-empty">Cargando asignaciones...</div>
        ) : professionalAssignments.length > 0 ? (
          professionalAssignments.map(({ professional, patients }) => (
            <div key={professional.id} className="calendar-group" style={{ marginBottom: '16px' }}>
              <h4>{professional.firstName} {professional.lastName} – {professional.role || 'Sin categoría'}</h4>
              {patients.length > 0 ? (
                patients.map((patient) => (
                  <div key={patient.id} className="calendar-list-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #eee' }}>
                    <div>
                      <strong>{patient.firstName} {patient.lastName}</strong>
                      <div style={{ fontSize: '0.95rem', color: '#555' }}>{patient.rut || patient.id}</div>
                    </div>
                    <span>{patient.phone || 'Sin teléfono'}</span>
                  </div>
                ))
              ) : (
                <div className="calendar-empty">No hay pacientes asignados a este profesional.</div>
              )}
            </div>
          ))
        ) : (
          <div className="calendar-empty">No hay asignaciones para esta categoría.</div>
        )}
      </div>

      {schedulingPatient && (
        <div className="modal-overlay" onClick={cancelScheduling} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: '8px', padding: '32px', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '1.5rem' }}>📅 Agendar cita</h2>
                <p style={{ margin: 0, color: '#666', fontSize: '0.95rem' }}>Paciente: <strong>{schedulingPatient.firstName} {schedulingPatient.lastName}</strong></p>
              </div>
              <button type="button" className="btn-danger" onClick={cancelScheduling} style={{ padding: '8px 16px' }}>✕ Cerrar</button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#666', marginBottom: '12px', fontSize: '0.9rem' }}>Selecciona la categoría del profesional:</p>
              <div className="category-filters" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {professionalCategories.map((category) => (
                  <button
                    key={category.value}
                    type="button"
                    className={`calendar-category ${categoryFilter === category.value ? 'selected' : ''}`}
                    onClick={() => setCategoryFilter(category.value)}
                    style={{ padding: '8px 16px', borderRadius: '20px', border: categoryFilter === category.value ? '2px solid #0066cc' : '1px solid #ddd', backgroundColor: categoryFilter === category.value ? '#e6f0ff' : 'white', cursor: 'pointer' }}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#666', marginBottom: '12px', fontSize: '0.9rem' }}>Profesionales disponibles:</p>
              {filteredProfessionals.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                  {filteredProfessionals.map((professional) => (
                    <button
                      key={professional.id}
                      type="button"
                      className={`professional-card ${appointmentForm.professionalId === professional.id ? 'selected' : ''}`}
                      onClick={() => setAppointmentForm({ ...appointmentForm, professionalId: professional.id })}
                      style={{ padding: '16px', borderRadius: '8px', border: appointmentForm.professionalId === professional.id ? '2px solid #4CAF50' : '1px solid #ddd', backgroundColor: appointmentForm.professionalId === professional.id ? '#f1f8f4' : 'white', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                      <strong style={{ display: 'block', marginBottom: '4px' }}>{professional.firstName} {professional.lastName}</strong>
                      <span style={{ display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '4px' }}>{professional.role ? professional.role.charAt(0).toUpperCase() + professional.role.slice(1) : 'Profesional'}</span>
                      <small style={{ display: 'block', color: '#999' }}>{professional.email || professional.phone || 'Sin contacto'}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#999', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                  No hay profesionales registrados para esta categoría.
                </div>
              )}
            </div>

            {appointmentForm.professionalId && selectedProfessional && (
              <div style={{ backgroundColor: '#e8f5e9', padding: '16px', borderRadius: '6px', marginBottom: '20px', borderLeft: '4px solid #4CAF50' }}>
                <p style={{ margin: '0 0 12px 0', color: '#2e7d32', fontWeight: 'bold' }}>✓ Profesional seleccionado</p>
                <p style={{ margin: 0, color: '#333' }}><strong>{selectedProfessional.firstName} {selectedProfessional.lastName}</strong> - {selectedProfessional.role}</p>
              </div>
            )}

            {appointmentForm.professionalId && (
              <form onSubmit={handleAppointmentSubmit} style={{ display: 'grid', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '0.9rem' }}>Fecha de cita</label>
                  <input
                    type="date"
                    value={appointmentForm.appointmentDate}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, appointmentDate: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '0.9rem' }}>Hora de cita</label>
                  <input
                    type="time"
                    value={appointmentForm.appointmentTime}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, appointmentTime: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '0.9rem' }}>Motivo de la cita</label>
                  <input
                    type="text"
                    placeholder="Ej: Consulta general"
                    value={appointmentForm.reason}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, reason: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <button type="submit" className="btn-success" style={{ padding: '12px 24px', marginTop: '12px' }}>
                  ✓ Crear cita
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {statusMessage.text && (
        <div className={`status-message ${statusMessage.type}`}>
          {statusMessage.text}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="form-container">
          <input
            type="text"
            placeholder="RUT del paciente"
            inputMode="numeric"
            maxLength={12}
            value={form.rut}
            onChange={(e) => setForm({ ...form, rut: formatRutInput(e.target.value) })}
            required
          />
          <input
            type="text"
            placeholder="Nombre"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Apellido"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            required
          />
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '10px',
            marginBottom: '15px'
          }}>
            <div>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '5px' }}>Año</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="AAAA"
                maxLength={4}
                value={form.birthYear}
                onChange={(e) => setForm({ ...form, birthYear: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                required
                style={{ width: '100%', minWidth: '0' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '5px' }}>Mes</label>
              <select
                value={form.birthMonth}
                onChange={(e) => setForm({ ...form, birthMonth: e.target.value })}
                required
                style={{ width: '100%', padding: '8px' }}
              >
                <option value="">Seleccionar mes</option>
                <option value="01">Enero</option>
                <option value="02">Febrero</option>
                <option value="03">Marzo</option>
                <option value="04">Abril</option>
                <option value="05">Mayo</option>
                <option value="06">Junio</option>
                <option value="07">Julio</option>
                <option value="08">Agosto</option>
                <option value="09">Septiembre</option>
                <option value="10">Octubre</option>
                <option value="11">Noviembre</option>
                <option value="12">Diciembre</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '5px' }}>Día</label>
              <input
                type="number"
                placeholder="DD"
                min="1"
                max="31"
                value={form.birthDay}
                onChange={(e) => setForm({ ...form, birthDay: e.target.value })}
                required
                style={{ width: '100%' }}
              />
            </div>
          </div>
          <input
            type="tel"
            placeholder="Teléfono (9 dígitos)"
            inputMode="numeric"
            maxLength={9}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: formatPhoneInput(e.target.value) })}
            required
          />
          <input
            type="text"
            placeholder="Dirección"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <input
            type="text"
            placeholder="Ciudad"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
          <input
            type="text"
            placeholder="Comuna"
            value={form.comuna}
            onChange={(e) => setForm({ ...form, comuna: e.target.value })}
          />
          <button type="submit" className="btn-success">{editing ? 'Actualizar' : 'Guardar'}</button>
        </form>
      )}

      <table className="table">
        <thead>
          <tr>
            <th>Número</th>
            <th>Nombre</th>
            <th>Apellido</th>
            <th>Fecha Nacimiento</th>
            <th>Creado</th>
            <th>Teléfono</th>
            <th>Ciudad</th>
            <th>Comuna</th>
            <th>Profesionales asignados</th>
            {user && user.role === 'admin' && <th>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {patients.map((p) => (
            <tr key={p.id}>
              <td>{p.rut}</td>
              <td>{p.firstName}</td>
              <td>{p.lastName}</td>
              <td>{formatDate(p.birthDate)}</td>
              <td>{formatDate(p.createdAt)}</td>
              <td>{p.phone}</td>
              <td>{p.city}</td>
              <td>{p.comuna || p.state || ''}</td>
              <td>
                {assignedProfessionalsByPatient[p.id]?.length > 0 ? (
                  assignedProfessionalsByPatient[p.id].map((professional) => (
                    <div key={professional.id} style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
                      {professional.firstName} {professional.lastName} ({professional.role || 'Sin categoría'})
                    </div>
                  ))
                ) : (
                  <span style={{ color: '#777', fontSize: '0.85rem' }}>Sin asignaciones</span>
                )}
              </td>
              {user && user.role === 'admin' && (
                <td>
                  <>
                    <button className="btn-secondary" onClick={() => startScheduling(p)}>Agendar</button>
                    <button className="btn-primary" onClick={() => openProfessionalManager(p)}>Profesionales</button>
                    <button className="btn-primary" onClick={() => handleEdit(p)}>Editar</button>
                    <button className="btn-danger" onClick={() => handleDelete(p.id)}>Eliminar</button>
                  </>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {managingPatient && (
        <PatientProfessionalManager
          patientId={managingPatient.id}
          patientName={`${managingPatient.firstName} ${managingPatient.lastName}`}
          onClose={closeProfessionalManager}
        />
      )}
    </div>
  );
}
