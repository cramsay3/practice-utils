/*
  Google Apps Script: Build a Google Doc from Songbook CSV
  ---------------------------------------------------------
  1) Upload songbook_google_doc_source.csv to Drive
  2) Put file ID below
  3) Run buildSongbookDoc()
*/

const CSV_FILE_ID = 'PASTE_YOUR_CSV_FILE_ID_HERE';

function buildSongbookDoc() {
  if (!CSV_FILE_ID || CSV_FILE_ID.includes('PASTE_YOUR')) {
    throw new Error('Set CSV_FILE_ID first.');
  }

  const file = DriveApp.getFileById(CSV_FILE_ID);
  const csv = file.getBlob().getDataAsString('UTF-8');
  const rows = Utilities.parseCsv(csv);

  if (!rows.length) throw new Error('CSV is empty.');

  const doc = DocumentApp.create('Songbook Export - Title Artist Key Description');
  const body = doc.getBody();

  body.appendParagraph('Songbook Export')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('Fields: Title, Artist, Key, Description');
  body.appendParagraph('');

  const tableData = rows.map((r) => [
    r[0] || '',
    r[1] || '',
    r[2] || '',
    r[3] || '',
  ]);

  const table = body.appendTable(tableData);
  table.getRow(0).editAsText().setBold(true);

  body.appendParagraph('');
  body.appendParagraph('Generated from SongbookPro .sbp export');

  Logger.log('Created Doc: ' + doc.getUrl());
}
