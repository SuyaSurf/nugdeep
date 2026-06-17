# Visual & Audio Design Strategy

Based on research into game feel ("juice"), color psychology, sound design, and engagement patterns.

## Core Principles (applied to every game)

### Juice Stack
Every interaction passes through all 5 feedback layers. Remove one and the game still works. Remove all and it's a spreadsheet.

1. **Animation** — Eased tweens (no linear movement). Use DOTween-style: `OutBack` for popups, `OutQuad` for movement, `OutElastic` sparingly for cartoony hits
2. **Particles** — Burst on success, fade on failure. Keep it minimal (3-8 particles per event)
3. **Screen effect** — Shake on impact (trauma-squared decay), flash on reveal, hit-stop on critical moments (freeze for 3 frames)
4. **Audio** — Layered: interaction click + result sound + environmental texture
5. **Haptic** — Light tap on tap, heavy thud on outcome (mobile vibration API)

### Color Philosophy
Each game gets a **primary** and **accent** color pair. The player should recognize the game by color alone at a distance.

- Color is communication, not decoration — green = success, red = failure, gold = reward
- Backgrounds are dark/warm (80% of screen), game elements are bright (20%)
- No text labels needed on core feedback — color + icon tells the story

### Audio Philosophy
- Every game needs a **signature sound** — a 0.5s audio logo played on match start
- Three essential sounds per game: **tick** (countdown/progress), **resolve** (win/lose outcome), **ambient** (low background texture)
- Silence is a tool — the 1s pause before a reveal is more powerful than any sound
- Sound should be proportional: a flip of the 9 in Flip = dramatic crash; a correct quiz answer = satisfying chime

---

## Category: Nerve Games

Shared visual DNA: dark backgrounds (space gray, deep navy, charcoal), one bright tracking element, minimal UI.

### 1. The Button
**Visual identity:** Deep space black background. A luminous ring timer (cyan/teal gradient). The ring closes in on itself as time approaches 10s. A central numeral shows the hundredths. The "stop" button is a simple white circle with a hand icon.

**Heartbeat animation:** The ring pulses faster past 9s. At the moment of stopping, the ring flashes and freezes. The number enlarges and color-shifts based on closeness to 10s — deep gold at 9.97s, dim gray at 0.2s. Camera gently shakes proportional to the gap.

**Audio:**
- Signature: A low synth pulse that increases in pitch as time passes
- Tick: Soft metronome click at 1s intervals, accelerating at the last second into rapid clicks (every 100ms past 9s)
- Resolve: Winner — ascending chime + subtle sparkle. Loser — descending tone + deflating air sound
- Ambient: Very low 40Hz hum throughout

**Juice:** Screen micro-shake on stop (trauma 0.15). Number "bounces" into final position with OutBack ease. Winner's number glows with particle sparkle. Loser's number fades to gray.

### 2. Chicken
**Visual identity:** Dark indigo background. A horizontal progress bar that fills from left to right with a gradient — cool blue at 0% → yellow at 50% → orange at 75% → red at 90% → deep crimson at 100%. A central indicator line marks the current position. Two player "grips" (simple hand icons) hold from either side.

**Heartbeat animation:** The bar color shifts temperature as it fills. At 90%+, the bar begins to "crackle" — tiny orange particles spark along the fill edge. When a player releases, the bar freezes, the releasing player's grip shatters (particle burst), and the remaining player's hand glows gold.

**Audio:**
- Signature: Low tension string drone, barely audible
- Tick: A low whooshing sound that intensifies with the bar level
- Resolve: Win — triumphant rise. Lose — deflating "pfffft" sound

**Juice:** Screen shake on release (trauma 0.3 for loser, 0.1 for winner). The bar "bounces" on freeze. Loser's grip shatters with glass-break particles. Winner's grip pulses with a golden glow.

### 3-6. Roulette, Flip, Bomb, Dice Fate
Each has detailed specifications in the game doc. Shared Nerve aesthetic:
- Dark atmospheric backgrounds
- One focal game element per screen
- Dramatic pause before reveals (1s of silence)
- Heavy screen shake on critical moments (flipping the 9, finding the bomb)

---

## Category: Social / Creative Games

Shared visual DNA: Warm, soft, friendly. Pastels, cream backgrounds, organic shapes. Rounded everything (no sharp corners). Warm lighting.

### 13. Which One
**Visual identity:** Cream/beige background with subtle paper texture. Two illustrated cards side by side — each is a painted scene (not photo, not flat vector — think watercolor illustration with texture). The card that represents your choice floats slightly higher. The question card has a gentle linen texture.

