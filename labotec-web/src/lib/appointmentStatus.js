const statusAlias = {
  scheduled: 'Scheduled',
  pendiente: 'Scheduled',
  confirmed: 'Scheduled',
  confirmada: 'Scheduled',
  checkin: 'CheckedIn',
  'check-in': 'CheckedIn',
  checkedin: 'CheckedIn',
  enprogreso: 'InProgress',
  inprogress: 'InProgress',
  atendiendo: 'InProgress',
  atendida: 'Completed',
  completed: 'Completed',
  completada: 'Completed',
  cancelada: 'Canceled',
  cancelled: 'Canceled',
  canceled: 'Canceled',
  noshow: 'NoShow',
  'no_show': 'NoShow',
}

export const STATUS_FLOW = ['Scheduled', 'CheckedIn', 'InProgress', 'Completed']
export const ACTIVE_QUEUE_STATUSES = new Set(['Scheduled', 'CheckedIn', 'InProgress'])

export const normalizeStatus = (value) => {
  if (!value) return ''
  const key = String(value).replace(/\s+/g, '').toLowerCase()
  return statusAlias[key] ?? value
}

export const getNextStatus = (value) => {
  const current = normalizeStatus(value) || 'Scheduled'
  const idx = STATUS_FLOW.indexOf(current)
  if (idx === -1) return STATUS_FLOW[0]
  if (idx >= STATUS_FLOW.length - 1) return STATUS_FLOW[idx]
  return STATUS_FLOW[idx + 1]
}
