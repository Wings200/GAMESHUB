(() => {
  let finishOrder = [];
  let localFinished = false;
  let finishHookInstalled = false;

  const carNames = {
    gt: "REDLINE GT",
    vortex: "VORTEX R",
    apex: "APEX S"
  };

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

      background: rgba(3, 7, 14, .78);
      backdrop-filter: blur(8px);

      font-family: Arial, sans-serif;
      color: white;
    }

    #redlineResultsOverlay.hidden {
      display: none;
    }

    #redlineResultsCard {
      width: min(680px, 100%);
      max-height: 82vh;
      overflow: auto;

      padding: 24px;

      border-radius: 18px;

      background: rgba(12, 18, 30, .97);

      border:
        1px solid rgba(255,255,255,.15);
    }

    #redlineResultsTitle {
      margin: 0 0 6px;

      font-size: clamp(30px, 5vw, 48px);
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

      background: white;
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

  document.body.appendChild(overlay);

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

  function getRoom() {
    return (
      window.REDLINE_MP?.room ??
      null
    );
  }

  function expectedRacers() {
    const players =
      getPlayers();

    if (players.length) {
      return players.length;
    }

    const hudTotal =
      Number(
        document.getElementById(
          "totalRacers"
        )?.textContent
      );

    if (
      Number.isFinite(hudTotal) &&
      hudTotal > 0
    ) {
      return hudTotal;
    }

    return Math.max(
      1,
      finishOrder.length
    );
  }

  function isHost() {
    const room =
      getRoom();

    const me =
      window.REDLINE_MP?.playerId;

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
      return "—";
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
      `${String(minutes).padStart(2, "0")}:` +
      `${String(seconds).padStart(2, "0")}.` +
      `${String(millis).padStart(3, "0")}`
    );
  }

  function getFinishTime(result) {
    return (
      result?.finishTime ??
      result?.time ??
      result?.elapsed ??
      result?.elapsedMs ??
      result?.finishMs ??
      null
    );
  }

  function addFinishResult(result) {
    if (
      !result ||
      !result.playerId
    ) {
      return;
    }

    const existing =
      finishOrder.findIndex(
        item =>
          item.playerId ===
          result.playerId
      );

    if (existing >= 0) {
      finishOrder[existing] = {
        ...finishOrder[existing],
        ...result
      };
    } else {
      finishOrder.push(result);
    }

    finishOrder.sort(
      (a, b) =>
        (Number(a.place) || Infinity)
        -
        (Number(b.place) || Infinity)
    );
  }

  function normalizeFinishEvent(raw) {
    const detail =
      raw ?? {};

    const payload =
      detail.payload ??
      detail.data ??
      detail;

    let result =
      payload.result ??
      detail.result ??
      null;

    if (
      !result &&
      payload.playerId
    ) {
      result =
        payload;
    }

    const order =
      payload.finishOrder ??
      detail.finishOrder ??
      payload.results ??
      detail.results ??
      null;

    return {
      result,
      order:
        Array.isArray(order)
          ? order
          : null
    };
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
      "Waiting for the other racers to finish...";

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
    const expected =
      expectedRacers();

    return (
      expected > 0 &&
      finishOrder.length >= expected
    );
  }

  function renderResults() {
    const players =
      getPlayers();

    showOverlay();

    title.textContent =
      "RACE RESULTS";

    status.textContent =
      "All racers finished.";

    list.replaceChildren();

    const ordered =
      [...finishOrder].sort(
        (a, b) =>
          (Number(a.place) || Infinity)
          -
          (Number(b.place) || Infinity)
      );

    ordered.forEach(
      (result, index) => {

        const player =
          players.find(
            item =>
              item.id ===
              result.playerId
          );

        const place =
          Number(result.place) ||
          index + 1;

        const username =
          result.username ??
          player?.username ??
          `Racer ${place}`;

        const car =
          result.car ??
          player?.car ??
          "gt";

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
          `#${place}`;

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
          username;

        const carEl =
          document.createElement(
            "div"
          );

        carEl.className =
          "redline-result-car";

        carEl.textContent =
          carNames[car] ??
          String(car).toUpperCase();

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
            getFinishTime(result)
          );

        row.append(
          placeEl,
          racer,
          timeEl
        );

        list.appendChild(row);
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
            finishOrder
          }
        }
      )
    );
  }

  function processFinishEvent(detail) {
    const normalized =
      normalizeFinishEvent(detail);

    if (normalized.order) {
      finishOrder =
        normalized.order.slice();
    }

    if (normalized.result) {
      addFinishResult(
        normalized.result
      );
    }

    const me =
      window.REDLINE_MP?.playerId;

    if (
      normalized.result?.playerId === me
    ) {
      localFinished =
        true;
    }

    if (
      finishOrder.some(
        result =>
          result.playerId === me
      )
    ) {
      localFinished =
        true;
    }

    if (everyoneFinished()) {
      renderResults();
      return;
    }

    if (localFinished) {
      showWaiting();
    }
  }

  function installFinishHook() {
    if (
      finishHookInstalled ||
      !window.REDLINE_MP ||
      typeof window.REDLINE_MP.sendFinish !==
        "function"
    ) {
      return false;
    }

    const original =
      window.REDLINE_MP.sendFinish.bind(
        window.REDLINE_MP
      );

    window.REDLINE_MP.sendFinish =
      (...args) => {

        localFinished =
          true;

        showWaiting();

        return original(...args);
      };

    finishHookInstalled =
      true;

    return true;
  }

  if (!installFinishHook()) {
    const hookTimer =
      setInterval(
        () => {
          if (installFinishHook()) {
            clearInterval(
              hookTimer
            );
          }
        },
        100
      );
  }

  returnButton.addEventListener(
    "click",
    () => {

      if (!isHost()) {
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
    "redline:player-finished",
    event => {
      processFinishEvent(
        event.detail
      );
    }
  );

  window.addEventListener(
    "redline:race-snapshot",
    event => {

      const detail =
        event.detail ?? {};

      const order =
        detail.finishOrder ??
        detail.payload?.finishOrder ??
        detail.data?.finishOrder;

      if (Array.isArray(order)) {
        finishOrder =
          order.slice();
      }

      const me =
        window.REDLINE_MP?.playerId;

      localFinished =
        finishOrder.some(
          result =>
            result.playerId === me
        );

      if (everyoneFinished()) {
        renderResults();
      }

      else if (localFinished) {
        showWaiting();
      }
    }
  );

  window.addEventListener(
    "redline:countdown",
    () => {

      finishOrder = [];
      localFinished = false;

      hideOverlay();
    }
  );

  window.addEventListener(
    "redline:race-started",
    () => {

      finishOrder = [];
      localFinished = false;

      hideOverlay();
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

      if (phase === "lobby") {
        finishOrder = [];
        localFinished = false;

        hideOverlay();
      }
    }
  );

  window.addEventListener(
    "redline:disconnected",
    () => {

      finishOrder = [];
      localFinished = false;

      hideOverlay();
    }
  );
})();
