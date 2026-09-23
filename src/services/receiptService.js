const formatMoney = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export const printLotReceipt = (lot) => {
  if (!lot) return;

  const printableWindow = window.open("", "_blank", "width=900,height=700");
  if (!printableWindow) {
    alert("Please allow pop-ups to save the receipt as a PDF.");
    return;
  }

  const lotDate = lot.date || lot.createdAt || new Date().toISOString();
  const displayDate = new Date(lotDate).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const receiptHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Lot Receipt - ${lot.lotId || "N/A"}</title>
        <style>
          :root {
            --bg: #f8fafc;
            --panel: #ffffff;
            --line: #dfe7ee;
            --text: #0f172a;
            --muted: #475569;
            --primary: #059669;
            --accent: #ecfdf5;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: var(--bg);
            color: var(--text);
            font-family: Arial, Helvetica, sans-serif;
          }
          .page {
            width: 700px;
            margin: 32px auto;
            background: var(--panel);
            border: 1px solid var(--line);
            border-radius: 18px;
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
            padding: 28px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 14px;
            border-bottom: 2px solid var(--line);
          }
          .brand h1 {
            margin: 0;
            font-size: 22px;
            color: var(--primary);
            letter-spacing: 0.04em;
          }
          .brand p {
            margin: 6px 0 0;
            color: var(--muted);
            font-size: 12px;
          }
          .status {
            background: var(--accent);
            color: #047857;
            padding: 8px 12px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: bold;
            letter-spacing: 0.05em;
            text-transform: uppercase;
          }
          .meta {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 18px;
            margin: 18px 0;
          }
          .meta-box {
            border: 1px solid var(--line);
            border-radius: 12px;
            padding: 12px 14px;
            background: #f8fafc;
          }
          .label {
            display: block;
            font-size: 10px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--muted);
            margin-bottom: 8px;
          }
          .value {
            font-size: 18px;
            font-weight: 700;
          }
          .summary {
            margin-top: 16px;
            border: 1px solid var(--line);
            border-radius: 14px;
            overflow: hidden;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 16px;
            border-bottom: 1px solid var(--line);
            font-size: 14px;
          }
          .summary-row:last-child { border-bottom: none; }
          .summary-row strong { font-size: 16px; }
          .footer {
            margin-top: 22px;
            text-align: center;
            color: var(--muted);
            font-size: 11px;
            line-height: 1.6;
          }
          .qr {
            display: inline-block;
            background: #0f172a;
            color: white;
            padding: 8px 12px;
            border-radius: 10px;
            font-size: 11px;
            letter-spacing: 0.08em;
            margin-top: 10px;
          }
          @media print {
            body { background: white; }
            .page { box-shadow: none; border: none; margin: 0; width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <div class="brand">
              <h1>Kabadi Saathi</h1>
              <p>Authorized E-Waste Lot Receipt</p>
            </div>
            <div class="status">${lot.status || "Created"}</div>
          </div>

          <div class="meta">
            <div class="meta-box">
              <span class="label">Receipt ID</span>
              <div class="value">${lot.lotId || "LOT-XXXX"}</div>
            </div>
            <div class="meta-box">
              <span class="label">Date</span>
              <div class="value">${displayDate}</div>
            </div>
          </div>

          <div class="summary">
            <div class="summary-row"><span>Material</span><strong>${lot.material || "Material"}</strong></div>
            <div class="summary-row"><span>Collector</span><strong>${lot.collectorName || "Local Collector"}</strong></div>
            <div class="summary-row"><span>Weight</span><strong>${Number(lot.weight || 0).toFixed(2)} kg</strong></div>
            <div class="summary-row"><span>Estimated Value</span><strong>${formatMoney(lot.estimatedVal || 0)}</strong></div>
          </div>

          <div class="footer">
            <div class="qr">LOT RECEIPT</div>
            <p>Thank you for contributing responsibly to circular waste recovery.</p>
            <p>Generated by Kabadi Saathi • Verified collection record</p>
          </div>
        </div>
      </body>
    </html>
  `;

  printableWindow.document.write(receiptHtml);
  printableWindow.document.close();
  printableWindow.focus();
  setTimeout(() => printableWindow.print(), 300);
};
