import React, { useState, useEffect } from 'react';
import {
  getTreatments,
  createTreatment,
  updateTreatment,
  deleteTreatment,
  getCategories
} from '../services/api';
import './Pages.css';

export default function Treatments() {
  const [treatments, setTreatments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    categoryId: '',
    name: '',
    description: '',
    duration: '',
    price: '',
    status: 'active'
  });

  useEffect(() => {
    fetchTreatments();
    fetchCategories();
  }, []);

  const fetchTreatments = async () => {
    try {
      const res = await getTreatments();
      setTreatments(res.data);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await getCategories();
      setCategories(res.data);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const resetForm = () => {
    setEditing(null);
    setForm({
      categoryId: '',
      name: '',
      description: '',
      duration: '',
      price: '',
      status: 'active'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateTreatment(editing, form);
      } else {
        await createTreatment(form);
      }
      resetForm();
      setShowForm(false);
      fetchTreatments();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleEdit = (treatment) => {
    setEditing(treatment.id);
    setForm({
      categoryId: treatment.categoryId || '',
      name: treatment.name,
      description: treatment.description,
      duration: treatment.duration || '',
      price: treatment.price || '',
      status: treatment.status || 'active'
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar tratamiento?')) {
      try {
        await deleteTreatment(id);
        fetchTreatments();
      } catch (err) {
        console.error('Error:', err);
      }
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>🩺 Gestión de Tratamientos</h2>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn-primary">
          {showForm ? 'Cancelar' : editing ? 'Editar Tratamiento' : '+ Nuevo Tratamiento'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="form-container">
          <select
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            required
          >
            <option value="">Seleccionar categoría</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Nombre del tratamiento"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            type="number"
            placeholder="Duración (minutos)"
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: e.target.value })}
          />
          <input
            type="number"
            placeholder="Precio"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            step="0.01"
          />
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
          <textarea
            placeholder="Descripción"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <button type="submit" className="btn-success">
            {editing ? 'Actualizar' : 'Guardar'}
          </button>
        </form>
      )}

      <table className="table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Categoría</th>
            <th>Duración</th>
            <th>Precio</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {treatments.map((t) => (
            <tr key={t.id}>
              <td>{t.name}</td>
              <td>{t.categoryName || 'Sin categoría'}</td>
              <td>{t.duration ? `${t.duration} min` : '-'}</td>
              <td>${parseFloat(t.price || 0).toFixed(2)}</td>
              <td>{t.status}</td>
              <td>
                <button className="btn-primary" onClick={() => handleEdit(t)}>Editar</button>
                <button className="btn-danger" onClick={() => handleDelete(t.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
