const PDFDocument = require("pdfkit");

function streamAttendancePdf(res, rows) {
  const doc = new PDFDocument({ margin: 42, size: "A4" });
  res.writeHead(200, {
    "Content-Type": "application/pdf",
    "Content-Disposition": "attachment; filename=attendance-report.pdf"
  });
  doc.pipe(res);

  doc.fontSize(20).fillColor("#490080").text("Class Attendance Report");
  doc.moveDown(0.5).fontSize(10).fillColor("#283044").text(`Generated: ${new Date().toLocaleString()}`);
  doc.moveDown();

  const widths = [120, 70, 65, 55, 45, 55, 50];
  const headers = ["Student", "Index", "Course", "Present", "Late", "Absent", "Marks"];
  let y = doc.y;

  function row(values, bold = false) {
    let x = doc.page.margins.left;
    if (y > 760) {
      doc.addPage();
      y = doc.y;
    }
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9).fillColor("#111827");
    values.forEach((value, index) => {
      doc.text(String(value ?? ""), x, y, { width: widths[index] });
      x += widths[index];
    });
    y += 22;
  }

  row(headers, true);
  doc.moveTo(doc.page.margins.left, y - 7).lineTo(555, y - 7).strokeColor("#988d9f").stroke();
  rows.forEach(item => row([item.student, item.indexNo, item.course, item.present, item.late, item.absent, item.rewardMarks]));

  if (!rows.length) {
    doc.moveDown().fillColor("#283044").text("No records found.");
  }

  doc.end();
}

module.exports = { streamAttendancePdf };
