// Vorbereitungen
const print = console.log;


// Einstellungen zum Spiel
const settings = {
  size: 9,
  mines: 10,
};


// Wichtige Tags einlesen
const $main = document.querySelector('main');
const $button = document.querySelector('input');
let $selected = null;


// Hilfsfunktionen um herauszufinden, ob wir auf Mac oder Windows ausgeführt werden
const isMac = () => navigator.userAgent.includes('Macintosh');
const isWindows = () => navigator.userAgent.includes('Windows');


// Neutralino vorbereiten
Neutralino.init();
Neutralino.events.on('ready', async () => {
  // Berechnungen für die Größe des Fensters durchführen
  // 1px padding-left + ((1px border-left + 40px .field width + 1px border-right) * N-Felder) + 1px padding-right
  let width = 1 + ((1 + 40 + 1) * settings.size) + 1;
  let height = width;

  // Die Höhe der Titelleiste bei macOS zur Höhe hinzufügen
  if (isMac()) {
    height += 28;
  }

  // Die UI-Skalierung von Windows ausgleichen, damit die Fenstergröße korrekt gesetzt wird
  if (isWindows()) {
    width *= window.devicePixelRatio;
    height *= window.devicePixelRatio;
  }

  // Berechnete Dimensionen des Fensters setzen
  await Neutralino.window.setSize({
    width,
    height,
    resizable: false,
  });

  // Spiel vorbereiten und starten
  start();

  // Das fertig vorbereitete Fenster anzeigen
  await Neutralino.window.show();
});


// Auf Tastaturkürzel reagieren
window.addEventListener('keydown', (event) => {
  // Tastaturkürzel Strg/CMD + ...
  if (((isWindows() && event.ctrlKey) || (isMac() && event.metaKey)) && !event.altKey) {
    switch (event.key) {
      // Spiel neu starten
      case 'n': {
        restart();
      } break;

      // Anwendung schließen
      case 'w': {
        Neutralino.app.exit();
      } break;

      // Anwendung minimieren
      case 'm': {
        // Neutralino.window.minimize();
      } break;

      // Alle anderen Tasten ignorieren
      default: return;
    }

    // Bei eigenen Tastaturkürzeln den Standard unterbinden
    return event.preventDefault();
  }

  // Tastaturnavigation über das Feld
  switch (event.key) {
    case 'ArrowUp': {
      moveSelection(0, -1);
    }; break;
    case 'ArrowLeft': {
      moveSelection(-1, 0);
    } break;
    case 'ArrowRight': {
      moveSelection(1, 0);
    } break;
    case 'ArrowDown': {
      moveSelection(0, 1);
    } break;
    case ' ': {
      if ($selected) {
        open($selected);
      }
    } break;
    case 'm': {
      if ($selected) {
        mark($selected);
      }
    }
  }
});


function moveSelection(x, y) {
  if ($selected?.hasAttribute('data-selected')) {
    $selected.removeAttribute('data-selected');
  }

  if (!$selected) {
    $selected = document.querySelector(`.field:nth-child(${Math.ceil(Math.pow(settings.size, 2) / 2)})`);
  } else {
    // ...
  }

  $selected.setAttribute('data-selected', '');
}


//
// restart()
// Spiel zurücksetzen und neu vorbereiten.
function restart() {
  $main.innerHTML = '';
  $main.toggleAttribute('data-game-won', false);
  $main.toggleAttribute('data-game-over', false);
  start();
}


