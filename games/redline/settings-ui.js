(() => {

  /* =========================================================
     REDLINE SETTINGS UI V1
  ========================================================= */

  const STORAGE_KEY =
    "redline_settings_v1";


  const DEFAULTS = {

    master:
      1,

    music:
      1,

    lobbyMusic:
      0.52,

    raceMusic:
      0.40,

    resultsMusic:
      0.34,

    engine:
      1,

    sfx:
      1,

    musicEnabled:
      true,

    crossfade:
      1500

  };


  function clamp(
    value,
    min = 0,
    max = 1
  ) {

    return Math.max(
      min,
      Math.min(
        max,
        Number(value) || 0
      )
    );

  }


  function load() {

    try {

      const saved =
        JSON.parse(
          localStorage.getItem(
            STORAGE_KEY
          )
        );


      return {

        ...DEFAULTS,

        ...(saved || {})

      };

    }

    catch {

      return {
        ...DEFAULTS
      };

    }

  }


  let settings =
    load();


  function save() {

    try {

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          settings
        )
      );

    }

    catch {}

  }


  /* =========================================================
     APPLY SETTINGS
  ========================================================= */

  function apply() {

    const music =
      window.REDLINE_MUSIC;


    const audio =
      window.REDLINE_AUDIO;


    /*
      MASTER affects BOTH music + gameplay.
    */

    audio?.setMasterVolume?.(
      settings.master
    );


    /*
      Engine and gameplay SFX are independently
      adjustable underneath Master.
    */

    audio?.setEngineVolume?.(
      settings.engine
    );


    audio?.setSFXVolume?.(
      settings.sfx
    );


    /*
      Music uses:

      Master *
      Music *
      Mode Volume
    */

    music?.setEnabled?.(
      settings.musicEnabled
    );


    music?.setMasterVolume?.(
      clamp(
        settings.master *
        settings.music
      )
    );


    music?.setLobbyVolume?.(
      settings.lobbyMusic
    );


    music?.setRaceVolume?.(
      settings.raceMusic
    );


    music?.setResultsVolume?.(
      settings.resultsMusic
    );


    music?.setFadeDuration?.(
      settings.crossfade
    );

  }


  /* =========================================================
     STYLES
  ========================================================= */

  const style =
    document.createElement(
      "style"
    );


  style.textContent = `

    #redlineSettingsButton {

      position:
        fixed;

      right:
        18px;

      bottom:
        18px;

      z-index:
        12000;

      height:
        42px;

      padding:
        0 16px;

      border:
        1px solid
        rgba(255,255,255,.15);

      border-radius:
        11px;

      background:
        rgba(10,15,25,.88);

      backdrop-filter:
        blur(10px);

      color:
        #fff;

      font:
        800 12px/1
        Arial,sans-serif;

      letter-spacing:
        .07em;

      cursor:
        pointer;

      transition:
        transform .15s ease,
        background .15s ease;

    }


    #redlineSettingsButton:hover {

      transform:
        translateY(-2px);

      background:
        rgba(20,29,46,.96);

    }


    #redlineSettingsOverlay {

      position:
        fixed;

      inset:
        0;

      z-index:
        15000;

      display:
        flex;

      align-items:
        center;

      justify-content:
        center;

      padding:
        22px;

      background:
        rgba(2,5,11,.72);

      backdrop-filter:
        blur(10px);

      color:
        #fff;

      font-family:
        Arial,sans-serif;

    }


    #redlineSettingsOverlay.hidden {

      display:
        none;

    }


    #redlineSettingsPanel {

      width:
        min(
          620px,
          100%
        );

      max-height:
        min(
          760px,
          90vh
        );

      overflow-y:
        auto;

      padding:
        24px;

      border:
        1px solid
        rgba(255,255,255,.13);

      border-radius:
        18px;

      background:
        rgba(9,14,24,.97);

      box-shadow:
        0 30px 80px
        rgba(0,0,0,.48);

    }


    .redline-settings-header {

      display:
        flex;

      align-items:
        center;

      justify-content:
        space-between;

      gap:
        20px;

      margin-bottom:
        22px;

    }


    .redline-settings-header h2 {

      margin:
        0;

      font-size:
        28px;

      font-weight:
        900;

      letter-spacing:
        .02em;

    }


    .redline-settings-header p {

      margin:
        5px 0 0;

      color:
        rgba(255,255,255,.52);

      font-size:
        12px;

    }


    #redlineSettingsClose {

      width:
        40px;

      height:
        40px;

      flex:
        none;

      border:
        1px solid
        rgba(255,255,255,.12);

      border-radius:
        10px;

      background:
        rgba(255,255,255,.06);

      color:
        white;

      font-size:
        22px;

      cursor:
        pointer;

    }


    .redline-settings-section {

      margin-top:
        22px;

      padding-top:
        18px;

      border-top:
        1px solid
        rgba(255,255,255,.08);

    }


    .redline-settings-section-title {

      margin-bottom:
        14px;

      color:
        rgba(255,255,255,.58);

      font-size:
        11px;

      font-weight:
        900;

      letter-spacing:
        .12em;

      text-transform:
        uppercase;

    }


    .redline-setting-row {

      display:
        grid;

      grid-template-columns:
        minmax(150px,1fr)
        minmax(170px,1.3fr)
        48px;

      align-items:
        center;

      gap:
        14px;

      min-height:
        48px;

    }


    .redline-setting-name {

      font-size:
        13px;

      font-weight:
        800;

    }


    .redline-setting-name small {

      display:
        block;

      margin-top:
        3px;

      color:
        rgba(255,255,255,.42);

      font-size:
        10px;

      font-weight:
        500;

    }


    .redline-setting-row input[type="range"] {

      width:
        100%;

      accent-color:
        #fff;

      cursor:
        pointer;

    }


    .redline-setting-value {

      text-align:
        right;

      color:
        rgba(255,255,255,.70);

      font-size:
        12px;

      font-variant-numeric:
        tabular-nums;

    }


    .redline-settings-toggle-row {

      display:
        flex;

      align-items:
        center;

      justify-content:
        space-between;

      gap:
        16px;

      min-height:
        50px;

    }


    .redline-toggle {

      position:
        relative;

      width:
        52px;

      height:
        28px;

      flex:
        none;

    }


    .redline-toggle input {

      position:
        absolute;

      opacity:
        0;

      pointer-events:
        none;

    }


    .redline-toggle-track {

      position:
        absolute;

      inset:
        0;

      border-radius:
        999px;

      background:
        rgba(255,255,255,.14);

      cursor:
        pointer;

      transition:
        .18s ease;

    }


    .redline-toggle-track::after {

      content:
        "";

      position:
        absolute;

      top:
        4px;

      left:
        4px;

      width:
        20px;

      height:
        20px;

      border-radius:
        50%;

      background:
        #fff;

      transition:
        transform .18s ease;

    }


    .redline-toggle input:checked
    + .redline-toggle-track {

      background:
        rgba(255,255,255,.40);

    }


    .redline-toggle input:checked
    + .redline-toggle-track::after {

      transform:
        translateX(24px);

    }


    #redlineNowPlaying {

      display:
        flex;

      align-items:
        center;

      justify-content:
        space-between;

      gap:
        16px;

      margin:
        10px 0 2px;

      padding:
        13px 15px;

      border:
        1px solid
        rgba(255,255,255,.08);

      border-radius:
        11px;

      background:
        rgba(255,255,255,.04);

    }


    #redlineNowPlaying span {

      color:
        rgba(255,255,255,.45);

      font-size:
        10px;

      font-weight:
        900;

      letter-spacing:
        .10em;

    }


    #redlineNowPlaying strong {

      text-align:
        right;

      font-size:
        12px;

    }


    .redline-settings-footer {

      display:
        flex;

      align-items:
        center;

      justify-content:
        space-between;

      gap:
        16px;

      margin-top:
        24px;

      padding-top:
        18px;

      border-top:
        1px solid
        rgba(255,255,255,.08);

    }


    .redline-settings-saved {

      color:
        rgba(255,255,255,.45);

      font-size:
        11px;

    }


    #redlineResetSettings {

      min-height:
        38px;

      padding:
        0 14px;

      border:
        1px solid
        rgba(255,255,255,.12);

      border-radius:
        9px;

      background:
        rgba(255,255,255,.06);

      color:
        white;

      font-weight:
        800;

      cursor:
        pointer;

    }


    @media (
      max-width:
      600px
    ) {

      .redline-setting-row {

        grid-template-columns:
          1fr
          46px;

        gap:
          5px 12px;

        padding:
          7px 0;

      }


      .redline-setting-name {

        grid-column:
          1 / 3;

      }

    }

  `;


  document.head.appendChild(
    style
  );


  /* =========================================================
     BUTTON
  ========================================================= */

  const settingsButton =
    document.createElement(
      "button"
    );


  settingsButton.id =
    "redlineSettingsButton";


  settingsButton.type =
    "button";


  settingsButton.textContent =
    "⚙ SETTINGS";


  document.body.appendChild(
    settingsButton
  );


  /* =========================================================
     OVERLAY
  ========================================================= */

  const overlay =
    document.createElement(
      "div"
    );


  overlay.id =
    "redlineSettingsOverlay";


  overlay.className =
    "hidden";


  overlay.innerHTML = `

    <section id="redlineSettingsPanel">

      <div class="redline-settings-header">

        <div>

          <h2>
            SETTINGS
          </h2>

          <p>
            Changes save automatically.
          </p>

        </div>

        <button
          id="redlineSettingsClose"
          type="button"
          aria-label="Close settings"
        >
          ×
        </button>

      </div>


      <div id="redlineNowPlaying">

        <span>
          NOW PLAYING
        </span>

        <strong id="redlineNowPlayingName">
          —
        </strong>

      </div>


      <div class="redline-settings-section">

        <div class="redline-settings-section-title">
          General Audio
        </div>


        <div class="redline-setting-row">

          <div class="redline-setting-name">

            Master Volume

            <small>
              Everything in REDLINE
            </small>

          </div>

          <input
            id="settingMaster"
            type="range"
            min="0"
            max="100"
            step="1"
          >

          <span
            id="settingMasterValue"
            class="redline-setting-value"
          ></span>

        </div>


        <div class="redline-setting-row">

          <div class="redline-setting-name">

            Engine

            <small>
              Car engine volume
            </small>

          </div>

          <input
            id="settingEngine"
            type="range"
            min="0"
            max="100"
            step="1"
          >

          <span
            id="settingEngineValue"
            class="redline-setting-value"
          ></span>

        </div>


        <div class="redline-setting-row">

          <div class="redline-setting-name">

            Gameplay / SFX

            <small>
              Startup and future effects
            </small>

          </div>

          <input
            id="settingSFX"
            type="range"
            min="0"
            max="100"
            step="1"
          >

          <span
            id="settingSFXValue"
            class="redline-setting-value"
          ></span>

        </div>

      </div>


      <div class="redline-settings-section">

        <div class="redline-settings-section-title">
          Music
        </div>


        <div class="redline-settings-toggle-row">

          <div class="redline-setting-name">

            Music

            <small>
              Enable or disable soundtrack
            </small>

          </div>


          <label class="redline-toggle">

            <input
              id="settingMusicEnabled"
              type="checkbox"
            >

            <span class="redline-toggle-track"></span>

          </label>

        </div>


        <div class="redline-setting-row">

          <div class="redline-setting-name">

            Music Volume

            <small>
              Overall soundtrack level
            </small>

          </div>

          <input
            id="settingMusic"
            type="range"
            min="0"
            max="100"
            step="1"
          >

          <span
            id="settingMusicValue"
            class="redline-setting-value"
          ></span>

        </div>


        <div class="redline-setting-row">

          <div class="redline-setting-name">

            Lobby Music

            <small>
              Menu and lobby soundtrack
            </small>

          </div>

          <input
            id="settingLobbyMusic"
            type="range"
            min="0"
            max="100"
            step="1"
          >

          <span
            id="settingLobbyMusicValue"
            class="redline-setting-value"
          ></span>

        </div>


        <div class="redline-setting-row">

          <div class="redline-setting-name">

            Race Music

            <small>
              Map-specific soundtrack
            </small>

          </div>

          <input
            id="settingRaceMusic"
            type="range"
            min="0"
            max="100"
            step="1"
          >

          <span
            id="settingRaceMusicValue"
            class="redline-setting-value"
          ></span>

        </div>


        <div class="redline-setting-row">

          <div class="redline-setting-name">

            Results Music

            <small>
              Music after the race
            </small>

          </div>

          <input
            id="settingResultsMusic"
            type="range"
            min="0"
            max="100"
            step="1"
          >

          <span
            id="settingResultsMusicValue"
            class="redline-setting-value"
          ></span>

        </div>


        <div class="redline-setting-row">

          <div class="redline-setting-name">

            Crossfade

            <small>
              Transition between lobby and map music
            </small>

          </div>

          <input
            id="settingCrossfade"
            type="range"
            min="500"
            max="5000"
            step="100"
          >

          <span
            id="settingCrossfadeValue"
            class="redline-setting-value"
          ></span>

        </div>

      </div>


      <div class="redline-settings-footer">

        <span class="redline-settings-saved">
          Saved automatically on this device
        </span>

        <button
          id="redlineResetSettings"
          type="button"
        >
          RESET DEFAULTS
        </button>

      </div>

    </section>

  `;


  document.body.appendChild(
    overlay
  );


  /* =========================================================
     ELEMENTS
  ========================================================= */

  const closeButton =
    document.getElementById(
      "redlineSettingsClose"
    );


  const resetButton =
    document.getElementById(
      "redlineResetSettings"
    );


  const nowPlaying =
    document.getElementById(
      "redlineNowPlayingName"
    );


  const controls = {

    master:
      document.getElementById(
        "settingMaster"
      ),

    music:
      document.getElementById(
        "settingMusic"
      ),

    lobbyMusic:
      document.getElementById(
        "settingLobbyMusic"
      ),

    raceMusic:
      document.getElementById(
        "settingRaceMusic"
      ),

    resultsMusic:
      document.getElementById(
        "settingResultsMusic"
      ),

    engine:
      document.getElementById(
        "settingEngine"
      ),

    sfx:
      document.getElementById(
        "settingSFX"
      ),

    crossfade:
      document.getElementById(
        "settingCrossfade"
      ),

    musicEnabled:
      document.getElementById(
        "settingMusicEnabled"
      )

  };


  const values = {

    master:
      document.getElementById(
        "settingMasterValue"
      ),

    music:
      document.getElementById(
        "settingMusicValue"
      ),

    lobbyMusic:
      document.getElementById(
        "settingLobbyMusicValue"
      ),

    raceMusic:
      document.getElementById(
        "settingRaceMusicValue"
      ),

    resultsMusic:
      document.getElementById(
        "settingResultsMusicValue"
      ),

    engine:
      document.getElementById(
        "settingEngineValue"
      ),

    sfx:
      document.getElementById(
        "settingSFXValue"
      ),

    crossfade:
      document.getElementById(
        "settingCrossfadeValue"
      )

  };


  /* =========================================================
     UI SYNC
  ========================================================= */

  function percent(
    value
  ) {

    return Math.round(
      value *
      100
    );

  }


  function syncUI() {

    controls.master.value =
      percent(
        settings.master
      );


    controls.music.value =
      percent(
        settings.music
      );


    controls.lobbyMusic.value =
      percent(
        settings.lobbyMusic
      );


    controls.raceMusic.value =
      percent(
        settings.raceMusic
      );


    controls.resultsMusic.value =
      percent(
        settings.resultsMusic
      );


    controls.engine.value =
      percent(
        settings.engine
      );


    controls.sfx.value =
      percent(
        settings.sfx
      );


    controls.crossfade.value =
      settings.crossfade;


    controls.musicEnabled.checked =
      settings.musicEnabled;


    values.master.textContent =
      `${percent(settings.master)}%`;


    values.music.textContent =
      `${percent(settings.music)}%`;


    values.lobbyMusic.textContent =
      `${percent(settings.lobbyMusic)}%`;


    values.raceMusic.textContent =
      `${percent(settings.raceMusic)}%`;


    values.resultsMusic.textContent =
      `${percent(settings.resultsMusic)}%`;


    values.engine.textContent =
      `${percent(settings.engine)}%`;


    values.sfx.textContent =
      `${percent(settings.sfx)}%`;


    values.crossfade.textContent =
      `${(
        settings.crossfade /
        1000
      ).toFixed(1)}s`;

  }


  function updateNowPlaying() {

    const track =
      window.REDLINE_MUSIC
        ?.currentTrack;


    nowPlaying.textContent =
      track?.name
      ??
      (
        settings.musicEnabled
          ?
          "—"
          :
          "MUSIC OFF"
      );

  }


  /* =========================================================
     SLIDERS
  ========================================================= */

  function bindPercentSlider(
    key
  ) {

    controls[key]
      .addEventListener(

        "input",

        () => {

          settings[key] =
            clamp(
              Number(
                controls[key]
                  .value
              )
              /
              100
            );


          save();

          syncUI();

          apply();

        }

      );

  }


  for (
    const key
    of [
      "master",
      "music",
      "lobbyMusic",
      "raceMusic",
      "resultsMusic",
      "engine",
      "sfx"
    ]
  ) {

    bindPercentSlider(
      key
    );

  }


  controls.crossfade
    .addEventListener(

      "input",

      () => {

        settings.crossfade =
          Number(
            controls
              .crossfade
              .value
          );


        save();

        syncUI();

        apply();

      }

    );


  controls.musicEnabled
    .addEventListener(

      "change",

      () => {

        settings.musicEnabled =
          controls
            .musicEnabled
            .checked;


        save();

        syncUI();

        apply();

      }

    );


  /* =========================================================
     OPEN / CLOSE
  ========================================================= */

  function openSettings() {

    overlay.classList.remove(
      "hidden"
    );


    syncUI();

    updateNowPlaying();

  }


  function closeSettings() {

    overlay.classList.add(
      "hidden"
    );

  }


  settingsButton.addEventListener(

    "click",

    openSettings

  );


  closeButton.addEventListener(

    "click",

    closeSettings

  );


  overlay.addEventListener(

    "pointerdown",

    event => {

      if (
        event.target ===
        overlay
      ) {

        closeSettings();

      }

    }

  );


  window.addEventListener(

    "keydown",

    event => {

      if (
        event.key ===
        "Escape"
        &&
        !overlay.classList.contains(
          "hidden"
        )
      ) {

        closeSettings();

      }

    }

  );


  /* =========================================================
     RESET
  ========================================================= */

  resetButton.addEventListener(

    "click",

    () => {

      settings = {
        ...DEFAULTS
      };


      save();

      syncUI();

      apply();

      updateNowPlaying();

    }

  );


  /* =========================================================
     NOW PLAYING REFRESH
  ========================================================= */

  setInterval(

    () => {

      if (
        !overlay.classList.contains(
          "hidden"
        )
      ) {

        updateNowPlaying();

      }

    },

    500

  );


  /* =========================================================
     INITIALIZE
  ========================================================= */

  syncUI();

  apply();

})();
