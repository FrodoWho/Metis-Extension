# Changelog

## 0.2.1 (2026-09-28)

### Firefox
- Klaar voor addons.mozilla.org: Mozilla's validator (`web-ext lint`) geeft geen fouten of waarschuwingen meer.
- De toolbar houdt zijn opmaak op sites met een strikte Content-Security-Policy (vanaf Firefox 153, eerdere versies vallen terug op de oude manier).
- De design-overlay wordt niet meer door de CSP van een site tegengehouden.
- Een bestand dat geen afbeelding is, geeft nu een melding in plaats van stil te falen.

### Voor developers
- Nieuwe test voor een pagina met strikte CSP (54 tests).

### Bekend
- Automatisch testen in een echte Firefox lukt nog niet; test de Firefox-versie handmatig voor een release.

## 0.2.0 (2026-09-28)

### Nieuw

**Toolbar**
- **Versleepbaar:** sleep de toolbar aan de ⠿-greep weg van wat je wilt meten. Dubbelklik zet hem terug. De positie wordt onthouden.
- **Inklappen** tot een klein knopje. De actieve tool blijft gewoon werken.
- **Viewportgrootte** staat in de toolbar, handig voor breakpoints.
- **Sneltoetsen:** M (Measure), G (Guides), L (Grid), O (Overlay), C (Copy CSS). Esc zet eerst de tool uit en sluit daarna de toolbar.

**Measure**
- Afstand tussen twee elementen: lock er één en hover een ander.
- Padding en margin worden ingekleurd, zoals in DevTools.
- Met ↑/↓ selecteer je het parent- of child-element, ook binnen web components.
- Typografie in het paneel: grootte, regelhoogte, gewicht, font, kleur en WCAG-contrast.
- Schakelaar px/rem en **Copy CSS** van het geselecteerde element.

**Guides**
- Linialen langs de rand. Sleep er een guide uit, of laat hem terugvallen om te annuleren.
- Guides verslepen, en met de pijltjestoetsen verschuiven (Shift: 10px).
- **Pin**: guides scrollen mee met de pagina.
- Guides blijven staan als je naar Measure wisselt.

**Nieuwe lagen**
- **Grid:** een kolomgrid met instelbare kolommen, gutter, max-breedte en marge.
- **Overlay:** leg een ontwerp (PNG) half doorzichtig over de pagina. In Diff-modus lichten alleen de verschillen op.

### Opgelost
- Wat achter de toolbar zat, kon je niet meten of aanklikken.
- Met een modale dialoog open reageerde de toolbar niet.
- CSS van een website kon de toolbar verbouwen.
- Bij grote elementen viel het meetpaneel buiten beeld.

### Voor developers
- **Nieuwe permissie `storage`:** alleen voor lokale voorkeuren, zonder waarschuwing voor gebruikers. Wel extra reviewtijd in de Web Store.
- **Tests draaien headless:** `npm test`, 53 tests. `npm run test:headed` toont de browser.
- **`npm run package`** maakt verse zips voor de Chrome Web Store en Firefox in `dist/`.

### Bekend
- De Firefox-versie is nog niet getest.
