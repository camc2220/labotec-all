import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Patients from './pages/Patients'
import Appointments from './pages/Appointments'
import Results from './pages/Results'
import Invoices from './pages/Invoices'
import LabTests from './pages/LabTests'
import Home from './pages/Home'
import PatientDashboard from './pages/PatientDashboard'
import AppIndexRedirect from './components/AppIndexRedirect'
import UserManagement from './pages/UserManagement'
import Profile from './pages/Profile'
export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route index element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/app"
          element={(
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          )}
        >
          <Route index element={<AppIndexRedirect />} />
          <Route path="dashboard" element={<PatientDashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="patients" element={<Patients />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="results" element={<Results />} />
          <Route path="lab-tests" element={<LabTests />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