**Heartbeat animation:** Both players have picked. 1-second pause. Cards slowly rotate in 3D space to reveal each other's choices. If matching — both cards glow warm gold, a gentle sparkle particle effect rains down, and a soft "ding!" plays. If different — cards slide apart gently, a neutral "hmm" tone plays, and the difference is shown with a subtle connecting line.

**Audio:**
- Signature: Soft harp or music box pluck (2 notes ascending)
- Tick: Gentle page rustle when question appears
- Resolve: Match — warm "ding" + soft chime. Mismatch — descending "hmm" tone (not punitive, just acknowledging)
- Ambient: Very quiet cafe-like room tone (distant chatter, clinking cups)

**Juice:** Cards float with a gentle idle animation (drift 1-2px, sine wave). Cards bounce on selection (OutBack ease, 1.1x scale bounce). Reveal uses a slow ease-out (no sudden movements).

### 14. Story Dice
**Visual identity:** Warm parchment background. Three large icon tiles centered. Clean serif font for story text. A vintage postcard aesthetic — slightly yellowed edges, ink-like text rendering.

**Heartbeat animation:** Stories appear as if being written — text animates in letter by letter on a typewriter effect (but faster, 0.3s per word). Both stories side by side in framed panels. The "better" story gets a gentle golden corner fold, like a winning restaurant menu item.

**Audio:**
- Signature: Single typewriter "clack" on keypress
- Tick: Ambient quill scratching sounds
- Resolve: Winner — a soft applause (very distant). Loser — a gentle "aww" tone

**Juice:** Icons "roll" into view (like slot machine settling). Text typewriter effect. The winning story's frame glows with a soft animated vignette.

### 15. Gesture
**Visual identity:** Clean white canvas (like a fresh sheet of drawing paper). Simple drawing tools — just a single brush width. Colors are limited to 3 per prompt (e.g., "draw a heart" gives you red, pink, rose — you pick one). A simple wooden frame around the canvas.

**Heartbeat animation:** Two drawings fade in simultaneously — first as outlines, then color fills in over 0.5s. A 2-second silence. Then a "gallery reveal" sound as the better-matched drawing gets a subtle golden frame highlight.

**Audio:**
- Signature: Pencil on paper scratch (single stroke)
- Tick: No tick — silence during drawing phase
- Resolve: Winner — "brush stroke" sound + soft chime. Loser — good-natured "boop"

**Juice:** Brush follows finger with inertia — smooth, responsive. The reveal animation: both drawings slide in from opposite edges, meeting in the middle. The losing drawing does a comical "wobble" (OutElastic, 0.3s).

---

## Category: Knowledge Games

Shared visual DNA: Premium editorial aesthetic. Clean whitespace, rich photography/illustration, serif headings, card-based layouts.

### 24. Food Remedy
**Visual identity:** Warm earth tones — terracotta, olive, cream. Food photography styling (not flat illustration, not photo-real — think editorial food illustration with texture). Botanical accents — small herb illustrations as decorative elements. A mortar and pestle icon as the game logo. Card-based question layout with the ingredient as the hero visual.

**Heartbeat animation:** The 5s timer ring (terracotta colored) closes in. Answer options appear as 4 ingredient cards with illustrations. On selection — the chosen card "pops" forward. During the reveal, the correct card glows warm gold with a "Did you know?" card flipping in from below with botanical particle effects.

**Audio:**
- Signature: Mortar and pestle grinding sound (1s, looped)
- Tick: Gentle wooden click
- Resolve: Correct — warm chime + subtle herb rustle. Wrong — gentle buzz + leaf crumbling sound
- "Did you know?": A pleasant "aha!" tone, followed by soft woodwind note during reading

**Juice:** Cards have a warm shadow. Selected card bounces (OutBack, 1.15x). Correct card "sparkles" with gentle gold particles. Timer ring pulses at 3s, 2s, 1s with increasing speed. The "Did you know?" card slides in with a 0.5s ease-out, pauses, then text fades in.

### 25. Style Match
**Visual identity:** Editorial fashion aesthetic. Blush pinks, cream, navy, gold accents. Illustrated outfits (think fashion sketch, not photo-real — elegant, clean lines, tasteful). A hanger icon as game logo. Question card shows the event with a mood board background (textures, color swatches).

