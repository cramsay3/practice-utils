# Google Doc Export From SongbookPro

This folder contains files to build a Google Doc from your SongbookPro `.sbp` data.

## 1) Build source CSV from `.sbp`

Run:

```bash
python3 sync-catalog/export_songbook_for_google_docs.py
```

Output:

- `sync-catalog/google_docs_export/songbook_google_doc_source.csv`

Columns:

- `Title`
- `Artist`
- `Key`
- `Description` (parsed from `{meta description: ...}` in song content)

## 2) Create the Google Doc automatically

1. Upload `songbook_google_doc_source.csv` to Google Drive.
2. Create a Google Apps Script project.
3. Paste `sync-catalog/google_docs_export/songbook_to_doc.gs`.
4. Set `CSV_FILE_ID` to the uploaded CSV file ID.
5. Run `buildSongbookDoc`.

The script will generate a Google Doc with a table containing Title, Artist, Key, and Description.
