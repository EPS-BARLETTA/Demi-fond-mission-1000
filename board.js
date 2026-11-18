'use strict';

const BOARD_BACKGROUNDS = {
  blank: 'Tableau blanc',
  team: 'Sport collectif',
  basket: 'Basket',
  racket: 'Badminton / volley',
  tennis: 'Tennis',
  badminton: 'Montée-descente · Badminton',
  pickleball: 'Montée-descente · Pickleball',
  scale: 'Échelle de 1 à 20',
};
const boardClamp = (value, min, max) => Math.max(min, Math.min(max, value));
const boardNumber = (value, fallback) => Number.isFinite(value) ? boardClamp(value, 0, 100) : fallback;

function boardFirstName(name) {
  const words = name.trim().split(/\s+/);
  const firstGiven = words.findIndex((word, index) => index > 0 && /\p{Ll}/u.test(word));
  if (firstGiven < 0) return words.at(-1);
  const lastGiven = words.findIndex((word, index) => index > firstGiven && !/\p{Ll}/u.test(word));
  return words.slice(firstGiven, lastGiven < 0 ? undefined : lastGiven).join(' ');
}

function normalizeBoard(raw, studentIds) {
  const positions = {};
  for (const id of studentIds) {
    const point = raw.positions?.[id];
    if (Number.isFinite(point?.x) && Number.isFinite(point?.y)) {
      positions[id] = {x: boardNumber(point.x, 50), y: boardNumber(point.y, 50)};
    }
  }
  const marks = Array.isArray(raw.marks) ? raw.marks : [];
  return {
    background: Object.hasOwn(BOARD_BACKGROUNDS, raw.background) ? raw.background : 'blank',
    courts: boardClamp(Math.round(Number(raw.courts)) || 1, 1, 4),
    ladderCourts: boardClamp(Math.round(Number(raw.ladderCourts)) || 6, 1, 12),
    positions,
    marks: marks.filter(m => m && typeof m.id === 'string' && /^[\w-]{1,80}$/.test(m.id) &&
      ['note', 'group'].includes(m.type) && typeof m.text === 'string').slice(0, 100).map(m => ({
      id: m.id, type: m.type, text: m.text.slice(0, m.type === 'note' ? 1200 : 32),
      x: boardNumber(m.x, 50), y: boardNumber(m.y, 50),
    })),
  };
}

