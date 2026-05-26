function getTimestampLabel() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");

  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
}

function downloadFile(filename, content, mimeType) {
  if (typeof window === "undefined") {
    return;
  }

  const blob = new Blob([content], { type: mimeType });
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);
}

function escapeXmlValue(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSpreadsheetXml(sheetName, rows) {
  const safeSheetName = escapeXmlValue(sheetName || "Sheet1");
  const headers = rows?.length ? Object.keys(rows[0]) : [];
  const allRows = rows?.length ? [headers, ...rows.map((row) => headers.map((header) => row[header]))] : [[]];

  const worksheetRows = allRows
    .map(
      (cells) => `
      <Row>
        ${cells
          .map((cell) => {
            const isNumber = typeof cell === "number" && Number.isFinite(cell);
            const dataType = isNumber ? "Number" : "String";
            return `<Cell><Data ss:Type="${dataType}">${escapeXmlValue(cell ?? "")}</Data></Cell>`;
          })
          .join("")}
      </Row>`,
    )
    .join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="${safeSheetName}">
    <Table>
      ${worksheetRows}
    </Table>
  </Worksheet>
</Workbook>`;
}

export function downloadExcelFile(filePrefix, rows, sheetName = "Sheet1") {
  downloadFile(
    `${filePrefix}-${getTimestampLabel()}.xls`,
    buildSpreadsheetXml(sheetName, rows || []),
    "application/vnd.ms-excel;charset=utf-8",
  );
}
