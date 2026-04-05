# Solete Vida Group

## Current State

The app has a "My Pages" section with two tabs:
- **Profile** (all logged-in users)
- **Users** (admins only, user management)

No holiday/calendar functionality exists yet.

## Requested Changes (Diff)

### Add
- New tab **"Kalender"** in My Pages (visible only to admins)
- Inside the calendar tab: a section called **"Höga Tider"** (High Holidays)
- Four toggles: Påsk (Easter), Julafton (Christmas Eve), Nyårsafton (New Year's Eve), Midsommar (Midsummer)
- When admin toggles a holiday ON, the setting is saved to the backend
- At page load, the frontend fetches the active holiday from the backend and shows an animated splash screen matching the holiday theme:
  - **Påsk**: Falling eggs and chicks (yellow/pastel)
  - **Julafton**: Falling snowflakes and Christmas trees (red/green/white)
  - **Nyårsafton**: Fireworks and confetti (gold/black)
  - **Midsommar**: Falling flowers and sun (green/yellow)
- Splash screen covers the full page on load, auto-dismisses after ~4 seconds or on click
- Only one holiday can be active at a time (toggling one off if another is toggled on)

### Modify
- `main.mo`: Add `activeHoliday` stable var, `getActiveHoliday` query, `setActiveHoliday` update (admin-only)
- `backend.did`, `backend.did.d.ts`, `backend.did.js`, `backend.ts`: Add new methods
- `App.tsx`: Add Kalender tab, add HolidaySplash, check active holiday on mount
- `translations.ts`: Add calendar/holiday strings in EN, ES, SV

### Remove
- Nothing removed

## Implementation Plan

1. Add `activeHoliday` state and `getActiveHoliday` / `setActiveHoliday` methods to `main.mo`
2. Update DID files (`backend.did`, `backend.did.d.ts`, `backend.did.js`) and `backend.ts` with new types and methods
3. Create `HolidaySplash.tsx` -- full-screen animated overlay with Canvas animations per holiday theme
4. Create `MyPagesCalendar.tsx` -- calendar tab with Höga Tider section and toggle switches
5. Update `App.tsx` to add Kalender tab (admin only) and HolidaySplash logic
6. Update `translations.ts` with calendar/holiday strings in all three languages