function renderClassBoard(group, students) {
  const studentIds = students.map(p => p.id);
  const layout = normalizeBoard(group.board || {}, studentIds);
  const {background} = layout;
  const content = $('content');
  content.innerHTML = `<section class="card class-board">
    <div class="board-toolbar">
      <label>Fond<select id="boardBackground">${Object.entries(BOARD_BACKGROUNDS).filter(([key]) => key !== 'tennis' || background === 'tennis').map(([key, label]) =>
        `<option value="${key}" ${key === background ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
      <label id="boardCountLabel">Terrains<select id="boardCourtCount"></select></label>
      <button id="boardAddGroup">Ajouter un groupe</button><button id="boardAddNote">Ajouter une note</button><button id="boardArchives">Sauvegardes du tableau</button>
    </div>
    <p class="muted board-help">Glisse les portraits librement. Double-touche ou double-clique sur un élève pour l’agrandir. Appuie longuement sur un espace libre pour ajouter une note.</p>
    <p id="boardLadderHelp" class="muted board-ladder-help" hidden>Terrain 1 en haut. Les gagnants montent vers le terrain précédent et les perdants descendent vers le suivant. Déplace les élèves à la main.</p>
    <div class="board-workspace"><div id="boardSurface" class="board-surface" role="region" aria-label="Tableau de ${esc(group.name)}">
      <div id="boardFloor" class="board-floor" aria-hidden="true"></div>
    </div>
    <aside class="board-notes" aria-labelledby="boardNotesTitle">
      <h2 id="boardNotesTitle">Notes <span id="boardNoteCount">0</span></h2>
      <ol id="boardNoteList"></ol>
    </aside></div>
    <dialog id="boardArchiveDialog" aria-labelledby="boardArchiveTitle">
      <h2 id="boardArchiveTitle">Sauvegardes du tableau</h2>
      <form id="boardSaveCopy">
        <label for="boardArchiveName">Nom de la sauvegarde</label>
        <div class="board-archive-controls"><input id="boardArchiveName" maxlength="80" required><button class="primary">Enregistrer une copie</button></div>
      </form>
      <ul id="boardArchiveList" class="board-archive-list"></ul>
      <p class="muted">Le fichier contient le fond, les positions, les groupes et les notes. À la réouverture, les portraits viennent de la classe.</p>
      <p id="boardArchiveStatus" role="status"></p>
      <div class="actions">
        <button id="boardDownload">Télécharger le tableau</button>
        <button id="boardUpload">Ouvrir un fichier</button><input type="file" id="boardArchiveFile" accept=".json,application/json" hidden>
        <button id="boardCloseArchive">Fermer</button>
      </div>
    </dialog>
    <dialog id="boardPortraitDialog" class="board-portrait-dialog" aria-labelledby="boardPortraitName">
      <div id="boardLargePortrait"></div><h2 id="boardPortraitName"></h2>
      <form method="dialog"><button>Fermer le portrait</button></form>
    </dialog>
    <dialog id="boardEditor" aria-labelledby="boardEditorTitle">
      <form id="boardForm">
        <h2 id="boardEditorTitle"></h2>
        <label id="boardTextLabel" for="boardText"></label><textarea id="boardText" rows="4" maxlength="1200" required></textarea>
        <p id="boardError" role="status"></p>
        <div class="actions"><button type="button" id="boardDelete" class="danger">Retirer du tableau</button><button type="button" id="boardCancel">Fermer</button><button class="primary" type="submit">Enregistrer</button></div>
      </form>
    </dialog>
  </section>`;
  const surface = $('boardSurface');
  const floor = $('boardFloor');
  const editor = $('boardEditor');
  const cards = new Map();
  const markElements = new Map();
  const portraitDialog = $('boardPortraitDialog');
  const isLadder = () => ['badminton', 'pickleball'].includes(layout.background);
  let gesture, pendingTap, editing;

  function showPortrait(student) {
    if (portraitDialog.open) return;
    $('boardPortraitName').textContent = student.name;
    $('boardLargePortrait').innerHTML = validRosterPortrait(student.portrait)
      ? `<img alt="" src="${student.portrait}">` : '<p class="muted">Aucun portrait importé</p>';
    portraitDialog.showModal();
  }

  function paintFloor() {
    const sport = !['blank', 'scale'].includes(layout.background);
    const ladder = isLadder();
    const count = ladder ? layout.ladderCourts : layout.courts;
    $('boardCountLabel').hidden = !sport;
    $('boardLadderHelp').hidden = !ladder;
    $('boardCourtCount').replaceChildren(...Array.from({length: ladder ? 12 : 4}, (_, index) => new Option(index + 1, index + 1)));
    $('boardCourtCount').value = count;
    surface.dataset.background = layout.background;
    floor.className = `board-floor board-${layout.background}`;
    floor.dataset.count = count;
    surface.classList.toggle('board-ladder', ladder);
    surface.style.setProperty('--court-rows', Math.ceil(count / 2));
    if (layout.background === 'scale') {
      floor.innerHTML = Array.from({length: 20}, (_, i) => `<div class="board-tick"><b>${20 - i}</b></div>`).join('');
    } else if (sport) {
      floor.innerHTML = Array.from({length: count}, (_, i) => `<div class="board-court"><i></i><i></i><i></i><i></i>${ladder ? `<b>Terrain ${i + 1}</b>` : ''}</div>`).join('');
    } else {
      floor.replaceChildren();
    }
  }

  function writeBoard() {
    const previous = group.board;
    group.board = layout;
    if (save()) return true;
    group.board = previous;
    return false;
  }

  function point(element, x, y) {
    const insetX = Math.min(49, element.offsetWidth * 50 / surface.clientWidth);
    const insetY = Math.min(49, element.offsetHeight * 50 / surface.clientHeight);
    return {x: boardClamp(x, insetX, 100 - insetX), y: boardClamp(y, insetY, 100 - insetY)};
  }

  function paint(element, position) {
    const visible = point(element, position.x, position.y);
    element.style.left = `${visible.x}%`;
    element.style.top = `${visible.y}%`;
  }

  function paintItems() {
    cards.forEach(({element, position}) => paint(element, position));
    markElements.forEach(({element, position}) => paint(element, position));
  }

  function boardIsCurrent() {
    return surface.isConnected;
  }

  if (typeof ResizeObserver !== 'undefined') {
    const resize = new ResizeObserver(() => {
      if (boardIsCurrent()) paintItems();
      else resize.disconnect();
    });
    resize.observe(surface);
    const lifetime = new MutationObserver(() => {
      if (!boardIsCurrent()) {
        resize.disconnect();
        lifetime.disconnect();
        cancelGesture();
      }
    });
    lifetime.observe(content, {childList: true});
  }

  function makeDraggable(element, position, persistPosition, activate, twice = false) {
    element.classList.add('board-movable');
    element.addEventListener('pointerdown', event => {
      const shownX = parseFloat(element.style.left);
      const shownY = parseFloat(element.style.top);
      startGesture(event, element, {x: shownX, y: shownY}, persistPosition, activate, twice);
    });
    element.addEventListener('click', event => {
      if (event.detail === 0) activate();
    });
    element.addEventListener('keydown', event => {
      const delta = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]}[event.key];
      if (!delta) return;
      event.preventDefault();
      const step = event.shiftKey ? 8 : 2;
      const next = point(element, parseFloat(element.style.left) + delta[0] * step, parseFloat(element.style.top) + delta[1] * step);
      persistPosition(next);
    });
    paint(element, position);
  }

  const columns = surface.clientWidth < 520 ? 4 : 7;
  const rows = Math.ceil(students.length / columns);
  students.forEach((student, index) => {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = 'board-student';
    element.setAttribute('aria-label', `${student.name} · Glisser pour déplacer, double toucher pour agrandir`);
    element.title = student.name;
    const validPhoto = validRosterPortrait(student.portrait);
    const initials = student.name.trim().split(/\s+/).slice(0, 2).map(part => Array.from(part)[0]).join('').toUpperCase();
    element.innerHTML = `${validPhoto ? `<img alt="" src="${student.portrait}" draggable="false">` : `<span class="board-initials">${esc(initials)}</span>`}<span>${esc(boardFirstName(student.name))}</span>`;
    surface.append(element);
    const old = layout.positions[student.id] || {};
    const record = {element, position: {
      x: boardNumber(old.x, (index % columns + 0.5) * 100 / columns),
      y: boardNumber(old.y, (Math.floor(index / columns) + 0.5) * Math.min(15, 92 / rows) + 4),
    }};
    cards.set(student.id, record);
    makeDraggable(element, record.position, next => {
      const previous = layout.positions[student.id];
      layout.positions[student.id] = next;
      if (writeBoard()) record.position = next;
      else if (previous) layout.positions[student.id] = previous;
      else delete layout.positions[student.id];
      paint(element, record.position);
    }, () => showPortrait(student), true);
  });

  function showMarks() {
    markElements.forEach(({element}) => element.remove());
    markElements.clear();
    const list = $('boardNoteList');
    list.replaceChildren();
    let noteNumber = 0;
    layout.marks.forEach(mark => {
      const number = mark.type === 'note' ? ++noteNumber : null;
      const element = document.createElement('button');
      element.type = 'button';
      element.className = `board-marker board-marker-${mark.type}`;
      element.textContent = number ?? mark.text;
      element.setAttribute('aria-label', number ? `Ouvrir la note ${number}` : `Modifier le groupe ${mark.text}`);
      if (number) {
        const item = document.createElement('li');
        const link = document.createElement('button');
        link.type = 'button';
        link.textContent = number;
        link.setAttribute('aria-label', `Lire la note ${number}`);
        link.onclick = () => openEdit(mark.type, mark, mark);
        item.append(link);
        list.append(item);
      }
      surface.append(element);
      markElements.set(mark.id, {element, position: mark});
      makeDraggable(element, mark, next => {
        const {x, y} = mark;
        Object.assign(mark, next);
        if (!writeBoard()) Object.assign(mark, {x, y});
        paint(element, mark);
      }, () => openEdit(mark.type, mark, mark));
    });
    $('boardNoteCount').textContent = noteNumber;
  }

  function startGesture(event, element, origin, commit, activate, twice) {
    if (event.button !== 0 || gesture || !event.isPrimary) return;
    const box = surface.getBoundingClientRect();
    const g = {id: event.pointerId, x: event.clientX, y: event.clientY, left: box.left, top: box.top, element, origin, commit, activate, twice};
    gesture = g;
    surface.setPointerCapture(g.id);
    if (!element) {
      g.timer = setTimeout(() => {
        if (gesture !== g) return;
        const box = surface.getBoundingClientRect();
        cancelGesture();
        openEdit('note', {x: 100 * (g.x - box.left) / box.width, y: 100 * (g.y - box.top) / box.height});
      }, 550);
    }
  }

  function cancelGesture() {
    if (!gesture) return;
    clearTimeout(gesture.timer);
    cancelAnimationFrame(gesture.frame);
    if (gesture.element) gesture.element.classList.remove('board-dragging');
    gesture = null;
  }

  surface.addEventListener('pointerdown', event => {
    if (!event.target.closest('.board-movable')) startGesture(event, null);
  });
  function paintDragged(g) {
    const box = surface.getBoundingClientRect();
    const dx = g.clientX - g.x + g.left - box.left;
    const dy = g.clientY - g.y + g.top - box.top;
    g.next = point(g.element, g.origin.x + dx * 100 / surface.clientWidth, g.origin.y + dy * 100 / surface.clientHeight);
    paint(g.element, g.next);
  }

  function scrollDuringDrag(g) {
    if (gesture !== g || !isLadder()) return;
    const margin = 68;
    const lower = window.innerHeight - margin;
    const box = surface.getBoundingClientRect();
    if (g.clientY < margin && box.top < 0) window.scrollBy(0, -10);
    if (g.clientY > lower && box.bottom > window.innerHeight) window.scrollBy(0, 10);
    paintDragged(g);
    g.frame = requestAnimationFrame(() => scrollDuringDrag(g));
  }

  surface.addEventListener('pointermove', event => {
    const g = gesture;
    if (!g || g.id !== event.pointerId) return;
    if (!g.moved && Math.hypot(event.clientX - g.x, event.clientY - g.y) < 6) return;
    const firstMove = !g.moved;
    g.moved = true;
    clearTimeout(g.timer);
    pendingTap = null;
    if (g.element) {
      g.clientX = event.clientX;
      g.clientY = event.clientY;
      g.element.classList.add('board-dragging');
      paintDragged(g);
      if (firstMove && isLadder()) g.frame = requestAnimationFrame(() => scrollDuringDrag(g));
    }
  });
  surface.addEventListener('pointerup', event => {
    const g = gesture;
    if (!g || g.id !== event.pointerId) return;
    cancelGesture();
    if (g.next) {
      g.commit(g.next);
    } else if (g.activate && !g.moved) {
      if (!g.twice) {
        g.activate();
        return;
      }
      const now = performance.now();
      if (pendingTap?.element === g.element && now - pendingTap.time < 480) {
        pendingTap = null;
        g.activate();
      } else {
        pendingTap = {element: g.element, time: now};
      }
    }
  });
  surface.addEventListener('pointercancel', () => { cancelGesture(); paintItems(); });
  surface.addEventListener('contextmenu', event => event.preventDefault());

  function openEdit(type, position, mark) {
    if (editor.open) return;
    editing = {type, position, mark};
    const isNote = type === 'note';
    const notes = layout.marks.filter(entry => entry.type === 'note');
    $('boardEditorTitle').textContent = isNote ? `Note ${mark ? notes.indexOf(mark) + 1 : notes.length + 1}` : 'Nom du groupe';
    $('boardTextLabel').textContent = isNote ? 'Commentaire' : 'Groupe';
    $('boardText').maxLength = isNote ? 1200 : 32;
    $('boardText').value = mark?.text || '';
    $('boardError').textContent = '';
    $('boardDelete').hidden = !mark;
    editor.showModal();
  }

  $('boardForm').onsubmit = event => {
    event.preventDefault();
    const value = $('boardText').value.trim();
    if (!value) {
      $('boardError').textContent = 'Saisis un texte avant d’enregistrer.';
      return;
    }
    const {type, position, mark} = editing;
    if (!mark && layout.marks.length >= 100) {
      $('boardError').textContent = 'Le tableau contient déjà 100 notes et groupes.';
      return;
    }
    const previous = layout.marks;
    layout.marks = mark ? previous.map(m => m === mark ? {...m, text: value} : m) : [...previous, {id: uid(), ...position, type, text: value}];
    if (!writeBoard()) {
      layout.marks = previous;
      $('boardError').textContent = 'Enregistrement impossible sur cet appareil.';
      return;
    }
    showMarks();
    editor.close();
  };
  $('boardDelete').onclick = () => {
    if (!editing.mark) return;
    const previous = layout.marks;
    layout.marks = previous.filter(m => m !== editing.mark);
    if (!writeBoard()) {
      layout.marks = previous;
      $('boardError').textContent = 'La modification n’a pas été enregistrée.';
      return;
    }
    showMarks();
    editor.close();
  };
  $('boardCancel').onclick = () => editor.close();
  $('boardAddNote').onclick = () => openEdit('note', {x: 50, y: 50});
  $('boardAddGroup').onclick = () => openEdit('group', {x: 23 + (layout.marks.filter(m => m.type === 'group').length % 3) * 27, y: 33});
  $('boardBackground').onchange = event => {
    const previous = layout.background;
    layout.background = event.target.value;
    if (!writeBoard()) event.target.value = layout.background = previous;
    paintFloor();
  };
  $('boardCourtCount').onchange = event => {
    const key = isLadder() ? 'ladderCourts' : 'courts';
    const previous = layout[key];
    layout[key] = Number(event.target.value);
    if (!writeBoard()) layout[key] = previous;
    paintFloor();
  };
  function snapshot() {
    return normalizeBoard({...layout, positions: Object.fromEntries(
      [...cards].map(([id, {element, position}]) => [id, point(element, position.x, position.y)])
    )}, studentIds);
  }

  const archiveDialog = $('boardArchiveDialog');
  const archiveStatus = $('boardArchiveStatus');
  const archiveName = $('boardArchiveName');
  const archives = () => Array.isArray(group.boardArchives) ? group.boardArchives : [];

  function addArchive(name, board) {
    const previous = group.boardArchives;
    if (archives().length >= 50) {
      archiveStatus.textContent = 'Tu as atteint 50 sauvegardes pour cette classe.';
      return false;
    }
    group.boardArchives = [...archives(), {id: uid(), name, board}];
    if (save()) return true;
    group.boardArchives = previous;
    archiveStatus.textContent = 'La sauvegarde n’a pas pu être enregistrée sur cet appareil.';
    return false;
  }

  function listArchives() {
    const list = $('boardArchiveList');
    list.replaceChildren();
    for (const entry of [...archives()].reverse()) {
      const item = document.createElement('li');
      const name = document.createElement('span');
      name.textContent = entry.name;
      const open = document.createElement('button');
      open.textContent = 'Ouvrir';
      open.setAttribute('aria-label', `Ouvrir la sauvegarde ${entry.name}`);
      open.onclick = () => {
        if (!confirm('Ouvrir cette copie à la place du tableau affiché ? Les copies enregistrées restent disponibles.')) return;
        const previous = group.board;
        group.board = normalizeBoard(entry.board, studentIds);
        if (save()) render();
        else group.board = previous;
      };
      const remove = document.createElement('button');
      remove.textContent = 'Supprimer';
      remove.setAttribute('aria-label', `Supprimer la sauvegarde ${entry.name}`);
      remove.onclick = () => {
        if (!confirm(`Supprimer la sauvegarde « ${entry.name} » ?`)) return;
        const previous = group.boardArchives;
        group.boardArchives = previous.filter(copy => copy !== entry);
        if (save()) listArchives();
        else group.boardArchives = previous;
      };
      item.append(name, open, remove);
      list.append(item);
    }
  }

  $('boardArchives').onclick = () => {
    archiveName.value = `Tableau du ${new Date().toLocaleDateString('fr-FR')}`;
    archiveStatus.textContent = '';
    listArchives();
    archiveDialog.showModal();
  };
  $('boardCloseArchive').onclick = () => archiveDialog.close();
  $('boardSaveCopy').onsubmit = event => {
    event.preventDefault();
    const name = archiveName.value.trim();
    if (!name || !addArchive(name, snapshot())) return;
    listArchives();
    archiveStatus.textContent = 'Copie enregistrée dans Mission 1000.';
  };
  $('boardDownload').onclick = () => {
    const name = archiveName.value.trim() || `Tableau du ${new Date().toLocaleDateString('fr-FR')}`;
    const data = {format: 'mission1000-board', version: 1, classId: group.id, name, board: snapshot()};
    download(`Mission1000-Tableau-${group.name.replace(/[^a-z0-9_-]/gi, '_')}-${today()}.json`, JSON.stringify(data), 'application/json');
  };
  $('boardUpload').onclick = () => $('boardArchiveFile').click();
  $('boardArchiveFile').onchange = async event => {
    const input = event.target;
    const file = input.files[0];
    if (!file) return;
    try {
      if (file.size > 500000) throw Error('Ce fichier est trop volumineux.');
      const data = JSON.parse(await file.text());
      if (data?.format !== 'mission1000-board' || data.version !== 1 ||
          !data.board || !Object.hasOwn(BOARD_BACKGROUNDS, data.board.background) ||
          typeof data.name !== 'string' || !data.name.trim()) throw Error('Choisis un fichier de tableau Mission 1000.');
      if (data.classId !== group.id) throw Error('Ouvre la classe d’origine pour importer ce tableau.');
      if (addArchive(data.name.trim().slice(0, 80), normalizeBoard(data.board, studentIds))) {
        listArchives();
        archiveStatus.textContent = 'Fichier importé. Choisis « Ouvrir » pour afficher cette copie.';
      }
    } catch (error) {
      archiveStatus.textContent = error instanceof SyntaxError ? 'Le fichier de tableau est illisible.' : error.message;
    } finally {
      input.value = '';
    }
  };
  paintFloor();
  showMarks();
}
