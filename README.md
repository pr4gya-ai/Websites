# Vinea: Wine Editorial Website (animated)

## Files
- `index.html`: page structure and Tailwind configuration
- `style.css`: styles and the animation layer
- `script.js`: scroll, cursor and menu behaviour (no libraries)

## Run
Open `index.html` in a modern browser. No build step.
Internet access is needed for the Tailwind CDN, Google Fonts and Unsplash images.

## Sections
Home, About Us, Our Judges, Become a Sponsor, Contact, Register Now.

## Animations added
- **Intro curtain**: wine-coloured screen with the logo, a 0 to 100 counter and a gold bar, then it lifts away. Plays once per visit (sessionStorage).
- **Headlines**: every big heading slides up line by line from behind a mask.
- **Images**: wipe open like a curtain while the picture settles from zoomed-in.
- **Parallax**: hero, about, judges and sponsor images, plus the big decorative "V" letters, drift at different speeds as you scroll.
- **Hero**: slow Ken Burns zoom, bobbing arrows, drifting film grain.
- **Staggered reveals**: judge cards, about cards and sponsor labels arrive one after another.
- **Marquee**: speeds up with scroll speed, glides into reverse when you scroll up, leans with the scroll, slows on hover.
- **Header**: hides when you scroll down, returns when you scroll up. A thin gold reading-progress bar runs along the top.
- **Footer**: giant "vinea." word rises letter by letter.
- **Cursor** (mouse only): gold ring that follows with a lag and grows over links; buttons lean toward the pointer.
- **Judge cards**: image zoom, gold underline on the name, rotating arrow.
- **Mobile menu**: panel wipes down, links rise one after another, Escape closes it, focus is managed.
- **Forms**: input underlines draw in on focus; the confirmation message rises in.

## Accessibility
Visitors with "reduce motion" turned on get the finished page: no intro, no movement, all content visible.
If JavaScript fails, content is still shown (hidden-until-animated styles only apply once scripts run).

## Tuning
- Animation speeds and easing: the `--ease` variables and transitions at the top of `style.css`.
- Intro length: `duration` in `script.js` (section 3). Remove the `#loader` block in `index.html` to drop the intro.
- Parallax strength: the `data-parallax` number on each element (higher moves more).
- Reveal a new element: add `class="reveal"`; wrap images in `img-reveal`; add `data-split` to a heading with `<br>` between lines.

Judge names and contact email are placeholders. Forms show demo confirmations; connect a backend or form provider before production.