**Heartbeat animation:** 4 options appear as if on a runway — each sliding in from the side with a fashion-show stride. The 5s timer is a gold ring. On selection, the chosen option is "spotlit." Correct answer: the outfit illuminates with a warm spotlight, fabric details become visible, a subtle "applause" sound. Wrong: a gentle "hmm" and the outfit dims.

**Audio:**
- Signature: Camera shutter + flash sound
- Tick: Soft fabric rustle (swish)
- Resolve: Correct — runway applause (distant, tasteful). Wrong — polite "oh" + dimming sound

**Juice:** Options slide in with an ease-out curve (like a runway model pausing). Correct outfit gets animated — a subtle wind effect on the fabric. The spotlight animation uses a soft gradient mask that fades in over 0.4s.

### 26. Kitchen Math
**Visual identity:** Recipe card aesthetic. Parchment/warm white background. Hand-drawn style illustrations of ingredients and measuring tools. Clean, readable serif/script headings. A whisk icon. Red accent color for correct answers, charcoal for text.

**Heartbeat animation:** The recipe card "flips" to reveal the question. Measuring cups show volume visually. 5s timer is a kitchen timer ring. Correct answer triggers a "chef's kiss" animation — fingers kissing, sparkle.

**Audio:**
- Signature: Kitchen timer ticking (mechanical)
- Tick: Metronome-like tick with each second
- Resolve: Correct — "ding!" (kitchen timer ding). Wrong — buzzer sound

**Juice:** Recipe card flip uses 3D card flip animation. Timer ring rotates like an old kitchen timer. Numbers appear as if stamped (ink effect). Correct answer: animated sparkle + timer ding. The calculation breakdown (for wrong answers) slides in like a recipe card extension.

### 27. Ingredient Swap
**Visual identity:** Pantry shelf aesthetic. Warm terracotta, olive green, wood tones. Illustrations of pantry shelves with ingredients. A circular arrow swap icon. Mason jar / rustic kitchen styling.

**Heartbeat animation:** Trick question reveals are the star. When ALL options are correct, each card "locks in" with a green glow sequentially over 0.3s each — building anticipation. The final card glowing is the release. "Did you know?" card shows the creative substitutions.

**Audio:**
- Signature: Jar lid opening sound
- Tick: Soft wooden surface tap
- Resolve: Single correct — soft pop sound. All correct (trick question) — ascending chime, each correct option adds a note

**Juice:** Each card "pops" when selected. Trick question reveal uses staggered animation — options glow one by one, building suspense. The "Did you know?" card slides up from the bottom with a satisfying thud.

### 28. 5-Move Chess
**Visual identity:** Premium, minimal, warm. Wooden chessboard tones (walnut and maple). Leather and brass accents. A knight piece in silhouette as logo. Dark warm background (charcoal), board in warm lighting. The evaluation bar is a simple gold/teal gradient bar at the bottom.

**Heartbeat animation:** Piece movement with smooth slide animation (ease-out, not instant). Captured pieces fade gently. The evaluation bar shifts smoothly after each move. The final bar comparison: both players' eval bars shown side by side, slowly — the winning bar glows gold, the losing one dims.

**Audio:**
- Signature: Wooden chess piece being placed on board (satisfying clack)
- Tick: Soft clock tick (chess clock sound)
- Resolve: Winner — a soft rising orchestral swell. Loser — a single descending piano note

**Juice:** Pieces cast soft shadows on the board. The move animation accelerates briefly then decelerates (OutQuad). Evaluation bar shifts with a smooth 0.5s ease — no jerky movements. Post-game: the evaluation bar history animates as a smooth curve, showing where the game turned.

---

## Category: Psychology Games

Shared visual DNA: Mysterious, ceremonial, atmospheric. Richer details, meaningful objects, sacred geometry influences.

### 9. Simul-Pick
**Visual identity:** Clean, modern, almost sterile. A white/cream circular arena. Three symbols (🔵🟢🟡) float in the center. The theme is "minimalist mind palace" — nothing distracts from the three choices and the reveal.

