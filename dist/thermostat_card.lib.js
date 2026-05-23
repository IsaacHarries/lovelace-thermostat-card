export default class ThermostatUI {
  get container() {
    return this._container
  }
  set dual(val) {
    this._dual = val
  }
  get dual() {
    return this._dual;
  }
  get in_control() {
    return this._in_control;
  }
  get temperature() {
    return {
      low: this._low,
      high: this._high,
      target: this._target,
    }
  }
  get ambient() {
    return this._ambient;
  }
  set temperature(val) {
    this._ambient = val.ambient;
    this._low = val.low;
    this._high = val.high;
    this._target = val.target;
    if (this._low && this._high) this.dual = true;
  }
  constructor(config) {

    this._config = config;  // need certain options for updates
    this._ticks = [];       // need for dynamic tick updates
    this._controls = [];    // need for managing highlight and clicks
    this._dual = false;     // by default is single temperature
    this._container = document.createElement('div');
    this._main_icon = document.createElement('div');
    this._modes_dialog = document.createElement('div');
    config.title = config.title === null || config.title === undefined ? 'Title' : config.title

    this._ic = document.createElement('div');
    this._ic.className = "prop";
    this._ic.innerHTML = `<ha-icon-button id="more" icon="mdi:dots-vertical" class="c_icon" role="button" tabindex="0" aria-disabled="false"></ha-icon-button>`;
    this._container.appendChild(this._ic)

    // this._container.appendChild(this._buildTitle(config.title));
    this._ic.addEventListener('click', () => this.openProp());
    this._container.appendChild(this._load_icon('', ''));
    this.c_body = document.createElement('div');
    this.c_body.className = 'c_body';
    const root = this._buildCore(config.diameter);
    root.appendChild(this._buildDial(config.radius));
    root.appendChild(this._buildTicks(config.num_ticks));
    root.appendChild(this._buildRing(config.radius));
    root.appendChild(this._buildThermoIcon(config.radius));
    root.appendChild(this._buildDialSlot(1));
    root.appendChild(this._buildDialSlot(2));
    root.appendChild(this._buildDialSlot(3));

    root.appendChild(this._buildText(config.radius, 'title', 0));
    root.appendChild(this._buildText(config.radius, 'ambient', 0));
    root.appendChild(this._buildText(config.radius, 'target', 0));
    root.appendChild(this._buildText(config.radius, 'low', -config.radius / 2.5));
    root.appendChild(this._buildText(config.radius, 'high', config.radius / 3));
    root.appendChild(this._buildChevrons(config.radius, 0, 'low', 0.7, -config.radius / 2.5));
    root.appendChild(this._buildChevrons(config.radius, 0, 'high', 0.7, config.radius / 3));
    root.appendChild(this._buildChevrons(config.radius, 0, 'target', 1, 0));
    root.appendChild(this._buildChevrons(config.radius, 180, 'low', 0.7, -config.radius / 2.5));
    root.appendChild(this._buildChevrons(config.radius, 180, 'high', 0.7, config.radius / 3));
    root.appendChild(this._buildChevrons(config.radius, 180, 'target', 1, 0));


    this.c_body.appendChild(root);
    this._container.appendChild(this.c_body);
    this._root = root;
    this._buildControls(config.radius);
    this._buildDragHandles(config.radius);
    this._root.addEventListener('click', () => this._enableControls());
    this._container.appendChild(this._buildDialog());
    this._main_icon.addEventListener('click', () => this._openDialog());
    this._modes_dialog.addEventListener('click', () => this._hideDialog());
    this._updateText('title', config.title);
  }

  updateState(options, hass) {

    const config = this._config;
    const away = options.away || false;
    this.entity = options.entity;
    this.min_value = options.min_value;
    this.max_value = options.max_value;
    this.hvac_state = options.hvac_state;
    this.hvac_action = options.hvac_action;
    this.preset_mode = options.preset_mode;
    this.hvac_modes = options.hvac_modes;
    this._updateClass('action--heating', this.hvac_action === 'heating');
    this._updateClass('action--cooling', this.hvac_action === 'cooling');
    this.temperature = {
      low: options.target_temperature_low,
      high: options.target_temperature_high,
      target: options.target_temperature,
      ambient: options.ambient_temperature,
    }

    this._updateClass('has_dual', this.dual);
    let tick_label, from, to;
    const tick_indexes = [];
    const ambient_index = SvgUtil.restrictToRange(Math.round((this.ambient - this.min_value) / (this.max_value - this.min_value) * config.num_ticks), 0, config.num_ticks - 1);
    const target_index = SvgUtil.restrictToRange(Math.round((this._target - this.min_value) / (this.max_value - this.min_value) * config.num_ticks), 0, config.num_ticks - 1);
    const high_index = SvgUtil.restrictToRange(Math.round((this._high - this.min_value) / (this.max_value - this.min_value) * config.num_ticks), 0, config.num_ticks - 1);
    const low_index = SvgUtil.restrictToRange(Math.round((this._low - this.min_value) / (this.max_value - this.min_value) * config.num_ticks), 0, config.num_ticks - 1);

    // Only some states support dual temp adjustment, even if the hvac is generally dual capable
    // Sensi reports range mode as 'auto', not 'heat_cool' — include both.
    let dual_state = (this.hvac_state == "heat_cool") || (this.hvac_state == "auto") || (this.hvac_state == "off")

    if (this.dual && dual_state) {
      tick_label = [this._low, this._high, this.ambient].sort();
      this._updateTemperatureSlot(null, 0, `temperature_slot_1`);
      this._updateTemperatureSlot(null, 0, `temperature_slot_2`);
      this._updateTemperatureSlot(null, 0, `temperature_slot_3`);

      switch (this.hvac_state) {
        case 'auto':
        case 'heat_cool':
          this._load_icon(this.hvac_state, 'thermostat-auto');

          if (high_index < ambient_index) {
            from = high_index;
            to = ambient_index;
            this._updateTemperatureSlot(this.ambient, 8, `temperature_slot_3`);
            this._updateTemperatureSlot(this._high, -8, `temperature_slot_2`);
          } else if (low_index > ambient_index) {
            from = ambient_index;
            to = low_index;
            this._updateTemperatureSlot(this.ambient, -8, `temperature_slot_1`);
            this._updateTemperatureSlot(this._low, 8, `temperature_slot_2`);
          } else {
            this._updateTemperatureSlot(this._low, -8, `temperature_slot_1`);
            this._updateTemperatureSlot(this._high, 8, `temperature_slot_3`);
          }
          break;

        case 'off':
          this._load_icon(this.hvac_state, 'power');

          if (high_index < ambient_index) {
            from = high_index;
            to = ambient_index;
            this._updateTemperatureSlot(this.ambient, 8, `temperature_slot_3`);
            this._updateTemperatureSlot(this._high, -8, `temperature_slot_2`);
          } else if (low_index > ambient_index) {
            from = ambient_index;
            to = low_index;
            this._updateTemperatureSlot(this.ambient, -8, `temperature_slot_1`);
            this._updateTemperatureSlot(this._low, 8, `temperature_slot_2`);
          } else {
            this._updateTemperatureSlot(this._low, -8, `temperature_slot_1`);
            this._updateTemperatureSlot(this._high, 8, `temperature_slot_3`);
          }
          break;
        default:
      }
    } else {
      tick_label = [this._target, this.ambient].sort();
      this._updateTemperatureSlot(tick_label[0], -8, `temperature_slot_1`);
      this._updateTemperatureSlot(tick_label[1], 8, `temperature_slot_2`);

      switch (this.hvac_state) {
        case 'dry':
          this._load_icon(this.hvac_state, 'water-percent');
          break;
        case 'fan_only':
          this._load_icon(this.hvac_state, 'fan');
          break;
        case 'cool':
          this._load_icon(this.hvac_state, 'snowflake');

          if (target_index <= ambient_index) {
            from = target_index;
            to = ambient_index;
          }
          break;
        case 'heat':
          this._load_icon(this.hvac_state, 'fire');

          if (target_index >= ambient_index) {
            from = ambient_index;
            to = target_index;
          }
          break;
        case 'heat_cool':
          this._load_icon(this.hvac_state, 'sync');

          if (target_index >= ambient_index) {
            from = ambient_index;
            to = target_index;
          }
          break;
        case 'auto':
          this._load_icon(this.hvac_state, 'thermostat-auto');

          if (target_index >= ambient_index) {
            from = ambient_index;
            to = target_index;
          }
          break;
        case 'off':
          this._load_icon(this.hvac_state, 'power');
          break;
        default:
          this._load_icon('more', 'dots-horizontal');
      }
    }

    tick_label.forEach(item => tick_indexes.push(SvgUtil.restrictToRange(Math.round((item - this.min_value) / (this.max_value - this.min_value) * config.num_ticks), 0, config.num_ticks - 1)));
    this._updateTicks(from, to, tick_indexes, this.hvac_state, ambient_index);
    // this._updateColor(this.hvac_state, this.preset_mode);
    this._updateText('ambient', this.ambient);
    this._updateEdit(false);
    this._updateDialog(this.hvac_modes, hass);
    this._updateDragHandlePositions();
  }

  _temperatureControlClicked(index) {
    const config = this._config;
    let chevron;
    // Drag-in-progress should suppress the click — see _buildDragHandles.
    if (this._dragJustEnded) { this._dragJustEnded = false; return; }
    this._root.querySelectorAll('path.dial__chevron').forEach(el => SvgUtil.setClass(el, 'pressed', false));
    if (this.in_control) {
      if (this.dual) {
        // Indices: 0=top-left, 1=top-right, 2=bottom-right, 3=bottom-left.
        // Right side (1 or 2) bumps both setpoints UP by step.
        // Left side (0 or 3) drops both setpoints DOWN by step.
        const goingUp = (index === 1 || index === 2);
        const delta = goingUp ? config.step : -config.step;
        let newLow = this._low + delta;
        let newHigh = this._high + delta;
        // Clamp the pair so neither end leaves the entity's allowed range,
        // and preserve the spread between the handles.
        if (newLow < this.min_value) { newHigh += (this.min_value - newLow); newLow = this.min_value; }
        if (newHigh > this.max_value) { newLow -= (newHigh - this.max_value); newHigh = this.max_value; }
        this._low = newLow;
        this._high = newHigh;
        this._updateText('low', this._low);
        this._updateText('high', this._high);
        this._updateDragHandlePositions();
        this._refreshTicks();
        if (config.highlight_tap) {
          // Highlight the two quadrants on the side that was tapped.
          if (goingUp) {
            SvgUtil.setClass(this._controls[1], 'control-visible', true);
            SvgUtil.setClass(this._controls[2], 'control-visible', true);
          } else {
            SvgUtil.setClass(this._controls[0], 'control-visible', true);
            SvgUtil.setClass(this._controls[3], 'control-visible', true);
          }
        }
      }
      else {
        if (index < 2) {
          // clicked top
          chevron = this._root.querySelectorAll('path.dial__chevron--target')[1];
          this._target = this._target + config.step;
          if (this._target > this.max_value) this._target = this.max_value;
          if (config.highlight_tap) {
            SvgUtil.setClass(this._controls[0], 'control-visible', true);
            SvgUtil.setClass(this._controls[1], 'control-visible', true);
          }
        } else {
          // clicked bottom
          chevron = this._root.querySelectorAll('path.dial__chevron--target')[0];
          this._target = this._target - config.step;
          if (this._target < this.min_value) this._target = this.min_value;
          if (config.highlight_tap) {
            SvgUtil.setClass(this._controls[2], 'control-visible', true);
            SvgUtil.setClass(this._controls[3], 'control-visible', true);
          }
        }
        SvgUtil.setClass(chevron, 'pressed', true);
        setTimeout(() => SvgUtil.setClass(chevron, 'pressed', false), 200);
      }
      if (config.highlight_tap) {
        setTimeout(() => {
          SvgUtil.setClass(this._controls[0], 'control-visible', false);
          SvgUtil.setClass(this._controls[1], 'control-visible', false);
          SvgUtil.setClass(this._controls[2], 'control-visible', false);
          SvgUtil.setClass(this._controls[3], 'control-visible', false);
        }, 200);
      }
    } else {
      this._enableControls();
    }
  }

  _updateEdit(show_edit) {
    SvgUtil.setClass(this._root, 'dial--edit', show_edit);
  }

  _enableControls() {
    const config = this._config;
    this._in_control = true;
    this._updateClass('in_control', this.in_control);
    if (this._timeoutHandler) clearTimeout(this._timeoutHandler);
    this._updateEdit(true);
    //this._updateClass('has-thermo', true);
    this._updateText('target', this.temperature.target);
    this._updateText('low', this.temperature.low);
    this._updateText('high', this.temperature.high);
    this._timeoutHandler = setTimeout(() => {
      this._updateText('ambient', this.ambient);
      this._updateEdit(false);
      //this._updateClass('has-thermo', false);
      this._in_control = false;
      this._updateClass('in_control', this.in_control);
      config.control();
    }, config.pending * 1000);
  }

  _updateClass(class_name, flag) {
    SvgUtil.setClass(this._root, class_name, flag);
  }

  _updateText(id, value) {
    const lblTarget = this._root.querySelector(`#${id}`).querySelectorAll('tspan');
    const text = Math.floor(value);
    if (value) {
      lblTarget[0].textContent = text;
      if (value % 1 != 0) {
        lblTarget[1].textContent = Math.round(value % 1 * 10);
      } else {
        lblTarget[1].textContent = '';
      }
    }

    if (this.in_control && id == 'target' && this.dual) {
      lblTarget[0].textContent = '·';
    }

    if (id == 'title') {
      lblTarget[0].textContent = value;
      lblTarget[1].textContent = '';
    }
  }

  _updateTemperatureSlot(value, offset, slot) {

    const config = this._config;
    const lblSlot1 = this._root.querySelector(`#${slot}`)
    lblSlot1.textContent = value != null ? SvgUtil.superscript(value) : '';

    const peggedValue = SvgUtil.restrictToRange(value, this.min_value, this.max_value);
    const position = [config.radius, config.ticks_outer_radius - (config.ticks_outer_radius - config.ticks_inner_radius) / 2];
    let degs = config.tick_degrees * (peggedValue - this.min_value) / (this.max_value - this.min_value) - config.offset_degrees + offset;
    const pos = SvgUtil.rotatePoint(position, degs, [config.radius, config.radius]);
    SvgUtil.attributes(lblSlot1, {
      x: pos[0],
      y: pos[1]
    });
  }

  _updateColor(state, preset_mode) {

    if (Object.prototype.toString.call(preset_mode) === "[object String]") {

      if (state != 'off' && preset_mode.toLowerCase() == 'idle')
        state = 'idle'
      this._root.classList.forEach(c => {
        if (c.indexOf('dial--state--') != -1)
          this._root.classList.remove(c);
      });
      this._root.classList.add('dial--state--' + state);
    }
  }

  _updateTicks(from, to, large_ticks, hvac_state, ambient_index) {
    const config = this._config;

    const tickPoints = [
      [config.radius - 1, config.ticks_outer_radius],
      [config.radius + 1, config.ticks_outer_radius],
      [config.radius + 1, config.ticks_inner_radius],
      [config.radius - 1, config.ticks_inner_radius]
    ];
    const tickPointsLarge = [
      [config.radius - 1.5, config.ticks_outer_radius],
      [config.radius + 1.5, config.ticks_outer_radius],
      [config.radius + 1.5, config.ticks_inner_radius + 20],
      [config.radius - 1.5, config.ticks_inner_radius + 20]
    ];
    // Ambient tick is longer and slightly thicker so the current temperature
    // is visually distinct from the setpoint markers.
    const tickPointsAmbient = [
      [config.radius - 2, config.ticks_outer_radius - 5],
      [config.radius + 2, config.ticks_outer_radius - 5],
      [config.radius + 2, config.ticks_inner_radius + 35],
      [config.radius - 2, config.ticks_inner_radius + 35]
    ];

    // In auto / heat_cool mode the unit can be either heating or cooling at any
    // given moment. Tag the active ticks with the effective state so the mode
    // color (which is keyed off the state class on the tick path itself)
    // reflects what's actually happening, not just the mode setting.
    let effectiveState = hvac_state;
    if ((hvac_state === 'auto' || hvac_state === 'heat_cool') && this.hvac_action) {
      if (this.hvac_action === 'cooling') effectiveState = 'cool';
      else if (this.hvac_action === 'heating') effectiveState = 'heat';
    }
    this._ticks.forEach((tick, index) => {
      const isAmbient = (index === ambient_index);
      let isLarge = false;
      let isActive = (index >= from && index <= to) ? 'active ' + effectiveState : '';
      large_ticks.forEach(i => isLarge = isLarge || (index == i));
      if (isLarge) isActive += ' large';
      if (isAmbient) isActive += ' ambient';
      const theta = config.tick_degrees / config.num_ticks;
      const points = isAmbient ? tickPointsAmbient : (isLarge ? tickPointsLarge : tickPoints);
      SvgUtil.attributes(tick, {
        d: SvgUtil.pointsToPath(SvgUtil.rotatePoints(points, index * theta - config.offset_degrees, [config.radius, config.radius])),
        class: isActive
      });
    });
  }
  _updateDialog(modes, hass) {
    this._modes_dialog.innerHTML = "";
    for (var i = 0; i < modes.length; i++) {
      let icon;
      let mode = modes[i];
      switch (mode) {
        case 'dry':
          icon = 'water-percent';
          break;
        case 'fan_only':
          icon = 'fan';
          break;
        case 'cool':
          icon = 'snowflake';
          break;
        case 'heat':
          icon = 'fire';
          break;
        case 'auto':
          icon = 'thermostat-auto';
          break;
        case 'heat_cool':
          icon = 'thermostat-auto';
          break;
        case 'off':
          icon = 'power';
          break;
        default:
          icon = 'help';
      }
      let d = document.createElement('span');
      d.innerHTML = `<ha-icon class="modeicon ${mode}" icon="mdi:${icon}"></ha-icon>`
      d.addEventListener('click', (e) => this._setMode(e, mode, hass));
      //this._modes[i].push(d);
      this._modes_dialog.appendChild(d)
    }
  }
  _buildCore(diameter) {
    return SvgUtil.createSVGElement('svg', {
      width: '100%',
      height: '100%',
      viewBox: '0 0 ' + diameter + ' ' + diameter,
      class: 'dial'
    })
  }

  openProp() {
    this._config.propWin(this.entity.entity_id)
  }
  _openDialog() {
    this._modes_dialog.className = "dialog modes";
  }
  _hideDialog() {
    this._modes_dialog.className = "dialog modes hide";
  }
  _setMode(e, mode, hass) {
    console.log(mode);
    let config = this._config;
    if (this._timeoutHandlerMode) clearTimeout(this._timeoutHandlerMode);
    hass.callService('climate', 'set_hvac_mode', {
      entity_id: this._config.entity,
      hvac_mode: mode,
    });
    this._modes_dialog.className = "dialog modes " + mode + " pending";
    this._timeoutHandlerMode = setTimeout(() => {
      this._modes_dialog.className = "dialog modes hide";
    }, config.pending * 1000);
    e.stopPropagation();
  }
  _load_icon(state, ic_name) {

    let ic_dot = 'dot_r'
    if (ic_name == '') {
      ic_dot = 'dot_h'
    }

    // In auto / heat_cool mode the icon color should track what the unit is
    // actively doing, not just the mode setting — mirrors the tick coloring.
    let effectiveState = state;
    if ((state === 'auto' || state === 'heat_cool') && this.hvac_action) {
      if (this.hvac_action === 'cooling') effectiveState = 'cool';
      else if (this.hvac_action === 'heating') effectiveState = 'heat';
    }

    this._main_icon.innerHTML = `
      <div class="climate_info">
        <div class="mode_color"><span class="${ic_dot}"></span></div>
        <div class="modes"><ha-icon class="${effectiveState}" icon="mdi:${ic_name}"></ha-icon></div>
      </div>
    `;
    return this._main_icon;
  }
  _buildDialog() {
    this._modes_dialog.className = "dialog modes hide";
    return this._modes_dialog;
  }
  // build black dial
  _buildDial(radius) {
    return SvgUtil.createSVGElement('circle', {
      cx: radius,
      cy: radius,
      r: radius,
      class: 'dial__shape'
    })
  }
  // build circle around
  _buildRing(radius) {
    return SvgUtil.createSVGElement('path', {
      d: SvgUtil.donutPath(radius, radius, radius - 4, radius - 8),
      class: 'dial__editableIndicator',
    })
  }

  _buildTicks(num_ticks) {
    const tick_element = SvgUtil.createSVGElement('g', {
      class: 'dial__ticks'
    });
    for (let i = 0; i < num_ticks; i++) {
      const tick = SvgUtil.createSVGElement('path', {})
      this._ticks.push(tick);
      tick_element.appendChild(tick);
    }
    return tick_element;
  }

  _buildChevrons(radius, rotation, id, scale, offset) {
    const config = this._config;
    const translation = rotation > 0 ? -1 : 1;
    const width = config.chevron_size;
    const chevron_def = ["M", 0, 0, "L", width / 2, width * 0.3, "L", width, 0].map((x) => isNaN(x) ? x : x * scale).join(' ');
    const translate = [radius - width / 2 * scale * translation + offset, radius + 70 * scale * 1.1 * translation];
    const chevron = SvgUtil.createSVGElement('path', {
      class: `dial__chevron dial__chevron--${id}`,
      d: chevron_def,
      transform: `translate(${translate[0]},${translate[1]}) rotate(${rotation})`
    });
    return chevron;
  }

  _buildThermoIcon(radius) {
    const thermoScale = radius / 3 / 100;
    const thermoDef = 'M 37.999 38.261 V 7 c 0 -3.859 -3.141 -7 -7 -7 s -7 3.141 -7 7 v 31.261 c -3.545 2.547 -5.421 6.769 -4.919 11.151 c 0.629 5.482 5.066 9.903 10.551 10.512 c 0.447 0.05 0.895 0.074 1.339 0.074 c 2.956 0 5.824 -1.08 8.03 -3.055 c 2.542 -2.275 3.999 -5.535 3.999 -8.943 C 42.999 44.118 41.14 40.518 37.999 38.261 Z M 37.666 55.453 c -2.146 1.921 -4.929 2.8 -7.814 2.482 c -4.566 -0.506 -8.261 -4.187 -8.785 -8.752 c -0.436 -3.808 1.28 -7.471 4.479 -9.56 l 0.453 -0.296 V 38 h 1 c 0.553 0 1 -0.447 1 -1 s -0.447 -1 -1 -1 h -1 v -3 h 1 c 0.553 0 1 -0.447 1 -1 s -0.447 -1 -1 -1 h -1 v -3 h 1 c 0.553 0 1 -0.447 1 -1 s -0.447 -1 -1 -1 h -1 v -3 h 1 c 0.553 0 1 -0.447 1 -1 s -0.447 -1 -1 -1 h -1 v -3 h 1 c 0.553 0 1 -0.447 1 -1 s -0.447 -1 -1 -1 h -1 v -3 h 1 c 0.553 0 1 -0.447 1 -1 s -0.447 -1 -1 -1 h -1 V 8 h 1 c 0.553 0 1 -0.447 1 -1 s -0.447 -1 -1 -1 H 26.1 c 0.465 -2.279 2.484 -4 4.899 -4 c 2.757 0 5 2.243 5 5 v 1 h -1 c -0.553 0 -1 0.447 -1 1 s 0.447 1 1 1 h 1 v 3 h -1 c -0.553 0 -1 0.447 -1 1 s 0.447 1 1 1 h 1 v 3 h -1 c -0.553 0 -1 0.447 -1 1 s 0.447 1 1 1 h 1 v 3 h -1 c -0.553 0 -1 0.447 -1 1 s 0.447 1 1 1 h 1 v 3 h -1 c -0.553 0 -1 0.447 -1 1 s 0.447 1 1 1 h 1 v 3 h -1 c -0.553 0 -1 0.447 -1 1 s 0.447 1 1 1 h 1 v 4.329 l 0.453 0.296 c 2.848 1.857 4.547 4.988 4.547 8.375 C 40.999 50.841 39.784 53.557 37.666 55.453 Z'.split(' ').map((x) => isNaN(x) ? x : x * thermoScale).join(' ');
    const translate = [radius - (thermoScale * 100 * 0.3), radius * 1.65]
    return SvgUtil.createSVGElement('path', {
      class: 'dial__ico__thermo',
      d: thermoDef,
      transform: 'translate(' + translate[0] + ',' + translate[1] + ')'
    });
  }

  _buildDialSlot(index) {
    return SvgUtil.createSVGElement('text', {
      class: 'dial__lbl dial__lbl--ring',
      id: `temperature_slot_${index}`
    })
  }

  _buildText(radius, name, offset) {
    const target = SvgUtil.createSVGElement('text', {
      x: radius + offset,
      y: radius - (name == 'title' ? radius / 2 : 0),
      class: `dial__lbl dial__lbl--${name}`,
      id: name
    });
    const text = SvgUtil.createSVGElement('tspan', {
    });
    // hack
    if (name == 'target' || name == 'ambient') offset += 20;
    const superscript = SvgUtil.createSVGElement('tspan', {
      x: radius + radius / 3.1 + offset,
      y: radius - radius / 6,
      class: `dial__lbl--super--${name}`
    });
    target.appendChild(text);
    target.appendChild(superscript);
    return target;
  }

  _buildControls(radius) {
    let startAngle = 270;
    let loop = 4;
    for (let index = 0; index < loop; index++) {
      const angle = 360 / loop;
      const sector = SvgUtil.anglesToSectors(radius, startAngle, angle);
      const controlsDef = 'M' + sector.L + ',' + sector.L + ' L' + sector.L + ',0 A' + sector.L + ',' + sector.L + ' 1 0,1 ' + sector.X + ', ' + sector.Y + ' z';
      const path = SvgUtil.createSVGElement('path', {
        class: 'dial__temperatureControl',
        fill: 'blue',
        d: controlsDef,
        transform: 'rotate(' + sector.R + ', ' + sector.L + ', ' + sector.L + ')'
      });
      this._controls.push(path);
      path.addEventListener('click', () => this._temperatureControlClicked(index));
      this._root.appendChild(path);
      startAngle = startAngle + angle;
    }
  }

  // --- Draggable dual-handle range on the arc ---

  // Recompute the active tick range from current state and redraw the dial ticks.
  // Used during handle drag and tap-bump so the visual range tracks the live values.
  _refreshTicks() {
    const config = this._config;
    if (this.ambient == null) return;
    const toIndex = (v) => SvgUtil.restrictToRange(
      Math.round((v - this.min_value) / (this.max_value - this.min_value) * config.num_ticks),
      0, config.num_ticks - 1
    );
    const ambient_index = toIndex(this.ambient);
    let from, to;
    let tick_label;
    if (this.dual && (this.hvac_state == 'heat_cool' || this.hvac_state == 'auto' || this.hvac_state == 'off')) {
      const high_index = toIndex(this._high);
      const low_index = toIndex(this._low);
      if (high_index < ambient_index) { from = high_index; to = ambient_index; }
      else if (low_index > ambient_index) { from = ambient_index; to = low_index; }
      tick_label = [this._low, this._high, this.ambient].sort();
    } else {
      const target_index = toIndex(this._target);
      if (this.hvac_state == 'cool') {
        if (target_index <= ambient_index) { from = target_index; to = ambient_index; }
      } else if (this.hvac_state == 'heat' || this.hvac_state == 'heat_cool' || this.hvac_state == 'auto') {
        if (target_index >= ambient_index) { from = ambient_index; to = target_index; }
      }
      tick_label = [this._target, this.ambient].sort();
    }
    const tick_indexes = tick_label.map(toIndex);
    this._updateTicks(from, to, tick_indexes, this.hvac_state, ambient_index);
  }

  _buildDragHandles(radius) {
    const handleRadius = Math.round(radius / 8);
    this._dragHandles = {};
    ['low', 'high'].forEach((which) => {
      const handle = SvgUtil.createSVGElement('circle', {
        class: `dial__handle dial__handle--${which}`,
        cx: radius,
        cy: radius,
        r: handleRadius,
      });
      this._setupHandleDrag(handle, which);
      this._root.appendChild(handle);
      this._dragHandles[which] = handle;
    });
  }

  _temperatureToAngle(value) {
    const config = this._config;
    const pegged = SvgUtil.restrictToRange(value, this.min_value, this.max_value);
    return config.tick_degrees * (pegged - this.min_value) / (this.max_value - this.min_value) - config.offset_degrees;
  }

  _updateDragHandlePositions() {
    if (!this._dragHandles) return;
    const config = this._config;
    const ringMid = (config.ticks_outer_radius + config.ticks_inner_radius) / 2;
    const showDual = this.dual;
    ['low', 'high'].forEach((which) => {
      const handle = this._dragHandles[which];
      if (!handle) return;
      const value = which === 'low' ? this._low : this._high;
      if (!showDual || value == null) {
        SvgUtil.attributes(handle, { visibility: 'hidden' });
        return;
      }
      SvgUtil.attributes(handle, { visibility: 'visible' });
      const degs = this._temperatureToAngle(value);
      const pos = SvgUtil.rotatePoint([config.radius, ringMid], degs, [config.radius, config.radius]);
      SvgUtil.attributes(handle, { cx: pos[0], cy: pos[1] });
    });
  }

  _pointerToTemperature(evt) {
    const config = this._config;
    const svg = this._root;
    const rect = svg.getBoundingClientRect();
    // Map screen coords to SVG viewBox coords.
    const sx = (evt.clientX - rect.left) * (config.diameter / rect.width);
    const sy = (evt.clientY - rect.top) * (config.diameter / rect.height);
    // Angle of the pointer relative to the center, in the same convention used by _temperatureToAngle:
    // _temperatureToAngle returns degrees that, when passed to SvgUtil.rotatePoint([cx, ringMid], degs, [cx, cx]),
    // place the point on the arc. SvgUtil.rotatePoint uses standard math (CCW positive), and the base point [cx, ringMid]
    // sits directly above the center, so degs=0 → straight up.
    // Pointer angle: x positive to right, y positive downward (SVG). For "0 = straight up", use atan2(dx, -dy).
    const dx = sx - config.radius;
    const dy = sy - config.radius;
    let degs = Math.atan2(dx, -dy) * 180 / Math.PI; // -180..180, 0 = up
    // Wrap degs into the active arc range. The arc occupies (-offset_degrees) .. (tick_degrees - offset_degrees).
    const arcStart = -config.offset_degrees;
    const arcEnd = config.tick_degrees - config.offset_degrees;
    // Normalize degs to be near the arc range
    while (degs < arcStart - 180) degs += 360;
    while (degs > arcEnd + 180) degs -= 360;
    // Clamp into arc
    degs = SvgUtil.restrictToRange(degs, arcStart, arcEnd);
    // Convert back to temperature
    const frac = (degs - arcStart) / config.tick_degrees;
    const raw = this.min_value + frac * (this.max_value - this.min_value);
    // Snap to step
    const step = config.step || 0.5;
    return Math.round(raw / step) * step;
  }

  _setupHandleDrag(handle, which) {
    const config = this._config;
    let dragging = false;
    let moved = false;
    let startX = 0, startY = 0;
    const MOVE_THRESHOLD = 5; // px
    const onDown = (evt) => {
      if (!this.dual) return;
      this._enableControls();
      dragging = true;
      moved = false;
      startX = evt.clientX;
      startY = evt.clientY;
      handle.setPointerCapture && handle.setPointerCapture(evt.pointerId);
      handle.classList.add('dragging');
      evt.stopPropagation();
      evt.preventDefault();
    };
    const onMove = (evt) => {
      if (!dragging) return;
      const dx = evt.clientX - startX;
      const dy = evt.clientY - startY;
      if (!moved && (dx * dx + dy * dy) > MOVE_THRESHOLD * MOVE_THRESHOLD) moved = true;
      if (!moved) return;
      let newVal = this._pointerToTemperature(evt);
      // Enforce idle_zone between handles
      if (which === 'low') {
        if (newVal > this._high - config.idle_zone) newVal = this._high - config.idle_zone;
        if (newVal < this.min_value) newVal = this.min_value;
        this._low = newVal;
      } else {
        if (newVal < this._low + config.idle_zone) newVal = this._low + config.idle_zone;
        if (newVal > this.max_value) newVal = this.max_value;
        this._high = newVal;
      }
      this._updateText(which, newVal);
      this._updateDragHandlePositions();
      this._refreshTicks();
      // Keep the in_control state alive for the duration of the drag — without
      // this, the 3-second auto-commit timer set on pointerdown can expire
      // mid-drag and hide the low/high labels in the center of the dial.
      this._enableControls();
      evt.stopPropagation();
      evt.preventDefault();
    };
    const onUp = (evt) => {
      if (!dragging) return;
      dragging = false;
      handle.classList.remove('dragging');
      handle.releasePointerCapture && handle.releasePointerCapture(evt.pointerId);
      // Suppress the click that the underlying control sector would otherwise fire.
      if (moved) {
        this._dragJustEnded = true;
        // Commit via the existing pending/control flow.
        this._enableControls();
      }
      evt.stopPropagation();
    };
    handle.addEventListener('pointerdown', onDown);
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  }

}

