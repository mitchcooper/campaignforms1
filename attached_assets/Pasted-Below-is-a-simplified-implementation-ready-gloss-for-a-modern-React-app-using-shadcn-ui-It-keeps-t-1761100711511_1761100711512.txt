Below is a simplified, implementation-ready gloss for a modern React app using shadcn/ui. It keeps the Harcourts Cooper & Co flavour, adds light glassmorphism, and stays practical.

# Harcourts Cooper & Co - Web UI Guide

## 0. Brand anchors

* Feel: precise, calm, confident.
* Layouts are simple, grid-driven, and spacious.
* Photography is real, local, and lightly edited.

## 1. Logo

* Use the approved Harcourts Cooper & Co lock-up only.
* Full-colour logo on white backgrounds.
* White (reverse) logo on dark or photos.
* Keep clear space equal to the “H” height on all sides.
* Do not stretch, recolour, or edit.
* Office or agent lock-ups must keep approved hierarchy and vertical rule spacing.

## 2. Colour tokens

Use Navy as the anchor. Cyan is a controlled accent. Generous white space.

```css
:root {
  --hc-navy:   #001F3A; /* Primary */
  --hc-cyan:   #00AEEF; /* Accent */
  --hc-white:  #FFFFFF; /* Base */
  --hc-g200:   #F2F2F2; /* Neutral Light */
  --hc-g400:   #CCCCCC; /* Neutral Mid */
  --hc-g700:   #666666; /* Neutral Dark */
  /* UI tokens */
  --hc-bg: var(--hc-white);
  --hc-fg: var(--hc-navy);
  --hc-muted: var(--hc-g700);
  --hc-border: #E6E6E6;
  --hc-focus: var(--hc-cyan);
}
```

Usage

* Backgrounds: white or very light grey.
* Text: Navy for headings, Charcoal for body.
* Actions and links: Cyan, used sparingly.
* Dividers and rules: light greys only.

## 3. Typography

* Typeface: Source Sans Pro for all text.
* Headings: Bold, title case or uppercase, tight leading.
* Subheadings: Semibold.
* Body: Regular, sentence case. 14–16 px min.
* Keep tracking consistent. No decorative mixes.

Note: set font family at app level. Do not override component-by-component.

## 4. Spacing, radius, and elevation

* Grid: 8-point scale. Spacing units 4, 8, 12, 16, 24, 32, 48.
* Radius: 8 for inputs and pills, 12 for cards, 16–20 for modals or feature tiles.
* Shadows: subtle only. Prefer 1–2 elevation steps.

```css
:root {
  --hc-radius-sm: 8px;
  --hc-radius-md: 12px;
  --hc-radius-lg: 16px;

  --hc-shadow-1: 0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04);
  --hc-shadow-2: 0 4px 12px rgba(0,0,0,0.08);
}
```

## 5. Light glassmorphism

Use glass for surfaces over imagery or tinted backgrounds. Keep contrast accessible.

Rules

* Background: semi-transparent white, subtle border, soft blur.
* Text over glass must meet AA contrast.
* Use sparingly for cards, nav bars, or panels. Not for long-form reading.

```css
.glass {
  background: rgba(255,255,255,0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.7);
  box-shadow: var(--hc-shadow-1);
  border-radius: var(--hc-radius-md);
}
.glass-dark {
  background: rgba(0,31,58,0.35);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.18);
  color: var(--hc-white);
}
```

## 6. shadcn/ui setup

* Use default shadcn/ui primitives.
* Map tokens via Tailwind CSS variables.
* Keep variants minimal: default, outline, ghost.

Buttons

* Primary: Navy background, white text. Focus ring Cyan.
* Secondary: Outline Navy, text Navy on white.
* Destructive: Use standard red only when required.

Inputs

* White fill, 1 px light border, 8 px radius.
* Focus ring Cyan at 2 px outside border.

Links

* Cyan text with underline on hover.
* Use Navy links only on white backgrounds when links are dense.

## 7. Component rules

Cards

* White or glass background. 12 px radius. 16–24 px padding.
* Optional subtle divider between header and body.

Navigation

* Top bar: Navy on white, or glass over media.
* Active item: Cyan indicator or underline, not both.
* Keep icons secondary. Text leads.

Tables

* Left-aligned text. Right-align numerics.
* Row height 48–56 px. Zebra using very light grey only.
* Use truncation with tooltips, not wrapping within dense tables.

Forms

* Single column by default. Two columns only for wide screens with related fields.
* Group with headings and helper text.
* Clear success and error states. Use inline validation.

Empty states

* Simple icon, short line of copy, clear primary action.
* No jokes or filler.

Toasts and banners

* One idea per message. Short, plain language.
* Use Cyan for info, standard success green, standard warning amber, standard error red.

## 8. Imagery

* Authentic, naturally lit, North Shore and Rodney focus.
* Light adjustments only. No heavy filters or over-saturation.
* Keep faces, homes, and community as the hero.

## 9. Accessibility and motion

* Colour contrast meets WCAG AA. Test interactive states.
* Focus states are visible on keyboard and touch.
* Motion is subtle. Use 150–250 ms for entrances. Reduce motion if user prefers reduced.

## 10. Do and don’t

Do

* Anchor with Navy. Use Cyan to guide action.
* Keep layouts clean, aligned, and predictable.
* Let content and photography carry the design.

Don’t

* Flood screens with gradients, shadows, or glass.
* Mix random type sizes or weights.
* Recolour or alter the logo.

## 11. Example: shadcn/ui Card with light glass

```tsx
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function PropertyHighlightCard() {
  return (
    <Card className="glass border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-[color:var(--hc-fg)] tracking-tight">
          New listing in Mairangi Bay
        </CardTitle>
      </CardHeader>
      <CardContent className="text-[color:var(--hc-muted)]">
        4 bed, 2 bath, double garage. Walk to the beach and village.
      </CardContent>
      <CardFooter className="gap-2">
        <Button className="bg-[color:var(--hc-navy)] text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--hc-focus)]">
          View details
        </Button>
        <Button variant="outline" className="border-[color:var(--hc-navy)] text-[color:var(--hc-navy)] hover:bg-[color:var(--hc-g200)]">
          Book appraisal
        </Button>
      </CardFooter>
    </Card>
  )
}
```

## 12. Page scaffolding

* Max width 1200–1280 px. Content gutters 24–32 px.
* Hero may use a glass nav over media. Main content on white panels.
* Footer on Navy with white text. Links in Cyan.

## 13. Quick checklist

* Logo lock-up correct and clear space kept.
* Navy leads, Cyan accents. Whites and light greys support.
* Type is Source Sans Pro, clean and consistent.
* Grid, spacing, and radius follow tokens.
* Glass used lightly and accessibly.
* Components align with shadcn/ui defaults and variants.
* Copy is plain, warm, and service-driven.
* Photography is genuine and local.

This keeps the brand precise and simple, with a modern app finish that feels unmistakably Cooper & Co.
