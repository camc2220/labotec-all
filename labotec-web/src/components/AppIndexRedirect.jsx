import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getDefaultModulePath } from '../lib/navigation'

export default function AppIndexRedirect() {
  const { user } = useAuth()
  if (!user) return null

  const target = getDefaultModulePath(user)
  return <Navigate to={target} replace />
}
