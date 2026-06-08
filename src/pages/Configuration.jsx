import React, { useState, useEffect } from 'react';
import {
  getConfigurations,
  createConfiguration,
  updateConfiguration,
  deleteConfiguration
} from '../services/api';
import './Pages.css';

export default function Configuration() {
  const [configs, setConfigs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    key: '',
    value: '',
    description: '',
    category: 'system'
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const res = await getConfigurations();
      setConfigs(res.data);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const resetForm = () => {
    setEditing(null);
    setForm({
      key: '',
      value: '',
      description: '',
      category: 'system'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateConfiguration(editing, form);
      } else {
        await createConfiguration(form);
      }
      resetForm();
      setShowForm(false);
      fetchConfigs();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleEdit = (config) => {
    setEditing(config.id);
    setForm({
      key: config.key,
      value: config.value,
      description: config.description || '',
      category: config.category || 'system'
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro?')) {
      try {
        await deleteConfiguration(id);
        fetchConfigs();
      } catch (err) {
        console.error('Error:', err);
      }
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>⚙️ Configuración del Sistema</h2>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn-primary">
          {showForm ? 'Cancelar' : editing ? 'Editar Configuración' : '+ Nueva Configuración'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="form-container">
          <input
            type="text"
            placeholder="Clave"
            value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Valor"
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
            required
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option value="system">Sistema</option>
            <option value="email">Email</option>
            <option value="security">Seguridad</option>
          </select>
          <textarea
            placeholder="Descripción"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <button type="submit" className="btn-success">{editing ? 'Actualizar' : 'Guardar'}</button>
        </form>
      )}

      <table className="table">
        <thead>
          <tr>
            <th>Clave</th>
            <th>Valor</th>
            <th>Categoría</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {configs.map((c) => (
            <tr key={c.id}>
              <td>{c.key}</td>
              <td>{c.value}</td>
              <td>{c.category}</td>
              <td>
                <button className="btn-primary" onClick={() => handleEdit(c)}>Editar</button>
                <button className="btn-danger" onClick={() => handleDelete(c.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
