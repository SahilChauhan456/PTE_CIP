// Renders an employee profile as a printable CV in PDF form.
//
// Takes exactly the payload GET /employees/:id/profile returns, so the download
// can never drift from what the profile page shows. The document is laid out for
// paper — light background, dark text — rather than mirroring the app's dark UI.
const PDFDocument = require('pdfkit');

// The app's palette, translated to ink on white.
const COLOR = {
  text: '#0B1220',
  muted: '#64748B',
  faint: '#94A3B8',
  rule: '#E2E8F0',
  accent: '#2563EB',
  good: '#15803D',
  warn: '#B45309',
  bad: '#B91C1C',
};

const PAGE_MARGIN = 48;
const PHOTO_SIZE = 84;

// PDFKit understands PNG and JPEG only. A webp/gif avatar is skipped rather
// than crashing the download.
const EMBEDDABLE_IMAGE = /^image\/(png|jpe?g)$/;

// Best-effort avatar fetch. A slow or dead storage URL must not hold up (or
// fail) the CV, so this resolves to null on any problem.
async function fetchPhoto(url) {
  if (!url) return null;
  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), 4000);
  try {
    const res = await fetch(url, { signal: control.signal });
    if (!res.ok) return null;
    if (!EMBEDDABLE_IMAGE.test(res.headers.get('content-type') || '')) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMonthYear(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

function dateRange(start, end) {
  if (!start && !end) return '';
  return `${formatMonthYear(start) || '?'} – ${end ? formatMonthYear(end) : 'Present'}`;
}

function join(parts, sep = ' · ') {
  return parts.filter(Boolean).join(sep);
}

// A filename that survives Windows, macOS and the Content-Disposition header.
function cvFileName(fullName) {
  const slug = String(fullName || 'employee')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return `${slug || 'employee'}-CV.pdf`;
}

// ---------------------------------------------------------------
// Layout primitives
// ---------------------------------------------------------------

function contentWidth(doc) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

// Start a new page when `needed` points would run past the bottom margin.
// Manual layout (rules, table rows) does not get PDFKit's automatic paging.
function ensureSpace(doc, needed) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed > bottom) doc.addPage();
}

function sectionHeading(doc, label) {
  ensureSpace(doc, 46);
  doc
    .font('Helvetica-Bold')
    .fontSize(10.5)
    .fillColor(COLOR.accent)
    .text(label.toUpperCase(), { characterSpacing: 0.8 });
  doc.moveDown(0.25);
  const y = doc.y;
  doc
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .lineWidth(0.75)
    .strokeColor(COLOR.rule)
    .stroke();
  doc.moveDown(0.6);
}

function bodyText(doc, text, options = {}) {
  doc.font('Helvetica').fontSize(9.5).fillColor(COLOR.text).text(text, options);
}

function mutedText(doc, text, options = {}) {
  doc.font('Helvetica').fontSize(8.5).fillColor(COLOR.muted).text(text, options);
}

function emptyNote(doc, text) {
  doc.font('Helvetica-Oblique').fontSize(9).fillColor(COLOR.faint).text(text);
  doc.moveDown(0.5);
}

function verificationLabel(cv = {}) {
  const status = cv.verification_status || 'Draft';
  if (status === 'Verified') {
    return {
      color: COLOR.good,
      text: join([
        'Profile verified',
        cv.verified_by_name ? `by ${cv.verified_by_name}` : null,
        formatDate(cv.verified_at),
      ]),
    };
  }
  if (status === 'Pending') {
    return {
      color: COLOR.warn,
      text: join(['Verification pending', cv.pending_with ? `with ${cv.pending_with}` : null]),
    };
  }
  if (status === 'Rejected') {
    return {
      color: COLOR.bad,
      text: join(['Verification rejected', cv.verified_by_name ? `by ${cv.verified_by_name}` : null]),
    };
  }
  return { color: COLOR.faint, text: 'Not verified' };
}

// ---------------------------------------------------------------
// Sections
// ---------------------------------------------------------------

