(() => {
  const finishedStates = new Map();

  let finishOrder = [];
  let raceStartAt = null;
  let currentPhase = null;

  const carNames = {
    gt: "REDLINE GT",
    vortex: "VORTEX R",
    apex: "APEX S"
  };

  /* =========================================================
     UI
  ========================================================= */

  const style = document.createElement("style");

  style.textContent = `
    #redlineResultsOverlay {
      position: fixed;
      inset: 0;
      z-index: 10000;

      display: flex;
      align-items: center;
      justify-content: center;

      padding: 24px;

      background: rgba(3,7,14,.80);
      backdrop-filter: blur(8px);

      font-family: Arial, sans-serif;
      color: #fff;
    }

    #redlineResultsOverlay.hidden {
      display: none;
    }

    #redlineResultsCard {
      width: min(680px,100%);
      max-height: 82vh;
      overflow: auto;

      padding: 24px;

      border-radius: 18px;

      background: rgba(12,18,30,.97);

      border: 1px solid rgba(255,255,255,.15);
    }

    #redlineResultsTitle {
      margin: 0 0 6px;

      font-size: clamp(30px,5vw,48px);
      font-weight: 900;
    }

    #redlineResultsStatus {
      margin: 0 0 20px;

      color: rgba(255,255,255,.68);
      font-weight: 700;
    }

    #redlineResultsList {
      display: grid;
      gap: 10px;
    }

    .redline-result-row {
      display: grid;

      grid-template-columns:
        58px 1fr auto;

      gap: 14px;

      align-items: center;

      padding: 14px 16px;

      border-radius: 12px;

      background: rgba(255,255,255,.06);

      border: 1px solid rgba(255,255,255,.08);
    }

    .redline-result-place {
      font-size: 22px;
      font-weight: 900;
    }

    .redline-result-name {
      font-size: 17px;
      font-weight: 800;
    }

    .redline-result-car {
      margin-top: 3px;

      color: rgba(255,255,255,.55);

      font-size: 12px;
      font-weight: 700;
    }

    .redline-result-time {
      font-variant-numeric: tabular-nums;
      font-weight: 900;
    }

    #redlineResultsActions {
      margin-top: 20px;

      display: flex;
      align-items: center;
      justify-content: flex-end;

      gap: 12px;

      flex-wrap: wrap;
    }

    #redlineResultsHostWait {
      margin-right: auto;

      color: rgba(255,255,255,.62);

      font-size: 13px;
      font-weight: 700;
    }

    #redlineReturnLobbyBtn {
      min-height: 44px;

      border: 0;
      border-radius: 10px;

      padding: 0 18px;

      background: #fff;
      color: #0b1019;

      font-weight: 900;

      cursor: pointer;
    }

    #redlineReturnLobbyBtn:disabled {
      opacity: .55;
      cursor: default;
    }
  `;

  document.head.appendChild(style);

  const overlay = document.createElement("div");

  overlay.id = "redlineResultsOverlay";
  overlay.className = "hidden";

  overlay.innerHTML = `
    <section id="redlineResultsCard">

      <h2 id="redlineResultsTitle">
        FINISHED
      </h2>

      <p id="redlineResultsStatus">
        Waiting for the other racers...
      </p>

      <div id="redlineResultsList"></div>

      <div id="redlineResultsActions">

        <span id="redlineResultsHostWait"></span>

        <button
          id="redlineReturnLobbyBtn"
          type="button"
        >
          RETURN TO LOBBY
        </button>

      </div>

    </section>
  `;

  document.body.appendChild(overlay);

  const title =
    document.getElementById("redlineResultsTitle");

  const status =
    document.getElementById("redlineResultsStatus");

  const list =
    document.getElementById("redlineResultsList");

  const hostWait =
    document.getElementById("redlineResultsHostWait");

  const returnButton =
    document.getElementById("redlineReturnLobbyBtn");

  /* =========================================================
     HELPERS
  ========================================================= */

  function getPlayers() {
    return window.REDLINE_MP?.players ?? [];
  }

  function getMyId() {
    return window.REDLINE_MP?.playerId ?? null;
  }

  function getRoomCode() {
    return (
      window.REDLINE_MP?.roomCode ??
      "unknown-room"
    );
  }

  function expectedRacers() {
    const players = getPlayers();

    if (players.length > 0) {
      return players.length;
    }

    const hudTotal =
      Number(
        document
          .getElementById("totalRacers")
          ?.textContent
      );

    if (
      Number.isFinite(hudTotal) &&
      hudTotal > 0
    ) {
      return hudTotal;
    }

    return Math.max(
      finishedStates.size,
      1
    );
  }

  function isHost() {
    const room =
      window.REDLINE_MP?.room;

    const me =
      getMyId();

    if (!room || !me) {
      return false;
    }

    const hostId =
      room.hostId ??
      room.hostPlayerId ??
      room.host?.id ??
      room.host?.playerId ??
      null;

    if (hostId) {
      return hostId === me;
    }

    const player =
      getPlayers().find(
        item =>
          item.id === me
      );

    return Boolean(
      player?.isHost ||
      player?.host
    );
  }

  function formatTime(ms) {
    const value =
      Number(ms);

    if (!Number.isFinite(value)) {
      return "FINISHED";
    }

    const total =
      Math.max(
        0,
        Math.floor(value)
      );

    const minutes =
      Math.floor(total / 60000);

    const seconds =
      Math.floor(
        (total % 60000) / 1000
      );

    const millis =
      total % 1000;

    return (
      `${String(minutes).padStart(2, "0")}:` +
      `${String(seconds).padStart(2, "0")}.` +
      `${String(millis).padStart(3, "0")}`
    );
  }

  function resultTime(result) {
    return (
      result?.finishTime ??
      result?.time ??
      result?.elapsed ??
      result?.elapsedMs ??
      result?.finishMs ??
      null
    );
  }

  function authoritativeResult(playerId) {
    return (
      finishOrder.find(
        item =>
          item?.playerId === playerId
      ) ??
      null
    );
  }

  /* =========================================================
     PERSISTENCE
  ========================================================= */

  function storageKey() {
    return (
      "redline-results:" +
      getRoomCode()
    );
  }

  function saveState() {
    try {
      sessionStorage.setItem(
        storageKey(),
        JSON.stringify({
          raceStartAt,
          phase: currentPhase,

          finishOrder,

          finishedStates:
            [...finishedStates.entries()]
        })
      );
    } catch {}
  }

  function loadState() {
    try {
      const raw =
        sessionStorage.getItem(
          storageKey()
        );

      if (!raw) {
        return;
      }

      const saved =
        JSON.parse(raw);

      if (!saved) {
        return;
      }

      const currentRace =
        window.REDLINE_MP
          ?.raceStartAt ??
        raceStartAt ??
        null;

      /*
        If both race IDs exist and they are different,
        the saved data belongs to an older race.
      */
      if (
        saved.raceStartAt &&
        currentRace &&
        saved.raceStartAt !== currentRace
      ) {
        sessionStorage.removeItem(
          storageKey()
        );

        return;
      }

      raceStartAt =
        currentRace ??
        saved.raceStartAt ??
        raceStartAt;

      if (
        Array.isArray(saved.finishOrder)
      ) {
        finishOrder =
          saved.finishOrder;
      }

      if (
        Array.isArray(
          saved.finishedStates
        )
      ) {
        finishedStates.clear();

        for (
          const entry
          of saved.finishedStates
        ) {
          if (
            Array.isArray(entry) &&
            entry.length === 2
          ) {
            finishedStates.set(
              entry[0],
              entry[1]
            );
          }
        }
      }
    } catch {}
  }

  function clearSavedState() {
    try {
      sessionStorage.removeItem(
        storageKey()
      );
    } catch {}
  }

  /* =========================================================
     UI STATE
  ========================================================= */

  function showOverlay() {
    overlay.classList.remove("hidden");
  }

  function hideOverlay() {
    overlay.classList.add("hidden");
  }

  function everyoneFinished() {
    const total =
      expectedRacers();

    return (
      total > 0 &&
      finishedStates.size >= total
    );
  }

  function showWaiting() {
    showOverlay();

    title.textContent =
      "FINISHED";

    status.textContent =
      `Waiting for racers... ${finishedStates.size}/${expectedRacers()} finished`;

    list.replaceChildren();

    hostWait.textContent = "";

    returnButton.hidden = true;

    window.dispatchEvent(
      new CustomEvent(
        "redline:results-shown",
        {
          detail: {
            waiting: true
          }
        }
      )
    );
  }

  function buildOrderedResults() {
    const players =
      getPlayers();

    const results = [];

    for (
      const [
        playerId,
        state
      ]
      of finishedStates.entries()
    ) {
      const player =
        players.find(
          item =>
            item.id === playerId
        );

      const official =
        authoritativeResult(
          playerId
        );

      results.push({
        playerId,

        username:
          official?.username ??
          state?.username ??
          player?.username ??
          "Racer",

        car:
          official?.car ??
          state?.car ??
          player?.car ??
          "gt",

        place:
          Number(
            official?.place
          ) ||
          null,

        finishTime:
          resultTime(
            official
          ) ??
          state?.finishTime ??
          null,

        firstSeen:
          state?._firstSeen ??
          Infinity
      });
    }

    results.sort(
      (a, b) => {
        if (
          a.place &&
          b.place
        ) {
          return (
            a.place -
            b.place
          );
        }

        if (a.place) {
          return -1;
        }

        if (b.place) {
          return 1;
        }

        return (
          a.firstSeen -
          b.firstSeen
        );
      }
    );

    return results.map(
      (result, index) => ({
        ...result,

        place:
          result.place ??
          index + 1
      })
    );
  }

  function renderResults() {
    const ordered =
      buildOrderedResults();

    showOverlay();

    title.textContent =
      "RACE RESULTS";

    status.textContent =
      "All racers finished.";

    list.replaceChildren();

    for (
      const result
      of ordered
    ) {
      const row =
        document.createElement("div");

      row.className =
        "redline-result-row";

      const placeEl =
        document.createElement("div");

      placeEl.className =
        "redline-result-place";

      placeEl.textContent =
        `#${result.place}`;

      const racer =
        document.createElement("div");

      const nameEl =
        document.createElement("div");

      nameEl.className =
        "redline-result-name";

      nameEl.textContent =
        result.username;

      const carEl =
        document.createElement("div");

      carEl.className =
        "redline-result-car";

      carEl.textContent =
        carNames[result.car] ??
        String(
          result.car
        ).toUpperCase();

      racer.append(
        nameEl,
        carEl
      );

      const timeEl =
        document.createElement("div");

      timeEl.className =
        "redline-result-time";

      timeEl.textContent =
        formatTime(
          result.finishTime
        );

      row.append(
        placeEl,
        racer,
        timeEl
      );

      list.appendChild(row);
    }

    if (isHost()) {
      hostWait.textContent = "";

      returnButton.hidden = false;
      returnButton.disabled = false;

      returnButton.textContent =
        "RETURN TO LOBBY";
    }

    else {
      hostWait.textContent =
        "Waiting for the host to return everyone to the lobby...";

      returnButton.hidden = true;
    }

    saveState();

    window.dispatchEvent(
      new CustomEvent(
        "redline:results-shown",
        {
          detail: {
            waiting: false,
            finishOrder: ordered
          }
        }
      )
    );
  }

  function evaluateResults() {
    const me =
      getMyId();

    if (everyoneFinished()) {
      renderResults();
      return;
    }

    if (
      me &&
      finishedStates.has(me)
    ) {
      showWaiting();
    }
  }

  /* =========================================================
     FINISH DATA
  ========================================================= */

  function ingestFinishedState(state) {
    if (
      !state?.playerId ||
      !state.finished
    ) {
      return;
    }

    const old =
      finishedStates.get(
        state.playerId
      );

    finishedStates.set(
      state.playerId,
      {
        ...old,
        ...state,

        _firstSeen:
          old?._firstSeen ??
          performance.now()
      }
    );

    saveState();

    evaluateResults();
  }

  function ingestFinishPacket(detail) {
    const payload =
      detail?.payload ??
      detail?.data ??
      detail ??
      {};

    const result =
      payload.result ??
      detail?.result ??
      (
        payload.playerId
          ? payload
          : null
      );

    const order =
      payload.finishOrder ??
      detail?.finishOrder ??
      payload.results ??
      detail?.results ??
      null;

    if (Array.isArray(order)) {
      finishOrder =
        order.slice();

      for (
        const item
        of finishOrder
      ) {
        if (!item?.playerId) {
          continue;
        }

        const old =
          finishedStates.get(
            item.playerId
          );

        finishedStates.set(
          item.playerId,
          {
            ...old,
            ...item,

            finished: true,

            _firstSeen:
              old?._firstSeen ??
              performance.now()
          }
        );
      }
    }

    if (result?.playerId) {
      const old =
        finishedStates.get(
          result.playerId
        );

      finishedStates.set(
        result.playerId,
        {
          ...old,
          ...result,

          finished: true,

          _firstSeen:
            old?._firstSeen ??
            performance.now()
        }
      );
    }

    saveState();

    evaluateResults();
  }

  /* =========================================================
     RESTORE SCREEN
  ========================================================= */

  function restoreScreen() {
    loadState();

    if (everyoneFinished()) {
      renderResults();
      return;
    }

    const me =
      getMyId();

    if (
      me &&
      finishedStates.has(me)
    ) {
      showWaiting();
    }
  }

  /* =========================================================
     RESET
  ========================================================= */

  function resetForNewRace(
    newStartAt
  ) {
    finishedStates.clear();

    finishOrder = [];

    raceStartAt =
      newStartAt ??
      null;

    clearSavedState();

    hideOverlay();
  }

  /* =========================================================
     RETURN TO LOBBY
  ========================================================= */

  returnButton.addEventListener(
    "click",
    () => {
      if (!isHost()) {
        return;
      }

      returnButton.disabled = true;

      returnButton.textContent =
        "RETURNING...";

      const sent =
        window.REDLINE_MP
          ?.send?.({
            type: "return_lobby"
          });

      if (!sent) {
        returnButton.disabled = false;

        returnButton.textContent =
          "RETURN TO LOBBY";
      }
    }
  );

  /* =========================================================
     MULTIPLAYER EVENTS
  ========================================================= */

  window.addEventListener(
    "redline:race-state",
    event => {
      ingestFinishedState(
        event.detail
      );
    }
  );

  window.addEventListener(
    "redline:player-finished",
    event => {
      ingestFinishPacket(
        event.detail
      );
    }
  );

  window.addEventListener(
    "redline:race-snapshot",
    event => {
      const detail =
        event.detail ?? {};

      if (detail.startAt) {
        /*
          Don't reset here.

          Snapshot is often sent after reconnecting.
          Resetting here is what could destroy the
          finish screen when switching tabs.
        */
        raceStartAt =
          detail.startAt;
      }

      if (
        Array.isArray(
          detail.finishOrder
        )
      ) {
        ingestFinishPacket(
          detail
        );
      }

      for (
        const state
        of (
          detail.states ??
          []
        )
      ) {
        ingestFinishedState(
          state
        );
      }

      restoreScreen();
    }
  );

  window.addEventListener(
    "redline:countdown",
    event => {
      const newStartAt =
        event.detail?.startAt ??
        window.REDLINE_MP?.raceStartAt ??
        null;

      /*
        Countdown means a genuinely new race,
        so this IS where we clear old results.
      */
      if (
        !raceStartAt ||
        newStartAt !== raceStartAt
      ) {
        resetForNewRace(
          newStartAt
        );
      }

      raceStartAt =
        newStartAt ??
        raceStartAt;

      currentPhase =
        "countdown";
    }
  );

  window.addEventListener(
    "redline:race-started",
    event => {
      const newStartAt =
        event.detail?.startAt ??
        window.REDLINE_MP?.raceStartAt ??
        null;

      /*
        Important:
        race-started may happen again after
        reconnecting.

        Only wipe results if this is actually
        a DIFFERENT race.
      */
      if (
        raceStartAt &&
        newStartAt &&
        newStartAt !== raceStartAt
      ) {
        resetForNewRace(
          newStartAt
        );
      }

      raceStartAt =
        newStartAt ??
        raceStartAt;

      currentPhase =
        "racing";

      restoreScreen();
    }
  );

  window.addEventListener(
    "redline:room-state",
    event => {
      const room =
        event.detail?.room ??
        event.detail?.state ??
        event.detail?.payload?.room ??
        event.detail;

      const phase =
        room?.phase ??
        window.REDLINE_MP
          ?.room
          ?.phase ??
        null;

      currentPhase =
        phase;

      /*
        Lobby means the previous race is
        completely over.

        This is safe to clear.
      */
      if (phase === "lobby") {
        finishedStates.clear();

        finishOrder = [];

        raceStartAt = null;

        clearSavedState();

        hideOverlay();

        return;
      }

      /*
        Reconnect/update during racing:
        restore whatever screen we had.
      */
      if (
        phase === "racing" ||
        phase === "countdown"
      ) {
        restoreScreen();
      }
    }
  );

  /* =========================================================
     TAB SWITCH / WINDOW FOCUS
  ========================================================= */

  document.addEventListener(
    "visibilitychange",
    () => {
      if (
        document.visibilityState !==
        "visible"
      ) {
        return;
      }

      restoreScreen();
    }
  );

  window.addEventListener(
    "focus",
    () => {
      restoreScreen();
    }
  );

  window.addEventListener(
    "pageshow",
    () => {
      restoreScreen();
    }
  );

  /* =========================================================
     DISCONNECT

     DO NOT clear results here.

     Switching tabs can temporarily cause a
     disconnect/reconnect, so we preserve the
     finish screen.
  ========================================================= */

  window.addEventListener(
    "redline:disconnected",
    () => {
      saveState();
    }
  );

  /* =========================================================
     INITIAL RESTORE
  ========================================================= */

  setTimeout(
    () => {
      raceStartAt =
        window.REDLINE_MP?.raceStartAt ??
        raceStartAt;

      restoreScreen();
    },
    250
  );
})();
