import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../pages/Pages.css';

const API = axios.create({
  baseURL: 'http://localhost:3002/api'
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default function PatientProfessionalManager({ patientId, onClose, patientName }) {
  const [assignedProfessionals, setAssignedProfessionals] = useState([]);
  const [availableProfessionals, setAvailableProfessionals] = useState([]);
  const [selectedProfessional, setSelectedProfessional] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchAssignedProfessionals();
    fetchAvailableProfessionals();
  }, [patientId]);

  const fetchAssignedProfessionals = async () => {
    try {
      const res = await API.get(`/patient-professional/patient/${patientId}/professionals`);
      setAssignedProfessionals(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching assigned professionals:', error);
      setStatusMessage({ type: 'error', text: 'Error al cargar profesionales asignados' });
    }
  };

  const fetchAvailableProfessionals = async () => {
    try {
      const res = await API.get('/professionals');
      setAvailableProfessionals(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching professionals:', error);
    }
  };

  const handleAssignProfessional = async () => {
    if (!selectedProfessional) {
      setStatusMessage({ type: 'error', text: 'Selecciona un profesional' });
      return;
    }

    const professional = availableProfessionals.find((p) => p.id === selectedProfessional);
    const rol = professional?.role || 'medico';

    try {
      setLoading(true);
      await API.post('/patient-professional/assign', {
        patientId,
        professionalId: selectedProfessional,
        rol
      });
      setStatusMessage({ type: 'success', text: 'Profesional asignado correctamente' });
      setSelectedProfessional('');
      await fetchAssignedProfessionals();
      setTimeout(() => setStatusMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error assigning professional:', error);
      setStatusMessage({ 
        type: 'error', 
        text: error.response?.data?.mensaje || 'Error al asignar profesional' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveProfessional = async (professionalId) => {
    if (!window.confirm('¿Estás seguro de que deseas remover este profesional?')) {
      return;
    }

    try {
      setLoading(true);
      await API.delete(`/patient-professional/patient/${patientId}/professional/${professionalId}`);
      setStatusMessage({ type: 'success', text: 'Profesional removido correctamente' });
      await fetchAssignedProfessionals();
      setTimeout(() => setStatusMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error removing professional:', error);
      setStatusMessage({ 
        type: 'error', 
        text: error.response?.data?.mensaje || 'Error al remover profesional' 
      });
    } finally {
      setLoading(false);
    }
  };

  const getUnassignedProfessionals = () => {
    const assignedIds = assignedProfessionals.map(ap => ap.professionalId);
    return availableProfessionals.filter(p => !assignedIds.includes(p.id));
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>Profesionales de {patientName}</h2>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ✕
          </button>
        </div>

        {statusMessage.text && (
          <div style={{
            padding: '12px',
            marginBottom: '16px',
            borderRadius: '6px',
            backgroundColor: statusMessage.type === 'error' ? '#fee' : '#efe',
            color: statusMessage.type === 'error' ? '#c33' : '#3c3'
          }}>
            {statusMessage.text}
          </div>
        )}

        {/* Profesionales Asignados */}
        <div style={{ marginBottom: '24px' }}>
          <h3>Profesionales Asignados ({assignedProfessionals.length})</h3>
          {assignedProfessionals.length > 0 ? (
            <div style={{
              display: 'grid',
              gap: '12px'
            }}>
              {assignedProfessionals.map(ap => (
                <div
                  key={ap.professionalId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '6px',
                    border: '1px solid #ddd'
                  }}
                >
                  <div>
                    <strong>{ap.firstName} {ap.lastName}</strong>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {ap.role} • {ap.rut} • {ap.email}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveProfessional(ap.professionalId)}
                    disabled={loading}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#f44',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#999' }}>No hay profesionales asignados</p>
          )}
        </div>

        {/* Asignar Nuevo Profesional */}
        <div style={{
          padding: '16px',
          backgroundColor: '#f9f9f9',
          borderRadius: '6px',
          borderTop: '1px solid #eee'
        }}>
          <h3 style={{ marginTop: 0 }}>Asignar Profesional</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              value={selectedProfessional}
              onChange={(e) => setSelectedProfessional(e.target.value)}
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                fontSize: '14px'
              }}
            >
              <option value="">Selecciona un profesional...</option>
              {getUnassignedProfessionals().map(p => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName} ({p.role})
                </option>
              ))}
            </select>
            <button
              onClick={handleAssignProfessional}
              disabled={loading || !selectedProfessional}
              style={{
                padding: '10px 16px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading || !selectedProfessional ? 0.6 : 1
              }}
            >
              {loading ? 'Cargando...' : 'Asignar'}
            </button>
          </div>
          {getUnassignedProfessionals().length === 0 && (
            <p style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
              Todos los profesionales ya están asignados a este paciente
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