function drawHeader(doc, { header, cv, photo }) {
  const left = doc.page.margins.left;
  const top = doc.y;
  const hasPhoto = Boolean(photo);
  const textWidth = contentWidth(doc) - (hasPhoto ? PHOTO_SIZE + 18 : 0);

  if (hasPhoto) {
    const x = doc.page.width - doc.page.margins.right - PHOTO_SIZE;
    const r = PHOTO_SIZE / 2;
    doc.save();
    doc.circle(x + r, top + r, r).clip();
    // `cover` keeps a non-square portrait from being stretched.
    doc.image(photo, x, top, { cover: [PHOTO_SIZE, PHOTO_SIZE], align: 'center', valign: 'center' });
    doc.restore();
    doc.circle(x + r, top + r, r).lineWidth(0.75).strokeColor(COLOR.rule).stroke();
  }

  doc.font('Helvetica-Bold').fontSize(21).fillColor(COLOR.text);
  doc.text(header.full_name || '—', left, top, { width: textWidth });

  const headline = cv.headline || join([header.job_role, header.team], ' – ');
  if (headline) {
    doc.font('Helvetica').fontSize(11).fillColor(COLOR.accent);
    doc.text(headline, { width: textWidth });
  }

  doc.moveDown(0.35);
  const orgLine = join([header.org_title, header.grade ? `Grade ${header.grade}` : null, header.department]);
  if (orgLine) mutedText(doc, orgLine, { width: textWidth });

  const contact = join([header.email, cv.phone, cv.location_text || header.location]);
  if (contact) mutedText(doc, contact, { width: textWidth });

  if (cv.linkedin_url) {
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(COLOR.accent)
      .text(cv.linkedin_url, { width: textWidth, link: cv.linkedin_url, underline: false });
  }

  const meta = join([
    header.employee_code ? `ID ${header.employee_code}` : null,
    header.manager_name ? `Reports to ${header.manager_name}` : null,
    header.joining_date ? `Joined ${formatDate(header.joining_date)}` : null,
  ]);
  if (meta) mutedText(doc, meta, { width: textWidth });

  const verification = verificationLabel(cv);
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(verification.color);
  doc.text(verification.text, { width: textWidth });

  // Clear the photo before continuing, so the first section never overlaps it.
  const afterText = doc.y;
  doc.y = hasPhoto ? Math.max(afterText, top + PHOTO_SIZE) : afterText;
  doc.x = left;
  doc.moveDown(1);
}

function drawSummary(doc, { cv }) {
  if (!cv.summary) return;
  sectionHeading(doc, 'Professional Summary');
  bodyText(doc, cv.summary, { align: 'justify', lineGap: 1.5 });
  doc.moveDown(0.9);
}

function drawExperience(doc, { experience }) {
  sectionHeading(doc, 'Experience');
  if (!experience.length) return emptyNote(doc, 'No experience listed.');

  experience.forEach((e) => {
    ensureSpace(doc, 54);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.text).text(e.title || '—', { continued: false });
    const line = join([e.organization, dateRange(e.start_date, e.end_date)]);
    if (line) mutedText(doc, line);
    if (e.description) {
      doc.moveDown(0.15);
      doc.font('Helvetica').fontSize(9).fillColor(COLOR.text).text(e.description, { lineGap: 1.2 });
    }
    doc.moveDown(0.6);
  });
  doc.moveDown(0.3);
}

function drawEducation(doc, { education }) {
  sectionHeading(doc, 'Education');
  if (!education.length) return emptyNote(doc, 'No education listed.');

  education.forEach((ed) => {
    ensureSpace(doc, 40);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.text).text(ed.degree || '—');
    const line = join([ed.institution, ed.field_of_study]);
    if (line) mutedText(doc, line);
    const years = join([
      [ed.start_year, ed.end_year].filter(Boolean).join(' – '),
      ed.grade ? `Grade ${ed.grade}` : null,
    ]);
    if (years) mutedText(doc, years);
    doc.moveDown(0.55);
  });
  doc.moveDown(0.3);
}

