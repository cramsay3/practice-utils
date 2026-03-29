/*
  SongbookPro Manager bulk metadata updater
  -----------------------------------------
  Usage:
  1) Open SongbookPro Manager in your browser and keep it on the "Manage Songs" page.
  2) Open DevTools Console.
  3) Paste this script.
  4) Run:
       await runSongbookBulkUpdate()
     Then paste CSV content from:
       sync-catalog/songbookpro_population.csv
*/

(function attachHelpers() {
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function normalize(s) {
    return (s || "")
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/&/g, "and")
      .replace(/\s+/g, " ")
      .trim();
  }

  function parseCsvLine(line) {
    const out = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      const next = line[i + 1];
      if (ch === '"' && inQuotes && next === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  }

  function parseCsv(text) {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const header = parseCsvLine(lines[0]).map((h) => normalize(h));
    const rows = [];
    for (let i = 1; i < lines.length; i += 1) {
      const cols = parseCsvLine(lines[i]);
      if (!cols.length) continue;
      const row = {};
      for (let c = 0; c < header.length; c += 1) {
        row[header[c]] = cols[c] || "";
      }
      rows.push(row);
    }
    return rows;
  }

  function allEls(selector) {
    return Array.from(document.querySelectorAll(selector));
  }

  function elementText(el) {
    return normalize((el && (el.innerText || el.textContent)) || "");
  }

  function setInputValue(input, value) {
    input.focus();
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "Enter" }));
  }

  function clickIfVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    el.click();
    return true;
  }

  function findSearchInput() {
    const candidates = allEls("input")
      .filter((el) => {
        const ph = normalize(el.getAttribute("placeholder"));
        const ar = normalize(el.getAttribute("aria-label"));
        const id = normalize(el.id);
        return ph.includes("search") || ar.includes("search") || id.includes("search");
      });
    return candidates[0] || null;
  }

  function findSongRowByTitle(title) {
    const needle = normalize(title);
    const rowCandidates = allEls("[role='row'], li, .song, .song-item, .list-item, .item, a, button, div");
    const scored = [];
    for (const el of rowCandidates) {
      const txt = elementText(el);
      if (!txt) continue;
      if (txt === needle) scored.push({ score: 3, el });
      else if (txt.startsWith(needle + " ")) scored.push({ score: 2, el });
      else if (txt.includes(needle)) scored.push({ score: 1, el });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.length ? scored[0].el : null;
  }

  function findLabeledInput(keywords) {
    const k = keywords.map(normalize);
    const labels = allEls("label");

    for (const label of labels) {
      const txt = elementText(label);
      if (!k.some((kw) => txt.includes(kw))) continue;

      const forId = label.getAttribute("for");
      if (forId) {
        const target = document.getElementById(forId);
        if (target && target.tagName === "INPUT") return target;
      }
      let sib = label.nextElementSibling;
      while (sib) {
        if (sib.tagName === "INPUT") return sib;
        const nested = sib.querySelector && sib.querySelector("input");
        if (nested) return nested;
        sib = sib.nextElementSibling;
      }
    }

    const generic = allEls("input");
    const byAttr = generic.find((el) => {
      const ph = normalize(el.getAttribute("placeholder"));
      const ar = normalize(el.getAttribute("aria-label"));
      const nm = normalize(el.getAttribute("name"));
      return k.some((kw) => ph.includes(kw) || ar.includes(kw) || nm.includes(kw));
    });
    return byAttr || null;
  }

  function findInputByNearbyText(keywords) {
    const keys = keywords.map(normalize);
    const containers = allEls("div, section, article, li, td, tr, form, fieldset");
    const candidates = [];
    for (const c of containers) {
      const txt = elementText(c);
      if (!txt) continue;
      if (!keys.some((k) => txt.includes(k))) continue;
      const inputs = Array.from(c.querySelectorAll("input")).filter((i) => i.type !== "hidden");
      if (inputs.length === 1) {
        candidates.push({ score: txt.length, input: inputs[0] });
      }
    }
    candidates.sort((a, b) => a.score - b.score);
    return candidates.length ? candidates[0].input : null;
  }

  async function saveCurrentSong() {
    const saveBtn = allEls("button, [role='button']").find((el) => {
      const txt = elementText(el);
      return txt === "save" || txt.includes("save");
    });
    if (saveBtn) {
      clickIfVisible(saveBtn);
      await sleep(300);
      return true;
    }

    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "s",
        code: "KeyS",
        ctrlKey: true,
        metaKey: false,
        bubbles: true
      })
    );
    await sleep(300);
    return true;
  }

  async function openSongByTitle(title) {
    const search = findSearchInput();
    if (search) {
      setInputValue(search, title);
      await sleep(450);
    }

    const row = findSongRowByTitle(title);
    if (!row) return false;
    clickIfVisible(row);
    await sleep(500);
    return true;
  }

  function findUrlInputStrict() {
    // Prefer explicit web-url style labels/attributes only.
    const byLabel = findLabeledInput(["web url", "web link", "url link", "website link", "website"]);
    if (byLabel) return byLabel;
    const byNearby = findInputByNearbyText(["web url", "url link", "website", "web link", "url"]);
    if (byNearby) return byNearby;

    const byAttr = allEls("input").find((el) => {
      const ph = normalize(el.getAttribute("placeholder"));
      const ar = normalize(el.getAttribute("aria-label"));
      const nm = normalize(el.getAttribute("name"));
      const id = normalize(el.id);
      const hay = [ph, ar, nm, id].join(" ");
      return (
        hay.includes("web url") ||
        hay.includes("url link") ||
        hay.includes("website") ||
        hay.includes("web link")
      );
    });
    return byAttr || null;
  }

  function findDurationInputStrict() {
    const byLabel = findLabeledInput(["duration", "length"]);
    if (byLabel) return byLabel;
    const byNearby = findInputByNearbyText(["duration", "length"]);
    if (byNearby) return byNearby;
    const byAttr = allEls("input").find((el) => {
      const ph = normalize(el.getAttribute("placeholder"));
      const ar = normalize(el.getAttribute("aria-label"));
      const nm = normalize(el.getAttribute("name"));
      const id = normalize(el.id);
      const hay = [ph, ar, nm, id].join(" ");
      return hay.includes("duration") || hay.includes("length");
    });
    return byAttr || null;
  }

  function openMetadataTabIfPresent() {
    const tabs = allEls("button, [role='tab'], [role='button'], a");
    const tab = tabs.find((el) => {
      const txt = elementText(el);
      return (
        txt === "general" ||
        txt.includes("metadata") ||
        txt.includes("details") ||
        txt.includes("info")
      );
    });
    if (tab) clickIfVisible(tab);
  }

  async function applyMetadata(duration, url) {
    openMetadataTabIfPresent();
    await sleep(200);

    const durationInput = findDurationInputStrict();
    const urlInput = findUrlInputStrict();

    if (!durationInput || !urlInput) {
      return {
        ok: false,
        reason:
          "Could not locate strict Duration/Web URL inputs. No changes written to avoid touching lyrics field."
      };
    }

    // Safety guard: never write URL into very large/body-like fields.
    if ((urlInput.value || "").length > 400) {
      return {
        ok: false,
        reason: "Detected large field for URL target; aborted to avoid writing into lyrics/body."
      };
    }

    if (duration) setInputValue(durationInput, duration);
    if (url) setInputValue(urlInput, url);
    await sleep(200);
    await saveCurrentSong();
    return { ok: true };
  }

  async function runSongbookBulkUpdate(options = {}) {
    const defaults = {
      onlyStatus: "ready",
      startAt: 0,
      limit: 999,
      dryRun: false
    };
    const cfg = { ...defaults, ...options };

    const csvText = window.prompt(
      "Paste CSV content from sync-catalog/songbookpro_population.csv, then click OK."
    );
    if (!csvText) {
      console.warn("No CSV pasted. Aborted.");
      return;
    }

    let rows = parseCsv(csvText);
    rows = rows.filter((r) => !cfg.onlyStatus || normalize(r.status) === normalize(cfg.onlyStatus));

    const toRun = rows.slice(cfg.startAt, cfg.startAt + cfg.limit);
    const results = [];

    console.log("Bulk update starting. Rows:", toRun.length, "Dry run:", cfg.dryRun);

    for (let i = 0; i < toRun.length; i += 1) {
      const r = toRun[i];
      const title = r.title;
      const duration = r.duration;
      const url = r.spotify_url;

      const rowLog = { index: i + cfg.startAt, title, duration, url, ok: false, reason: "" };

      if (!title) {
        rowLog.reason = "Missing title in CSV row.";
        results.push(rowLog);
        continue;
      }

      const opened = await openSongByTitle(title);
      if (!opened) {
        rowLog.reason = "Song row not found in manager list.";
        results.push(rowLog);
        continue;
      }

      if (cfg.dryRun) {
        rowLog.ok = true;
        rowLog.reason = "Dry run only.";
        results.push(rowLog);
        continue;
      }

      const applied = await applyMetadata(duration, url);
      rowLog.ok = !!applied.ok;
      rowLog.reason = applied.ok ? "Updated." : applied.reason || "Unknown error.";
      results.push(rowLog);
      await sleep(250);
    }

    const success = results.filter((r) => r.ok).length;
    const failed = results.length - success;
    console.table(results);
    console.log("Bulk update complete.", { success, failed, total: results.length });

    window.__songbookBulkResults = results;
    return results;
  }

  window.runSongbookBulkUpdate = runSongbookBulkUpdate;
  window.debugSongbookMetaFields = function debugSongbookMetaFields() {
    openMetadataTabIfPresent();
    const durationInput = findDurationInputStrict();
    const urlInput = findUrlInputStrict();
    console.log("Duration input found:", !!durationInput, durationInput);
    console.log("URL input found:", !!urlInput, urlInput);
    return { durationInput, urlInput };
  };
  console.log("Loaded. Run: await runSongbookBulkUpdate()");
})();
