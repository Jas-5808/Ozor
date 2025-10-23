# Design System - Liquid Glass UI

## Overview

This design system implements a "liquid glass" aesthetic inspired by modern iOS interfaces, featuring translucent elements, subtle blur effects, and smooth animations.

## Color Palette

### Primary Colors

- **Primary Blue**: `#006DFF` - Main brand color
- **Primary Blue Dark**: `#0055BF` - Darker variant for hover states
- **Primary Blue Ink**: `#1e3a8a` - Deep blue for text

### Background Colors

- **Glass Background**: `rgba(255, 255, 255, 0.1)` - Translucent white
- **Glass Background Dark**: `rgba(67, 67, 68, 0.7)` - Translucent dark
- **Surface**: `#f8fafc` - Light surface color
- **Surface Dark**: `#1f2937` - Dark surface color

### Text Colors

- **Primary Text**: `#111827` - Main text color
- **Secondary Text**: `#6b7280` - Muted text
- **Glass Text**: `rgba(255, 255, 255, 0.9)` - Text on glass elements

### Status Colors

- **Success**: `#059669` - Green for success states
- **Warning**: `#d97706` - Orange for warnings
- **Error**: `#dc2626` - Red for errors
- **Info**: `#2563eb` - Blue for information

## Typography

### Font Family

- **Primary**: `"Montserrat", sans-serif`
- **Fallback**: `system-ui, -apple-system, sans-serif`

### Font Scale

- **xs**: `0.75rem` (12px) - Small labels, captions
- **sm**: `0.875rem` (14px) - Body text small
- **base**: `1rem` (16px) - Body text
- **lg**: `1.125rem` (18px) - Large body text
- **xl**: `1.25rem` (20px) - Headings small
- **2xl**: `1.5rem` (24px) - Headings medium
- **3xl**: `1.875rem` (30px) - Headings large
- **4xl**: `2.25rem` (36px) - Headings extra large

### Font Weights

- **Light**: `300`
- **Normal**: `400`
- **Medium**: `500`
- **Semibold**: `600`
- **Bold**: `700`
- **Extrabold**: `800`

## Spacing Scale

### Base Unit: 4px

- **1**: `0.25rem` (4px)
- **2**: `0.5rem` (8px)
- **3**: `0.75rem` (12px)
- **4**: `1rem` (16px)
- **5**: `1.25rem` (20px)
- **6**: `1.5rem` (24px)
- **8**: `2rem` (32px)
- **10**: `2.5rem` (40px)
- **12**: `3rem` (48px)
- **16**: `4rem` (64px)
- **20**: `5rem` (80px)
- **24**: `6rem` (96px)

## Border Radius

### Glass Elements

- **sm**: `0.375rem` (6px) - Small glass elements
- **base**: `0.5rem` (8px) - Standard glass elements
- **md**: `0.75rem` (12px) - Medium glass elements
- **lg**: `1rem` (16px) - Large glass elements
- **xl**: `1.5rem` (24px) - Extra large glass elements
- **2xl**: `2rem` (32px) - Pill-shaped elements
- **full**: `9999px` - Circular elements

## Shadows

### Glass Shadows

- **glass-sm**: `0 1px 2px rgba(0, 0, 0, 0.05), 0 1px 1px rgba(0, 0, 0, 0.04)`
- **glass-md**: `0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)`
- **glass-lg**: `0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)`
- **glass-xl**: `0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)`

### Button Shadows

- **button**: `0 8px 16px rgba(0, 109, 255, 0.25)`
- **button-hover**: `0 10px 22px rgba(22, 82, 204, 0.28)`

## Blur Effects

### Backdrop Blur

- **blur-sm**: `blur(4px)` - Subtle blur
- **blur-md**: `blur(8px)` - Medium blur
- **blur-lg**: `blur(16px)` - Strong blur
- **blur-xl**: `blur(24px)` - Maximum blur
- **blur-2xl**: `blur(40px)` - Extreme blur

## Animations

### Transitions

- **fast**: `150ms ease-out` - Quick interactions
- **normal**: `200ms ease-out` - Standard transitions
- **slow**: `300ms ease-out` - Smooth animations

### Easing Functions

- **ease-out**: `cubic-bezier(0, 0, 0.2, 1)`
- **ease-in-out**: `cubic-bezier(0.4, 0, 0.2, 1)`
- **bounce**: `cubic-bezier(0.68, -0.55, 0.265, 1.55)`

## Component Patterns

### Glass Cards

```css
.glass-card {
  @apply bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-glass-md;
}
```

### Glass Buttons

```css
.glass-button {
  @apply bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-2 text-white/90 hover:bg-white/20 transition-all duration-200;
}
```

### Glass Inputs

```css
.glass-input {
  @apply bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/70 focus:bg-white/20 focus:border-white/40 transition-all duration-200;
}
```

## Mobile-First Breakpoints

- **sm**: `640px` - Small tablets
- **md**: `768px` - Tablets
- **lg**: `1024px` - Laptops
- **xl**: `1280px` - Desktops
- **2xl**: `1536px` - Large desktops

## Accessibility

### Focus States

- **Focus Ring**: `0 0 0 3px rgba(0, 109, 255, 0.15)`
- **Focus Border**: `border-blue-500`

### Color Contrast

- **Minimum**: 4.5:1 for normal text
- **Enhanced**: 7:1 for large text
- **AAA**: 7:1 for all text

## Implementation Notes

1. **Backdrop Filter Support**: Use `@supports (backdrop-filter: blur(10px))` for progressive enhancement
2. **Fallback Colors**: Always provide solid color fallbacks for older browsers
3. **Performance**: Use `transform` and `opacity` for animations to leverage GPU acceleration
4. **Touch Targets**: Minimum 44px touch targets for mobile interfaces
