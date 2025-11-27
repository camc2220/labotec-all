export function resolveEntityId(entity) {
  if (!entity || typeof entity !== 'object') return undefined
  return (
    entity.id ??
    entity._id ??
    entity.userId ??
    entity.userID ??
    entity.UserId ??
    entity.UserID ??
    entity.patientId ??
    entity.resultId ??
    entity.invoiceId ??
    entity.appointmentId ??
    entity.documentId ??
    entity.number
  )
}
