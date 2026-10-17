(() => {

  const carNames = {
    gt: "REDLINE GT",
    vortex: "VORTEX R",
    apex: "APEX S"
  };


  let lastRoom = null;

  /*
    Once the server says the race is complete, keep a frozen copy of
    the final standings on screen. Late race_state / snapshot messages
    are allowed to arrive after race_complete, so they must not replace
    the final results with the temporary "waiting" view.
  */
  let resultsLocked = false;
  let completedRoom = null;
  let lastPodiumSignature = "";


  function snapshotRoom(
    room
  ) {

    if (
      !room
    ) {

      return null;

    }


    return {
      ...room,

      players:
        Array.isArray(
          room.players
        )
        ?
        room.players.map(
          player => ({
            ...player
          })
        )
        :
        [],

      finishOrder:
        Array.isArray(
          room.finishOrder
        )
        ?
        room.finishOrder.map(
          result => ({
            ...result
          })
        )
        :
        []
    };

  }


  /* =========================================================
     RESULTS UI
  ========================================================= */

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

    .redline-result-cash {
      margin-top:6px;color:#a3ffc7;font-size:12px;font-weight:900;
      text-shadow:0 0 9px rgba(77,255,162,.17);
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
      opacity:.55;
      cursor:default;
    }
    #redlineResultsPodium {
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:10px;
      align-items:end;
      margin:0 0 20px;
    }
    #redlineResultsPodium:empty{display:none}
    .redline-podium-card {
      text-align:center;
      padding:14px 8px 10px;
      border-radius:12px;
      border:1px solid rgba(150,182,230,.20);
      background:linear-gradient(155deg,rgba(20,33,54,.92),rgba(8,15,29,.9));
      animation:redlinePodiumRise .5s ease-out both;
      min-height:104px;
    }
    .redline-podium-card.place-1 {
      order:2;min-height:155px;
      border-color:rgba(255,208,105,.65);
      box-shadow:0 0 22px rgba(240,180,61,.12);
    }
    .redline-podium-card.place-2 {order:1;min-height:124px}
    .redline-podium-card.place-3 {order:3}
    .redline-podium-medal {font-size:27px;margin:0 0 6px}
    .redline-podium-name {
      font-size:13px;font-weight:900;white-space:nowrap;
      overflow:hidden;text-overflow:ellipsis;
    }
    .redline-podium-time {
      font-size:11px;color:rgba(231,241,255,.64);
      font-variant-numeric:tabular-nums;margin-top:6px;
    }
    .redline-podium-cash {font-size:12px;font-weight:900;color:#9cffc1;margin-top:6px}
    .redline-result-row.place-1{border-color:rgba(255,207,90,.35)}
    .redline-result-row.place-2{border-color:rgba(183,212,255,.29)}
    .redline-result-row.place-3{border-color:rgba(216,157,95,.29)}
    @keyframes redlinePodiumRise {
      from{opacity:0;transform:translateY(18px)}
      to{opacity:1;transform:translateY(0)}
    }
    @media(max-width:540px) {
      #redlineResultsCard{padding:14px}
      #redlineResultsPodium{gap:5px}
      .redline-podium-card{padding:10px 5px}
      .redline-podium-name{font-size:11px}
      .redline-result-row{grid-template-columns:36px 1fr auto;padding:10px;gap:7px}
    }
    @media(prefers-reduced-motion:reduce){
      .redline-podium-card{animation:none}
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

      <div id="redlineResultsPodium" aria-label="Race podium"></div>
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
  const podium=document.getElementById("redlineResultsPodium");


  const hostWait =
    document.getElementById(
      "redlineResultsHostWait"
    );


  const returnButton =
    document.getElementById(
      "redlineReturnLobbyBtn"
    );


  /* =========================================================
     HELPERS
  ========================================================= */

  function getRoom() {

    return (
      lastRoom
      ||
      window.REDLINE_MP?.room
      ||
      null
    );

  }


  function getMyId() {

    return (
      window.REDLINE_MP?.playerId
      ||
      null
    );

  }


  function isHost(
    room = getRoom()
  ) {

    const me =
      getMyId();


    if (
      !room
      ||
      !me
    ) {

      return false;

    }


    if (
      room.hostId
    ) {

      return (
        room.hostId ===
        me
      );

    }


    const mePlayer =
      room.players
        ?.find(
          player =>
            player.id ===
            me
        );


    return Boolean(
      mePlayer?.host
    );

  }


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


  /* =========================================================
     IMPORTANT:
     ACTUALLY RESTORE THE LOBBY UI
  ========================================================= */

  function restoreLobbyUI() {

    const menu =
      document.getElementById(
        "menu"
      );


    const hud =
      document.getElementById(
        "hud"
      );


    const countdown =
      document.getElementById(
        "countdown"
      );


    const checkpointPopup =
      document.getElementById(
        "checkpointPopup"
      );


    const message =
      document.getElementById(
        "message"
      );


    /*
      game.js hides the WHOLE menu when a race starts.

      We must explicitly bring that parent back.
    */

    menu?.classList.remove(
      "hidden"
    );


    /*
      Hide the race HUD/canvas UI.
    */

    hud?.classList.add(
      "hidden"
    );


    countdown?.classList.add(
      "hidden"
    );


    checkpointPopup?.classList.add(
      "hidden"
    );


    message?.classList.add(
      "hidden"
    );


    /*
      Make absolutely sure LOBBY is the visible
      menu screen.

      index.html should already do this too,
      but we're making the return bulletproof.
    */

    const screenIds = [
      "homeScreen",
      "joinScreen",
      "createScreen",
      "lobbyScreen",
      "carSelectScreen"
    ];


    for (
      const id
      of screenIds
    ) {

      const screen =
        document.getElementById(
          id
        );


      if (!screen) {

        continue;

      }


      const lobby =
        id ===
        "lobbyScreen";


      screen.classList.toggle(
        "hidden",
        !lobby
      );


      screen.classList.toggle(
        "active-screen",
        lobby
      );

    }


    /*
      Bring background music back up.
    */

    window.REDLINE_MUSIC
      ?.setNormal?.();

  }


  /* =========================================================
     OVERLAY
  ========================================================= */

  function hideResults() {
    overlay.classList.add("hidden");
    lastPodiumSignature="";
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
        ?.length
      ||
      0;


    const total =
      room.players
        ?.length
      ||
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


    const ordered =
      [
        ...(
          room.finishOrder
          ||
          []
        )
      ]
        .sort(
          (
            a,
            b
          ) => {

            return (
              (
                Number(
                  a.place
                )
                ||
                Infinity
              )
              -
              (
                Number(
                  b.place
                )
                ||
                Infinity
              )
            );

          }
        );


    const signature=JSON.stringify({
      id:room.raceId||room.raceStartAt,
      finish:ordered.map(r=>[r.playerId,r.place,r.finishTime,r.cashEarned]),
      players:room.players?.length||0
    });
    if(signature!==lastPodiumSignature) {
      lastPodiumSignature=signature;
      list.replaceChildren();
      podium.replaceChildren();
      const medals=["🥇","🥈","🥉"];
      for(const result of ordered.slice(0,3)) {
        const place=Number(result.place);
        if(!Number.isInteger(place)||place<1||place>3)continue;
        const player=room.players?.find(p=>p.id===result.playerId);
        const card=document.createElement("div");
        card.className="redline-podium-card place-"+place;
        const medal=document.createElement("div");
        medal.className="redline-podium-medal";
        medal.textContent=medals[place-1];
        const name=document.createElement("div");
        name.className="redline-podium-name";
        name.textContent=result.username||player?.username||"Racer";
        const time=document.createElement("div");
        time.className="redline-podium-time";
        time.textContent=formatTime(result.finishTime);
        card.append(medal,name,time);
        if(Number.isSafeInteger(result.cashEarned)&&result.cashEarned>=0) {
          const cash=document.createElement("div");
          cash.className="redline-podium-cash";
          cash.textContent="+$"+result.cashEarned+" CASH";
          card.append(cash);
        }
        podium.append(card);
      }
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
          "redline-result-row place-"+String(result.place||index+1);


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
            )
            ||
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
          result.username
          ||
          player?.username
          ||
          "Racer";


        const car =
          document.createElement(
            "div"
          );


        car.className =
          "redline-result-car";


        const carId =
          result.car
          ||
          player?.car
          ||
          "gt";


        car.textContent =
          carNames[
            carId
          ]
          ||
          String(
            carId
          ).toUpperCase();


        racer.append(
          name,
          car
        );

        // Shown only for grants confirmed by the Worker.
        const prize=Number(result.cashEarned);
        if(Number.isSafeInteger(prize) && prize>=0 &&
           result.cashEarned!==undefined){
          const award=document.createElement("div");
          award.className="redline-result-cash";
          award.textContent="+$"+prize+" CASH";
          racer.appendChild(award);
        }

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
    }


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


  /* =========================================================
     ROOM EVALUATION
  ========================================================= */

  function evaluate(
    room = getRoom()
  ) {

    if (
      !room
    ) {

      return;

    }


    lastRoom =
      room;


    /*
      A completed race stays locked on the final results screen until
      the server sends a genuinely reset lobby state. This prevents
      late racing/snapshot packets from flashing the standings for a
      moment and then wiping them out.
    */

    if (
      resultsLocked
    ) {

      const cleanLobby =
        room.phase ===
        "lobby"
        &&
        !room.raceComplete
        &&
        (
          !Array.isArray(
            room.finishOrder
          )
          ||
          room.finishOrder.length ===
          0
        );


      if (
        cleanLobby
      ) {

        resultsLocked =
          false;


        completedRoom =
          null;


        hideResults();


        restoreLobbyUI();


        return;

      }


      if (
        completedRoom
      ) {

        showResults(
          completedRoom
        );

      }


      return;

    }


    /* ---------------------------------------------------------
       LOBBY
    --------------------------------------------------------- */

    if (
      room.phase ===
      "lobby"
    ) {

      hideResults();


      restoreLobbyUI();


      return;

    }


    /* ---------------------------------------------------------
       CAR SELECT / COUNTDOWN
    --------------------------------------------------------- */

    if (
      room.phase ===
      "car_select"
      ||
      room.phase ===
      "countdown"
    ) {

      hideResults();


      return;

    }


    /* ---------------------------------------------------------
       RESULTS
    --------------------------------------------------------- */

    if (
      room.phase ===
      "results"
      ||
      room.raceComplete
    ) {

      resultsLocked =
        true;


      completedRoom =
        snapshotRoom(
          room
        );


      showResults(
        completedRoom
        ||
        room
      );


      return;

    }


    /* ---------------------------------------------------------
       RACING
    --------------------------------------------------------- */

    if (
      room.phase ===
      "racing"
    ) {

      const me =
        getMyId();


      const finished =
        (
          room.finishOrder
          ||
          []
        )
          .some(
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

        hideResults();

      }

    }

  }


  /* =========================================================
     RETURN TO LOBBY BUTTON
  ========================================================= */

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


      if (
        !sent
      ) {

        returnButton.disabled =
          false;


        returnButton.textContent =
          "RETURN TO LOBBY";

      }

    }
  );


  /* =========================================================
     ROOM STATE
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
        !room?.code
      ) {

        return;

      }


      evaluate(
        room
      );

    }
  );


  /* =========================================================
     PLAYER FINISH
  ========================================================= */

  window.addEventListener(
    "redline:player-finished",
    event => {

      const room =
        event.detail?.room
        ||
        window.REDLINE_MP?.room;


      if (
        !room
      ) {

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


  /* =========================================================
     RACE COMPLETE
  ========================================================= */

  window.addEventListener(
    "redline:race-complete",
    event => {

      const room =
        event.detail?.room
        ||
        window.REDLINE_MP?.room;


      if (
        !room
      ) {

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


      room.raceComplete =
        true;


      room.phase =
        "results";


      /*
        Lock immediately on the authoritative race_complete event,
        before any later room-state packet has a chance to replace it.
      */

      resultsLocked =
        true;


      completedRoom =
        snapshotRoom(
          room
        );


      showResults(
        completedRoom
        ||
        room
      );

    }
  );


  /* =========================================================
     RECONNECT SNAPSHOT
  ========================================================= */

  window.addEventListener(
    "redline:race-snapshot",
    event => {

      const room =
        event.detail?.room
        ||
        window.REDLINE_MP?.room;


      if (
        !room
      ) {

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


  /* =========================================================
     TAB SWITCH / WINDOW FOCUS
  ========================================================= */

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
    () => {

      evaluate();

    }
  );


  window.addEventListener(
    "pageshow",
    () => {

      evaluate();

    }
  );


  /* =========================================================
     INITIAL CHECK
  ========================================================= */

  setTimeout(
    () => {

      evaluate();

    },
    250
  );

})();
