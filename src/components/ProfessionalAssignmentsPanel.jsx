import React, { useMemo, useState } from 'react';

const PAGE_SIZE = 5;

export default function ProfessionalAssignmentsPanel({
  assignments,
  loading,
  searchTerm,
  onSearchChange,
  selectedProfessionalId,
  onSelectProfessional
}) {
  const normalizedSearch = (searchTerm || '').toLowerCase().trim();
  const [page, setPage] = useState(1);

  const filteredAssignments = useMemo(() => assignments.filter(({ professional, patients }) => {
    const professionalLabel = `${professional.firstName || ''} ${professional.lastName || ''} ${professional.role || ''}`.toLowerCase();
    const patientsLabel = (patients || [])
      .map((patient) => `${patient.firstName || ''} ${patient.lastName || ''} ${patient.rut || ''}`)
      .join(' ')
      .toLowerCase();

    return !normalizedSearch || professionalLabel.includes(normalizedSearch) || patientsLabel.includes(normalizedSearch);
  }), [assignments, normalizedSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredAssignments.length / PAGE_SIZE));
  const paginatedAssignments = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredAssignments.slice(start, start + PAGE_SIZE);
  }, [filteredAssignments, page]);

  const selectedAssignment = paginatedAssignments.find((item) => item.professional.id === selectedProfessionalId)
    || paginatedAssignments[0]
    || null;

  React.useEffect(() => {
    setPage(1);
  }, [normalizedSearch]);

  return (
    <section className="card-section" style={{ marginTop: '16px' }}>
      <div className="page-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ marginBottom: '6px' }}>Asignaciones de profesionales</h3>
          <p style={{ margin: 0, color: '#526a85' }}>Selecciona un profesional para ver solo sus pacientes asignados.</p>
        </div>
        <div style={{ color: '#7a868f', fontSize: '0.9rem', maxWidth: '320px', textAlign: 'right' }}>
          Filtra por nombre, rol o paciente sin repetir bloques largos.
        </div>
      </div>

      <div className="assignment-search" style={{ marginBottom: '16px' }}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filtrar profesionales o pacientes..."
          style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #d9e2ec', background: '#f6f9fc' }}
        />
      </div>

      {loading ? (
        <div className="calendar-empty">Cargando asignaciones...</div>
      ) : filteredAssignments.length === 0 ? (
        <div className="calendar-empty">No hay asignaciones para esta búsqueda.</div>
      ) : (
        <div className="assignments-layout">
          <aside className="assignment-sidebar">
            {paginatedAssignments.map(({ professional, patients }) => {
              const isActive = selectedAssignment?.professional?.id === professional.id;
              return (
                <button
                  key={professional.id}
                  type="button"
                  className={`assignment-card ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectProfessional(professional.id)}
                >
                  <strong>{professional.firstName} {professional.lastName}</strong>
                  <span>{professional.role || 'Sin categoría'}</span>
                  <small>{patients.length} paciente{patients.length === 1 ? '' : 's'} asignado{patients.length === 1 ? '' : 's'}</small>
                </button>
              );
            })}
            {filteredAssignments.length > PAGE_SIZE && (
              <div className="assignment-pagination" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                <button type="button" className="btn-secondary" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1}>Anterior</button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={item === page ? 'btn-primary' : 'btn-secondary'}
                    onClick={() => setPage(item)}
                    style={{ minWidth: '42px' }}
                  >
                    {item}
                  </button>
                ))}
                <button type="button" className="btn-secondary" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page === totalPages}>Siguiente</button>
              </div>
            )}
          </aside>

          <article className="assignment-detail">
            {selectedAssignment ? (
              <>
                <div style={{ marginBottom: '12px' }}>
                  <h4 style={{ margin: '0 0 6px', color: '#102a43' }}>{selectedAssignment.professional.firstName} {selectedAssignment.professional.lastName}</h4>
                  <p style={{ margin: 0, color: '#526a85' }}>{selectedAssignment.professional.role || 'Sin categoría'}</p>
                </div>
                {selectedAssignment.patients.length > 0 ? (
                  <div className="assignment-patient-list">
                    {selectedAssignment.patients.map((patient) => (
                      <article key={patient.id || `${selectedAssignment.professional.id}-${patient.rut || patient.id}`} className="assignment-patient-card">
                        <div>
                          <strong>{patient.firstName} {patient.lastName}</strong>
                          <div style={{ color: '#5c728a', fontSize: '0.92rem' }}>{patient.rut || patient.id}</div>
                        </div>
                        <span>{patient.phone || 'Sin teléfono'}</span>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="calendar-empty">No hay pacientes asignados a este profesional.</div>
                )}
              </>
            ) : (
              <div className="calendar-empty">Selecciona un profesional para ver su detalle.</div>
            )}
          </article>
        </div>
      )}
    </section>
  );
}
