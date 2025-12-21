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
  brandName = 'Labotec SRL',
  footerNote = '',
  renderRowDetails = null, 
}) {
  if (typeof window === 'undefined') return
  if (!rows.length) {
    window.alert('No hay registros para imprimir.')
    return
  }

  const printWindow = window.open('', '', 'width=1000,height=800')
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
      
      const mainRow = `<tr><td class="index-cell">${index + 1}</td>${cells}</tr>`
      
      // Lógica para detalles (desglose)
      let detailRow = ''
      if (renderRowDetails) {
        const detailsHtml = renderRowDetails(row)
        if (detailsHtml) {
          detailRow = `
            <tr class="detail-row">
              <td colspan="${columns.length + 1}">
                <div class="detail-container">
                  ${detailsHtml}
                </div>
              </td>
            </tr>
          `
        }
      }

      return mainRow + detailRow
    })
    .join('')

  const generatedAt = new Date().toLocaleString('es-DO', { dateStyle: 'long', timeStyle: 'short' })
  
  const infoSection = (info ?? [])
    .filter(item => item && item.label && item.value)
    .map(item => `
      <div class="info-group">
        <div class="info-label">${escapeHtml(item.label)}</div>
        <div class="info-value">${escapeHtml(item.value)}</div>
      </div>
    `)
    .join('')

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(title)} - ${escapeHtml(brandName)}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        :root {
          --primary: #0284c7; /* sky-600 */
          --primary-dark: #0369a1; /* sky-700 */
          --text-main: #0f172a; /* slate-900 */
          --text-muted: #64748b; /* slate-500 */
          --border: #e2e8f0; /* slate-200 */
          --bg-header: #f8fafc; /* slate-50 */
          --bg-row-alt: #f1f5f9; /* slate-100 */
        }
        
        *, *::before, *::after {
          box-sizing: border-box;
        }

        body {
          font-family: 'Inter', sans-serif;
          margin: 0;
          background-color: #fff;
          color: var(--text-main);
          font-size: 12px;
          line-height: 1.5;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .page-container {
          max-width: 210mm; /* A4 width */
          margin: 0 auto;
          padding: 40px;
        }

        /* Print Specifics */
        @media print {
          @page {
            margin: 1.5cm;
            size: auto;
          }
          body {
            background: none;
            margin: 0;
          }
          .page-container {
            width: 100%;
            max-width: none;
            padding: 0;
            margin: 0;
          }
        }

        /* Header */
        .doc-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid var(--primary);
          padding-bottom: 16px;
          margin-bottom: 24px;
        }

        .brand-section {
          display: flex;
          flex-direction: column;
        }

        .brand-logo {
          font-size: 20px;
          font-weight: 800;
          color: var(--primary);
          text-transform: uppercase;
          letter-spacing: -0.5px;
          margin-bottom: 2px;
        }

        .brand-subtitle {
          color: var(--text-muted);
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          font-weight: 600;
        }

        .doc-meta {
          text-align: right;
        }

        .doc-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-main);
          margin: 0;
          text-transform: uppercase;
        }

        .doc-date {
          color: var(--text-muted);
          font-size: 10px;
          margin-top: 4px;
        }

        /* Info Grid */
        .info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
          background-color: var(--bg-header);
          padding: 12px 16px;
          border-radius: 6px;
          border: 1px solid var(--border);
        }

        .info-group {
          display: flex;
          flex-direction: column;
        }

        .info-label {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
          font-weight: 700;
          margin-bottom: 2px;
        }

        .info-value {
          font-size: 11px;
          font-weight: 500;
          color: var(--text-main);
        }

        /* Table */
        .data-table-container {
          margin-bottom: 30px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
        }

        th {
          background-color: var(--bg-header);
          color: var(--text-muted);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 8px 10px;
          text-align: left;
          border-bottom: 1px solid var(--border);
          border-top: 1px solid var(--border);
        }

        td {
          padding: 8px 10px;
          border-bottom: 1px solid var(--border);
          color: var(--text-main);
          vertical-align: top;
        }

        .index-cell {
          width: 30px;
          text-align: center;
          color: var(--text-muted);
          font-weight: 500;
        }

        /* Zebra Striping */
        /* Only apply stripe to main rows if not expanding details heavily, 
           or use specific logic. Here we keep simple striping but detail row needs care */
        tbody tr:not(.detail-row):nth-child(4n-3) {
          background-color: var(--bg-row-alt);
        }

        /* Detail Row Styles */
        .detail-row td {
          padding: 0 40px 15px 40px; /* Indent content */
          border-bottom: 1px solid var(--border);
          background-color: inherit;
        }

        .detail-container {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          padding: 10px;
        }

        /* Styles for inner content (passed via renderRowDetails) */
        .sub-table {
          width: 100%;
          border-collapse: collapse;
        }
        .sub-table th {
          font-size: 9px;
          color: var(--text-muted);
          text-transform: uppercase;
          border-bottom: 1px solid #cbd5e1;
          padding: 4px 0;
          background: transparent;
        }
        .sub-table td {
          font-size: 10px;
          color: var(--text-main);
          border-bottom: 1px solid #e2e8f0;
          padding: 4px 0;
        }
        .sub-table tr:last-child td {
          border-bottom: none;
        }
        .text-right { text-align: right; }
        .text-bold { font-weight: 600; }

        /* Footer */
        .doc-footer {
          margin-top: 40px;
          padding-top: 16px;
          border-top: 1px solid var(--border);
          text-align: center;
        }

        .footer-note {
          font-size: 9px;
          color: var(--text-muted);
          margin-bottom: 4px;
          font-style: italic;
        }
        
        .footer-brand {
          font-size: 9px;
          font-weight: 600;
          color: var(--primary);
        }

      </style>
    </head>
    <body>
      <div class="page-container">
        
        <header class="doc-header">
          <div class="brand-section">
            <div class="brand-logo">${escapeHtml(brandName)}</div>
            <div class="brand-subtitle">Laboratorio Clínico</div>
          </div>
          <div class="doc-meta">
            <h1 class="doc-title">${escapeHtml(title)}</h1>
            <div class="doc-date">${escapeHtml(generatedAt)}</div>
            ${subtitle ? `<div class="doc-date" style="font-weight:500">${escapeHtml(subtitle)}</div>` : ''}
          </div>
        </header>

        ${infoSection ? `<section class="info-grid">${infoSection}</section>` : ''}

        <div class="data-table-container">
          <table>
            <thead>
              <tr>
                <th class="index-cell">#</th>
                ${headerCells}
              </tr>
            </thead>
            <tbody>
              ${bodyRows}
            </tbody>
          </table>
        </div>

        <footer class="doc-footer">
          ${footerNote ? `<p class="footer-note">${escapeHtml(footerNote)}</p>` : ''}
          <div class="footer-brand">
             Labotec SRL - Avenida Miguel Díaz, Santo Domingo Este - Tel: (809) 695-1289
          </div>
        </footer>

      </div>
    </body>
    </html>
  `

  printWindow.document.write(htmlContent)
  printWindow.document.close()
  
  // Wait for resources to load (like fonts) before printing
  printWindow.onload = () => {
    printWindow.focus()
    // Small delay to ensure styles render correctly
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }
}