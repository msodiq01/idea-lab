# IDEA LAB Neon UI Design System

## Direction
IDEA LAB's command-center interface uses a near-black foundation, violet/blue/cyan accent light, layered panels, crisp type, and restrained animation. The interface should feel futuristic and professional, not noisy or game-like.

## Palette
- Base background: `#03040A`
- Panel background: `#0B0D1B`
- Raised panel: `#14142A`
- Primary violet: `#7D6BFF`
- Electric blue: `#5C69FF`
- Cyan accent: `#42DCFF`
- Main text: `#F5F5FF`
- Secondary text: `#A0A5BD`
- Borders: violet-tinted transparent borders (around 15–20% opacity)

## Surface rules
- Panels use dark gradients and subtle borders.
- Avoid high-opacity glow behind every element; reserve glow for actions, hover, or key indicators.
- Keep card radius consistent within a page.
- Make text contrast readable; don't use neon as body text.
- Use spacing and typography hierarchy before decoration.

## Interaction
- Primary actions use a violet/blue/cyan gradient.
- Secondary actions are transparent dark surfaces with subtle violet borders.
- Hover states can increase border brightness and add a restrained shadow.
- Inputs remain dark, with a visible focus border and focus ring.
- Motion must respect `prefers-reduced-motion`.

## Responsive expectations
- Cards and grids collapse without horizontal overflow.
- Navigation and action buttons remain usable on small screens.
- Do not hide essential actions on mobile.
- Verify at narrow widths (360px), tablet (768px), and desktop (1280px).

## Accessibility and quality
- Maintain semantic controls and visible keyboard focus.
- Keep contrast for status labels.
- Avoid color-only status indicators; include text or icons.
- Check reduced-motion mode.
- Browser/device screenshots and keyboard checks are required before marking a page visually verified.

## Implementation boundaries
- Visual changes should not alter auth, API, data, or permission logic.
- Do not label demo/sample content as live.
- Keep existing functionality unless a separately reviewed functional change is requested.
- A page is not finished until browser rendering, mobile layout, and regression checks have been completed.
