import React, { useState, useEffect } from 'react';
import { getReports, createReport, deleteReport, getPatients, getProfessionals } from '../services/api';
import './Pages.css';

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [patients, setPatients] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    reportName: '',
    reportType: '',
    description: '',
    startDate: '',
    endDate: '',
    patientId: '',
    professionalId: ''
  });

  useEffect(() => {
    fetchReports();
    fetchPatients();
    fetchProfessionals();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await getReports();
      setReports(res.data);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await getPatients();
      setPatients(res.data);
    } catch (err) {
      console.error('Error fetching patients:', err);
    }
  };

  const fetchProfessionals = async () => {
    try {
      const res = await getProfessionals();
      setProfessionals(res.data);
    } catch (err) {
      console.error('Error fetching professionals:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createReport(form);
      setForm({
        reportName: '',
        reportType: '',
        description: '',
        startDate: '',
        endDate: '',
        patientId: '',
        professionalId: ''
      });
      setShowForm(false);
      fetchReports();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro?')) {
      try {
        await deleteReport(id);
        fetchReports();
      } catch (err) {
        console.error('Error:', err);
      }
    }
  };

  return (
    <div className="page">
      <h2>📊 Reportes</h2>

      <button onClick={() => setShowForm(!showForm)} className="btn-primary">
        {showForm ? 'Cancelar' : '+ Generar Reporte'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="form-container">
          <select
            value={form.patientId || ''}
            onChange={(e) => setForm({ ...form, patientId: e.target.value })}
          >
            <option value="">Seleccionar paciente (opcional)</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
            ))}
          </select>
          <select
            value={form.professionalId || ''}
            onChange={(e) => setForm({ ...form, professionalId: e.target.value })}
          >
            <option value="">Seleccionar profesional (opcional)</option>
            {professionals.length > 0 ? (
              professionals.map((professional) => (
                <option key={professional.id} value={professional.id}>
                  {professional.firstName} {professional.lastName} ({professional.role})
                </option>
              ))
            ) : (
              <option value="">No hay profesionales disponibles</option>
            )}
          </select>
          <input
            type="text"
            placeholder="Nombre del Reporte"
            value={form.reportName}
            onChange={(e) => setForm({ ...form, reportName: e.target.value })}
            required
          />
          <select
            value={form.reportType}
            onChange={(e) => setForm({ ...form, reportType: e.target.value })}
            required
          >
            <option value="">Tipo</option>
            <option value="appointments">Citas</option>
            <option value="payments">Pagos</option>
            <option value="patients">Pacientes</option>
          </select>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            required
          />
          <input
            type="date"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            required
          />
          <textarea
            placeholder="Descripción"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <button type="submit" className="btn-success">Generar</button>
        </form>
      )}

      <div className="cards-container">
        {reports.map((r) => (
          <div key={r.id} className="card-report">
            <h3>{r.reportName}</h3>
            <p>Tipo: {r.reportType}</p>
            {r.patientFirstName && (
              <p>Paciente: {r.patientFirstName} {r.patientLastName}</p>
            )}
            {r.professionalFirstName && (
              <p>Profesional: {r.professionalFirstName} {r.professionalLastName} ({r.professionalRole})</p>
            )}
            <p>Período: {new Date(r.startDate).toLocaleDateString()} - {new Date(r.endDate).toLocaleDateString()}</p>
            <p>Estado: {r.status}</p>
            <button className="btn-danger" onClick={() => handleDelete(r.id)}>
              Eliminar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