**Heartbeat animation:** Both have picked. 1.5-second silence. The three symbols slowly rotate in a circle, then two disappear (the opponent's non-picks) and one glows — the opponent's actual pick. Brief pause, then the winner's symbol enlarges and pulses twice.

**Audio:**
- Signature: Three ascending chime notes, one per symbol
- Tick: None (silent until reveal)
- Resolve: A single resonant bell tone. Pitch higher = closer to winning

**Juice:** Symbols float with ambient drift (gentle sine wave). On hover/focus, symbol scales up 1.1x. The reveal uses a dramatic slow ease — 1.5s to settle.

### 10. Compass
**Visual identity:** Dark background, warm directional aesthetic. The compass is rendered as an antique instrument — brass, glass, hand-drawn cardinal points. Glowing needle.

**Heartbeat animation:** Both submitted. The compass needle spins for 2 full revolutions, slowing, then points to true north. Simultaneously, each player's pick is revealed as a small marker on the compass ring. The needle's final settling is the climax.

**Audio:**
- Signature: Compass needle click
- Tick: Soft ambient wind
- Resolve: Bell tone + magnetic "click" as needle settles

### 11. Sabotage
**Visual identity:** Warm wooden tabletop. A stack of wooden blocks (Jenga-like) in the center. Two hands reach in from opposite sides. Simple, tactile, physical.

**Heartbeat animation:** The tower build/sabotage is physical. When it collapses, blocks scatter with physics. The slow-motion collapse is the money shot.

### 12. The Offering
**Visual identity:** Rich ceremonial aesthetic. Dark background, warm candlelight tones. An ornate shrine with incense smoke animation. Tokens are carved stone/wood with distinct shapes and colors.

**Heartbeat animation:** Shrine's request appears as glowing text. Both tokens slide forward onto cushions. Incense smoke swirls. The shrine's eyes glow to indicate the winner. When both offer the same token, both tokens are gently pushed back (rejected).

---

## Category: Strategy Games

Shared visual DNA: Physical, tactile, weighty. Real-world materials (wood, metal, stone, water). Gravity and physics are visible.

### 19. Scales
**Visual identity:** Ornate brass balance scale on dark wood. Warm lighting. Two plates with carved stone weights.

**Heartbeat animation:** The scale teeters, finding balance, then tips. On break: the winning plate crashes down, the loser's plate flips, stones scatter with physics.

### 20. Plank
**Visual identity:** Two figures on a wooden plank over dark water. Stormy sky. Camera gradually zooms as the game progresses.

### 21. Sumo
**Visual identity:** Minimalist clay platform (dohyo), two stylized wrestlers. Abstract crowd shapes. Warm lantern lighting.

### 22. Boil
**Visual identity:** Cast iron pot over a fire. Rich deep colors. Steam, bubbles, flame animation. Warm amber lighting.

### 23. Kite Fight
**Visual identity:** Beautiful sky gradient (sunset colors). Two kites with trailing strings. Silhouette or semi-realistic kite designs. The string is visible as a thin glowing line.

---

## Category: Visual / Observation

### 29. Spot the Difference
**Visual identity:** The image itself is the hero. Framed like an art piece. Clean white or dark gallery wall background. Minimal chrome.

**Heartbeat animation:** The tap location pulses with a ripple effect. Correct: a green checkmark expands from the tap point, the image section briefly desaturates to highlight the difference. Wrong: a red X fades in and out.

### 30. War (Ante)
**Visual identity:** Dark green felt table. Two cards in the center. Chip stacks on either side. Classic casino/gambling aesthetic. Warm overhead light.

**Heartbeat animation:** Cards flip with a satisfying slap sound. The flip animation uses a 3D card rotation (0.4s). The winning card glows briefly. Chips "clack" as they move.

---

## Implementation Strategy

### Phase 1: Juice System
Build a shared juice library before any game:
- Screen shake (trauma model)
- Particle burst system (generic, parameterized)
- Tweening utilities (ease functions, animation queues)
- Audio pool (3-layer mixing: SFX, ambient, music)
- Hit-stop (frame freeze on critical events)

### Phase 2: Game Shell
Each game uses the juice library. Game-specific assets are:
- Color palette (2 colors per game)
- Signature sound (0.5s per game)
- Core visual (the main game element — timer ring, bar, die, card, etc.)
- Particle preset (color + count for success/failure)

### Phase 3: Polish
Per-game:
- Ambient idle animations (game element breathes when waiting)
- Transition animations between rounds
- Post-game celebration screen (winner animation, score reveal)
- Share screenshot composition (the game result framed for social media)

### Priority games for aesthetic investment
Highest visual ROI games for Phase 1 launch:
1. **The Button** — simplest visuals, purest juice
2. **Which One** — the card reveal must feel magical
3. **Chicken** — the bar must feel physically tense
4. **Dice Fate** — the die animation must be beautiful
5. **Food Remedy** — the "Did you know?" card must feel like a gift
