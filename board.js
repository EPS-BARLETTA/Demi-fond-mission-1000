'use strict';

const BOARD_BACKGROUNDS = {
  blank: 'Tableau blanc',
  team: 'Sport collectif',
  basket: 'Basket',
  racket: 'Badminton / volley',
  tennis: 'Tennis',
  scale: 'Échelle de 1 à 20',
};
const boardClamp = (value, min, max) => Math.max(min, Math.min(max, value));
const boardNumber = (value, fallback) => Number.isFinite(value) ? boardClamp(value, 0, 100) : fallback;

function renderClassBoard(group, students) {
  const raw = group.board || {};
  const background = Object.hasOwn(BOARD_BACKGROUNDS, raw.background) ? raw.background : 'blank';
  const groups = Array.isArray(raw.marks) ? raw.marks.filter(m => m && /^[\w-]+$/.test(m.id) && ['note', 'group'].includes(m.type) && typeof m.text === 'string').slice(0, 100) : [];
  const layout = {
    background,
    courts: boardClamp(Math.round(Number(raw.courts)) || 1, 1, 4),
    positions: {...raw.positions},
    marks: groups.map(m => ({...m, x: boardNumber(m.x, 50), y: boardNumber(m.y, 50)})),
  };
  const content = $('content');
  content.innerHTML = `<section class="card class-board">
    <div class="board-toolbar">
      <label>Fond<select id="boardBackground">${Object.entries(BOARD_BACKGROUNDS).map(([key, label]) =>
        `<option value="${key}" ${key === background ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
      <label id="boardCountLabel">Terrains<select id="boardCourtCount">${[1, 2, 3, 4].map(n => `<option ${n === layout.courts ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <button id="boardAddGroup">Ajouter un groupe</button><button id="boardAddNote">Ajouter une note</button>
    </div>
    <p class="muted board-help">Déplace chaque élève librement. Appuie longuement sur un emplacement libre pour y poser une note.</p>
    <div id="boardSurface" class="board-surface" role="region" aria-label="Tableau de ${esc(group.name)}">
      <div id="boardFloor" class="board-floor" aria-hidden="true"></div>
    </div>
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
  let gesture, suppressClick = false, lastGesture = 0, editing;

  function paintFloor() {
    const sport = !['blank', 'scale'].includes(layout.background);
    $('boardCountLabel').hidden = !sport;
    surface.dataset.background = layout.background;
    floor.className = `board-floor board-${layout.background}`;
    floor.dataset.count = layout.courts;
    if (layout.background === 'scale') {
      floor.innerHTML = Array.from({length: 20}, (_, i) => `<div class="board-tick"><b>${20 - i}</b></div>`).join('');
    } else if (sport) {
      floor.innerHTML = Array.from({length: layout.courts}, () => '<div class="board-court"><i></i><i></i><i></i><i></i></div>').join('');
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

  function makeDraggable(element, position, persistPosition) {
    element.classList.add('board-movable');
    element.addEventListener('pointerdown', event => {
      const shownX = parseFloat(element.style.left);
      const shownY = parseFloat(element.style.top);
      startGesture(event, element, {x: shownX, y: shownY}, persistPosition);
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
    element.setAttribute('aria-label', `${student.name} · Déplacer avec les flèches ou glisser`);
    element.title = student.name;
    const validPhoto = validRosterPortrait(student.portrait);
    const initials = student.name.trim().split(/\s+/).slice(0, 2).map(part => Array.from(part)[0]).join('').toUpperCase();
    element.innerHTML = `${validPhoto ? `<img alt="" src="${student.portrait}" draggable="false">` : `<span class="board-initials">${esc(initials)}</span>`}<span>${esc(student.name)}</span>`;
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
    });
  });

  function showMarks() {
    markElements.forEach(({element}) => element.remove());
    markElements.clear();
    layout.marks.forEach(mark => {
      const element = document.createElement('button');
      element.type = 'button';
      element.className = `board-marker board-marker-${mark.type}`;
      element.textContent = mark.type === 'note' ? 'Note' : mark.text;
      element.setAttribute('aria-label', mark.type === 'note' ? 'Ouvrir la note' : `Modifier le groupe ${mark.text}`);
      element.addEventListener('click', () => {
        if (!suppressClick && Date.now() - lastGesture > 300) openEdit(mark.type, mark, mark);
      });
      surface.append(element);
      markElements.set(mark.id, {element, position: mark});
      makeDraggable(element, mark, next => {
        const {x, y} = mark;
        Object.assign(mark, next);
        if (!writeBoard()) Object.assign(mark, {x, y});
        paint(element, mark);
      });
    });
  }

  function startGesture(event, element, origin, commit) {
    if (event.button !== 0 || gesture || !event.isPrimary) return;
    const g = {id: event.pointerId, x: event.clientX, y: event.clientY, element, origin, commit};
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
    if (gesture.element) gesture.element.classList.remove('board-dragging');
    gesture = null;
  }

  surface.addEventListener('pointerdown', event => {
    if (!event.target.closest('.board-movable')) startGesture(event, null);
  });
  surface.addEventListener('pointermove', event => {
    const g = gesture;
    if (!g || g.id !== event.pointerId) return;
    const dx = event.clientX - g.x, dy = event.clientY - g.y;
    if (!g.moved && Math.hypot(dx, dy) < 6) return;
    g.moved = true;
    clearTimeout(g.timer);
    if (g.element) {
      g.element.classList.add('board-dragging');
      g.next = point(g.element, g.origin.x + dx * 100 / surface.clientWidth, g.origin.y + dy * 100 / surface.clientHeight);
      paint(g.element, g.next);
    }
  });
  surface.addEventListener('pointerup', event => {
    const g = gesture;
    if (!g || g.id !== event.pointerId) return;
    cancelGesture();
    if (g.next) {
      lastGesture = Date.now();
      g.commit(g.next);
    } else if (g.element?.classList.contains('board-marker')) {
      // Capturing the pointer on the surface can retarget the click on touch devices.
      g.element.click();
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 0);
    }
  });
  surface.addEventListener('pointercancel', () => { cancelGesture(); paintItems(); });
  surface.addEventListener('contextmenu', event => event.preventDefault());

  function openEdit(type, position, mark) {
    if (editor.open) return;
    editing = {type, position, mark};
    const isNote = type === 'note';
    $('boardEditorTitle').textContent = isNote ? 'Note du tableau' : 'Nom du groupe';
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
    const previous = layout.courts;
    layout.courts = Number(event.target.value);
    if (!writeBoard()) event.target.value = layout.courts = previous;
    paintFloor();
  };
  paintFloor();
  showMarks();
}
