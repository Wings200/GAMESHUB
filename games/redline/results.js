(() => {
  let finishOrder = [];
  let localFinished = false;

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

      background:
        rgba(3, 7, 14, .72);

      backdrop-filter:
        blur(8px);

      font-family:
        Arial, sans-serif;

      color:
        #fff;
    }

    #redlineResultsOverlay.hidden {
      display: none;
    }

    #redlineResultsCard {
      width:
        min(680px, 100%);

      max-height:
        82vh;

      overflow:
        auto;

      border:
        1px solid rgba(255,255,255,.15);

      border-radius:
        18px;

      background:
        rgba(12, 18, 30, .96);

      padding:
        24px;
    }

    #redlineResultsTitle {
      margin:
        0 0 6px;

      font-size:
        clamp(30px, 5vw, 48px);

      font-weight:
        900;
    }

    #redlineResultsStatus {
      margin:
        0 0 20px;

      color:
        rgba(255,255,255,.68);

      font-weight:
        700;
    }

    #redlineResultsList {
      display:
        grid;

      gap:
        10px;
    }

    .redline-result-row {
      display:
        grid;

      grid-template-columns:
        58px 1fr auto;

      gap:
        14px;

      align-items:
        center;

      padding:
        14px 16px;

      border-radius:
        12px;

      background:
        rgba(255,255,255,.06);

      border:
        1px solid rgba(255,255,255,.08);
    }

    .redline-result-place {
      font-size:
        22px;

      font-weight:
        900;
    }

    .redline-result-name {
      font-size:
        17px;

      font-weight:
        800;
    }

    .redline-result-car {
      margin-top:
        3px;

      color:
        rgba(255,255,255,.55);

      font-size:
        12px;

      font-weight:
        700;
    }

    .redline-result-time {
      font-variant-numeric:
        tabular-nums;

      font-weight:
        900;
    }

    #redlineResultsActions {
      margin-top:
        20px;

      display:
        flex;

      align-items:
        center;

      justify-content:
        flex-end;

      gap:
        12px;

      flex-wrap:
        wrap;
    }

    #redlineResultsHostWait {
      margin-right:
        auto;

      color:
        rgba(255,255,255,.62);

      font-size:
        13px;

      font-weight:
        700;
    }

    #redlineReturnLobbyBtn {
      min-height:
        44px;

      border:
        0;

      border-radius:
        10px;

      padding:
        0 18px;

      background:
        #fff;

      color:
        #0b1019;

      font-weight:
        900;

      cursor:
        pointer;
    }

    #redlineReturnLobbyBtn:disabled {
      opacity:
        .55;
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

  function formatTime(ms) {

    if (
      !Number.isFinite(
        Number(ms)
      )
    ) {
      return "—";
    }

    const total =
      Math.max(
        0,
        Math.floor(
          Number(ms)
        )
      );

    const minutes =
      Math.floor(
        total / 60000
      );

    const seconds =
      Math.floor(
        (total % 60000)
        / 1000
      );

    const millis =
      total % 1000;

    return (
      `${String(minutes).padStart(2, "0")}:` +
      `${String(seconds).padStart(2, "0")}.` +
      `${String(millis).padStart(3, "0")}`
    );
  }

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
  }

  function allRacersFinished() {

    const total =
      getPlayers().length;

    return (
      total > 0 &&
      finishOrder.length >= total
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
      [...finishOrder]
        .sort(
          (a, b) =>
            (Number(a?.place) || Infinity)
            -
            (Number(b?.place) || Infinity)
        );

    ordered.forEach(
      (result, index) => {

        const player =
          players.find(
            item =>
              item.id ===
              result?.playerId
          );

        const place =
          Number(result?.place)
          ||
          index + 1;

        const username =
          result?.username ??
          player?.username ??
          `Racer ${place}`;

        const car =
          result?.car ??
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
            finishOrder
          }
        }
      )
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
        window.REDLINE_MP?.send?.({
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

      const detail =
        event.detail ?? {};

      if (
        Array.isArray(
          detail.finishOrder
        )
      ) {

        finishOrder =
          detail.finishOrder;
      }

      const me =
        window.REDLINE_MP?.playerId;

      if (
        detail.result?.playerId ===
        me
      ) {

        localFinished =
          true;
      }

      if (
        allRacersFinished()
      ) {

        renderResults();

      }

      else if (
        localFinished
      ) {

        showWaiting();

      }
    }
  );

  window.addEventListener(
    "redline:race-snapshot",
    event => {

      const detail =
        event.detail ?? {};

      if (
        Array.isArray(
          detail.finishOrder
        )
      ) {

        finishOrder =
          detail.finishOrder;
      }

      const me =
        window.REDLINE_MP?.playerId;

      localFinished =
        finishOrder.some(
          result =>
            result?.playerId === me
        );

      if (
        allRacersFinished()
      ) {

        renderResults();

      }

      else if (
        localFinished
      ) {

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
        event.detail;

      const phase =
        room?.phase ??
        window.REDLINE_MP?.room?.phase;

      if (
        phase === "lobby"
      ) {

        finishOrder = [];
        localFinished = false;

        hideOverlay();

        document
          .getElementById("hud")
          ?.classList
          .add("hidden");

        document
          .getElementById("menu")
          ?.classList
          .remove("hidden");
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
