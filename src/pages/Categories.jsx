import React, { useState, useEffect } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../services/api';
import './Pages.css';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchCategories();
  }, []);

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
    setForm({ name: '', description: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateCategory(editing, { ...form, isActive: true });
      } else {
        await createCategory(form);
      }
      resetForm();
      setShowForm(false);
      fetchCategories();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleEdit = (category) => {
    setEditing(category.id);
    setForm({ name: category.name, description: category.description });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar categoría?')) {
      try {
        await deleteCategory(id);
        fetchCategories();
      } catch (err) {
        console.error('Error:', err);
      }
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>🗂️ Gestión de Categorías</h2>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn-primary">
          {showForm ? 'Cancelar' : editing ? 'Editar Categoría' : '+ Nueva Categoría'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="form-container">
          <input
            type="text"
            placeholder="Nombre de la categoría"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
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
            <th>Descripción</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <tr key={cat.id}>
              <td>{cat.name}</td>
              <td>{cat.description || 'N/A'}</td>
              <td>
                <button className="btn-primary" onClick={() => handleEdit(cat)}>Editar</button>
                <button className="btn-danger" onClick={() => handleDelete(cat.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
