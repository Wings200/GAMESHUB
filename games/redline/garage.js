(() => {
  const screen = document.getElementById("carSelectScreen");
  const lockInBtn = document.getElementById("lockInBtn");
  const lockStatus = document.getElementById("lockStatus");
  const carSelectStatus = document.getElementById("carSelectStatus");

  // Avoid duplicate legacy appearance panels if cached clients load
  // this compatibility script a second time.
  if(document.getElementById("redlineGarageV1"))return;

  if (!screen || !lockInBtn) {
    console.warn("REDLINE Garage: car select screen not found.");
    return;
  }

  const STORAGE_KEY = "redline_garage_build_v1";
  const MAX_PER_STAT = 8;
  const TOTAL_POINTS = 16;

  const BODY_STYLES = {
    coupe: "COUPE",
    supercar: "SUPERCAR",
    muscle: "MUSCLE",
    track: "TRACK"
  };

  const DEFAULT_BUILD = {
    stats: {
      speed: 4,
      acceleration: 4,
      grip: 4,
      turning: 4
    },

    appearance: {
      body: "coupe",
      color: "#e9edf2",
      accent: "#315fbd"
    }
  };

  function clampInt(value, min, max) {
    return Math.max(
      min,
      Math.min(
        max,
        Math.round(Number(value) || 0)
      )
    );
  }

  function cleanHex(value, fallback) {
    return /^#[0-9a-f]{6}$/i.test(
      String(value || "")
    )
      ? String(value)
      : fallback;
  }

  function totalPoints(build = state) {
    return Object.values(
      build.stats
    ).reduce(
      (sum, value) => sum + value,
      0
    );
  }

  function sanitizeBuild(raw) {
    const stats =
      raw?.stats || {};

    const appearance =
      raw?.appearance || {};

    const result = {
      stats: {
        speed:
          clampInt(
            stats.speed ?? 4,
            0,
            MAX_PER_STAT
          ),

        acceleration:
          clampInt(
            stats.acceleration ?? 4,
            0,
            MAX_PER_STAT
          ),

        grip:
          clampInt(
            stats.grip ?? 4,
            0,
            MAX_PER_STAT
          ),

        turning:
          clampInt(
            stats.turning ?? 4,
            0,
            MAX_PER_STAT
          )
      },

      appearance: {
        body:
          BODY_STYLES[
            appearance.body
          ]
            ? appearance.body
            : "coupe",

        color:
          cleanHex(
            appearance.color,
            DEFAULT_BUILD.appearance.color
          ),

        accent:
          cleanHex(
            appearance.accent,
            DEFAULT_BUILD.appearance.accent
          )
      }
    };

    /*
      Make sure old/corrupt saves
      can never start over 16 points.
    */

    while (
      totalPoints(result) >
      TOTAL_POINTS
    ) {
      const keys = [
        "speed",
        "acceleration",
        "grip",
        "turning"
      ];

      const largest =
        keys.sort(
          (a, b) =>
            result.stats[b] -
            result.stats[a]
        )[0];

      if (
        result.stats[largest] <= 0
      ) {
        break;
      }

      result.stats[largest]--;
    }

    return result;
  }

  function loadBuild() {
    try {
      const saved =
        JSON.parse(
          localStorage.getItem(
            STORAGE_KEY
          )
        );

      return sanitizeBuild(
        saved ||
        DEFAULT_BUILD
      );
    }

    catch {
      return sanitizeBuild(
        DEFAULT_BUILD
      );
    }
  }

  let state =
    loadBuild();

  // Performance points are retired. The separate cash shop and Worker
  // now determine real driving stats; legacy values cannot block Ready.
  function buildIsValid() { return true; }

  function saveBuild() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
      );
    }

    catch {}
  }

  function emitChange() {
    window.dispatchEvent(
      new CustomEvent(
        "redline:garage-change",
        {
          detail:
            JSON.parse(
              JSON.stringify(state)
            )
        }
      )
    );
  }


  /* =========================================================
     STYLE
  ========================================================= */

  const style =
    document.createElement(
      "style"
    );

  style.textContent = `

    #carSelectScreen.redline-garage-active {
      overflow-y: auto;
    }


    #carSelectScreen.redline-garage-active > .garage-header,
    #carSelectScreen.redline-garage-active > #carSelector,
    #carSelectScreen.redline-garage-active > .car-stats {
      display: none !important;
    }


    .rg-wallet {
      display:flex;align-items:center;justify-content:space-between;
      gap:14px;margin:13px 0 16px;padding:12px 14px;
      border:1px solid rgba(95,230,175,.27);
      border-radius:12px;
      background:linear-gradient(115deg,rgba(17,52,45,.8),rgba(7,17,28,.94));
    }
    .rg-wallet-title {font-size:10px;font-weight:900;letter-spacing:.12em;color:#9bdac1;}
    .rg-wallet-value {font-size:27px;font-weight:950;color:#d5ffe5;}
    .rg-wallet-desc {font-size:10px;color:rgba(210,238,225,.66);max-width:210px;text-align:right;}
    .rg-wallet-hint {font-size:10px;line-height:1.55;color:rgba(225,237,249,.68);margin:-5px 0 12px;}
    #redlineGarageV1 {
      width: min(1050px, 100%);
      margin: 18px auto 20px;

      display: grid;

      grid-template-columns:
        minmax(300px, .9fr)
        minmax(340px, 1.1fr);

      gap: 18px;

      color: #fff;

      font-family:
        Arial,
        sans-serif;
    }


    .rg-panel {
      border:
        1px solid
        rgba(255,255,255,.10);

      border-radius:
        16px;

      background:
        rgba(8,13,22,.78);

      padding:
        18px;
    }


    .rg-kicker {
      color:
        rgba(255,255,255,.45);

      font-size:
        10px;

      font-weight:
        900;

      letter-spacing:
        .14em;
    }


    .rg-title {
      margin:
        5px 0 0;

      font-size:
        22px;

      font-weight:
        900;
    }


    /* =========================
       CAR PREVIEW
    ========================= */

    .rg-preview {
      position:
        relative;

      height:
        220px;

      margin-top:
        16px;

      overflow:
        hidden;

      border-radius:
        13px;

      background:
        radial-gradient(
          circle at 50% 35%,
          rgba(70,112,255,.18),
          transparent 42%
        ),
        linear-gradient(
          180deg,
          rgba(255,255,255,.025),
          rgba(255,255,255,.01)
        );

      border:
        1px solid
        rgba(255,255,255,.07);
    }


    .rg-preview::after {
      content: "";

      position:
        absolute;

      left:
        10%;

      right:
        10%;

      bottom:
        38px;

      height:
        2px;

      background:
        linear-gradient(
          90deg,
          transparent,
          rgba(255,255,255,.13),
          transparent
        );
    }


    .rg-car {
      --rg-body:
        #e9edf2;

      --rg-accent:
        #315fbd;

      position:
        absolute;

      left:
        50%;

      bottom:
        43px;

      width:
        280px;

      height:
        105px;

      transform:
        translateX(-50%);

      transition:
        transform .2s ease;
    }


    .rg-car-body {
      position:
        absolute;

      left:
        16px;

      right:
        16px;

      bottom:
        23px;

      height:
        48px;

      border-radius:
        24px 38px 14px 14px;

      background:
        var(--rg-body);

      box-shadow:
        inset 0 -8px 0
        rgba(0,0,0,.14),

        0 18px 30px
        rgba(0,0,0,.28);
    }


    .rg-car-cabin {
      position:
        absolute;

      left:
        77px;

      bottom:
        62px;

      width:
        125px;

      height:
        38px;

      border-radius:
        48px 55px 5px 5px;

      background:
        linear-gradient(
          120deg,
          #1b2532,
          #0a0f17 70%
        );

      border:
        4px solid
        var(--rg-body);

      border-bottom:
        0;
    }


    .rg-car-accent {
      position:
        absolute;

      left:
        38px;

      right:
        38px;

      bottom:
        34px;

      height:
        8px;

      border-radius:
        99px;

      background:
        var(--rg-accent);
    }


    .rg-wheel {
      position:
        absolute;

      bottom:
        6px;

      width:
        42px;

      height:
        42px;

      border-radius:
        50%;

      background:
        #090c11;

      border:
        7px solid
        #171c24;

      box-shadow:
        inset 0 0 0 4px
        #59616d;
    }


    .rg-wheel.left {
      left:
        48px;
    }


    .rg-wheel.right {
      right:
        48px;
    }


    /* SUPERCAR */

    .rg-car[data-body="supercar"]
    .rg-car-body {
      left:
        9px;

      right:
        9px;

      height:
        42px;

      border-radius:
        34px 55px 10px 10px;
    }


    .rg-car[data-body="supercar"]
    .rg-car-cabin {
      left:
        92px;

      width:
        112px;

      height:
        31px;

      bottom:
        58px;
    }


    /* MUSCLE */

    .rg-car[data-body="muscle"]
    .rg-car-body {
      left:
        13px;

      right:
        13px;

      height:
        51px;

      border-radius:
        12px 20px 10px 10px;
    }


    .rg-car[data-body="muscle"]
    .rg-car-cabin {
      left:
        84px;

      width:
        114px;

      height:
        35px;

      border-radius:
        13px 18px 4px 4px;
    }


    /* TRACK */

    .rg-car[data-body="track"]
    .rg-car-body {
      left:
        10px;

      right:
        10px;

      height:
        44px;

      border-radius:
        26px 42px 9px 9px;
    }


    .rg-car[data-body="track"]::after {
      content: "";

      position:
        absolute;

      right:
        23px;

      bottom:
        74px;

      width:
        66px;

      height:
        8px;

      border-radius:
        4px;

      background:
        var(--rg-accent);
    }


    /* =========================
       BODY SELECT
    ========================= */

    .rg-body-options {
      display:
        grid;

      grid-template-columns:
        repeat(4,1fr);

      gap:
        8px;

      margin-top:
        14px;
    }


    .rg-body-btn {
      min-height:
        42px;

      border:
        1px solid
        rgba(255,255,255,.10);

      border-radius:
        9px;

      background:
        rgba(255,255,255,.04);

      color:
        #fff;

      font-size:
        10px;

      font-weight:
        900;

      cursor:
        pointer;
    }


    .rg-body-btn.selected {
      background:
        rgba(255,255,255,.16);

      border-color:
        rgba(255,255,255,.35);
    }


    /* =========================
       COLORS
    ========================= */

    .rg-color-grid {
      display:
        grid;

      grid-template-columns:
        1fr 1fr;

      gap:
        10px;

      margin-top:
        14px;
    }


    .rg-color-field {
      display:
        flex;

      align-items:
        center;

      justify-content:
        space-between;

      gap:
        10px;

      padding:
        10px 11px;

      border-radius:
        10px;

      background:
        rgba(255,255,255,.04);

      border:
        1px solid
        rgba(255,255,255,.07);
    }


    .rg-color-field span {
      font-size:
        11px;

      font-weight:
        800;

      color:
        rgba(255,255,255,.68);
    }


    .rg-color-field input[type="color"] {
      width:
        42px;

      height:
        30px;

      padding:
        0;

      border:
        0;

      border-radius:
        7px;

      background:
        transparent;

      cursor:
        pointer;
    }


    /* =========================
       POINTS
    ========================= */

    .rg-points-header {
      display:
        flex;

      align-items:
        flex-end;

      justify-content:
        space-between;

      gap:
        20px;

      margin-bottom:
        14px;
    }


    .rg-points-count {
      text-align:
        right;
    }


    .rg-points-count strong {
      display:
        block;

      font-size:
        28px;

      line-height:
        1;
    }


    .rg-points-count span {
      display:
        block;

      margin-top:
        4px;

      color:
        rgba(255,255,255,.48);

      font-size:
        10px;

      font-weight:
        800;
    }


    .rg-stat-list {
      display:
        grid;

      gap:
        11px;
    }


    .rg-stat-row {
      display:
        grid;

      grid-template-columns:
        108px
        minmax(160px,1fr)
        92px;

      align-items:
        center;

      gap:
        12px;

      min-height:
        54px;

      padding:
        8px 10px;

      border-radius:
        11px;

      background:
        rgba(255,255,255,.035);

      border:
        1px solid
        rgba(255,255,255,.06);
    }


    .rg-stat-name {
      font-size:
        12px;

      font-weight:
        900;

      letter-spacing:
        .04em;
    }


    .rg-segments {
      display:
        grid;

      grid-template-columns:
        repeat(8,1fr);

      gap:
        4px;
    }


    .rg-segment {
      height:
        10px;

      border-radius:
        3px;

      background:
        rgba(255,255,255,.08);
    }


    .rg-segment.on {
      background:
        #fff;

      box-shadow:
        0 0 10px
        rgba(255,255,255,.18);
    }


    .rg-stat-controls {
      display:
        grid;

      grid-template-columns:
        28px 28px 28px;

      gap:
        4px;

      align-items:
        center;

      justify-content:
        end;
    }


    .rg-stat-controls button {
      width:
        28px;

      height:
        28px;

      border:
        1px solid
        rgba(255,255,255,.12);

      border-radius:
        7px;

      background:
        rgba(255,255,255,.06);

      color:
        white;

      font-size:
        17px;

      font-weight:
        900;

      cursor:
        pointer;
    }


    .rg-stat-controls button:disabled,
    .rg-body-btn:disabled,
    .rg-color-field input:disabled {
      opacity:
        .35;

      cursor:
        default;
    }


    .rg-stat-value {
      text-align:
        center;

      font-size:
        12px;

      font-weight:
        900;
    }


    .rg-build-message {
      margin-top:
        14px;

      min-height:
        42px;

      display:
        flex;

      align-items:
        center;

      justify-content:
        space-between;

      gap:
        12px;

      padding:
        10px 12px;

      border-radius:
        10px;

      background:
        rgba(255,255,255,.04);

      border:
        1px solid
        rgba(255,255,255,.07);

      font-size:
        11px;

      font-weight:
        800;

      color:
        rgba(255,255,255,.65);
    }


    .rg-build-message.valid {
      border-color:
        rgba(110,255,170,.22);

      color:
        #aaffc6;
    }


    .rg-reset-btn {
      border:
        0;

      background:
        transparent;

      color:
        rgba(255,255,255,.58);

      font-size:
        10px;

      font-weight:
        900;

      cursor:
        pointer;

      text-decoration:
        underline;

      text-underline-offset:
        3px;
    }


    @media (
      max-width:
      840px
    ) {

      #redlineGarageV1 {
        grid-template-columns:
          1fr;
      }

    }


    @media (
      max-width:
      560px
    ) {

      .rg-body-options {
        grid-template-columns:
          repeat(2,1fr);
      }


      .rg-color-grid {
        grid-template-columns:
          1fr;
      }


      .rg-stat-row {
        grid-template-columns:
          86px 1fr;
      }


      .rg-stat-controls {
        grid-column:
          1 / 3;

        justify-content:
          start;
      }

    }

  `;

  document.head.appendChild(
    style
  );


  /* =========================================================
     REPLACE OLD GARAGE VISUALLY
  ========================================================= */

  screen.classList.add(
    "redline-garage-active"
  );


  const screenTitle =
    screen.querySelector(
      ".screen-topbar > span:nth-child(2)"
    );


  if (
    screenTitle
  ) {
    screenTitle.textContent =
      "BUILD YOUR CAR";
  }


  const garage =
    document.createElement(
      "div"
    );


  garage.id =
    "redlineGarageV1";


  garage.innerHTML = `

    <section class="rg-panel">

      <div class="rg-kicker">
        APPEARANCE
      </div>

      <h2 class="rg-title">
        CUSTOMIZE
      </h2>

      <div class="rg-wallet" aria-live="polite">
        <div>
          <div class="rg-wallet-title">REDLINE CASH</div>
          <div class="rg-wallet-value" id="rgCashBalance">—</div>
        </div>
        <div class="rg-wallet-desc" id="rgCashStatus">
          Loading your account balance…
        </div>
      </div>
      <p class="rg-wallet-hint">
        Earn $5 solo. In multiplayer, 1st wins $10 per racer
        (up to $80), 2nd gets half, 3rd gets one-third
        rounded, and 4th–8th get $5.
      </p>

      <div class="rg-preview">

        <div
          id="rgPreviewCar"
          class="rg-car"
          data-body="coupe"
        >

          <div class="rg-car-body"></div>

          <div class="rg-car-cabin"></div>

          <div class="rg-car-accent"></div>

          <div class="rg-wheel left"></div>

          <div class="rg-wheel right"></div>

        </div>

      </div>


      <div
        id="rgBodyOptions"
        class="rg-body-options"
      >

        ${Object.entries(
          BODY_STYLES
        )
          .map(
            ([id,label]) => `

              <button
                class="rg-body-btn"
                type="button"
                data-body="${id}"
              >
                ${label}
              </button>

            `
          )
          .join("")}

      </div>


      <div class="rg-color-grid">

        <label class="rg-color-field">

          <span>
            BODY COLOR
          </span>

          <input
            id="rgBodyColor"
            type="color"
          >

        </label>


        <label class="rg-color-field">

          <span>
            ACCENT COLOR
          </span>

          <input
            id="rgAccentColor"
            type="color"
          >

        </label>

      </div>

    </section>


    <section class="rg-panel">

      <div class="rg-points-header">

        <div>

          <div class="rg-kicker">
            PERFORMANCE
          </div>

          <h2 class="rg-title">
            16-POINT BUILD
          </h2>

        </div>


        <div class="rg-points-count">

          <strong id="rgPointCount">
            16 / 16
          </strong>

          <span id="rgPointSubtext">
            0 POINTS LEFT
          </span>

        </div>

      </div>


      <div
        id="rgStatList"
        class="rg-stat-list"
      >

        ${[
          "speed",
          "acceleration",
          "grip",
          "turning"
        ]
          .map(
            stat => `

              <div
                class="rg-stat-row"
                data-stat="${stat}"
              >

                <div class="rg-stat-name">
                  ${stat.toUpperCase()}
                </div>


                <div class="rg-segments">

                  ${Array
                    .from(
                      {
                        length:
                          8
                      },

                      (_,i) => `

                        <span
                          class="rg-segment"
                          data-segment="${i + 1}"
                        ></span>

                      `
                    )
                    .join("")}

                </div>


                <div class="rg-stat-controls">

                  <button
                    type="button"
                    data-action="minus"
                  >
                    −
                  </button>

                  <span class="rg-stat-value">
                    4
                  </span>

                  <button
                    type="button"
                    data-action="plus"
                  >
                    +
                  </button>

                </div>

              </div>

            `
          )
          .join("")}

      </div>


      <div
        id="rgBuildMessage"
        class="rg-build-message"
      >

        <span>
          BUILD READY
        </span>

        <button
          id="rgResetBuild"
          class="rg-reset-btn"
          type="button"
        >
          RESET 4 / 4 / 4 / 4
        </button>

      </div>

    </section>

  `;


  const footer =
    screen.querySelector(
      ".car-select-footer"
    );


  if (
    footer
  ) {

    screen.insertBefore(
      garage,
      footer
    );

  }

  else {

    screen.appendChild(
      garage
    );

  }


  /* =========================================================
     ELEMENTS
  ========================================================= */

  const preview =
    document.getElementById(
      "rgPreviewCar"
    );


  const bodyColor =
    document.getElementById(
      "rgBodyColor"
    );


  const accentColor =
    document.getElementById(
      "rgAccentColor"
    );


  const cashBalanceEl=document.getElementById("rgCashBalance");
  const cashStatusEl=document.getElementById("rgCashStatus");
  let cashBalance=null;
  let lastCashRefresh=0;
  let cashRequest=null;
  async function refreshCashBalance(force=false){
    const account=window.REDLINE_MP?.getAccountStats;
    if(!account) {
      cashStatusEl.textContent="Sign in to load cash.";
      return;
    }
    if(cashRequest)return cashRequest;
    if(!force && Date.now()-lastCashRefresh<10000)return;
    lastCashRefresh=Date.now();
    cashStatusEl.textContent="Checking server…";
    cashRequest=(async()=>{
      try{
        const stats=await account.call(window.REDLINE_MP);
        const balance=Number(stats?.cashBalance);
        if(!Number.isSafeInteger(balance)||balance<0)
          throw new Error("Invalid cash balance");
        cashBalance=balance;
        cashBalanceEl.textContent="$"+cashBalance.toLocaleString();
        const last=Number(stats?.lastCashAward)||0;
        cashStatusEl.textContent=last>0 ?
          "Last race +$"+last+" · saved to your account" :
          "Saved to your REDLINE account";
      }catch(e){
        cashStatusEl.textContent="Balance unavailable — try again later.";
      }finally{
        cashRequest=null;
      }
    })();
    return cashRequest;
  }

  const pointCount =
    document.getElementById(
      "rgPointCount"
    );


  const pointSubtext =
    document.getElementById(
      "rgPointSubtext"
    );


  const buildMessage =
    document.getElementById(
      "rgBuildMessage"
    );


  const resetButton =
    document.getElementById(
      "rgResetBuild"
    );


  const statRows = [
    ...garage.querySelectorAll(
      ".rg-stat-row"
    )
  ];


  const bodyButtons = [
    ...garage.querySelectorAll(
      ".rg-body-btn"
    )
  ];


  /* =========================================================
     STATE HELPERS
  ========================================================= */

  function playerReady() {

    return Boolean(
      window.REDLINE_MP
        ?.myPlayer
        ?.ready
    );

  }


  function legacyCarSelected() {

    return Boolean(
      window.REDLINE_MP
        ?.myPlayer
        ?.car
    );

  }


  /* =========================================================
     RENDER
  ========================================================= */

  function render() {

    const total =
      totalPoints();


    const remaining =
      TOTAL_POINTS -
      total;


    const ready =
      playerReady();


    const valid =
      buildIsValid();


    pointCount.textContent =
      `${total} / ${TOTAL_POINTS}`;


    pointSubtext.textContent =
      remaining === 0

        ? "0 POINTS LEFT"

        : `${remaining} POINT${
            Math.abs(
              remaining
            ) === 1
              ? ""
              : "S"
          } LEFT`;


    /* =========================
       STATS
    ========================= */

    statRows.forEach(
      row => {

        const stat =
          row.dataset.stat;


        const value =
          state.stats[
            stat
          ];


        row
          .querySelector(
            ".rg-stat-value"
          )
          .textContent =
          String(value);


        row
          .querySelectorAll(
            ".rg-segment"
          )
          .forEach(
            segment => {

              segment.classList.toggle(

                "on",

                Number(
                  segment.dataset.segment
                )
                <=
                value

              );

            }
          );


        const minus =
          row.querySelector(
            '[data-action="minus"]'
          );


        const plus =
          row.querySelector(
            '[data-action="plus"]'
          );


        minus.disabled =
          ready ||
          value <= 0;


        plus.disabled =
          ready ||
          value >=
          MAX_PER_STAT ||
          total >=
          TOTAL_POINTS;

      }
    );


    /* =========================
       PREVIEW
    ========================= */

    preview.dataset.body =
      state.appearance.body;


    preview.style.setProperty(
      "--rg-body",
      state.appearance.color
    );


    preview.style.setProperty(
      "--rg-accent",
      state.appearance.accent
    );


    bodyColor.value =
      state.appearance.color;


    accentColor.value =
      state.appearance.accent;


    bodyColor.disabled =
      ready;


    accentColor.disabled =
      ready;


    bodyButtons.forEach(
      button => {

        button.classList.toggle(

          "selected",

          button.dataset.body ===
          state.appearance.body

        );


        button.disabled =
          ready;

      }
    );


    /* =========================
       BUILD STATUS
    ========================= */

    buildMessage.classList.toggle(
      "valid",
      valid
    );


    if (
      ready
    ) {

      buildMessage
        .firstElementChild
        .textContent =
        "BUILD LOCKED FOR THIS RACE";

    }

    else if (
      valid
    ) {

      buildMessage
        .firstElementChild
        .textContent =
        "BUILD READY — 16 / 16 POINTS";

    }

    else {

      buildMessage
        .firstElementChild
        .textContent =
        `ALLOCATE ${remaining} MORE POINT${
          remaining === 1
            ? ""
            : "S"
        }`;

    }


    resetButton.disabled =
      ready;


    /*
      Stage 1 still requires the old
      server car ID behind the scenes.
    */

    lockInBtn.disabled =
      ready ||
      !valid ||
      !legacyCarSelected();


    if (
      !ready
    ) {

      if (
        lockStatus
      ) {

        lockStatus.textContent =
          valid
            ? "16 / 16 POINTS"
            : `${total} / 16 POINTS`;

      }


      if (
        carSelectStatus
      ) {

        carSelectStatus.textContent =
          valid

            ? "Build ready. Lock in when you're ready."

            : `Allocate ${remaining} more point${
                remaining === 1
                  ? ""
                  : "s"
              }.`;

      }

    }

  }


  /* =========================================================
     STAT CHANGES
  ========================================================= */

  function changeStat(
    stat,
    delta
  ) {

    if (
      playerReady() ||
      !(
        stat in
        state.stats
      )
    ) {

      return;

    }


    const current =
      state.stats[
        stat
      ];


    const total =
      totalPoints();


    if (
      delta > 0
    ) {

      if (
        current >=
        MAX_PER_STAT ||
        total >=
        TOTAL_POINTS
      ) {

        return;

      }


      state.stats[
        stat
      ] =
        current + 1;

    }

    else {

      if (
        current <= 0
      ) {

        return;

      }


      state.stats[
        stat
      ] =
        current - 1;

    }


    saveBuild();

    render();

    emitChange();

  }


  /* =========================================================
     CLICK HANDLING
  ========================================================= */

  garage.addEventListener(

    "click",

    event => {

      const statButton =
        event.target.closest(
          ".rg-stat-controls button"
        );


      if (
        statButton
      ) {

        const row =
          statButton.closest(
            ".rg-stat-row"
          );


        changeStat(

          row.dataset.stat,

          statButton.dataset.action ===
          "plus"

            ? 1

            : -1

        );


        return;

      }


      const bodyButton =
        event.target.closest(
          ".rg-body-btn"
        );


      if (
        bodyButton &&
        !playerReady()
      ) {

        state.appearance.body =
          bodyButton.dataset.body;


        saveBuild();

        render();

        emitChange();

      }

    }

  );


  /* =========================================================
     COLORS
  ========================================================= */

  bodyColor.addEventListener(

    "input",

    () => {

      if (
        playerReady()
      ) {

        return;

      }


      state.appearance.color =
        cleanHex(

          bodyColor.value,

          state.appearance.color

        );


      saveBuild();

      render();

      emitChange();

    }

  );


  accentColor.addEventListener(

    "input",

    () => {

      if (
        playerReady()
      ) {

        return;

      }


      state.appearance.accent =
        cleanHex(

          accentColor.value,

          state.appearance.accent

        );


      saveBuild();

      render();

      emitChange();

    }

  );


  /* =========================================================
     RESET
  ========================================================= */

  resetButton.addEventListener(

    "click",

    () => {

      if (
        playerReady()
      ) {

        return;

      }


      state.stats = {

        speed:
          4,

        acceleration:
          4,

        grip:
          4,

        turning:
          4

      };


      saveBuild();

      render();

      emitChange();

    }

  );


  /* =========================================================
     LOCK-IN GUARD
  ========================================================= */

  lockInBtn.addEventListener(

    "click",

    event => {

      if (
        buildIsValid()
      ) {

        return;

      }


      /*
        Prevent the OLD multiplayer lock-in
        listener from firing with an invalid
        build.
      */

      event.preventDefault();

      event.stopImmediatePropagation();


      render();

    },

    true

  );


  /* =========================================================
     KEEP EXISTING MULTIPLAYER WORKING

     Stage 1 only:
     secretly select GT in the old selector.

     The new stats do NOT affect physics yet.
  ========================================================= */

  function ensureLegacySelection() {

    const room =
      window.REDLINE_MP
        ?.room;


    const me =
      window.REDLINE_MP
        ?.myPlayer;


    if (
      room?.phase !==
      "car_select" ||
      !me ||
      me.car
    ) {

      render();

      return;

    }


    const gt =
      document.querySelector(
        '.car-card[data-car="gt"]'
      );


    if (
      gt
    ) {

      gt.click();

    }


    setTimeout(
      render,
      0
    );

  }


  /* =========================================================
     MULTIPLAYER EVENTS
  ========================================================= */

  window.addEventListener(

    "redline:room-state",

    event => {

      const room =
        event.detail?.room
        ??
        event.detail?.state
        ??
        event.detail;


      if (
        room?.phase ===
        "car_select"
      ) {
        refreshCashBalance();
        ensureLegacySelection();

      }

      else {

        render();

      }

    }

  );


  window.addEventListener(
    "redline:countdown",
    render
  );


  window.addEventListener(
    "redline:race-started",
    render
  );
  window.addEventListener("redline:race-complete",()=>refreshCashBalance(true));
  window.addEventListener("redline:results-shown",()=>refreshCashBalance(true));


  /* =========================================================
     PUBLIC GARAGE API

     Stage 2 will use this to send the build
     through multiplayer + physics.
  ========================================================= */

  window.REDLINE_GARAGE = {
    refreshCashBalance:()=>refreshCashBalance(true),
    get cashBalance(){return cashBalance;},

    get build() {

      return JSON.parse(
        JSON.stringify(
          state
        )
      );

    },


    get valid() {

      return buildIsValid();

    },


    get totalPoints() {

      return totalPoints();

    },


    resetStats() {

      if (
        playerReady()
      ) {

        return false;

      }


      state.stats = {

        speed:
          4,

        acceleration:
          4,

        grip:
          4,

        turning:
          4

      };


      saveBuild();

      render();

      emitChange();


      return true;

    }

  };


  /* =========================================================
     INITIAL
  ========================================================= */

  render();


  setTimeout(
    ensureLegacySelection,
    0
  );

})();
