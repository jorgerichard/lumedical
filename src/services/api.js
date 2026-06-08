import axios from 'axios';

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

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Notify app to logout via event so AuthContext can handle it
      try {
        window.dispatchEvent(new Event('auth:logout'));
      } catch (e) {
        // fallback
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authLogin = (email, password) => API.post('/auth/login', { email, password });
export const authRegister = (firstName, lastName, email, password, role) =>
  API.post('/auth/register', { firstName, lastName, email, password, role });
export const getProfile = () => API.get('/auth/profile');

// Patients
export const getPatients = () => API.get('/patients');
export const createPatient = (data) => API.post('/patients', data);
export const updatePatient = (id, data) => API.put(`/patients/${id}`, data);
export const deletePatient = (id) => API.delete(`/patients/${id}`);
export const searchPatients = (query) => API.get(`/patients/search?query=${encodeURIComponent(query)}`);

// Professionals
export const getProfessionals = () => API.get('/professionals');
export const createProfessional = (data) => API.post('/professionals', data);
export const updateProfessional = (id, data) => API.put(`/professionals/${id}`, data);
export const deleteProfessional = (id) => API.delete(`/professionals/${id}`);
export const searchProfessionals = (query) => API.get(`/professionals/search?query=${encodeURIComponent(query)}`);
export const getProfessionalPatients = (id, year, month) => API.get(`/professionals/${id}/patients?year=${year}&month=${month}`);
export const getAssignedPatientsByProfessional = (professionalId) => API.get(`/patient-professional/professional/${professionalId}/patients`);

// Appointments
export const getAppointments = () => API.get('/appointments');
export const createAppointment = (data) => API.post('/appointments', data);
export const updateAppointment = (id, data) => API.put(`/appointments/${id}`, data);
export const registerAppointmentGpsEvent = (id, data) => API.post(`/appointments/${id}/gps`, data);
export const deleteAppointment = (id) => API.delete(`/appointments/${id}`);
export const getAppointmentsByPatient = (patientId) => API.get(`/appointments/patient/${patientId}`);

// Payments
export const getPayments = () => API.get('/payments');
export const createPayment = (data) => API.post('/payments', data);
export const updatePayment = (id, data) => API.put(`/payments/${id}`, data);
export const deletePayment = (id) => API.delete(`/payments/${id}`);
export const getPaymentsByPatient = (patientId) => API.get(`/payments/patient/${patientId}`);

// Reports
export const getReports = () => API.get('/reports');
export const createReport = (data) => API.post('/reports', data);
export const deleteReport = (id) => API.delete(`/reports/${id}`);

// Configuration
export const getConfigurations = () => API.get('/configurations');
export const createConfiguration = (data) => API.post('/configurations', data);
export const updateConfiguration = (id, data) => API.put(`/configurations/${id}`, data);
export const deleteConfiguration = (id) => API.delete(`/configurations/${id}`);

// Categories
export const getCategories = () => API.get('/categories');
export const createCategory = (data) => API.post('/categories', data);
export const updateCategory = (id, data) => API.put(`/categories/${id}`, data);
export const deleteCategory = (id) => API.delete(`/categories/${id}`);

// Treatments
export const getTreatments = () => API.get('/treatments');
export const createTreatment = (data) => API.post('/treatments', data);
export const updateTreatment = (id, data) => API.put(`/treatments/${id}`, data);
export const deleteTreatment = (id) => API.delete(`/treatments/${id}`);

// Evolutions
export const getEvolutions = () => API.get('/evolutions');
export const createEvolution = (data) => API.post('/evolutions', data);
export const updateEvolution = (id, data) => API.put(`/evolutions/${id}`, data);
export const deleteEvolution = (id) => API.delete(`/evolutions/${id}`);

// Messages
export const getInboxMessages = () => API.get('/messages');
export const getSentMessages = () => API.get('/messages/sent');
export const createMessage = (data) => API.post('/messages', data);
export const markMessageAsRead = (id) => API.put(`/messages/${id}/read`);
export const toggleMessageStar = (id, isStarred) => API.put(`/messages/${id}/star`, { isStarred });
export const deleteMessage = (id) => API.delete(`/messages/${id}`);
