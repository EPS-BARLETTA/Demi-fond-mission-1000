/* global Tesseract */
'use strict';

const rosterOCRFiles = {
  script: './ocr/client/tesseract.min.js',
  worker: './ocr/client/worker.min.js',
  core: './ocr/core/tesseract-core-lstm.js',
  language: './ocr/lang',
};
let ocrScript;

function loadRosterOCR() {
  if (!ocrScript) {
    ocrScript = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = rosterOCRFiles.script;
      script.integrity = 'sha384-r1ru3tcf6FhnCFR4B7pIFG+BhFF9LlFtz/P1y4pblWn3AGs9y3lBx5SKLNf4+rED';
      script.referrerPolicy = 'no-referrer';
      script.onload = resolve;
      script.onerror = () => {
        script.remove();
        reject(new Error('Le moteur de lecture est indisponible. Vérifie ta connexion et réessaie.'));
      };
      document.head.append(script);
    }).catch(error => {
      ocrScript = null;
      throw error;
    });
  }
  return ocrScript;
}

function rosterCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function imageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Choisis une capture d’écran au format JPG ou PNG.'));
    };
    img.src = url;
  });
}

function denseBands(values, threshold, minimum, gap = 2) {
  const bands = [];
  let start = -1;
  let last = -1;
  for (let i = 0; i <= values.length + gap; i++) {
    if (values[i] >= threshold) {
      if (start === -1) start = i;
      last = i;
    } else if (start !== -1 && i - last > gap) {
      if (last + 1 - start >= minimum) bands.push([start, last + 1]);
      start = -1;
    }
  }
  return bands;
}

async function rosterTiles(file) {
  if (file.size > 20 * 1024 * 1024) throw new Error('La capture dépasse 20 Mo.');
  const image = await imageFromFile(file);
  const scale = Math.min(1, 1800 / Math.max(image.width, image.height));
  const source = rosterCanvas(Math.round(image.width * scale), Math.round(image.height * scale));
  const {width, height} = source;
  const ctx = source.getContext('2d', {willReadFrequently: true});
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  const pixels = ctx.getImageData(0, 0, width, height).data;
  const dark = new Uint8Array(width * height);
  const rows = new Uint16Array(height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const point = y * width + x;
      const i = point * 4;
      if (Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) < 200) {
        dark[point] = 1;
        rows[y]++;
      }
    }
    if (rows[y] > 0.94 * width) rows[y] = 0;
  }
  const portraitRows = denseBands(rows, width * 0.085, Math.max(32, height * 0.045));
  const grid = portraitRows.map(([top, bottom]) => {
    const rowHeight = bottom - top;
    const cols = new Uint16Array(width);
    for (let y = top; y < bottom; y++) {
      for (let x = 0; x < width; x++) cols[x] += dark[y * width + x];
    }
    const portraits = denseBands(cols, rowHeight * 0.32, Math.max(22, width * 0.033));
    return {top, bottom, portraits};
  }).filter(row => row.portraits.length && row.portraits.every(([left, right]) => {
    const ratio = (right - left) / (row.bottom - row.top);
    return ratio >= 0.47 && ratio <= 1.37;
  }));
  const layout = grid.reduce((best, row) => row.portraits.length > best.length ? row.portraits : best, []);
  if (layout.length < 2 || grid.reduce((n, row) => n + row.portraits.length, 0) > 80) {
    throw new Error('La grille n’a pas été reconnue. Utilise une capture complète avec les photos et les noms en dessous.');
  }
  if (grid.some(row => row.portraits.some(([left, right]) =>
    !layout.some(([x, xEnd]) => Math.abs(x - left) <= 8 && Math.abs(xEnd - right) <= 10)
  ))) {
    throw new Error('Les portraits ne sont pas alignés. Recadre la capture sur la grille et réessaie.');
  }
  const tiles = [];
  for (const [i, row] of grid.entries()) {
    const portraitHeight = row.bottom - row.top;
    for (const [left, right] of row.portraits) {
      const col = layout.findIndex(([x]) => Math.abs(x - left) <= 8);
      const textLeft = Math.max(0, left - 3);
      const textRight = Math.min(width, (layout[col + 1]?.[0] ?? width) - 4);
      const textBottom = Math.min(height, grid[i + 1]?.top ?? height, row.bottom + Math.round(portraitHeight * 0.275));
      if (textBottom - row.bottom < 10) continue;
      const portraitWidth = right - left;
      const photo = rosterCanvas(84, Math.round(84 * portraitHeight / portraitWidth));
      photo.getContext('2d').drawImage(source, left, row.top, portraitWidth, portraitHeight, 0, 0, photo.width, photo.height);
      const label = rosterCanvas((textRight - textLeft) * 2 + 20, (textBottom - row.bottom) * 2 + 16);
      const labelCtx = label.getContext('2d');
      labelCtx.fillStyle = '#fff';
      labelCtx.fillRect(0, 0, label.width, label.height);
      labelCtx.drawImage(source, textLeft, row.bottom, textRight - textLeft, textBottom - row.bottom, 10, 8,
        label.width - 20, label.height - 16);
      tiles.push({photo: photo.toDataURL('image/jpeg', 0.72), label});
    }
  }
  return tiles;
}

async function readRosterTiles(tiles, onProgress) {
  await loadRosterOCR();
  let worker;
  let timer;
  let timerExpired = false;
  try {
    const started = Tesseract.createWorker('fra', 1, {
      workerPath: new URL(rosterOCRFiles.worker, location.href).href,
      corePath: new URL(rosterOCRFiles.core, location.href).href,
      langPath: new URL(rosterOCRFiles.language, location.href).href,
      workerBlobURL: false,
      errorHandler: () => {},
    }, {load_system_dawg: '0', load_freq_dawg: '0'});
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        timerExpired = true;
        reject(new Error('Le moteur de lecture met trop de temps à démarrer.'));
      }, 25000);
    });
    started.then(late => {
      if (timerExpired) return late.terminate();
    }).catch(() => {});
    worker = await Promise.race([started, timeout]);
    clearTimeout(timer);
    await worker.setParameters({tessedit_pageseg_mode: '6'});
    for (const [i, tile] of tiles.entries()) {
      onProgress(i + 1);
      const {data} = await worker.recognize(tile.label);
      const lines = data.text.trim().split(/\n/).map(line => line.trim()).filter(Boolean);
      if (lines.length === 2 && /\s/.test(lines[0]) && /^\p{L}$/u.test(lines[1])) lines.pop();
      tile.name = lines.join(' ').replace(/\s+/g, ' ');
      delete tile.label;
    }
  } finally {
    clearTimeout(timer);
    if (worker) await worker.terminate();
  }
}

function portraitNameKey(name) {
  return name.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('fr')
    .replace(/[’‘]/g, "'").trim().replace(/\s+/g, ' ');
}

function suggestPortraitStudent(students, name) {
  const key = portraitNameKey(name || '');
  if (!key) return '';
  const exact = students.filter(p => portraitNameKey(p.name) === key);
  if (exact.length) return exact.length === 1 ? exact[0].id : '';
  const parts = key.split(' ');
  const alternatives = new Set(parts.slice(1).map((_, i) => [...parts.slice(i + 1), ...parts.slice(0, i + 1)].join(' ')));
  const swapped = students.filter(p => alternatives.has(portraitNameKey(p.name)));
  return swapped.length === 1 ? swapped[0].id : '';
}

function validRosterPortrait(value) {
  return typeof value === 'string' && value.length <= 30000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
}
