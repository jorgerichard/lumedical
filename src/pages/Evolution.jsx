import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getEvolutions, createEvolution, updateEvolution, deleteEvolution, getPatients, getProfessionals } from '../services/api';
import './Pages.css';

export default function Evolution() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [evolutions, setEvolutions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedEvolution, setSelectedEvolution] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    patientId: '',
    professionalId: '',
    status: 'active',
    notes: '',
    evolutionDate: ''
  });

  useEffect(() => {
    fetchEvolutions();
    fetchPatients();
    fetchProfessionals();
  }, []);

  const fetchEvolutions = async () => {
    try {
      const res = await getEvolutions();
      setEvolutions(res.data);
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
      setProfessionals(res.data);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const resetForm = () => {
    setEditing(null);
    setForm({
      patientId: '',
      professionalId: '',
      status: 'active',
      notes: '',
      evolutionDate: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateEvolution(editing, form);
      } else {
        await createEvolution(form);
      }
      resetForm();
      setShowForm(false);
      fetchEvolutions();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleEdit = (item) => {
    setEditing(item.id);
    setForm({
      patientId: item.patientId,
      professionalId: item.professionalId || '',
      status: item.status,
      notes: item.notes,
      evolutionDate: item.evolutionDate
    });
    setShowForm(true);
  };

  const handleViewEvolution = (item) => {
    setSelectedEvolution(item);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedEvolution(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar esta evolución clínica?')) {
      try {
        await deleteEvolution(id);
        fetchEvolutions();
      } catch (err) {
        console.error('Error:', err);
      }
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>📋 Evolución Clínica</h2>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn-primary">
          {showForm ? 'Cancelar' : editing ? 'Editar Evolución' : '+ Nueva Evolución'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="form-container">
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
          {isAdmin ? (
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
          ) : null}
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="active">Activo</option>
            <option value="review">En revisión</option>
            <option value="completed">Completado</option>
          </select>
          <input
            type="date"
            value={form.evolutionDate}
            onChange={(e) => setForm({ ...form, evolutionDate: e.target.value })}
            required
          />
          <textarea
            placeholder="Notas clínicas"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <button type="submit" className="btn-success">
            {editing ? 'Actualizar' : 'Guardar'}
          </button>
        </form>
      )}

      {showModal && selectedEvolution && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detalle de Evolución Clínica</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">Fecha:</span>
                <span className="detail-value">{new Date(selectedEvolution.evolutionDate).toLocaleDateString()}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Paciente:</span>
                <span className="detail-value">{selectedEvolution.patientFirstName} {selectedEvolution.patientLastName}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Profesional:</span>
                <span className="detail-value">{selectedEvolution.professionalFirstName ? `${selectedEvolution.professionalFirstName} ${selectedEvolution.professionalLastName} (${selectedEvolution.professionalRole})` : '-'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Estado:</span>
                <span className="detail-value" style={{ textTransform: 'capitalize' }}>
                  {selectedEvolution.status === 'active' && '🟢 Activo'}
                  {selectedEvolution.status === 'review' && '🟡 En revisión'}
                  {selectedEvolution.status === 'completed' && '✅ Completado'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Notas Clínicas:</span>
                <p className="detail-notes">{selectedEvolution.notes}</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => { handleEdit(selectedEvolution); closeModal(); }}>Editar</button>
              <button className="btn-secondary" onClick={closeModal}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <table className="table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Paciente</th>
            <th>Profesional</th>
            <th>Estado</th>
            <th>Notas</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {evolutions.map((item) => (
            <tr key={item.id}>
              <td>{new Date(item.evolutionDate).toLocaleDateString()}</td>
              <td>{item.patientFirstName} {item.patientLastName}</td>
              <td>{item.professionalFirstName ? `${item.professionalFirstName} ${item.professionalLastName}` : '-'}</td>
              <td>{item.status}</td>
              <td>{item.notes?.slice(0, 64)}</td>
              <td>
                <button className="btn-primary" onClick={() => handleViewEvolution(item)}>Ver</button>
                <button className="btn-warning" onClick={() => handleEdit(item)}>Editar</button>
                <button className="btn-danger" onClick={() => handleDelete(item.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
