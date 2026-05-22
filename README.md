# Thermostat Card HK

A fork of [`fineemb/lovelace-thermostat-card`](https://github.com/fineemb/lovelace-thermostat-card) with a draggable dual-handle range UX for dual-setpoint climate entities.

Custom element: `thermostat-card-hk`

## What's different from the upstream card

- **Two draggable handles on the arc** when the entity is in a dual-setpoint mode (`heat_cool`, `auto`, or `off` with low/high). Drag each handle independently along the ring to adjust the low and high setpoints.
- **Tap-to-bump-both** on the dial. Tap the right side of the arc to bump both setpoints up by one step; tap the left side to drop both down. The spread between the handles is preserved.
- **`auto` is treated as a dual-setpoint state.** Integrations like Sensi report range mode as `HVACMode.AUTO` rather than `HVACMode.HEAT_COOL`. The card now shows dual handles for either.
- **Dial color tracks `hvac_action`, not just `hvac_state`.** When the unit is actively heating the dial fills with a warm brown (`#804f18`); when actively cooling it fills with a deep teal (`#185a80`). Idle/off falls back to the original dark default.
- **Mode icon swapped to `mdi:thermostat-auto`** for auto/heat_cool modes, matching the Google Nest aesthetic.
- **The current temperature tick is longer and thicker** than the setpoint tick marks so the ambient reading is unambiguous at a glance.
- **The range setpoint markers and ambient marker render in a lighter grey** than the dim base ticks for visual separation.
- **Floating perimeter temperature labels are hidden** — the same numbers are already in the center of the dial.
- **`touch-action: none` on the dial** so dragging handles on a tablet doesn't scroll the dashboard.
- **The `max-width: 300px` cap was removed** so the dial fills the column width it lives in.

## Install

### HACS (custom repository)

1. HACS → Frontend → ⋮ → Custom repositories.
2. URL: `https://github.com/IsaacHarries/lovelace-thermostat-card`
3. Category: Dashboard.
4. Download.
5. Hard-refresh the dashboard.

### Manual

1. Copy the three files from `dist/` to `/config/www/thermostat-card-hk/`.
2. Settings → Dashboards → Resources → Add Resource:
   - URL: `/local/thermostat-card-hk/main.js`
   - Type: JavaScript Module
3. Restart Home Assistant. Hard-refresh the dashboard.

## Use

```yaml
type: custom:thermostat-card-hk
entity: climate.your_thermostat
no_card: true
highlight_tap: true
```

All upstream config options still work (`diameter`, `pending`, `idle_zone`, `step`, `chevron_size`, `num_ticks`, `tick_degrees`, `min_value`, `max_value`, `ambient_temperature`).

## Compatibility notes

- Drag handles only appear when the entity is in a dual-setpoint state and exposes `target_temp_low` / `target_temp_high` attributes. If your integration only exposes a single `temperature` setpoint, you get the upstream single-target UI.
- `hvac_action` is read from the entity attribute. Integrations that don't expose `hvac_action` will use the entity state-based dial color instead.

## License

MIT. Original work © 2015 Dal Hundal; subsequent modifications © 2018 Marius-Stefan Ciotlos & Silas Baronda, © 2020 fineemb, © 2026 Isaac Harries. See `LICENSE` for the full text.
