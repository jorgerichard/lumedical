import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Appointments from './pages/Appointments';
import Patients from './pages/Patients';
import Evolution from './pages/Evolution';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Professionals from './pages/Professionals';
import Treatments from './pages/Treatments';
import Categories from './pages/Categories';
import Configuration from './pages/Configuration';
import Messages from './pages/Messages';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/patients" element={<Patients />} />
          <Route path="/professionals" element={<Professionals />} />
          <Route path="/evolution" element={<Evolution />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/treatments" element={<Treatments />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/configuration" element={<Configuration />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
