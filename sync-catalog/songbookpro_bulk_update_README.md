# SongbookPro Bulk URL + Duration Update

This uses SongbookPro Manager in your browser and updates existing songs in place.

## Files

- Script: `sync-catalog/songbookpro_bulk_update.js`
- Data source: `sync-catalog/songbookpro_population.csv`

## Before running

1. Back up your SongbookPro library first.
2. Open SongbookPro Manager (Manage Songs screen).
3. Keep the song list visible on the left and metadata editor visible.

## Run steps

1. Open browser DevTools Console.
2. Paste script contents from `songbookpro_bulk_update.js`.
3. Run:

```js
await runSongbookBulkUpdate()
```

4. When prompted, paste the full CSV contents from `songbookpro_population.csv`.

The script will process rows with `status=ready` and attempt to:

- open each song by title
- set Duration
- set Web URL link
- save

## Recommended test

Start with 2 rows first:

```js
await runSongbookBulkUpdate({ limit: 2 })
```

Then full run:

```js
await runSongbookBulkUpdate()
```

## Dry run mode

Checks matching/opening without writing:

```js
await runSongbookBulkUpdate({ dryRun: true })
```

## If a song fails

After run, results are in:

```js
window.__songbookBulkResults
```

Use:

```js
console.table(window.__songbookBulkResults.filter(x => !x.ok))
```

Common reasons:

- song title not found in left list
- manager UI labels differ (Duration/Web URL fields not detected)

If UI labels differ, share one screenshot of the metadata panel and I can tailor selectors quickly.
