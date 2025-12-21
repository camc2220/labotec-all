const escapeHtml = value => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

export function printRecords({
  title,
  subtitle = '',
  columns = [],
  rows = [],
  info = [],
  brandName = 'Labotec',
  footerNote = '',
}) {
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
  const infoItems = (info ?? [])
    .filter(item => item && item.label && item.value)
    .map(item => `
      <div class="info-item">
        <div class="info-label">${escapeHtml(item.label)}</div>
        <div class="info-value">${escapeHtml(item.value)}</div>
      </div>
    `)
    .join('')

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
      background: #0b172a;
      color: #0f172a;
    }
    .sheet {
      max-width: 960px;
      margin: 0 auto;
      background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 45%, #e0f2fe 100%);
      border-radius: 18px;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
      padding: 28px;
      border: 1px solid rgba(14, 116, 144, 0.12);
    }
    .header {
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-mark {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      border-radius: 16px;
      background: linear-gradient(145deg, #0ea5e9 0%, #0f172a 70%);
      color: white;
      font-weight: 800;
      letter-spacing: 0.08em;
      font-size: 18px;
      text-transform: uppercase;
      border: 1px solid rgba(255, 255, 255, 0.35);
      box-shadow: 0 10px 30px rgba(14, 165, 233, 0.35);
    }
    h1 {
      margin: 2px 0;
      font-size: 26px;
      color: #0f172a;
    }
    .brand-tagline {
      margin: 0;
      font-size: 12px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #0ea5e9;
      font-weight: 700;
    }
    .subtitle, .generated {
      margin: 4px 0;
      font-size: 14px;
      color: #475569;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin: 22px 0 14px;
    }
    .info-item {
      background: rgba(255, 255, 255, 0.75);
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 12px;
      padding: 10px 12px;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
    }
    .info-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #0ea5e9;
      margin-bottom: 2px;
      font-weight: 700;
    }
    .info-value {
      font-size: 15px;
      color: #0f172a;
      font-weight: 700;
    }
    .table-card {
      background: white;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
    }
    table {
      border-collapse: collapse;
      width: 100%;
      background: white;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 10px 12px;
      text-align: left;
      font-size: 14px;
    }
    thead {
      background: linear-gradient(90deg, #0ea5e9, #22d3ee);
      color: #0f172a;
      font-size: 13px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    tbody tr:hover {
      background: #ecfeff;
    }
    .footer-note {
      margin-top: 16px;
      font-size: 13px;
      color: #334155;
      padding: 12px;
      background: rgba(255, 255, 255, 0.7);
      border-radius: 12px;
      border: 1px dashed rgba(14, 165, 233, 0.4);
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="brand">
        <div class="brand-mark">${escapeHtml(brandName)}</div>
        <div>
          <p class="brand-tagline">Resultados confiables y oportunos</p>
          <h1>${escapeHtml(title)}</h1>
          ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ''}
          <p class="generated">Generado el ${escapeHtml(generatedAt)}</p>
        </div>
      </div>
    </div>
    ${infoItems ? `<section class="info-grid">${infoItems}</section>` : ''}
    <div class="table-card">
      <table>
        <thead>
          <tr><th>#</th>${headerCells}</tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
      </table>
    </div>
    ${footerNote ? `<p class="footer-note">${escapeHtml(footerNote)}</p>` : ''}
  </div>
</body>
</html>`)

  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}
