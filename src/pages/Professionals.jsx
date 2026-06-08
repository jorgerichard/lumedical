import React, { useState, useEffect } from 'react';
import { getProfessionals, createProfessional, updateProfessional, deleteProfessional, searchProfessionals, getProfessionalPatients } from '../services/api';
import './Pages.css';

const formatRutInput = (value) => {
  const clean = value.replace(/[^0-9-]/g, '');
  const digits = clean.replace(/-/g, '').slice(0, 9);
  if (digits.length <= 8) {
    return digits;
  }
  return `${digits.slice(0, 8)}-${digits.slice(8)}`;
};

const formatPhoneInput = (value) => value.replace(/\D/g, '').slice(0, 9);

const validateProfessionalForm = ({ firstName, lastName, rut, correo, telefono, direccion, role }) => {
  if (!firstName || !lastName || !rut || !correo || !telefono || !direccion || !role) {
    return 'Todos los campos son obligatorios.';
  }
  if (!/^\d{8}-\d$/.test(rut)) {
    return 'RUT inválido. Debe tener formato 12345678-9 y solo números con un guion.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return 'Correo inválido.';
  }
  if (!/^\d{9}$/.test(telefono)) {
    return 'Teléfono inválido. Debe contener exactamente 9 dígitos.';
  }
  return null;
};