class SvgUtil {
  static createSVGElement(tag, attributes) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    this.attributes(element, attributes)
    return element;
  }
  static attributes(element, attrs) {
    for (let i in attrs) {
      element.setAttribute(i, attrs[i]);
    }
  }
  // Rotate a cartesian point about given origin by X degrees
  static rotatePoint(point, angle, origin) {
    const radians = angle * Math.PI / 180;
    const x = point[0] - origin[0];
    const y = point[1] - origin[1];
    const x1 = x * Math.cos(radians) - y * Math.sin(radians) + origin[0];
    const y1 = x * Math.sin(radians) + y * Math.cos(radians) + origin[1];
    return [x1, y1];
  }
  // Rotate an array of cartesian points about a given origin by X degrees
  static rotatePoints(points, angle, origin) {
    return points.map((point) => this.rotatePoint(point, angle, origin));
  }
  // Given an array of points, return an SVG path string representing the shape they define
  static pointsToPath(points) {
    return points.map((point, iPoint) => (iPoint > 0 ? 'L' : 'M') + point[0] + ' ' + point[1]).join(' ') + 'Z';
  }
  static circleToPath(cx, cy, r) {
    return [
      "M", cx, ",", cy,
      "m", 0 - r, ",", 0,
      "a", r, ",", r, 0, 1, ",", 0, r * 2, ",", 0,
      "a", r, ",", r, 0, 1, ",", 0, 0 - r * 2, ",", 0,
      "z"
    ].join(' ').replace(/\s,\s/g, ",");
  }
  static donutPath(cx, cy, rOuter, rInner) {
    return this.circleToPath(cx, cy, rOuter) + " " + this.circleToPath(cx, cy, rInner);
  }

  static superscript(n) {

    if ((n - Math.floor(n)) !== 0)
      n = Number(n).toFixed(1);;
    const x = `${n}${n == 0 ? '' : ''}`;
    return x;
  }

  // Restrict a number to a min + max range
  static restrictToRange(val, min, max) {
    if (val < min) return min;
    if (val > max) return max;
    return val;
  }
  static setClass(el, className, state) {


    el.classList[state ? 'add' : 'remove'](className);
  }

  static anglesToSectors(radius, startAngle, angle) {
    let aRad = 0 // Angle in Rad
    let z = 0 // Size z
    let x = 0 // Side x
    let X = 0 // SVG X coordinate
    let Y = 0 // SVG Y coordinate
    const aCalc = (angle > 180) ? 360 - angle : angle;
    aRad = aCalc * Math.PI / 180;
    z = Math.sqrt(2 * radius * radius - (2 * radius * radius * Math.cos(aRad)));
    if (aCalc <= 90) {
      x = radius * Math.sin(aRad);
    }
    else {
      x = radius * Math.sin((180 - aCalc) * Math.PI / 180);
    }
    Y = Math.sqrt(z * z - x * x);
    if (angle <= 180) {
      X = radius + x;
    }
    else {
      X = radius - x;
    }
    return {
      L: radius,
      X: X,
      Y: Y,
      R: startAngle
    }
  }
}