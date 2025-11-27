const escapeHtml = value => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

export function printRecords({ title, subtitle = '', columns = [], rows = [] }) {
  if (typeof window === 'undefined') return
  if (!rows.length) {
    window.alert('No hay registros para imprimir.')
    return
  }

  const printWindow = window.open('', '', 'width=900,height=650')
  if (!printWindow) {
    window.alert('No pudimos abrir la ventana de impresión. Revisa que el navegador no bloquee ventanas emergentes.')
    return
  }

  const headerCells = columns.map(col => `<th>${escapeHtml(col.header)}</th>`).join('')
  const bodyRows = rows
    .map((row, index) => {
      const cells = columns
        .map(col => {
          const value = typeof col.accessor === 'function' ? col.accessor(row, index) : row[col.key]
          return `<td>${escapeHtml(value ?? '')}</td>`
        })
        .join('')
      return `<tr><td>${index + 1}</td>${cells}</tr>`
    })
    .join('')

  const generatedAt = new Date().toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })

  printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      margin: 0;
      padding: 24px;
      background: #f8fafc;
      color: #0f172a;
    }
    .header {
      margin-bottom: 24px;
    }
    h1 {
      margin: 0;
      font-size: 24px;
    }
    .subtitle, .generated {
      margin: 4px 0;
      font-size: 14px;
      color: #475569;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      background: white;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 8px 12px;
      text-align: left;
      font-size: 14px;
    }
    thead {
      background: #e2e8f0;
    }
    tbody tr:nth-child(even) {
      background: #f8fafc;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(title)}</h1>
    ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ''}
    <p class="generated">Generado el ${escapeHtml(generatedAt)}</p>
  </div>
  <table>
    <thead>
      <tr><th>#</th>${headerCells}</tr>
    </thead>
    <tbody>
      ${bodyRows}
    </tbody>
  </table>
</body>
</html>`)

  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}
