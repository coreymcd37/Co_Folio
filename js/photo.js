/* Photo tool — all processing stays on-device.
   EXIF/XMP read via exifr (CDN ESM). Canvas re-encode strips metadata.
   Optional JPEG field write via piexifjs when available (title/artist/description).
   Limits: XMP edit is strip-only; complex MakerNote/proprietary blobs are not rewritten. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const state = {
    file: null,
    name: "photo",
    type: "image/jpeg",
    meta: null,
    img: null,
    w: 0,
    h: 0,
    // working bitmap (ImageBitmap or HTMLImageElement drawn size)
    draw: null,
    // markup strokes in image coords
    strokes: [],
    drawing: false,
    crop: null, // {x,y,w,h} in image coords
    cropDrag: null,
    tool: "draw", // draw | crop
  };

  const els = {};
  const bindEls = () => {
    [
      "drop", "file", "canvas", "metaList", "metaEmpty", "status",
      "btnStrip", "btnApplyMeta", "title", "artist", "description",
      "maxW", "maxH", "pct", "btnResize", "btnResetSize",
      "cropPresets", "btnCropApply", "btnCropClear",
      "ink", "brush", "btnUndo", "btnClearInk",
      "fmt", "quality", "btnDownload", "btnDownloadStrip",
      "previewWrap", "tabs"
    ].forEach((id) => { els[id] = document.getElementById(id); });
  };

  const setStatus = (msg) => { if (els.status) els.status.textContent = msg || ""; };

  const loadExifr = async () => {
    if (window.exifr) return window.exifr;
    // Documented dependency: exifr (read-only metadata)
    const mod = await import("https://cdn.jsdelivr.net/npm/exifr@7.1.3/dist/full.esm.js");
    window.exifr = mod;
    return mod;
  };

  const loadPiexif = async () => {
    if (window.piexif) return window.piexif;
    try {
      await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/piexifjs@1.0.6/piexif.js";
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
      return window.piexif;
    } catch {
      return null;
    }
  };

  const flattenMeta = (obj, prefix = "", out = []) => {
    if (!obj || typeof obj !== "object") return out;
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === "object" && !(v instanceof Date) && !ArrayBuffer.isView(v) && !(v instanceof Array)) {
        flattenMeta(v, key, out);
      } else {
        let val = v;
        if (v instanceof Date) val = v.toISOString();
        else if (typeof v === "object") val = JSON.stringify(v);
        out.push([key, String(val)]);
      }
    }
    return out;
  };

  const renderMeta = (meta) => {
    state.meta = meta;
    const list = els.metaList;
    list.innerHTML = "";
    const rows = flattenMeta(meta || {});
    if (!rows.length) {
      els.metaEmpty.hidden = false;
      return;
    }
    els.metaEmpty.hidden = true;
    rows.sort((a, b) => a[0].localeCompare(b[0]));
    for (const [k, v] of rows.slice(0, 200)) {
      const dt = document.createElement("div");
      dt.className = "ph-meta-row";
      dt.innerHTML = `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`;
      list.appendChild(dt);
    }
    if (rows.length > 200) {
      const more = document.createElement("p");
      more.className = "howto";
      more.textContent = `Showing 200 of ${rows.length} fields.`;
      list.appendChild(more);
    }
    // Prefill common fields if present
    const pick = (...keys) => {
      for (const k of keys) {
        const hit = rows.find(([n]) => n.toLowerCase().endsWith(k.toLowerCase()) || n.toLowerCase() === k.toLowerCase());
        if (hit) return hit[1];
      }
      return "";
    };
    if (els.title && !els.title.value) els.title.value = pick("ImageDescription", "title", "XPTitle", "description") || "";
    if (els.artist && !els.artist.value) els.artist.value = pick("Artist", "artist", "XPAuthor", "Creator") || "";
    if (els.description && !els.description.value) els.description.value = pick("ImageDescription", "Description", "XPComment") || "";
  };

  const escapeHtml = (s) => String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const drawScene = () => {
    const c = els.canvas;
    if (!c || !state.img) return;
    const ctx = c.getContext("2d");
    c.width = state.w;
    c.height = state.h;
    ctx.clearRect(0, 0, state.w, state.h);
    ctx.drawImage(state.img, 0, 0, state.w, state.h);
    // strokes
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of state.strokes) {
      if (!s.pts.length) continue;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.beginPath();
      s.pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
    }
    // crop overlay
    if (state.crop) {
      const { x, y, w, h } = state.crop;
      ctx.save();
      ctx.fillStyle = "rgba(5,4,12,0.55)";
      ctx.fillRect(0, 0, state.w, state.h);
      ctx.clearRect(x, y, w, h);
      ctx.drawImage(state.img, x, y, w, h, x, y, w, h);
      // redraw strokes clipped roughly
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      for (const s of state.strokes) {
        if (!s.pts.length) continue;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width;
        ctx.beginPath();
        s.pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = "#22d3ee";
      ctx.lineWidth = Math.max(2, Math.round(Math.min(state.w, state.h) * 0.004));
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      // handles
      const hs = Math.max(8, Math.round(Math.min(state.w, state.h) * 0.015));
      ctx.fillStyle = "#c084fc";
      [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([hx, hy]) => {
        ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
      });
    }
  };

  const canvasPoint = (e) => {
    const c = els.canvas;
    const r = c.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return {
      x: (cx / r.width) * c.width,
      y: (cy / r.height) * c.height,
    };
  };

  const hitHandle = (p) => {
    if (!state.crop) return null;
    const { x, y, w, h } = state.crop;
    const hs = Math.max(14, Math.min(state.w, state.h) * 0.03);
    const pts = [
      ["nw", x, y], ["ne", x + w, y], ["sw", x, y + h], ["se", x + w, y + h],
    ];
    for (const [name, hx, hy] of pts) {
      if (Math.abs(p.x - hx) <= hs && Math.abs(p.y - hy) <= hs) return name;
    }
    if (p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h) return "move";
    return null;
  };

  const openFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) {
      setStatus("Choose an image file.");
      return;
    }
    state.file = file;
    state.name = (file.name || "photo").replace(/\.[^.]+$/, "") || "photo";
    state.type = file.type || "image/jpeg";
    state.strokes = [];
    state.crop = null;
    els.title.value = "";
    els.artist.value = "";
    els.description.value = "";
    setStatus("Reading…");

    try {
      const exifr = await loadExifr();
      const meta = await exifr.parse(file, {
        tiff: true, ifd0: true, ifd1: true, exif: true, gps: true,
        xmp: true, icc: false, iptc: true, jfif: true, ihdr: true,
        mergeOutput: true, translateKeys: true, reviveValues: true,
      });
      renderMeta(meta || {});
    } catch (err) {
      renderMeta(null);
      setStatus("Metadata could not be fully read (file may still edit).");
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      state.img = img;
      state.w = img.naturalWidth;
      state.h = img.naturalHeight;
      els.maxW.value = state.w;
      els.maxH.value = state.h;
      els.pct.value = 100;
      drawScene();
      setStatus(`${state.w}×${state.h} · ${file.type || "image"}`);
      els.previewWrap?.classList.add("has-image");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setStatus("Could not decode that image.");
    };
    img.src = url;
  };

  const applyResize = () => {
    if (!state.img) return;
    let tw = parseInt(els.maxW.value, 10);
    let th = parseInt(els.maxH.value, 10);
    const pct = parseFloat(els.pct.value);
    if (pct && pct !== 100) {
      tw = Math.max(1, Math.round(state.img.naturalWidth * (pct / 100)));
      th = Math.max(1, Math.round(state.img.naturalHeight * (pct / 100)));
    }
    if (!tw && !th) return;
    if (tw && !th) th = Math.round(state.img.naturalHeight * (tw / state.img.naturalWidth));
    if (th && !tw) tw = Math.round(state.img.naturalWidth * (th / state.img.naturalHeight));
    // fit inside max box keeping aspect
    const scale = Math.min(tw / state.img.naturalWidth, th / state.img.naturalHeight);
    const nw = Math.max(1, Math.round(state.img.naturalWidth * scale));
    const nh = Math.max(1, Math.round(state.img.naturalHeight * scale));

    const off = document.createElement("canvas");
    off.width = nw;
    off.height = nh;
    off.getContext("2d").drawImage(state.img, 0, 0, nw, nh);
    // bake current strokes scaled
    const scaleX = nw / state.w;
    const scaleY = nh / state.h;
    const ctx = off.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of state.strokes) {
      if (!s.pts.length) continue;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width * ((scaleX + scaleY) / 2);
      ctx.beginPath();
      s.pts.forEach((p, i) => {
        const x = p.x * scaleX, y = p.y * scaleY;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
    }
    const baked = new Image();
    baked.onload = () => {
      state.img = baked;
      state.w = nw;
      state.h = nh;
      state.strokes = [];
      state.crop = null;
      els.maxW.value = nw;
      els.maxH.value = nh;
      els.pct.value = 100;
      drawScene();
      setStatus(`Resized to ${nw}×${nh}`);
    };
    baked.src = off.toDataURL("image/png");
  };

  const setCropPreset = (ratio) => {
    if (!state.img) return;
    let rw = state.w, rh = state.h;
    if (ratio === "free") {
      state.crop = { x: Math.round(rw * 0.1), y: Math.round(rh * 0.1), w: Math.round(rw * 0.8), h: Math.round(rh * 0.8) };
    } else {
      const [a, b] = ratio.split(":").map(Number);
      const target = a / b;
      let w = rw * 0.85, h = w / target;
      if (h > rh * 0.85) { h = rh * 0.85; w = h * target; }
      state.crop = {
        x: Math.round((rw - w) / 2),
        y: Math.round((rh - h) / 2),
        w: Math.round(w),
        h: Math.round(h),
      };
    }
    state.tool = "crop";
    drawScene();
  };

  const applyCrop = () => {
    if (!state.img || !state.crop) return;
    const { x, y, w, h } = state.crop;
    const off = document.createElement("canvas");
    off.width = Math.max(1, Math.round(w));
    off.height = Math.max(1, Math.round(h));
    const ctx = off.getContext("2d");
    ctx.drawImage(state.img, x, y, w, h, 0, 0, off.width, off.height);
    // strokes in crop
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of state.strokes) {
      const pts = s.pts.map((p) => ({ x: p.x - x, y: p.y - y })).filter((p) => p.x >= -20 && p.y >= -20);
      if (pts.length < 2) continue;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
    }
    const baked = new Image();
    baked.onload = () => {
      state.img = baked;
      state.w = off.width;
      state.h = off.height;
      state.strokes = [];
      state.crop = null;
      els.maxW.value = state.w;
      els.maxH.value = state.h;
      drawScene();
      setStatus(`Cropped to ${state.w}×${state.h}`);
    };
    baked.src = off.toDataURL("image/png");
  };

  const exportCanvas = (stripMeta) => {
    if (!state.img) return null;
    // compose final without crop overlay
    const c = document.createElement("canvas");
    let sx = 0, sy = 0, sw = state.w, sh = state.h;
    if (state.crop) ({ x: sx, y: sy, w: sw, h: sh } = state.crop);
    c.width = Math.max(1, Math.round(sw));
    c.height = Math.max(1, Math.round(sh));
    const ctx = c.getContext("2d");
    ctx.drawImage(state.img, sx, sy, sw, sh, 0, 0, c.width, c.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of state.strokes) {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.beginPath();
      s.pts.forEach((p, i) => {
        const x = p.x - sx, y = p.y - sy;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
    }
    return c;
  };

  const downloadBlob = (blob, filename) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const doDownload = async (forceStrip) => {
    const c = exportCanvas();
    if (!c) return;
    const fmt = els.fmt.value || "image/jpeg";
    const q = Math.min(1, Math.max(0.5, (parseInt(els.quality.value, 10) || 92) / 100));
    const ext = fmt === "image/png" ? "png" : "jpg";
    const base = `${state.name}${forceStrip ? "-clean" : "-edited"}`;

    const blob = await new Promise((res) => c.toBlob(res, fmt, q));
    if (!blob) { setStatus("Export failed."); return; }

    // Canvas export already strips EXIF/XMP. Optional: write a few JPEG fields back unless forceStrip.
    if (fmt === "image/jpeg" && !forceStrip && (els.title.value || els.artist.value || els.description.value)) {
      try {
        const piexif = await loadPiexif();
        if (piexif) {
          const dataUrl = await new Promise((res) => {
            const r = new FileReader();
            r.onload = () => res(r.result);
            r.readAsDataURL(blob);
          });
          const zeroth = {};
          const exif = {};
          if (els.artist.value) zeroth[piexif.ImageIFD.Artist] = els.artist.value;
          if (els.description.value || els.title.value) {
            zeroth[piexif.ImageIFD.ImageDescription] = els.description.value || els.title.value;
          }
          const dump = piexif.dump({ "0th": zeroth, Exif: exif });
          const inserted = piexif.insert(dump, dataUrl);
          const bin = atob(inserted.split(",")[1]);
          const arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          downloadBlob(new Blob([arr], { type: "image/jpeg" }), `${base}.jpg`);
          setStatus("Downloaded JPEG with basic tags (canvas base is clean; limited fields written).");
          return;
        }
      } catch (_) {
        /* fall through to clean download */
      }
    }

    downloadBlob(blob, `${base}.${ext}`);
    setStatus(forceStrip
      ? "Downloaded — metadata stripped by re-encode."
      : "Downloaded — re-encoded (metadata stripped unless JPEG tags written).");
  };

  const bindUi = () => {
    const drop = els.drop;
    drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("drag"); });
    drop.addEventListener("dragleave", () => drop.classList.remove("drag"));
    drop.addEventListener("drop", (e) => {
      e.preventDefault();
      drop.classList.remove("drag");
      const f = e.dataTransfer.files?.[0];
      if (f) openFile(f);
    });
    els.file.addEventListener("change", () => {
      const f = els.file.files?.[0];
      if (f) openFile(f);
    });

    els.btnStrip.addEventListener("click", () => {
      renderMeta(null);
      els.title.value = "";
      els.artist.value = "";
      els.description.value = "";
      setStatus("Metadata cleared in UI. Download to get a stripped file (re-encode).");
    });
    els.btnApplyMeta.addEventListener("click", () => {
      setStatus("Fields will be written on JPEG download when possible. PNG export is always stripped.");
    });

    els.btnResize.addEventListener("click", applyResize);
    els.btnResetSize.addEventListener("click", () => {
      if (!state.img) return;
      // reload original file
      if (state.file) openFile(state.file);
    });

    els.cropPresets?.addEventListener("click", (e) => {
      const b = e.target.closest("[data-crop]");
      if (!b) return;
      setCropPreset(b.dataset.crop);
    });
    els.btnCropApply.addEventListener("click", applyCrop);
    els.btnCropClear.addEventListener("click", () => { state.crop = null; drawScene(); });

    els.btnUndo.addEventListener("click", () => { state.strokes.pop(); drawScene(); });
    els.btnClearInk.addEventListener("click", () => { state.strokes = []; drawScene(); });

    const onDown = (e) => {
      if (!state.img) return;
      e.preventDefault();
      const p = canvasPoint(e);
      if (state.crop) {
        const handle = hitHandle(p);
        if (handle) {
          state.cropDrag = { handle, start: p, orig: { ...state.crop } };
          state.tool = "crop";
          return;
        }
      }
      state.tool = "draw";
      state.drawing = true;
      state.strokes.push({
        color: els.ink.value || "#22d3ee",
        width: parseInt(els.brush.value, 10) || 4,
        pts: [p],
      });
    };
    const onMove = (e) => {
      if (!state.img) return;
      const p = canvasPoint(e);
      if (state.cropDrag) {
        e.preventDefault();
        const { handle, start, orig } = state.cropDrag;
        const dx = p.x - start.x, dy = p.y - start.y;
        let { x, y, w, h } = orig;
        if (handle === "move") { x += dx; y += dy; }
        if (handle === "se") { w += dx; h += dy; }
        if (handle === "ne") { y += dy; h -= dy; w += dx; }
        if (handle === "sw") { x += dx; w -= dx; h += dy; }
        if (handle === "nw") { x += dx; y += dy; w -= dx; h -= dy; }
        w = Math.max(10, w); h = Math.max(10, h);
        x = Math.min(Math.max(0, x), state.w - w);
        y = Math.min(Math.max(0, y), state.h - h);
        state.crop = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
        drawScene();
        return;
      }
      if (!state.drawing) return;
      e.preventDefault();
      state.strokes[state.strokes.length - 1].pts.push(p);
      drawScene();
    };
    const onUp = () => { state.drawing = false; state.cropDrag = null; };

    els.canvas.addEventListener("mousedown", onDown);
    els.canvas.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    els.canvas.addEventListener("touchstart", onDown, { passive: false });
    els.canvas.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);

    els.btnDownload.addEventListener("click", () => doDownload(false));
    els.btnDownloadStrip.addEventListener("click", () => doDownload(true));

    // tabs
    els.tabs?.addEventListener("click", (e) => {
      const b = e.target.closest("[data-tab]");
      if (!b) return;
      const id = b.dataset.tab;
      $$(".ph-tab").forEach((t) => t.classList.toggle("is-active", t === b));
      $$(".ph-panel").forEach((p) => p.hidden = p.dataset.panel !== id);
    });
  };

  document.addEventListener("DOMContentLoaded", () => {
    bindEls();
    bindUi();
  });
})();
