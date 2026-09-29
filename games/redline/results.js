(() => {
  const finishedStates = new Map();

  let finishOrder = [];
  let raceStartAt = null;

  const carNames = {
    gt: "REDLINE GT",
    vortex: "VORTEX R",
    apex: "APEX S"
  };

  const style =
    document.createElement("style");

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

      font-family: Arial,sans-serif;
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

      border:
        1px solid rgba(255,255,255,.15);
    }

    #redlineResultsTitle {
      margin: 0 0 6px;

      font-size:
        clamp(30px,5vw,48px);

      font-weight: 900;
    }

    #redlineResultsStatus {
      margin: 0 0 20px;

      color:
        rgba(255,255,255,.68);

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

      background:
        rgba(255,255,255,.06);

      border:
        1px solid rgba(255,255,255,.08);
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

      color:
        rgba(255,255,255,.55);

      font-size: 12px;
      font-weight: 700;
    }

    .redline-result-time {
      font-variant-numeric:
        tabular-nums;

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

      color:
        rgba(255,255,255,.62);

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

  document.head.appendChild(
    style
  );

  const overlay =
    document.createElement("div");

  overlay.id =
    "redlineResultsOverlay";

  overlay.className =
    "hidden";

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

  document.body.appendChild(
    overlay
  );

  const title =
    document.getElementById(
      "redlineResultsTitle"
    );

  const status =
    document.getElementById(
      "redlineResultsStatus"
    );

  const list =
    document.getElementById(
      "redlineResultsList"
    );

  const hostWait =
    document.getElementById(
      "redlineResultsHostWait"
    );

  const returnButton =
    document.getElementById(
      "redlineReturnLobbyBtn"
    );

  function getPlayers() {
    return (
      window.REDLINE_MP?.players ??
      []
    );
  }

  function getMyId() {
    return (
      window.REDLINE_MP?.playerId ??
      null
    );
  }

  function expectedRacers() {
    const players =
      getPlayers();

    if (
      players.length > 0
    ) {
      return players.length;
    }

    const hudTotal =
      Number(
        document.getElementById(
          "totalRacers"
        )?.textContent
      );

    return (
      Number.isFinite(hudTotal) &&
      hudTotal > 0
    )
      ? hudTotal
      : 1;
  }

  function isHost() {
    const room =
      window.REDLINE_MP?.room;

    const me =
      getMyId();

    if (
      !room ||
      !me
    ) {
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

    if (
      !Number.isFinite(value)
    ) {
      return "FINISHED";
    }

    const total =
      Math.max(
        0,
        Math.floor(value)
      );

    const minutes =
      Math.floor(
        total / 60000
      );

    const seconds =
      Math.floor(
        (total % 60000) / 1000
      );

    const millis =
      total % 1000;

    return (
      `${String(minutes).padStart(2,"0")}:` +
      `${String(seconds).padStart(2,"0")}.` +
      `${String(millis).padStart(3,"0")}`
    );
  }

  function authoritativeResult(
    playerId
  ) {
    return (
      finishOrder.find(
        item =>
          item?.playerId === playerId
      ) ??
      null
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

  function showOverlay() {
    overlay.classList.remove(
      "hidden"
    );
  }

  function hideOverlay() {
    overlay.classList.add(
      "hidden"
    );
  }

  function showWaiting() {
    showOverlay();

    title.textContent =
      "FINISHED";

    status.textContent =
      `Waiting for racers... ${finishedStates.size}/${expectedRacers()} finished`;

    list.replaceChildren();

    hostWait.textContent =
      "";

    returnButton.hidden =
      true;

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

  function everyoneFinished() {
    const total =
      expectedRacers();

    return (
      total > 0 &&
      finishedStates.size >= total
    );
  }

  function buildOrderedResults() {
    const players =
      getPlayers();

    return players
      .filter(
        player =>
          finishedStates.has(
            player.id
          )
      )
      .map(
        player => {

          const state =
            finishedStates.get(
              player.id
            );

          const official =
            authoritativeResult(
              player.id
            );

          return {
            playerId:
              player.id,

            username:
              official?.username ??
              state?.username ??
              player.username ??
              "Racer",

            car:
              official?.car ??
              state?.car ??
              player.car ??
              "gt",

            place:
              Number(
                official?.place
              ) ||
              null,

            finishTime:
              resultTime(
                official
              ),

            firstSeen:
              state?._firstSeen ??
              Infinity
          };
        }
      )
      .sort(
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
      )
      .map(
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

    ordered.forEach(
      result => {

        const row =
          document.createElement(
            "div"
          );

        row.className =
          "redline-result-row";

        const placeEl =
          document.createElement(
            "div"
          );

        placeEl.className =
          "redline-result-place";

        placeEl.textContent =
          `#${result.place}`;

        const racer =
          document.createElement(
            "div"
          );

        const nameEl =
          document.createElement(
            "div"
          );

        nameEl.className =
          "redline-result-name";

        nameEl.textContent =
          result.username;

        const carEl =
          document.createElement(
            "div"
          );

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
          document.createElement(
            "div"
          );

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

        list.appendChild(
          row
        );
      }
    );

    if (isHost()) {

      hostWait.textContent =
        "";

      returnButton.hidden =
        false;

      returnButton.disabled =
        false;

      returnButton.textContent =
        "RETURN TO LOBBY";

    }

    else {

      hostWait.textContent =
        "Waiting for the host to return everyone to the lobby...";

      returnButton.hidden =
        true;

    }

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
    const myId =
      getMyId();

    if (
      everyoneFinished()
    ) {
      renderResults();
      return;
    }

    if (
      myId &&
      finishedStates.has(
        myId
      )
    ) {
      showWaiting();
    }
  }

  function ingestFinishedState(
    state
  ) {
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

    evaluateResults();
  }

  function ingestFinishPacket(
    detail
  ) {
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

    if (
      Array.isArray(order)
    ) {

      finishOrder =
        order.slice();

      for (
        const item
        of finishOrder
      ) {

        if (
          !item?.playerId
        ) {
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

    if (
      result?.playerId
    ) {

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

    evaluateResults();
  }

  function resetResults() {
    finishedStates.clear();

    finishOrder = [];

    hideOverlay();
  }

  returnButton.addEventListener(
    "click",
    () => {

      if (
        !isHost()
      ) {
        return;
      }

      returnButton.disabled =
        true;

      returnButton.textContent =
        "RETURNING...";

      const sent =
        window.REDLINE_MP
          ?.send?.({
            type: "return_lobby"
          });

      if (!sent) {

        returnButton.disabled =
          false;

        returnButton.textContent =
          "RETURN TO LOBBY";

      }
    }
  );

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

      if (
        event.detail?.startAt
      ) {
        raceStartAt =
          event.detail.startAt;
      }

      if (
        Array.isArray(
          event.detail?.finishOrder
        )
      ) {

        ingestFinishPacket(
          event.detail
        );

      }

      for (
        const state
        of (
          event.detail?.states ??
          []
        )
      ) {

        ingestFinishedState(
          state
        );

      }
    }
  );

  window.addEventListener(
    "redline:countdown",
    event => {

      raceStartAt =
        event.detail?.startAt ??
        window.REDLINE_MP?.raceStartAt ??
        null;

      resetResults();

    }
  );

  window.addEventListener(
    "redline:race-started",
    event => {

      raceStartAt =
        event.detail?.startAt ??
        window.REDLINE_MP?.raceStartAt ??
        raceStartAt;

      resetResults();

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
          ?.phase;

      if (
        phase === "lobby"
      ) {
        resetResults();
      }
    }
  );

  window.addEventListener(
    "redline:disconnected",
    resetResults
  );
})();