export default function Professionals() {
  const [professionals, setProfessionals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    rut: '',
    correo: '',
    telefono: '',
    direccion: '',
    role: 'medico'
  });
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [profileProfessional, setProfileProfessional] = useState(null);
  const [profileMonth, setProfileMonth] = useState(new Date().toISOString().slice(0, 7));
  const [profilePatients, setProfilePatients] = useState([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('todo');

  const rolCategories = [
    { value: 'medico', label: 'Médico' },
    { value: 'kinesiologo', label: 'Kinesiólogo' },
    { value: 'enfermera', label: 'Enfermería' },
    { value: 'quiropractico', label: 'Quiropráctico' }
  ];

  const professionalCategories = [
    { value: 'todo', label: 'Todas' },
    ...rolCategories
  ];

  useEffect(() => {
    fetchProfessionals();
  }, []);

  const fetchProfessionals = async () => {
    try {
      const res = await getProfessionals();
      const normalizedProfessionals = Array.isArray(res.data)
        ? res.data.map((professional) => ({
            ...professional,
            firstName: professional.firstName || professional.nombre || '',
            lastName: professional.lastName || professional.apellido || '',
            rut: professional.rut || professional.rutProfesional || '',
            correo: professional.correo || professional.email || '',
            telefono: professional.telefono || professional.phone || '',
            direccion: professional.direccion || professional.address || ''
          }))
        : [];
      setProfessionals(normalizedProfessionals);
      setStatusMessage({ type: '', text: '' });
    } catch (err) {
      console.error('Error al cargar profesionales:', err.response?.data || err.message);
      setStatusMessage({ type: 'error', text: 'No se pueden cargar los profesionales. Intenta de nuevo.' });
    }
  };

  const formatMonthLabel = (monthString) => {
    if (!monthString) return '';
    const [year, month] = monthString.split('-');
    const date = new Date(`${year}-${month}-01`);
    return date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  };

  const fetchProfessionalPatients = async (professionalId, monthYear) => {
    try {
      setProfileLoading(true);
      const [year, month] = monthYear.split('-');
      const res = await getProfessionalPatients(professionalId, year, month);
      setProfilePatients(Array.isArray(res.data.patients) ? res.data.patients : []);
      setStatusMessage({ type: '', text: '' });
    } catch (err) {
      console.error('Error cargando pacientes del profesional:', err.response?.data || err.message);
      setStatusMessage({ type: 'error', text: 'No se pudieron cargar los pacientes del profesional.' });
    } finally {
      setProfileLoading(false);
    }
  };

  const openProfessionalProfile = async (professional) => {
    setProfileProfessional(professional);
    await fetchProfessionalPatients(professional.id, profileMonth);
  };

  useEffect(() => {
    if (profileProfessional) {
      fetchProfessionalPatients(profileProfessional.id, profileMonth);
    }
  }, [profileMonth]);

  const closeProfessionalProfile = () => {
    setProfileProfessional(null);
    setProfilePatients([]);
  };

  const handleSearch = async () => {
    const query = String(search || '').trim();
    if (!query) {
      fetchProfessionals();
      return;
    }

    try {
      const res = await searchProfessionals(query);
      setProfessionals(res.data);
      setStatusMessage({ type: '', text: '' });
    } catch (err) {
      console.error('Error buscando profesionales:', err.response?.data || err.message);
      setStatusMessage({ type: 'error', text: 'No se pudo buscar profesionales.' });
    }
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ firstName: '', lastName: '', rut: '', correo: '', telefono: '', direccion: '', role: 'medico' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateProfessionalForm(form);
    if (validationError) {
      setStatusMessage({ type: 'error', text: validationError });
      return;
    }

    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        rut: form.rut.trim(),
        email: form.correo.trim().toLowerCase(),
        phone: form.telefono.trim(),
        address: form.direccion.trim(),
        role: form.role
      };

      if (editing) {
        await updateProfessional(editing, payload);
        setStatusMessage({ type: 'success', text: 'Profesional actualizado correctamente.' });
      } else {
        await createProfessional(payload);
        setStatusMessage({ type: 'success', text: 'Profesional creado correctamente.' });
      }

      resetForm();
      setShowForm(false);
      fetchProfessionals();
      setTimeout(() => setStatusMessage({ type: '', text: '' }), 4000);
    } catch (err) {
      console.error('Error al guardar profesional:', err.response?.data || err.message);
      setStatusMessage({ type: 'error', text: err.response?.data?.mensaje || 'Error al guardar profesional. Revisa los datos e intenta de nuevo.' });
    }
  };

  const handleEdit = (professional) => {
    setEditing(professional.id);
    setForm({
      firstName: professional.firstName || '',
      lastName: professional.lastName || '',
      rut: professional.rut || '',
      correo: professional.correo || '',
      telefono: professional.telefono || '',
      direccion: professional.direccion || '',
      role: professional.role || 'medico'
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro?')) {
      try {
        await deleteProfessional(id);
        fetchProfessionals();
      } catch (err) {
        console.error('Error al eliminar profesional:', err.response?.data || err.message);
      }
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>🩺 Gestión de Profesionales</h2>
        <button
          className="btn-primary"
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
        >
          {showForm ? 'Cancelar' : editing ? 'Editar Profesional' : '+ Nuevo Profesional'}
        </button>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Buscar profesional por RUT o correo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button type="button" onClick={handleSearch}>Buscar</button>
      </div>

      {statusMessage.text && (
        <div className={`status-message ${statusMessage.type}`}>
          {statusMessage.text}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="form-container">
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
          <input
            type="text"
            placeholder="RUT (12345678-9)"
            value={form.rut}
            inputMode="tel"
            maxLength={10}
            onChange={(e) => setForm({ ...form, rut: formatRutInput(e.target.value) })}
            required
          />
          <input
            type="email"
            placeholder="Correo"
            value={form.correo}
            onChange={(e) => setForm({ ...form, correo: e.target.value.toLowerCase() })}
            required
          />
          <input
            type="tel"
            placeholder="Teléfono (9 dígitos)"
            value={form.telefono}
            inputMode="numeric"
            maxLength={9}
            onChange={(e) => setForm({ ...form, telefono: formatPhoneInput(e.target.value) })}
            required
          />
          <input
            type="text"
            placeholder="Dirección"
            value={form.direccion}
            onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            required
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            required
            style={{ padding: '8px 12px', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="">Selecciona categoría...</option>
            {rolCategories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-success">
            {editing ? 'Actualizar' : 'Guardar'}
          </button>
        </form>
      )}

      <div className="category-filters" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
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
      <table className="table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Apellido</th>
            <th>RUT</th>
            <th>Correo</th>
            <th>Teléfono</th>
            <th>Dirección</th>
            <th>Categoría</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {professionals
            .filter((professional) => categoryFilter === 'todo' || professional.role === categoryFilter)
            .map((professional) => (
            <tr key={professional.id}>
              <td>{professional.firstName}</td>
              <td>{professional.lastName}</td>
              <td>{professional.rut}</td>
              <td>{professional.correo}</td>
              <td>{professional.telefono}</td>
              <td>{professional.direccion}</td>
              <td>
                <strong>{rolCategories.find(c => c.value === professional.role)?.label || professional.role}</strong>
              </td>
              <td>
                <button className="btn-secondary" onClick={() => openProfessionalProfile(professional)}>
                  Perfil
                </button>
                <button className="btn-primary" onClick={() => handleEdit(professional)}>
                  Editar
                </button>
                <button className="btn-danger" onClick={() => handleDelete(professional.id)}>
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {profileProfessional && (
        <div className="modal-overlay" onClick={closeProfessionalProfile} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(920px, 90%)', maxHeight: '90vh', overflowY: 'auto', backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0 }}>{profileProfessional.firstName} {profileProfessional.lastName}</h2>
                <p style={{ margin: '8px 0 0 0', color: '#555' }}><strong>Categoría:</strong> {rolCategories.find((c) => c.value === profileProfessional.role)?.label || profileProfessional.role}</p>
                <p style={{ margin: '4px 0 0 0', color: '#555' }}><strong>RUT:</strong> {profileProfessional.rut}</p>
              </div>
              <button type="button" className="btn-danger" onClick={closeProfessionalProfile} style={{ marginLeft: 'auto' }}>
                Cerrar
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
              <label style={{ fontWeight: '600', color: '#444' }}>Mes de consulta:</label>
              <input
                type="month"
                value={profileMonth}
                onChange={(e) => setProfileMonth(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
              />
              <span style={{ color: '#556' }}>{formatMonthLabel(profileMonth)}</span>
            </div>

            {profileLoading ? (
              <p>Cargando los pacientes atendidos por este profesional...</p>
            ) : profilePatients.length > 0 ? (
              <table className="table" style={{ marginTop: '0' }}>
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>RUT</th>
                    <th>Teléfono</th>
                    <th>Ciudad</th>
                    <th>Comuna</th>
                    <th>Fecha cita</th>
                    <th>Hora</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {profilePatients.map((patient) => (
                    <tr key={patient.appointmentId}>
                      <td>{patient.patientFirstName} {patient.patientLastName}</td>
                      <td>{patient.rut}</td>
                      <td>{patient.patientPhone}</td>
                      <td>{patient.patientCity}</td>
                      <td>{patient.patientState}</td>
                      <td>{patient.appointmentDate}</td>
                      <td>{patient.appointmentTime}</td>
                      <td>{patient.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No hay pacientes atendidos por este profesional en {formatMonthLabel(profileMonth)}.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
