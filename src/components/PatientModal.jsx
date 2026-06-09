import React from 'react';

export default function PatientModal({
  open,
  onClose,
  form,
  setForm,
  editing,
  onSubmit,
  formatPhoneInput,
  formatRutInput,
  formatInputToDate,
  validatePatientForm
}) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: '18px', padding: '24px', width: '92%', maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 18px 40px rgba(16, 49, 73, 0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, color: '#102a43' }}>{editing ? 'Editar paciente' : 'Nuevo paciente'}</h3>
            <p style={{ margin: '6px 0 0', color: '#526a85', fontSize: '0.95rem' }}>Completa los datos del paciente en este modal para no saturar la vista principal.</p>
          </div>
          <button type="button" className="btn-danger" onClick={onClose}>✕ Cerrar</button>
        </div>

        <form onSubmit={onSubmit} className="form-container" style={{ marginBottom: 0 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '15px' }}>
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
          <p style={{ marginTop: '-8px', color: '#59708a', fontSize: '0.92rem' }}>
            Sugerencia: el GPS se obtendrá desde la dirección cuando esté habilitado, sin pedir coordenadas manuales al usuario.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-success">{editing ? 'Actualizar' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
