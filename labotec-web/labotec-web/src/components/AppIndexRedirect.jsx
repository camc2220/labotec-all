import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AppIndexRedirect() {
  const { user } = useAuth()
  if (!user) return null

  const target = user.role === 'admin' ? '/app/users' : '/app/dashboard'
  return <Navigate to={target} replace />
}
