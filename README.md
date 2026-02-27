# Persönlicher Webauftritt – Portfolio & Showcase
# PHASE 1 (27.02)

Dieses Projekt ist ein persönlicher Webauftritt, der als Mischung aus **Portfolio**, **Showcase** und **Curriculum Vitae** dient. Ziel ist es, meine bisherigen Erfahrungen, Projekte aus meiner Hiwi-Tätigkeit sowie meine persönlichen Interessen strukturiert und ansprechend darzustellen.

## Ziele des Projekts
- Erstellung einer statischen, responsiven Website
- Darstellung von persönlichen Informationen, Lebenslauf und Projekten
- Technisch saubere Umsetzung mit HTML, CSS und optional JavaScript / Three.js
- Versionierung mit Git und strukturierter Git-Workflow

## Geplante Inhalte
- **Über mich** – Vorstellung, Motivation, Kontext
- **Lebenslauf** – tabellarische Übersicht über Werdegang und Skills
- **Projekte / Showcase** – Präsentation zweier real umgesetzter Webprojekte aus meiner Hiwi-Tätigkeit
- **Kontakt / Impressum**

## Technische Anforderungen & Umsetzung
- HTML & CSS (keine Frameworks in Phase 1)
- Responsive Design mit Media Queries
- Nutzung von Flexbox / Grid
- Barrierearme Gestaltung nach WCAG-Basiskriterien
- Entwicklung unter Versionskontrolle (Git, GitHub)

## Aktueller Stand
- Grundstruktur des Projekts angelegt
- Basisdateien erstellt
- Konzeption und Struktur in Arbeit

Weitere Funktionen und Design-Aspekte werden in den nächsten Phasen ergänzt.


# PHASE 2 (27.02)

Dieser Webauftritt ist ein interaktives Portfolio und experimenteller Showcase. Er kombiniert modernes UI/UX-Design mit komplexen 3D-Web-Technologien und scroll-gesteuerten Animationen, um meine Erfahrungen, Projekte und technischen Fähigkeiten eindrucksvoll zu präsentieren.

## Kern-Features & interaktive Sektionen
- 3D Skills (About): Eine WebGL-Szene mit fallenden 3D-Blöcken (inkl. Physik und Hover-Drift), die meine Kernkompetenzen interaktiv visualisieren – optimiert für Desktop und Mobile.

- Animierte Timeline (Lebenslauf): Eine dynamische, scroll-gesteuerte Zeitachse, die meinen Werdegang und meine Erfahrungen strukturiert und visuell ansprechend darstellt.

- Cinematic Globe Sektion: Eine interaktive 3D-Weltkugel (ThreeGlobe) mit Wolken, Sternen-Parallax und Kamerafahrten. Die Animationen (Reveal, Approach, Explore) sind direkt an das Scroll-Verhalten (GSAP ScrollTrigger) gekoppelt.

- Experimenteller Shop: Ein E-Commerce-Showcase mit CSS-Scroll-Snapping, edlem Glassmorphism-UI und nahtlosen Übergängen. Der 3D-Hintergrund reagiert hier mit dynamischen "Cinematic Blur"- und Belichtungs-Effekten auf die User-Interaktion.

## Tech-Stack
-Das Projekt verzichtet in Phase 1 bewusst auf schwere Frontend-Frameworks und setzt auf eine performante, maßgeschneiderte Architektur:

-Core: Semantisches HTML5 & modernes CSS (CSS Grid/Flexbox, Custom Properties, CSS Scroll Snapping, Glassmorphism).

-3D & Render-Logik: Three.js (WebGL) für performantes Rendering, eigene Physik-Logiken und DOM-to-Canvas Mapping.

-Animation & State-Control: GSAP & ScrollTrigger für hochpräzise, scroll-basierte Timelines und State-Machines.

-Workflow: Git/GitHub, Mobile-First-Ansatz mit dynamischer JS-Skalierung für optimale Performance auf allen Endgeräten.