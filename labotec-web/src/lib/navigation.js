export function getNavigationForUser(user) {
  if (!user) return []

  if (user.isAdmin) {
    return [
      { to: '/app/users', label: 'Usuarios' },
      { to: '/app/patients', label: 'Pacientes' },
      { to: '/app/appointments', label: 'Citas' },
      { to: '/app/results', label: 'Resultados' },
      { to: '/app/lab-tests', label: 'Pruebas' },
      { to: '/app/invoices', label: 'Facturas' },
      { to: '/app/profile', label: 'Mi perfil' },
    ]
  }

  if (user.isRecepcion) {
    return [
      { to: '/app/appointments', label: 'Citas' },
      { to: '/app/patients', label: 'Pacientes' },
      { to: '/app/profile', label: 'Mi perfil' },
    ]
  }

  if (user.isFacturacion) {
    return [
      { to: '/app/lab-tests', label: 'Pruebas' },
      { to: '/app/invoices', label: 'Facturas' },
      { to: '/app/profile', label: 'Mi perfil' },
    ]
  }

  if (user.isBioanalista) {
    return [
      { to: '/app/patients', label: 'Pacientes' },
      { to: '/app/appointments', label: 'Citas' },
      { to: '/app/results', label: 'Resultados' },
      { to: '/app/profile', label: 'Mi perfil' },
    ]
  }

  // patient
  return [
    { to: '/app/dashboard', label: 'Inicio' },
    { to: '/app/appointments', label: 'Mis citas' },
    { to: '/app/results', label: 'Mis resultados' },
    { to: '/app/invoices', label: 'Mis facturas' },
    { to: '/app/profile', label: 'Mi perfil' },
  ]
}

export function getDefaultModulePath(user) {
  const navigation = getNavigationForUser(user)
  if (!navigation.length) return '/app'

  const firstNonDashboard = navigation.find(item => item.to !== '/app/dashboard')
  return (firstNonDashboard || navigation[0]).to
}