//
// start()
// Neues Spiel starten
function start() {
  // Anzahl der Minen als Klasse auf den Container setzen
  $main.className = `size${settings.size}x${settings.size}`;

  // ID Zähler für das Feld
  let id = 0;

  // Alle Felder des Spielfeldes erstellen:
  // Y-Koordinate
  for (let y = 1; y <= settings.size; y++) {
    // X-Koordinate
    for (let x = 1; x <= settings.size; x++) {
      // Neues Feld erstellen
      const $field = document.createElement('div');

      // Fortlaufende ID sowie Klasse setzen
      $field.id = `field${id++}`;
      $field.className = 'field';

      // X- und Y-Koordinate setzen
      $field.setAttribute('data-x', x);
      $field.setAttribute('data-y', y);

      // Feld bei Klick aufdecken
      $field.addEventListener('click', () => open($field));

      // Feld anzeigen
      $main.append($field);
    }
  }

  // Solange zufällige Felder als Minen markieren bis die gewünschte Anzahl an Minen existiert
  do {
    const id = Math.floor(Math.random() * Math.pow(settings.size, 2));
    document.querySelector(`#field${id}`).setAttribute('data-is-mine', '');
  }
  while (document.querySelectorAll('.field[data-is-mine]').length < settings.mines);

  // Zahlen ermitteln, wie viele Minen sich um ein Feld herum befinden sowie alle Nachbarn merken
  [...document.querySelectorAll('.field')].forEach(($field) => {
    // Koordinaten des aktuellen Feldes ermitteln
    const field = {
      x: parseInt($field.getAttribute('data-x')),
      y: parseInt($field.getAttribute('data-y')),
    };

    // Variablen deren Werte wir ermitteln wollen
    const neighbors = [];
    let minesAround = 0;

    // Über alle umliegenden Felder inklusive sich selbst iterieren
    for (let offsetY = -1; offsetY <= 1; offsetY++) {
      for (let offsetX = -1; offsetX <= 1; offsetX++) {
        // Koordinaten des aktuellen Nachbars berechnen
        const neighbor = {
          x: field.x + offsetX,
          y: field.y + offsetY,
        };

        // Versuchen auf den Nachbarn zuzugreifen
        const $neighbor = document.querySelector(`.field[data-x="${neighbor.x}"][data-y="${neighbor.y}"]`);

        // Überprüfen ob ein Nachbar gefunden wurde und es nicht das eigene Feld ist
        if (!$neighbor || $neighbor === $field) continue;

        // Nachbar im Array merken
        neighbors.push($neighbor);

        // Prüfen ob eine Mine vorliegt und den Minenzähler erhöhen
        if ($neighbor.hasAttribute('data-is-mine')) {
          minesAround++;
        }
      }
    }

    // Gefundene Informationen im Feld speichern
    $field.neighbors = neighbors;
    $field.setAttribute('data-mines-around', minesAround);
  });
}


//
// open()
// Angeklicktes Feld aufdecken sowie Sieg oder Niederlage ermitteln.
// <- $field: Element
function open($field) {
  // Markierte sowie bereits geöffnete Felder nicht öffnen lassen
  if ($field.hasAttribute('data-is-open') || $field.hasAttribute('data-is-marked')) return;

  // Feld als aufgedeckt markieren
  $field.setAttribute('data-is-open', '');

  // Wenn eine Mine angedrückt wurden, dann Game Over aktivieren
  if ($field.hasAttribute('data-is-mine')) {
    $main.setAttribute('data-game-over', '');
    return;
  }

  // Bei einem leeren Feld alle darum herum liegenden Felder aufdecken
  if ($field.getAttribute('data-mines-around') === '0') {
    // $field.neighbors.forEach(($neighbor) => open($neighbor));
    $field.neighbors.forEach(open);
  }

  // Siegbedingung überprüfen, wenn alle nicht Minenfelder aufgedeckt wurden
  const allFields = [...document.querySelectorAll('.field')].length;
  const openFields = [...document.querySelectorAll('.field[data-is-open]')].length;
  if (allFields - openFields === settings.mines) {
    $main.setAttribute('data-game-won', '');
    return;
  }
}


//
// mark()
// Rechts angeklicktes Feld als Mine (ent)markieren.
function mark($field) {
  if ($field.hasAttribute('data-is-open')) return;

  // if ($field.hasAttribute('data-is-marked')) {
  //   $field.removeAttribute('data-is-marked');
  // } else {
  //   $field.setAttribute('data-is-marked', '');
  // }
  $field.toggleAttribute('data-is-marked');
}


// Events registrieren
$button.addEventListener('click', restart);
window.addEventListener('contextmenu', (event) => {
  if (event.altKey) return;
  event.preventDefault();

  // if (event.target.matches('.field')) {
  if (event.target.className === 'field') {
    mark(event.target);
  }
});
