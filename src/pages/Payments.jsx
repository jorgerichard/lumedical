import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPayments, createPayment, updatePayment, deletePayment, getPatients, getProfessionals } from '../services/api';
import './Pages.css';

export default function Payments() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [payments, setPayments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [form, setForm] = useState({
    patientId: '',
    professionalId: '',
    professionalRut: '',
    amount: '',
    status: 'pending',
    paymentMethod: '',
    description: ''
  });

  const formatRutInput = (value) => {
    const clean = value.replace(/[^0-9kK]/g, '').toUpperCase().slice(0, 9);
    if (clean.length <= 8) {
      return clean;
    }
    return `${clean.slice(0, 8)}-${clean.slice(8)}`;
  };

  const getProfessionalDisplayName = (professional) => {
    if (!professional) return '';
    if (professional.name) return professional.name;
    const local = professional.correo?.split('@')[0] || professional.rut || '';
    return local
      .replace(/[._]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const isValidRut = (rut) => /^\d{8}-[0-9K]$/.test((rut || '').toUpperCase());

  useEffect(() => {
    fetchPayments();
    fetchPatients();
    fetchProfessionals();
  }, []);

  const fetchPayments = async () => {
    try {
      const res = await getPayments();
      setPayments(res.data);
    } catch (err) {
      const errorMsg = err.response?.data?.mensaje || err.message || 'Error al cargar pagos';
      setStatusMessage({ type: 'error', text: `❌ ${errorMsg}` });
      setTimeout(() => setStatusMessage({ type: '', text: '' }), 4000);
      console.error('Error:', err);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await getPatients();
      setPatients(res.data);
    } catch (err) {
      console.error('Error al cargar pacientes:', err.response?.data || err.message);
    }
  };

  const fetchProfessionals = async () => {
    try {
      const res = await getProfessionals();
      setProfessionals(res.data);
    } catch (err) {
      console.error('Error al cargar profesionales:', err.response?.data || err.message);
    }
  };

  const handleProfessionalChange = (professionalId) => {
    const selected = professionals.find((p) => p.id === professionalId);
    setForm({
      ...form,
      professionalId,
      professionalRut: selected?.rut || ''
    });
  };

  const handleProfessionalRutChange = (value) => {
    const formattedRut = formatRutInput(value);
    const selected = professionals.find((p) => p.rut.toUpperCase() === formattedRut.toUpperCase());

    setForm({
      ...form,
      professionalRut: formattedRut,
      professionalId: selected?.id || ''
    });
  };

  const resetForm = () => {
    setForm({
      patientId: '',
      professionalId: '',
      professionalRut: '',
      amount: '',
      status: 'pending',
      paymentMethod: '',
      description: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.patientId || !form.professionalId || !form.amount || !form.paymentMethod) {
      setStatusMessage({ type: 'error', text: 'Por favor completa todos los campos requeridos' });
      setTimeout(() => setStatusMessage({ type: '', text: '' }), 4000);
      return;
    }

    if (!isValidRut(form.professionalRut)) {
      setStatusMessage({ type: 'error', text: 'RUT de profesional inválido. Debe tener formato 12345678-9' });
      setTimeout(() => setStatusMessage({ type: '', text: '' }), 4000);
      return;
    }

    try {
      const payload = {
        patientId: form.patientId,
        professionalId: form.professionalId,
        amount: form.amount,
        status: form.status,
        paymentMethod: form.paymentMethod,
        description: form.description
      };

      await createPayment(payload);
      setStatusMessage({ type: 'success', text: '✅ Pago registrado correctamente' });
      resetForm();
      setShowForm(false);
      setTimeout(() => setStatusMessage({ type: '', text: '' }), 4000);
      fetchPayments();
    } catch (err) {
      const errorMsg = err.response?.data?.mensaje || err.message || 'Error al registrar pago';
      setStatusMessage({ type: 'error', text: `❌ ${errorMsg}` });
      setTimeout(() => setStatusMessage({ type: '', text: '' }), 4000);
      console.error('Error:', err);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updatePayment(id, { status });
      setStatusMessage({ type: 'success', text: '✅ Estado actualizado' });
      setTimeout(() => setStatusMessage(''), 3000);
      fetchPayments();
    } catch (err) {
      const errorMsg = err.response?.data?.mensaje || err.message || 'Error al actualizar';
      setStatusMessage({ type: 'error', text: `❌ ${errorMsg}` });
      setTimeout(() => setStatusMessage(''), 3000);
      console.error('Error:', err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este pago?')) {
      try {
        await deletePayment(id);
        setStatusMessage({ type: 'success', text: '✅ Pago eliminado correctamente' });
        setTimeout(() => setStatusMessage(''), 3000);
        fetchPayments();
      } catch (err) {
        const errorMsg = err.response?.data?.mensaje || err.message || 'Error al eliminar';
        setStatusMessage({ type: 'error', text: `❌ ${errorMsg}` });
        setTimeout(() => setStatusMessage(''), 3000);
        console.error('Error:', err);
      }
    }
  };

  const visiblePayments = payments.filter((p) => ['pending', 'paid', 'cancelled'].includes(p.status));
  const filtered = filterStatus ? visiblePayments.filter((p) => p.status === filterStatus) : visiblePayments;

  return (
    <div className="page">
      <h2>💰 Pagos</h2>

      {statusMessage.text && (
        <div className={`status-message ${statusMessage.type}`}>
          {statusMessage.text}
        </div>
      )}

      <div className="search-bar">
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            {showForm ? 'Cancelar' : '+ Nuevo Pago'}
          </button>
        )}
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Todos</option>
          <option value="pending">Pendiente</option>
          <option value="paid">Pagado</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="form-container">
          <select
            value={form.patientId}
            onChange={(e) => setForm({ ...form, patientId: e.target.value })}
            required
          >
            <option value="">Selecciona paciente</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.firstName} {patient.lastName}
              </option>
            ))}
          </select>

          <select
            value={form.professionalId}
            onChange={(e) => handleProfessionalChange(e.target.value)}
            required
          >
            <option value="">Selecciona profesional</option>
            {professionals.map((professional) => (
              <option key={professional.id} value={professional.id}>
                {getProfessionalDisplayName(professional)}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="RUT profesional (12345678-9)"
            value={form.professionalRut}
            onChange={(e) => handleProfessionalRutChange(e.target.value)}
            maxLength={10}
            pattern="^\d{8}-[0-9K]$"
            title="Formato exacto: 12345678-9"
            required
          />
          <small>Formato exacto: 8 dígitos + guion + dígito/K.</small>

          <input
            type="number"
            placeholder="Monto"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            step="0.01"
            required
          />
          <select
            value={form.paymentMethod}
            onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
            required
          >
            <option value="">Método de pago</option>
            <option value="credit_card">Tarjeta Crédito</option>
            <option value="cash">Efectivo</option>
            <option value="transfer">Transferencia</option>
          </select>
          <textarea
            placeholder="Descripción"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <button type="submit" className="btn-success">Crear</button>
        </form>
      )}

      <table className="table">
        <thead>
          <tr>
            <th>Referencia</th>
            <th>Paciente</th>
            <th>Profesional</th>
            <th>Monto</th>
            <th>Método</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((p) => (
            <tr key={p.id}>
              <td>{p.referenceNumber}</td>
              <td>{p.patientFirstName} {p.patientLastName}</td>
              <td>{getProfessionalDisplayName({ rut: p.professionalRut, correo: p.professionalEmail }) || '-'}</td>
              <td>${parseFloat(p.amount).toFixed(2)}</td>
              <td>{p.paymentMethod || '-'}</td>
              <td>
                {isAdmin ? (
                  <select
                    value={p.status}
                    onChange={(e) => handleStatusChange(p.id, e.target.value)}
                  >
                    <option value="pending">Pendiente</option>
                    <option value="paid">Pagado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                ) : (
                  <span style={{ textTransform: 'capitalize' }}>{p.status}</span>
                )}
              </td>
              <td>
                {isAdmin ? (
                  <button className="btn-danger" onClick={() => handleDelete(p.id)}>
                    Eliminar
                  </button>
                ) : (
                  <span style={{ color: '#555', fontSize: '0.9rem' }}>Solo lectura</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


