import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPatients, getProfessionals, getAppointments, createPatient, updatePatient, deletePatient, searchPatients, createAppointment, getAssignedPatientsByProfessional } from '../services/api';
import PatientProfessionalManager from '../components/PatientProfessionalManager';
import PatientModal from '../components/PatientModal';
import ProfessionalAssignmentsPanel from '../components/ProfessionalAssignmentsPanel';
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
    comuna: '',
    postalCode: '',
    patientAddressLatitude: '',
    patientAddressLongitude: ''
  });
  const [professionals, setProfessionals] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryFilter, setCategoryFilter] = useState('todo');
  const [professionalAssignments, setProfessionalAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [selectedAssignmentProfessionalId, setSelectedAssignmentProfessionalId] = useState('');
  const [schedulingPatient, setSchedulingPatient] = useState(null);
  const [appointmentForm, setAppointmentForm] = useState({ professionalId: '', appointmentDate: '', appointmentTime: '', reason: '' });
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [managingPatient, setManagingPatient] = useState(null);
  const [activeTab, setActiveTab] = useState('patients');
  const [scheduleTabForm, setScheduleTabForm] = useState({
    patientId: '',
    professionalId: '',
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentTime: '09:00',
    reason: ''
  });
  const [previousCategoryFilter, setPreviousCategoryFilter] = useState('todo');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 5;

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

  const fetchProfessionalAssignments = useCallback(async () => {
    let visibleProfessionals = professionals.filter((p) =>
      categoryFilter === 'todo' || normalizeText(p.role) === normalizeText(categoryFilter)
    );

    if (user && user.role && user.role !== 'admin') {
      visibleProfessionals = visibleProfessionals.filter((p) => p.userId === user.id);
    }

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
            return {
              professional,
              patients: Array.isArray(res.data) ? res.data : []
            };
          } catch (err) {
            console.error(`Error obteniendo pacientes para ${professional.firstName}:`, err);
            return { professional, patients: [] };
          }
        })
      );
      setProfessionalAssignments(assignmentResults);
    } catch (err) {
      console.error('Error al cargar asignaciones de profesionales:', err.response?.data || err.message);
      setProfessionalAssignments([]);
    } finally {
      setAssignmentsLoading(false);
    }
  }, [categoryFilter, professionals, user]);

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
  }, [professionals, categoryFilter, user, fetchProfessionalAssignments]);

  useEffect(() => {
    if (!professionalAssignments.length) {
      setSelectedAssignmentProfessionalId('');
      return;
    }

    const stillExists = professionalAssignments.some((item) => item.professional.id === selectedAssignmentProfessionalId);
    if (!stillExists) {
      setSelectedAssignmentProfessionalId(professionalAssignments[0].professional.id);
    }
  }, [professionalAssignments, selectedAssignmentProfessionalId]);

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
      setCurrentPage(1);
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
      setCurrentPage(1);
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
      comuna: '',
      postalCode: '',
      patientAddressLatitude: '',
      patientAddressLongitude: ''
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

  const totalPages = Math.max(1, Math.ceil(patients.length / PAGE_SIZE));
  const paginatedPatients = patients.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

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

  const handleScheduleTabSubmit = async (e) => {
    e.preventDefault();

    if (!scheduleTabForm.patientId || !scheduleTabForm.professionalId || !scheduleTabForm.appointmentDate || !scheduleTabForm.appointmentTime || !scheduleTabForm.reason) {
      setStatusMessage({ type: 'error', text: 'Completa paciente, profesional, fecha, hora y motivo para agendar.' });
      return;
    }

    try {
      await createAppointment({
        patientId: scheduleTabForm.patientId,
        professionalId: scheduleTabForm.professionalId,
        appointmentDate: scheduleTabForm.appointmentDate,
        appointmentTime: scheduleTabForm.appointmentTime,
        reason: scheduleTabForm.reason
      });
      setStatusMessage({ type: 'success', text: 'Cita creada correctamente.' });
      setScheduleTabForm({
        patientId: '',
        professionalId: '',
        appointmentDate: new Date().toISOString().split('T')[0],
        appointmentTime: '09:00',
        reason: ''
      });
      fetchAppointments();
      fetchProfessionalAssignments();
    } catch (err) {
      console.error('Error creando cita desde la pestaña:', err);
      setStatusMessage({ type: 'error', text: err.response?.data?.mensaje || 'No se pudo crear la cita.' });
    }
  };

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
        state: form.comuna?.trim() || ''
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
      comuna: patient.comuna || patient.state || '',
      postalCode: patient.postalCode || '',
      patientAddressLatitude: patient.patientAddressLatitude ?? '',
      patientAddressLongitude: patient.patientAddressLongitude ?? ''
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
        <div>
          <h2>👥 Gestión de Pacientes</h2>
          <p style={{ margin: '6px 0 0', color: '#526a85' }}>Divide la gestión en pestañas para evitar saturar la vista y centrarte en cada tarea.</p>
        </div>
        {user && user.role === 'admin' && (
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
            + Nuevo Paciente
          </button>
        )}
      </div>

      <div className="tab-switcher" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
        <button type="button" className={activeTab === 'patients' ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveTab('patients')}>Listado de pacientes</button>
        <button type="button" className={activeTab === 'assignments' ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveTab('assignments')}>Asignaciones</button>
        <button type="button" className={activeTab === 'schedule' ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveTab('schedule')}>Agendar paciente</button>
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

      {activeTab === 'patients' && (
        <>
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

          <table className="table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>Fecha Nacimiento</th>
                <th>Creado</th>
                <th>Teléfono</th>
                <th>Dirección</th>
                <th>Ciudad</th>
                <th>Comuna</th>
                <th>Profesionales asignados</th>
                {user && user.role === 'admin' && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedPatients.map((p) => (
                <tr key={p.id}>
                  <td>{p.rut}</td>
                  <td>{p.firstName}</td>
                  <td>{p.lastName}</td>
                  <td>{formatDate(p.birthDate)}</td>
                  <td>{formatDate(p.createdAt)}</td>
                  <td>{p.phone}</td>
                  <td>{p.address}</td>
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
            <span style={{ color: '#526a85', fontSize: '0.95rem' }}>
              Mostrando {Math.min((currentPage - 1) * PAGE_SIZE + 1, patients.length)}-{Math.min(currentPage * PAGE_SIZE, patients.length)} de {patients.length} pacientes
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button type="button" className="btn-secondary" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1}>Anterior</button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button key={page} type="button" className={page === currentPage ? 'btn-primary' : 'btn-secondary'} onClick={() => setCurrentPage(page)} style={{ minWidth: '42px' }}>{page}</button>
              ))}
              <button type="button" className="btn-secondary" onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>Siguiente</button>
            </div>
          </div>
        </>
      )}

      {activeTab === 'assignments' && (
        <ProfessionalAssignmentsPanel
          assignments={professionalAssignments}
          loading={assignmentsLoading}
          searchTerm={assignmentSearch}
          onSearchChange={setAssignmentSearch}
          selectedProfessionalId={selectedAssignmentProfessionalId}
          onSelectProfessional={setSelectedAssignmentProfessionalId}
        />
      )}

      {activeTab === 'schedule' && (
        <section className="card-section" style={{ marginTop: '8px' }}>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <h3 style={{ marginBottom: '6px' }}>Agendar paciente</h3>
              <p style={{ margin: 0, color: '#526a85' }}>Crea una cita directamente desde esta pestaña, sin depender del formulario de asignación.</p>
            </div>
            <form onSubmit={handleScheduleTabSubmit} style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '700', color: '#102a43' }}>Paciente</label>
                <select
                  value={scheduleTabForm.patientId}
                  onChange={(e) => setScheduleTabForm({ ...scheduleTabForm, patientId: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #d9e2ec', background: '#f6f9fc' }}
                >
                  <option value="">Selecciona un paciente</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>{patient.firstName} {patient.lastName} — {patient.rut}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '700', color: '#102a43' }}>Profesional</label>
                <select
                  value={scheduleTabForm.professionalId}
                  onChange={(e) => setScheduleTabForm({ ...scheduleTabForm, professionalId: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #d9e2ec', background: '#f6f9fc' }}
                >
                  <option value="">Selecciona un profesional</option>
                  {professionals.map((professional) => (
                    <option key={professional.id} value={professional.id}>{professional.firstName} {professional.lastName} ({professional.role || 'Sin categoría'})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '700', color: '#102a43' }}>Fecha</label>
                  <input
                    type="date"
                    value={scheduleTabForm.appointmentDate}
                    onChange={(e) => setScheduleTabForm({ ...scheduleTabForm, appointmentDate: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #d9e2ec', background: '#f6f9fc' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '700', color: '#102a43' }}>Hora</label>
                  <input
                    type="time"
                    value={scheduleTabForm.appointmentTime}
                    onChange={(e) => setScheduleTabForm({ ...scheduleTabForm, appointmentTime: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #d9e2ec', background: '#f6f9fc' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '700', color: '#102a43' }}>Motivo</label>
                <input
                  type="text"
                  placeholder="Ej: Consulta general"
                  value={scheduleTabForm.reason}
                  onChange={(e) => setScheduleTabForm({ ...scheduleTabForm, reason: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #d9e2ec', background: '#f6f9fc' }}
                />
              </div>
              <button type="submit" className="btn-success">Confirmar agendamiento</button>
            </form>
          </div>
        </section>
      )}

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

      <PatientModal
        open={showForm}
        onClose={() => { setShowForm(false); resetForm(); }}
        form={form}
        setForm={setForm}
        editing={editing}
        onSubmit={handleSubmit}
        formatPhoneInput={formatPhoneInput}
        formatRutInput={formatRutInput}
        formatInputToDate={formatInputToDate}
        validatePatientForm={validatePatientForm}
      />

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
