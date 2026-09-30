const GAMESHUB_STATS_API =
  "https://redline-multiplayer.guestuseonly0173.workers.dev";


(() => {

  const games = {

    redline: {
      name:
        "REDLINE",

      maps: [
        {
          id:
            "neon",

          name:
            "NEON DISTRICT"
        },
        {
          id:
            "canyon",

          name:
            "CANYON RUN"
        },
        {
          id:
            "arctic",

          name:
            "ARCTIC RELAY"
        }
      ]
    }

  };


  let selectedGame =
    "redline";


  let selectedView =
    "mine";


  let selectedMap =
    "neon";


  let requestNumber =
    0;


  function formatTime(
    milliseconds
  ) {

    const value =
      Number(
        milliseconds
      );


    if (
      !Number.isFinite(
        value
      )
    ) {

      return "—";

    }


    const total =
      Math.max(
        0,
        Math.floor(
          value
        )
      );


    const minutes =
      Math.floor(
        total /
        60000
      );


    const seconds =
      Math.floor(
        (
          total %
          60000
        )
        /
        1000
      );


    const millis =
      total %
      1000;


    return (
      `${String(minutes).padStart(2, "0")}:`
      +
      `${String(seconds).padStart(2, "0")}.`
      +
      `${String(millis).padStart(3, "0")}`
    );

  }


  function ordinal(
    place
  ) {

    const value =
      Number(
        place
      );


    if (
      value ===
      1
    ) {

      return "1ST";

    }


    if (
      value ===
      2
    ) {

      return "2ND";

    }


    if (
      value ===
      3
    ) {

      return "3RD";

    }


    return `${value}TH`;

  }


  function createUI() {

    if (
      document.getElementById(
        "gameshubLeaderboards"
      )
    ) {

      return;

    }


    const header =
      document.querySelector(
        "header"
      );


    const button =
      document.createElement(
        "button"
      );


    button.id =
      "gameshubLeaderboardsButton";


    button.type =
      "button";


    button.textContent =
      "LEADERBOARDS";


    if (
      header
    ) {

      const account =
        document.getElementById(
          "gameshubAccount"
        );


      const logout =
        header.querySelector(
          "#logoutButton"
        );


      if (
        account
      ) {

        header.insertBefore(
          button,
          account
        );

      }

      else if (
        logout
      ) {

        header.insertBefore(
          button,
          logout
        );

      }

      else {

        header.appendChild(
          button
        );

      }

    }

    else {

      document.body.prepend(
        button
      );

    }


    const overlay =
      document.createElement(
        "div"
      );


    overlay.id =
      "gameshubLeaderboards";


    overlay.innerHTML = `
      <section
        id="gameshubLeaderboardsPanel"
        role="dialog"
        aria-modal="true"
        aria-label="GAMESHUB leaderboards"
      >

        <div class="gh-stats-handle"></div>

        <div class="gh-stats-topbar">

          <div>

            <div class="gh-stats-eyebrow">
              GAMESHUB
            </div>

            <h2>
              Stats & Leaderboards
            </h2>

          </div>

          <button
            id="gameshubLeaderboardsClose"
            class="gh-stats-close"
            type="button"
            aria-label="Close leaderboards"
          >
            ×
          </button>

        </div>


        <div class="gh-game-picker">

          <span>
            GAME
          </span>

          <div id="gameshubGameChoices"></div>

        </div>


        <div
          class="gh-stats-tabs"
          role="tablist"
        >

          <button
            class="gh-stats-tab active"
            data-stats-view="mine"
            type="button"
          >
            MY STATS
          </button>

          <button
            class="gh-stats-tab"
            data-stats-view="global"
            type="button"
          >
            GLOBAL TOP 10
          </button>

        </div>


        <div id="gameshubStatsContent"></div>

      </section>
    `;


    document.body.appendChild(
      overlay
    );


    const style =
      document.createElement(
        "style"
      );


    style.textContent = `
      #gameshubLeaderboardsButton {
        min-height:36px;
        padding:0 14px;
        border:1px solid rgba(94,132,196,.38);
        border-radius:8px;
        background:rgba(40,70,118,.18);
        color:#c6d8f5;
        cursor:pointer;
        font-size:10px;
        font-weight:950;
        letter-spacing:.09em;
        white-space:nowrap;
        transition:
          transform .16s ease,
          background .16s ease,
          border-color .16s ease,
          color .16s ease;
      }

      #gameshubLeaderboardsButton:hover {
        transform:translateY(-1px);
        border-color:rgba(110,158,238,.68);
        background:rgba(50,92,159,.28);
        color:#fff;
      }

      #gameshubLeaderboards {
        position:fixed;
        inset:0;
        z-index:999998;
        display:flex;
        align-items:flex-end;
        justify-content:center;
        pointer-events:none;
        background:rgba(2,5,10,0);
        backdrop-filter:blur(0);
        transition:
          background .55s ease,
          backdrop-filter .55s ease;
      }

      #gameshubLeaderboards.open {
        pointer-events:auto;
        background:rgba(2,5,10,.72);
        backdrop-filter:blur(9px);
      }

      #gameshubLeaderboardsPanel {
        width:min(1100px, calc(100% - 28px));
        max-height:92vh;
        overflow:auto;
        transform:translateY(calc(100% + 32px));
        opacity:.82;
        padding:10px 28px 34px;
        border:1px solid rgba(255,255,255,.12);
        border-bottom:0;
        border-radius:22px 22px 0 0;
        background:
          radial-gradient(
            circle at 74% 0%,
            rgba(62,105,180,.18),
            transparent 33%
          ),
          linear-gradient(
            180deg,
            #101724,
            #090e16 78%
          );
        color:#fff;
        box-shadow:
          0 -35px 100px rgba(0,0,0,.55);
        transition:
          transform .72s cubic-bezier(.18,.76,.2,1),
          opacity .62s ease;
      }

      #gameshubLeaderboards.open
      #gameshubLeaderboardsPanel {
        transform:translateY(0);
        opacity:1;
      }

      .gh-stats-handle {
        width:58px;
        height:4px;
        margin:0 auto 12px;
        border-radius:999px;
        background:rgba(255,255,255,.24);
      }

      .gh-stats-topbar {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:20px;
        padding-bottom:20px;
        border-bottom:1px solid rgba(255,255,255,.08);
      }

      .gh-stats-eyebrow {
        color:#73a6f3;
        font-size:10px;
        font-weight:950;
        letter-spacing:.18em;
      }

      .gh-stats-topbar h2 {
        margin:5px 0 0;
        font-size:30px;
        letter-spacing:-.035em;
      }

      .gh-stats-close {
        width:42px;
        height:42px;
        border:1px solid rgba(255,255,255,.13);
        border-radius:10px;
        background:rgba(255,255,255,.05);
        color:#aeb9c9;
        cursor:pointer;
        font-size:27px;
        line-height:1;
      }

      .gh-stats-close:hover {
        color:#fff;
        background:rgba(255,255,255,.09);
      }

      .gh-game-picker {
        display:flex;
        align-items:center;
        gap:14px;
        padding:20px 0 14px;
      }

      .gh-game-picker > span {
        color:#68778e;
        font-size:9px;
        font-weight:950;
        letter-spacing:.14em;
      }

      #gameshubGameChoices {
        display:flex;
        flex-wrap:wrap;
        gap:8px;
      }

      .gh-game-choice {
        min-height:36px;
        padding:0 16px;
        border:1px solid #29364b;
        border-radius:8px;
        background:#0c131e;
        color:#8595ad;
        cursor:pointer;
        font-size:11px;
        font-weight:950;
        letter-spacing:.08em;
      }

      .gh-game-choice.active {
        border-color:#4f82d7;
        background:#172b49;
        color:#dbe9ff;
        box-shadow:
          inset 0 0 0 1px rgba(89,143,237,.11);
      }

      .gh-stats-tabs {
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:8px;
        margin:4px 0 20px;
        padding:5px;
        border:1px solid #202b3b;
        border-radius:11px;
        background:#080d14;
      }

      .gh-stats-tab {
        min-height:42px;
        border:0;
        border-radius:8px;
        background:transparent;
        color:#65758d;
        cursor:pointer;
        font-size:10px;
        font-weight:950;
        letter-spacing:.09em;
      }

      .gh-stats-tab.active {
        background:#182438;
        color:#e8f1ff;
      }

      #gameshubStatsContent {
        min-height:330px;
      }

      .gh-stats-loading,
      .gh-stats-empty,
      .gh-stats-error {
        min-height:260px;
        display:grid;
        place-items:center;
        padding:30px;
        border:1px dashed #273449;
        border-radius:12px;
        color:#77869c;
        text-align:center;
        font-size:13px;
        font-weight:800;
      }

      .gh-stats-error {
        color:#d59090;
      }

      .gh-my-stats-heading {
        display:flex;
        align-items:flex-end;
        justify-content:space-between;
        gap:20px;
        margin-bottom:15px;
      }

      .gh-my-stats-heading h3 {
        margin:0;
        font-size:22px;
      }

      .gh-my-stats-heading span {
        color:#708097;
        font-size:11px;
        font-weight:800;
      }

      .gh-races-total {
        min-width:125px;
        padding:13px 15px;
        border:1px solid #28374d;
        border-radius:10px;
        background:#0c1420;
        text-align:right;
      }

      .gh-races-total span {
        display:block;
        color:#63728a;
        font-size:8px;
        font-weight:950;
        letter-spacing:.13em;
      }

      .gh-races-total strong {
        display:block;
        margin-top:3px;
        font-size:24px;
      }

      .gh-stat-section-title {
        margin:24px 0 10px;
        color:#7587a2;
        font-size:9px;
        font-weight:950;
        letter-spacing:.16em;
      }

      .gh-best-times {
        display:grid;
        grid-template-columns:repeat(3, minmax(0,1fr));
        gap:10px;
      }

      .gh-best-time-card {
        padding:16px;
        border:1px solid #253247;
        border-radius:11px;
        background:
          linear-gradient(
            180deg,
            #101925,
            #0b111a
          );
      }

      .gh-best-time-card span {
        color:#72839d;
        font-size:9px;
        font-weight:900;
        letter-spacing:.08em;
      }

      .gh-best-time-card strong {
        display:block;
        margin-top:8px;
        font-size:23px;
        font-variant-numeric:tabular-nums;
      }

      .gh-placement-grid {
        display:grid;
        grid-template-columns:repeat(8, minmax(72px,1fr));
        gap:8px;
      }

      .gh-placement {
        padding:14px 8px;
        border:1px solid #222e40;
        border-radius:9px;
        background:#0b121c;
        text-align:center;
      }

      .gh-placement span {
        display:block;
        color:#718198;
        font-size:9px;
        font-weight:950;
        letter-spacing:.07em;
      }

      .gh-placement strong {
        display:block;
        margin-top:5px;
        font-size:22px;
      }

      .gh-map-tabs {
        display:flex;
        flex-wrap:wrap;
        gap:8px;
        margin-bottom:12px;
      }

      .gh-map-tab {
        min-height:36px;
        padding:0 14px;
        border:1px solid #28354a;
        border-radius:8px;
        background:#0b121c;
        color:#73839a;
        cursor:pointer;
        font-size:9px;
        font-weight:950;
        letter-spacing:.07em;
      }

      .gh-map-tab.active {
        border-color:#4c7bd0;
        background:#172844;
        color:#e0ecff;
      }

      .gh-leaderboard {
        overflow:hidden;
        border:1px solid #222e40;
        border-radius:12px;
        background:#0a1018;
      }

      .gh-leaderboard-row {
        display:grid;
        grid-template-columns:70px minmax(0,1fr) auto;
        align-items:center;
        gap:14px;
        min-height:58px;
        padding:0 16px;
        border-bottom:1px solid rgba(255,255,255,.055);
      }

      .gh-leaderboard-row:last-child {
        border-bottom:0;
      }

      .gh-leaderboard-rank {
        color:#7b91b3;
        font-size:15px;
        font-weight:950;
      }

      .gh-leaderboard-name {
        overflow:hidden;
        text-overflow:ellipsis;
        color:#e7edf7;
        font-size:13px;
        font-weight:850;
        white-space:nowrap;
      }

      .gh-leaderboard-time {
        color:#dbe8ff;
        font-size:14px;
        font-weight:950;
        font-variant-numeric:tabular-nums;
      }

      @media (max-width: 780px) {
        #gameshubLeaderboardsPanel {
          width:100%;
          max-height:94vh;
          padding-left:18px;
          padding-right:18px;
          border-radius:18px 18px 0 0;
        }

        .gh-best-times {
          grid-template-columns:1fr;
        }

        .gh-placement-grid {
          grid-template-columns:repeat(4,1fr);
        }
      }

      @media (max-width: 620px) {
        #gameshubLeaderboardsButton {
          padding:0 10px;
          font-size:9px;
        }

        .gh-my-stats-heading {
          align-items:stretch;
          flex-direction:column;
        }

        .gh-races-total {
          text-align:left;
        }

        .gh-leaderboard-row {
          grid-template-columns:45px minmax(0,1fr) auto;
          padding:0 11px;
        }
      }
    `;


    document.head.appendChild(
      style
    );


    renderGameChoices();
    bindEvents();

  }


  function renderGameChoices() {

    const container =
      document.getElementById(
        "gameshubGameChoices"
      );


    if (
      !container
    ) {

      return;

    }


    container.replaceChildren();


    for (
      const [
        id,
        game
      ]
      of Object.entries(
        games
      )
    ) {

      const button =
        document.createElement(
          "button"
        );


      button.type =
        "button";


      button.className =
        "gh-game-choice";


      button.classList.toggle(
        "active",
        id ===
        selectedGame
      );


      button.textContent =
        game.name;


      button.addEventListener(
        "click",
        () => {

          selectedGame =
            id;


          selectedMap =
            game.maps[0]?.id
            ||
            "neon";


          renderGameChoices();
          loadCurrentView();

        }
      );


      container.appendChild(
        button
      );

    }

  }


  function bindEvents() {

    document
      .getElementById(
        "gameshubLeaderboardsButton"
      )
      ?.addEventListener(
        "click",
        openPanel
      );


    document
      .getElementById(
        "gameshubLeaderboardsClose"
      )
      ?.addEventListener(
        "click",
        closePanel
      );


    document
      .getElementById(
        "gameshubLeaderboards"
      )
      ?.addEventListener(
        "click",
        event => {

          if (
            event.target.id ===
            "gameshubLeaderboards"
          ) {

            closePanel();

          }

        }
      );


    document
      .querySelectorAll(
        "[data-stats-view]"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            () => {

              selectedView =
                button.dataset.statsView;


              updateViewTabs();
              loadCurrentView();

            }
          );

        }
      );


    document.addEventListener(
      "keydown",
      event => {

        if (
          event.key ===
          "Escape"
        ) {

          closePanel();

        }

      }
    );

  }


  function openPanel() {

    const overlay =
      document.getElementById(
        "gameshubLeaderboards"
      );


    if (
      !overlay
    ) {

      return;

    }


    overlay.classList.add(
      "open"
    );


    document.documentElement
      .classList.add(
        "gh-stats-open"
      );


    document.body.style.overflow =
      "hidden";


    loadCurrentView();

  }


  function closePanel() {

    document
      .getElementById(
        "gameshubLeaderboards"
      )
      ?.classList.remove(
        "open"
      );


    document.documentElement
      .classList.remove(
        "gh-stats-open"
      );


    document.body.style.overflow =
      "";

  }


  function updateViewTabs() {

    document
      .querySelectorAll(
        "[data-stats-view]"
      )
      .forEach(
        button => {

          button.classList.toggle(
            "active",
            button.dataset.statsView ===
            selectedView
          );

        }
      );

  }


  function setContent(
    html,
    className =
      ""
  ) {

    const content =
      document.getElementById(
        "gameshubStatsContent"
      );


    if (
      !content
    ) {

      return;

    }


    content.className =
      className;


    content.innerHTML =
      html;

  }


  async function getAccountToken() {

    const response =
      await fetch(
        "/api/account/multiplayer-token",
        {
          method:
            "POST",

          credentials:
            "same-origin"
        }
      );


    const data =
      await response
        .json()
        .catch(
          () => null
        );


    if (
      !response.ok
      ||
      !data?.ok
      ||
      !data.token
    ) {

      throw new Error(
        data?.error
        ||
        "Sign in with Google or continue as guest to view your stats."
      );

    }


    return data.token;

  }


  function loadCurrentView() {

    updateViewTabs();


    if (
      selectedView ===
      "global"
    ) {

      loadGlobalLeaderboard();

    }

    else {

      loadMyStats();

    }

  }


  async function loadMyStats() {

    const currentRequest =
      ++requestNumber;


    setContent(
      `
        <div class="gh-stats-loading">
          Loading your REDLINE stats...
        </div>
      `
    );


    try {

      const accountToken =
        await getAccountToken();


      const response =
        await fetch(
          `${GAMESHUB_STATS_API}/api/stats/me`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                accountToken
              })
          }
        );


      const data =
        await response
          .json()
          .catch(
            () => null
          );


      if (
        currentRequest !==
        requestNumber
      ) {

        return;

      }


      if (
        !response.ok
        ||
        !data?.ok
      ) {

        throw new Error(
          data?.error
          ||
          "Could not load your REDLINE stats."
        );

      }


      renderMyStats(
        data.stats
      );

    }

    catch (
      error
    ) {

      if (
        currentRequest !==
        requestNumber
      ) {

        return;

      }


      setContent(
        `
          <div class="gh-stats-error">
            ${escapeHtml(
              error.message
              ||
              "Could not load your stats."
            )}
          </div>
        `
      );

    }

  }


  function renderMyStats(
    stats
  ) {

    const game =
      games[
        selectedGame
      ];


    const bestCards =
      game.maps
        .map(
          map => {

            const best =
              stats?.bestTimes
                ?.[
                  map.id
                ];


            return `
              <div class="gh-best-time-card">
                <span>
                  ${escapeHtml(map.name)}
                </span>

                <strong>
                  ${formatTime(best?.time)}
                </strong>
              </div>
            `;

          }
        )
        .join(
          ""
        );


    const placements =
      Array
        .from(
          {
            length:
              8
          },
          (
            _,
            index
          ) =>
            index +
            1
        )
        .map(
          place => {

            const count =
              Number(
                stats?.placements
                  ?.[
                    String(
                      place
                    )
                  ]
              )
              ||
              0;


            return `
              <div class="gh-placement">
                <span>
                  ${ordinal(place)}
                </span>

                <strong>
                  ${count}
                </strong>
              </div>
            `;

          }
        )
        .join(
          ""
        );


    setContent(
      `
        <div class="gh-my-stats-heading">

          <div>
            <h3>
              ${escapeHtml(stats?.username || "Racer")}
            </h3>

            <span>
              REDLINE career statistics
            </span>
          </div>

          <div class="gh-races-total">
            <span>
              RACES FINISHED
            </span>

            <strong>
              ${Number(stats?.racesFinished) || 0}
            </strong>
          </div>

        </div>


        <div class="gh-stat-section-title">
          BEST TIMES
        </div>

        <div class="gh-best-times">
          ${bestCards}
        </div>


        <div class="gh-stat-section-title">
          FINISH POSITIONS
        </div>

        <div class="gh-placement-grid">
          ${placements}
        </div>
      `
    );

  }


  function renderMapTabs() {

    const game =
      games[
        selectedGame
      ];


    return game.maps
      .map(
        map => `
          <button
            class="gh-map-tab ${
              map.id ===
              selectedMap
                ?
                "active"
                :
                ""
            }"
            data-map="${escapeHtml(map.id)}"
            type="button"
          >
            ${escapeHtml(map.name)}
          </button>
        `
      )
      .join(
        ""
      );

  }


  async function loadGlobalLeaderboard() {

    const currentRequest =
      ++requestNumber;


    setContent(
      `
        <div class="gh-map-tabs">
          ${renderMapTabs()}
        </div>

        <div class="gh-stats-loading">
          Loading global times...
        </div>
      `
    );


    bindMapTabs();


    try {

      const response =
        await fetch(
          `${GAMESHUB_STATS_API}/api/stats/leaderboard?map=${
            encodeURIComponent(
              selectedMap
            )
          }`,
          {
            cache:
              "no-store"
          }
        );


      const data =
        await response
          .json()
          .catch(
            () => null
          );


      if (
        currentRequest !==
        requestNumber
      ) {

        return;

      }


      if (
        !response.ok
        ||
        !data?.ok
      ) {

        throw new Error(
          data?.error
          ||
          "Could not load the leaderboard."
        );

      }


      renderGlobalLeaderboard(
        data.leaderboard
        ??
        []
      );

    }

    catch (
      error
    ) {

      if (
        currentRequest !==
        requestNumber
      ) {

        return;

      }


      setContent(
        `
          <div class="gh-map-tabs">
            ${renderMapTabs()}
          </div>

          <div class="gh-stats-error">
            ${escapeHtml(
              error.message
              ||
              "Could not load the leaderboard."
            )}
          </div>
        `
      );


      bindMapTabs();

    }

  }


  function renderGlobalLeaderboard(
    leaderboard
  ) {

    const rows =
      leaderboard
        .slice(
          0,
          10
        )
        .map(
          (
            row,
            index
          ) => `
            <div class="gh-leaderboard-row">

              <div class="gh-leaderboard-rank">
                #${Number(row.rank) || index + 1}
              </div>

              <div class="gh-leaderboard-name">
                ${escapeHtml(row.username || "Racer")}
              </div>

              <div class="gh-leaderboard-time">
                ${formatTime(row.time)}
              </div>

            </div>
          `
        )
        .join(
          ""
        );


    setContent(
      `
        <div class="gh-map-tabs">
          ${renderMapTabs()}
        </div>

        ${
          rows
            ?
            `
              <div class="gh-leaderboard">
                ${rows}
              </div>
            `
            :
            `
              <div class="gh-stats-empty">
                No recorded times on this map yet.
              </div>
            `
        }
      `
    );


    bindMapTabs();

  }


  function bindMapTabs() {

    document
      .querySelectorAll(
        ".gh-map-tab"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            () => {

              selectedMap =
                button.dataset.map;


              loadGlobalLeaderboard();

            }
          );

        }
      );

  }


  function escapeHtml(
    value
  ) {

    return String(
      value
      ??
      ""
    )
      .replaceAll(
        "&",
        "&amp;"
      )
      .replaceAll(
        "<",
        "&lt;"
      )
      .replaceAll(
        ">",
        "&gt;"
      )
      .replaceAll(
        '"',
        "&quot;"
      )
      .replaceAll(
        "'",
        "&#039;"
      );

  }


  function start() {

    createUI();

  }


  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      start
    );

  }

  else {

    start();

  }

})();
