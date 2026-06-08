import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function Register() {
  const [data, setData] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', role: 'medico' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData({ ...data, [name]: value });
  };

  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (data.password !== data.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      await register(data.firstName, data.lastName, data.email, data.password, data.role);
      const dest = location.state?.from?.pathname || '/dashboard';
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>🏥 Salud System</h1>
        <h2>Registrarse</h2>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Nombre"
            name="firstName"
            value={data.firstName}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            placeholder="Apellido"
            name="lastName"
            value={data.lastName}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            placeholder="Email"
            name="email"
            value={data.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            name="password"
            value={data.password}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            placeholder="Confirmar Contraseña"
            name="confirmPassword"
            value={data.confirmPassword}
            onChange={handleChange}
            required
          />
          <select
            name="role"
            value={data.role}
            onChange={handleChange}
            required
            style={{ padding: '10px 12px', marginTop: '12px', borderRadius: '6px', border: '1px solid #ccc' }}
          >
            <option value="medico">Médico</option>
            <option value="enfermera">Enfermería</option>
            <option value="kinesiologo">Kinesiología</option>
            <option value="quiropractico">Quiropráctico</option>
          </select>
          <button type="submit" disabled={loading}>
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>

        <p>
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