// Skills table: skill name plus the three assessment sources and the effective
// level, matching the Skills Passport tab column for column.
function drawSkills(doc, { skillsPassport }) {
  sectionHeading(doc, 'Skills Passport');
  if (!skillsPassport.length) return emptyNote(doc, 'No skills recorded.');

  const left = doc.page.margins.left;
  const width = contentWidth(doc);
  const numCol = 54;
  const nameWidth = width - numCol * 4;
  const columns = ['Self', 'Manager', 'Mentor', 'Effective'];

  const drawHeadRow = () => {
    const y = doc.y;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR.muted);
    doc.text('SKILL', left, y, { width: nameWidth });
    columns.forEach((c, i) => {
      doc.text(c.toUpperCase(), left + nameWidth + numCol * i, y, { width: numCol, align: 'center' });
    });
    doc.y = y + 13;
    doc
      .moveTo(left, doc.y - 3)
      .lineTo(left + width, doc.y - 3)
      .lineWidth(0.5)
      .strokeColor(COLOR.rule)
      .stroke();
  };

  drawHeadRow();

  skillsPassport.forEach((s) => {
    if (doc.y + 16 > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      drawHeadRow();
    }
    const y = doc.y;
    doc.font('Helvetica').fontSize(9).fillColor(COLOR.text);
    doc.text(s.skill_name || '—', left, y, { width: nameWidth, ellipsis: true, lineBreak: false });

    const values = [s.self_level, s.manager_level, s.mentor_level];
    values.forEach((v, i) => {
      doc.fillColor(COLOR.muted).text(v ?? '—', left + nameWidth + numCol * i, y, {
        width: numCol,
        align: 'center',
        lineBreak: false,
      });
    });
    doc
      .font('Helvetica-Bold')
      .fillColor(COLOR.text)
      .text(s.effective_level ?? '—', left + nameWidth + numCol * 3, y, {
        width: numCol,
        align: 'center',
        lineBreak: false,
      });

    doc.y = y + 15;
  });
  doc.x = left;
  doc.moveDown(0.9);
}

function drawCertifications(doc, { certifications }) {
  sectionHeading(doc, 'Certifications');
  if (!certifications.length) return emptyNote(doc, 'No certifications recorded.');

  certifications.forEach((c) => {
    ensureSpace(doc, 32);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COLOR.text).text(c.title || '—');
    mutedText(
      doc,
      join([
        c.status,
        c.issued_date ? `Issued ${formatDate(c.issued_date)}` : null,
        c.expiry_date ? `Expires ${formatDate(c.expiry_date)}` : null,
        c.approved_by ? `Approved by ${c.approved_by}` : null,
      ])
    );
    doc.moveDown(0.45);
  });
}

// Footer is stamped per page at the end, once the page count is known.
function stampFooters(doc, { header, generatedAt }) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);

    // The footer deliberately sits below the bottom margin, and PDFKit treats
    // writing there as content overflowing the page — so it starts a new page
    // and puts the footer on that instead. Two text calls per page meant two
    // blank pages appended to every CV. Zeroing the bottom margin for the
    // duration of the write keeps each footer on the page it belongs to.
    const bottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    const y = doc.page.height - bottomMargin + 14;
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(COLOR.faint)
      .text(
        `${header.full_name || 'Employee'} · PTE CIP · Generated ${formatDate(generatedAt)}`,
        doc.page.margins.left,
        y,
        { width: contentWidth(doc), align: 'left', lineBreak: false }
      )
      .text(`Page ${i - range.start + 1} of ${range.count}`, doc.page.margins.left, y, {
        width: contentWidth(doc),
        align: 'right',
        lineBreak: false,
      });

    doc.page.margins.bottom = bottomMargin;
  }
}

// ---------------------------------------------------------------

// Builds the CV and streams it into `stream` (the Express response).
// Resolves once the document has been fully written.
async function streamCvPdf(stream, profile) {
  const {
    header = {},
    cv = {},
    experience = [],
    education = [],
    skillsPassport = [],
    certifications = [],
  } = profile;

  const photo = await fetchPhoto(header.photo_url);

  // bufferPages lets the footer report "page N of M" after the fact.
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN, right: PAGE_MARGIN },
    bufferPages: true,
    info: {
      Title: `${header.full_name || 'Employee'} — CV`,
      Author: 'PTE CIP',
      Subject: 'Capability profile / CV',
    },
  });

  const done = new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.on('error', reject);
  });

  doc.pipe(stream);

  const context = { header, cv, experience, education, skillsPassport, certifications, photo };
  drawHeader(doc, context);
  drawSummary(doc, context);
  drawExperience(doc, context);
  drawEducation(doc, context);
  drawSkills(doc, context);
  drawCertifications(doc, context);
  stampFooters(doc, { header, generatedAt: new Date() });

  doc.end();
  return done;
}

module.exports = { streamCvPdf, cvFileName };
