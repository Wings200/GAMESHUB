(() => {
  const carNames = {
    gt: "REDLINE GT",
    vortex: "VORTEX R",
    apex: "APEX S"
  };

  let lastRoom = null;

  const style =
    document.createElement(
      "style"
    );

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
        rgba(3,7,14,.80);

      backdrop-filter:
        blur(8px);

      font-family:
        Arial,sans-serif;

      color:
        #fff;
    }

    #redlineResultsOverlay.hidden {
      display: none;
    }

    #redlineResultsCard {
      width:
        min(680px,100%);

      max-height:
        82vh;

      overflow:
        auto;

      padding:
        24px;

      border-radius:
        18px;

      background:
        rgba(12,18,30,.97);

      border:
        1px solid
        rgba(255,255,255,.15);
    }

    #redlineResultsTitle {
      margin:
        0 0 6px;

      font-size:
        clamp(30px,5vw,48px);

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
        1px solid
        rgba(255,255,255,.08);
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

      cursor:
        default;
    }
  `;

  document.head.appendChild(
    style
  );

  const overlay =
    document.createElement(
      "div"
    );

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

  function getRoom() {
    return (
      lastRoom ||
      window.REDLINE_MP?.room ||
      null
    );
  }

  function getMyId() {
    return (
      window.REDLINE_MP
        ?.playerId ||
      null
    );
  }

  function isHost(
    room = getRoom()
  ) {
    const me =
      getMyId();

    if (
      !room ||
      !me
    ) {
      return false;
    }

    if (
      room.hostId
    ) {
      return (
        room.hostId === me
      );
    }

    const mePlayer =
      room.players
        ?.find(
          player =>
            player.id === me
        );

    return Boolean(
      mePlayer?.host
    );
  }

  function formatTime(
    ms
  ) {
    const value =
      Number(ms);

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
      `${String(minutes).padStart(2,"0")}:` +
      `${String(seconds).padStart(2,"0")}.` +
      `${String(millis).padStart(3,"0")}`
    );
  }

  function hide() {
    overlay.classList.add(
      "hidden"
    );
  }

  function showWaiting(
    room
  ) {
    overlay.classList.remove(
      "hidden"
    );

    title.textContent =
      "FINISHED";

    const count =
      room.finishOrder
        ?.length ||
      0;

    const total =
      room.players
        ?.length ||
      1;

    status.textContent =
      `Waiting for racers... ${count}/${total} finished`;

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
            waiting:
              true
          }
        }
      )
    );
  }

  function showResults(
    room
  ) {
    overlay.classList.remove(
      "hidden"
    );

    title.textContent =
      "RACE RESULTS";

    status.textContent =
      "All racers finished.";

    list.replaceChildren();

    const ordered =
      [
        ...(
          room.finishOrder ||
          []
        )
      ].sort(
        (a, b) =>
          (
            Number(a.place) ||
            Infinity
          )
          -
          (
            Number(b.place) ||
            Infinity
          )
      );

    ordered.forEach(
      (
        result,
        index
      ) => {
        const player =
          room.players
            ?.find(
              item =>
                item.id ===
                result.playerId
            );

        const row =
          document.createElement(
            "div"
          );

        row.className =
          "redline-result-row";

        const place =
          document.createElement(
            "div"
          );

        place.className =
          "redline-result-place";

        place.textContent =
          `#${
            Number(
              result.place
            ) ||
            index + 1
          }`;

        const racer =
          document.createElement(
            "div"
          );

        const name =
          document.createElement(
            "div"
          );

        name.className =
          "redline-result-name";

        name.textContent =
          result.username ||
          player?.username ||
          "Racer";

        const car =
          document.createElement(
            "div"
          );

        car.className =
          "redline-result-car";

        const carId =
          result.car ||
          player?.car ||
          "gt";

        car.textContent =
          carNames[
            carId
          ] ||
          String(
            carId
          ).toUpperCase();

        racer.append(
          name,
          car
        );

        const time =
          document.createElement(
            "div"
          );

        time.className =
          "redline-result-time";

        time.textContent =
          formatTime(
            result.finishTime
          );

        row.append(
          place,
          racer,
          time
        );

        list.appendChild(
          row
        );
      }
    );

    if (
      isHost(
        room
      )
    ) {
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
            waiting:
              false,

            finishOrder:
              ordered
          }
        }
      )
    );
  }

  function evaluate(
    room = getRoom()
  ) {
    if (!room) {
      return;
    }

    lastRoom =
      room;

    if (
      room.phase ===
      "lobby" ||
      room.phase ===
      "car_select" ||
      room.phase ===
      "countdown"
    ) {
      hide();

      return;
    }

    if (
      room.phase ===
      "results" ||
      room.raceComplete
    ) {
      showResults(
        room
      );

      return;
    }

    if (
      room.phase ===
      "racing"
    ) {
      const me =
        getMyId();

      const finished =
        (
          room.finishOrder ||
          []
        ).some(
          result =>
            result.playerId ===
            me
        );

      if (
        finished
      ) {
        showWaiting(
          room
        );
      }

      else {
        hide();
      }
    }
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
            type:
              "return_lobby"
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
    "redline:room-state",
    event => {
      const room =
        event.detail?.room ??
        event.detail?.state ??
        event.detail;

      if (
        room?.code
      ) {
        evaluate(
          room
        );
      }
    }
  );

  window.addEventListener(
    "redline:race-snapshot",
    event => {
      const room =
        event.detail?.room ||
        window.REDLINE_MP
          ?.room;

      if (!room) {
        return;
      }

      if (
        Array.isArray(
          event.detail
            ?.finishOrder
        )
      ) {
        room.finishOrder =
          event.detail
            .finishOrder;
      }

      if (
        event.detail
          ?.raceComplete
      ) {
        room.raceComplete =
          true;

        room.phase =
          "results";
      }

      evaluate(
        room
      );
    }
  );

  window.addEventListener(
    "redline:player-finished",
    event => {
      const room =
        event.detail?.room ||
        window.REDLINE_MP
          ?.room;

      if (!room) {
        return;
      }

      if (
        Array.isArray(
          event.detail
            ?.finishOrder
        )
      ) {
        room.finishOrder =
          event.detail
            .finishOrder;
      }

      if (
        event.detail
          ?.raceComplete
      ) {
        room.raceComplete =
          true;

        room.phase =
          "results";
      }

      evaluate(
        room
      );
    }
  );

  document.addEventListener(
    "visibilitychange",
    () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        evaluate();
      }
    }
  );

  window.addEventListener(
    "focus",
    () =>
      evaluate()
  );

  window.addEventListener(
    "pageshow",
    () =>
      evaluate()
  );

  setTimeout(
    () =>
      evaluate(),
    250
  );
})();
