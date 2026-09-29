import { DurableObject } from "cloudflare:workers";


/* =========================================================
   REDLINE MULTIPLAYER SERVER V2

   Handles:
   - Public/private rooms
   - 1-8 racers
   - Host
   - Lobby sync
   - Car selection
   - Ready states
   - Countdown
   - Live race-state relay
   - Finish order foundation

   IMPORTANT:
   Race position packets are NOT written to Durable Object
   storage every frame. They stay in memory during the race.
========================================================= */


const ROOM_CODE_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


const VALID_CARS =
  new Set([
    "gt",
    "vortex",
    "apex"
  ]);


const VALID_MAPS =
  new Set([
    "neon",
    "canyon",
    "arctic"
  ]);


const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};


/* =========================================================
   HELPERS
========================================================= */

function json(
  data,
  status = 200
) {

  return new Response(
    JSON.stringify(data),
    {
      status,

      headers: {
        "Content-Type":
          "application/json; charset=utf-8",

        "Cache-Control":
          "no-store",

        ...CORS_HEADERS
      }
    }
  );
}


function cleanUsername(value) {

  const name =
    String(value ?? "")
      .replace(/[<>]/g, "")
      .trim()
      .slice(0, 18);


  return name || "Racer";
}


function cleanRoomName(
  value,
  username
) {

  const name =
    String(value ?? "")
      .replace(/[<>]/g, "")
      .trim()
      .slice(0, 24);


  return (
    name ||
    `${username}'s Room`
  );
}


function clampPlayerCount(value) {

  return Math.max(
    1,
    Math.min(
      8,
      Number(value) || 8
    )
  );
}


function finiteNumber(
  value,
  fallback = 0
) {

  const number =
    Number(value);


  return Number.isFinite(number)
    ?
    number
    :
    fallback;
}


function clamp(
  value,
  min,
  max
) {

  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}


function makeRoomCode() {

  const bytes =
    new Uint8Array(6);


  crypto.getRandomValues(
    bytes
  );


  let code =
    "";


  for (
    const byte
    of bytes
  ) {

    code +=
      ROOM_CODE_CHARS[
        byte %
        ROOM_CODE_CHARS.length
      ];

  }


  return code;
}


function publicPlayer(player) {

  return {
    id:
      player.id,

    username:
      player.username,

    host:
      player.host,

    connected:
      player.connected,

    car:
      player.car,

    ready:
      player.ready
  };
}


function publicRoom(room) {

  return {
    code:
      room.code,

    name:
      room.name,

    privacy:
      room.privacy,

    maxPlayers:
      room.maxPlayers,

    map:
      room.map,

    phase:
      room.phase,

    hostId:
      room.hostId,

    createdAt:
      room.createdAt,

    raceStartAt:
      room.raceStartAt ?? null,

    players:
      room.players.map(
        publicPlayer
      )
  };
}


function roomSummary(room) {

  return {
    code:
      room.code,

    name:
      room.name,

    players:
      room.players.length,

    maxPlayers:
      room.maxPlayers,

    map:
      room.map,

    phase:
      room.phase,

    createdAt:
      room.createdAt
  };
}


async function readJson(request) {

  try {

    return await request.json();

  }

  catch {

    return null;

  }
}


function roomStub(
  env,
  code
) {

  return env.ROOMS.getByName(
    `room:${code}`
  );
}


function directoryStub(env) {

  return env.DIRECTORY.getByName(
    "redline-public-directory"
  );
}


/* =========================================================
   MAIN WORKER
========================================================= */

export default {

  async fetch(
    request,
    env
  ) {

    const url =
      new URL(
        request.url
      );


    /* -----------------------------------------------------
       CORS
    ----------------------------------------------------- */

    if (
      request.method ===
      "OPTIONS"
    ) {

      return new Response(
        null,
        {
          status: 204,
          headers:
            CORS_HEADERS
        }
      );
    }


    /* -----------------------------------------------------
       HEALTH
    ----------------------------------------------------- */

    if (
      url.pathname === "/"
      ||
      url.pathname === "/health"
    ) {

      return json({
        ok: true,

        service:
          "REDLINE multiplayer",

        version: 2
      });
    }


    /* -----------------------------------------------------
       PUBLIC ROOM LIST
    ----------------------------------------------------- */

    if (
      url.pathname ===
      "/api/rooms"
      &&
      request.method ===
      "GET"
    ) {

      const rooms =
        await directoryStub(
          env
        ).listRooms();


      return json({
        rooms
      });
    }


    /* -----------------------------------------------------
       CREATE ROOM
    ----------------------------------------------------- */

    if (
      url.pathname ===
      "/api/rooms"
      &&
      request.method ===
      "POST"
    ) {

      const body =
        await readJson(
          request
        );


      if (!body) {

        return json(
          {
            error:
              "Invalid JSON body."
          },
          400
        );
      }


      const username =
        cleanUsername(
          body.username
        );


      const privacy =
        body.privacy ===
        "private"
          ?
          "private"
          :
          "public";


      const maxPlayers =
        clampPlayerCount(
          body.maxPlayers
        );


      const name =
        cleanRoomName(
          body.name,
          username
        );


      let code =
        null;


      let room =
        null;


      for (
        let attempt = 0;
        attempt < 12;
        attempt++
      ) {

        const candidate =
          makeRoomCode();


        const candidateRoom =
          roomStub(
            env,
            candidate
          );


        if (
          !(
            await candidateRoom.exists()
          )
        ) {

          code =
            candidate;


          room =
            candidateRoom;


          break;

        }
      }


      if (
        !code ||
        !room
      ) {

        return json(
          {
            error:
              "Could not allocate a room code."
          },
          503
        );
      }


      const created =
        await room.createRoom({
          code,
          name,
          privacy,
          maxPlayers,
          username
        });


      return json(
        created,
        201
      );
    }


    /* -----------------------------------------------------
       ROOM ROUTES
    ----------------------------------------------------- */

    const roomMatch =
      url.pathname.match(
        /^\/api\/rooms\/([A-Z0-9]{6})(?:\/(join|ws))?$/i
      );


    if (roomMatch) {

      const code =
        roomMatch[1]
          .toUpperCase();


      const action =
        roomMatch[2]
        ||
        "snapshot";


      const room =
        roomStub(
          env,
          code
        );


      /* -----------------------------------------------
         ROOM SNAPSHOT
      ----------------------------------------------- */

      if (
        action ===
        "snapshot"
        &&
        request.method ===
        "GET"
      ) {

        const snapshot =
          await room.getSnapshot();


        if (!snapshot) {

          return json(
            {
              error:
                "Room not found."
            },
            404
          );
        }


        return json({
          room:
            snapshot
        });
      }


      /* -----------------------------------------------
         JOIN
      ----------------------------------------------- */

      if (
        action ===
        "join"
        &&
        request.method ===
        "POST"
      ) {

        const body =
          await readJson(
            request
          );


        const result =
          await room.joinRoom({
            username:
              cleanUsername(
                body?.username
              )
          });


        if (!result.ok) {

          return json(
            {
              error:
                result.error
            },

            result.status || 400
          );
        }


        return json(
          result.data
        );
      }


      /* -----------------------------------------------
         WEBSOCKET
      ----------------------------------------------- */

      if (
        action ===
        "ws"
        &&
        request.method ===
        "GET"
      ) {

        if (
          (
            request.headers.get(
              "Upgrade"
            )
            ||
            ""
          )
            .toLowerCase()
          !==
          "websocket"
        ) {

          return json(
            {
              error:
                "Expected WebSocket upgrade."
            },
            426
          );
        }


        return room.fetch(
          request
        );
      }
    }


    return json(
      {
        error:
          "Not found."
      },
      404
    );
  }
};


/* =========================================================
   PUBLIC ROOM DIRECTORY
========================================================= */

export class RedlineDirectory
  extends DurableObject {

  constructor(
    ctx,
    env
  ) {

    super(
      ctx,
      env
    );


    this.rooms =
      {};


    this.ctx
      .blockConcurrencyWhile(
        async () => {

          this.rooms =
            (
              await this.ctx
                .storage
                .get(
                  "rooms"
                )
            )
            ||
            {};

        }
      );
  }


  async listRooms() {

    return Object
      .values(
        this.rooms
      )
      .filter(
        room =>
          room.phase ===
          "lobby"
          &&
          room.players <
          room.maxPlayers
      )
      .sort(
        (
          a,
          b
        ) =>
          b.createdAt -
          a.createdAt
      )
      .slice(
        0,
        100
      );
  }


  async upsertRoom(summary) {

    this.rooms[
      summary.code
    ] =
      summary;


    await this.ctx
      .storage
      .put(
        "rooms",
        this.rooms
      );
  }


  async removeRoom(code) {

    if (
      this.rooms[
        code
      ]
    ) {

      delete this.rooms[
        code
      ];


      await this.ctx
        .storage
        .put(
          "rooms",
          this.rooms
        );
    }
  }
}


/* =========================================================
   ROOM DURABLE OBJECT
========================================================= */

export class RedlineRoom
  extends DurableObject {

  constructor(
    ctx,
    env
  ) {

    super(
      ctx,
      env
    );


    this.env =
      env;


    this.room =
      null;


    /*
      High-frequency race data stays in memory.

      We DO NOT write these position packets to
      Durable Object storage 15 times per second.
    */

    this.liveRaceStates =
      new Map();


    this.finishOrder =
      [];


    this.ctx
      .blockConcurrencyWhile(
        async () => {

          this.room =
            (
              await this.ctx
                .storage
                .get(
                  "room"
                )
            )
            ||
            null;

        }
      );
  }


  /* =======================================================
     EXISTS
  ======================================================= */

  async exists() {

    return Boolean(
      this.room
    );
  }


  /* =======================================================
     CREATE
  ======================================================= */

  async createRoom({
    code,
    name,
    privacy,
    maxPlayers,
    username
  }) {

    if (this.room) {

      return {
        error:
          "Room already exists."
      };
    }


    const playerId =
      crypto.randomUUID();


    const playerToken =
      crypto.randomUUID();


    this.room = {
      code,

      name,

      privacy,

      maxPlayers,

      map:
        "neon",

      phase:
        "lobby",

      hostId:
        playerId,

      createdAt:
        Date.now(),

      raceStartAt:
        null,

      players: [
        {
          id:
            playerId,

          token:
            playerToken,

          username,

          host:
            true,

          connected:
            false,

          car:
            null,

          ready:
            false
        }
      ]
    };


    this.liveRaceStates.clear();

    this.finishOrder =
      [];


    await this.persist();

    await this.syncDirectory();


    return {
      code,

      playerId,

      playerToken,

      room:
        publicRoom(
          this.room
        )
    };
  }


  /* =======================================================
     SNAPSHOT
  ======================================================= */

  async getSnapshot() {

    return this.room
      ?
      publicRoom(
        this.room
      )
      :
      null;
  }


  /* =======================================================
     JOIN
  ======================================================= */

  async joinRoom({
    username
  }) {

    if (!this.room) {

      return {
        ok:
          false,

        status:
          404,

        error:
          "Room not found."
      };
    }


    if (
      this.room.phase !==
      "lobby"
    ) {

      return {
        ok:
          false,

        status:
          409,

        error:
          "This race has already started."
      };
    }


    if (
      this.room.players.length >=
      this.room.maxPlayers
    ) {

      return {
        ok:
          false,

        status:
          409,

        error:
          "Room is full."
      };
    }


    const playerId =
      crypto.randomUUID();


    const playerToken =
      crypto.randomUUID();


    this.room.players.push({
      id:
        playerId,

      token:
        playerToken,

      username,

      host:
        false,

      connected:
        false,

      car:
        null,

      ready:
        false
    });


    await this.persist();

    await this.syncDirectory();

    this.broadcastState();


    return {
      ok:
        true,

      data: {
        code:
          this.room.code,

        playerId,

        playerToken,

        room:
          publicRoom(
            this.room
          )
      }
    };
  }


  /* =======================================================
     WEBSOCKET CONNECTION
  ======================================================= */

  async fetch(request) {

    if (!this.room) {

      return json(
        {
          error:
            "Room not found."
        },
        404
      );
    }


    if (
      (
        request.headers.get(
          "Upgrade"
        )
        ||
        ""
      )
        .toLowerCase()
      !==
      "websocket"
    ) {

      return json(
        {
          error:
            "Expected WebSocket upgrade."
        },
        426
      );
    }


    const url =
      new URL(
        request.url
      );


    const token =
      url.searchParams.get(
        "token"
      )
      ||
      "";


    const player =
      this.room.players.find(
        candidate =>
          candidate.token ===
          token
      );


    if (!player) {

      return json(
        {
          error:
            "Invalid player token."
        },
        401
      );
    }


    const pair =
      new WebSocketPair();


    const [
      client,
      server
    ] =
      Object.values(
        pair
      );


    this.ctx.acceptWebSocket(
      server
    );


    server.serializeAttachment({
      playerId:
        player.id
    });


    player.connected =
      true;


    await this.persist();

    await this.syncDirectory();

    this.broadcastState();


    /*
      If a player reconnects while the race is already
      running, send the current race states immediately.
    */

    if (
      this.room.phase ===
      "racing"
    ) {

      this.send(
        server,
        {
          type:
            "race_snapshot",

          startAt:
            this.room.raceStartAt,

          states:
            Array.from(
              this.liveRaceStates.values()
            ),

          finishOrder:
            this.finishOrder
        }
      );
    }


    return new Response(
      null,
      {
        status:
          101,

        webSocket:
          client
      }
    );
  }


  /* =======================================================
     WEBSOCKET MESSAGE
  ======================================================= */

  async webSocketMessage(
    ws,
    message
  ) {

    if (!this.room) {

      return;
    }


    let data;


    try {

      const text =
        typeof message ===
        "string"
          ?
          message
          :
          new TextDecoder()
            .decode(
              message
            );


      data =
        JSON.parse(
          text
        );

    }

    catch {

      this.send(
        ws,
        {
          type:
            "error",

          error:
            "Invalid WebSocket message."
        }
      );


      return;
    }


    const attachment =
      ws.deserializeAttachment();


    const player =
      this.room.players.find(
        candidate =>
          candidate.id ===
          attachment?.playerId
      );


    if (!player) {

      this.send(
        ws,
        {
          type:
            "error",

          error:
            "Player session not found."
        }
      );


      return;
    }


    /* =====================================================
       PING
    ===================================================== */

    if (
      data.type ===
      "ping"
    ) {

      this.send(
        ws,
        {
          type:
            "pong",

          now:
            Date.now()
        }
      );


      return;
    }


    /* =====================================================
       SET MAP
    ===================================================== */

    if (
      data.type ===
      "set_map"
    ) {

      if (!player.host) {

        this.send(
          ws,
          {
            type:
              "error",

            error:
              "Only the host can choose the map."
          }
        );


        return;
      }


      if (
        this.room.phase !==
        "lobby"
      ) {

        return;
      }


      if (
        !VALID_MAPS.has(
          data.map
        )
      ) {

        return;
      }


      this.room.map =
        data.map;


      await this.persist();

      await this.syncDirectory();

      this.broadcastState();


      return;
    }


    /* =====================================================
       START CAR SELECT
    ===================================================== */

    if (
      data.type ===
      "start_car_select"
    ) {

      if (!player.host) {

        this.send(
          ws,
          {
            type:
              "error",

            error:
              "Only the host can start the race."
          }
        );


        return;
      }


      if (
        this.room.phase !==
        "lobby"
      ) {

        return;
      }


      this.room.phase =
        "car_select";


      this.room.raceStartAt =
        null;


      this.liveRaceStates.clear();

      this.finishOrder =
        [];


      for (
        const racer
        of this.room.players
      ) {

        racer.car =
          null;


        racer.ready =
          false;
      }


      await this.persist();

      await this.syncDirectory();

      this.broadcastState();


      return;
    }


    /* =====================================================
       SELECT CAR
    ===================================================== */

    if (
      data.type ===
      "select_car"
    ) {

      if (
        this.room.phase !==
        "car_select"
      ) {

        return;
      }


      if (
        !VALID_CARS.has(
          data.car
        )
      ) {

        return;
      }


      player.car =
        data.car;


      player.ready =
        false;


      await this.persist();

      this.broadcastState();


      return;
    }


    /* =====================================================
       READY
    ===================================================== */

    if (
      data.type ===
      "ready"
    ) {

      if (
        this.room.phase !==
        "car_select"
      ) {

        return;
      }


      if (!player.car) {

        this.send(
          ws,
          {
            type:
              "error",

            error:
              "Choose a car before locking in."
          }
        );


        return;
      }


      player.ready =
        true;


      await this.persist();

      this.broadcastState();


      const everyoneReady =
        this.room.players.length >=
        1
        &&
        this.room.players.every(
          racer =>
            racer.car
            &&
            racer.ready
        );


      if (
        everyoneReady
      ) {

        await this.beginCountdown();

      }


      return;
    }


    /* =====================================================
       UNREADY
    ===================================================== */

    if (
      data.type ===
      "unready"
    ) {

      if (
        this.room.phase !==
        "car_select"
      ) {

        return;
      }


      player.ready =
        false;


      await this.persist();

      this.broadcastState();


      return;
    }


    /* =====================================================
       LIVE RACE STATE

       Sent around 12-15 times per second by each racer.
    ===================================================== */

    if (
      data.type ===
      "race_state"
    ) {

      if (
        this.room.phase !==
        "racing"
      ) {

        return;
      }


      const x =
        clamp(
          finiteNumber(
            data.x
          ),
          -10000,
          10000
        );


      const y =
        clamp(
          finiteNumber(
            data.y
          ),
          -1000,
          1000
        );


      const z =
        clamp(
          finiteNumber(
            data.z
          ),
          -10000,
          10000
        );


      const rotation =
        finiteNumber(
          data.rotation
        );


      const speed =
        clamp(
          finiteNumber(
            data.speed
          ),
          -500,
          500
        );


      const lap =
        clamp(
          Math.floor(
            finiteNumber(
              data.lap,
              1
            )
          ),
          1,
          100
        );


      const checkpoint =
        clamp(
          Math.floor(
            finiteNumber(
              data.checkpoint
            )
          ),
          0,
          1000
        );


      const progress =
        clamp(
          finiteNumber(
            data.progress
          ),
          0,
          1
        );


      const state = {
        playerId:
          player.id,

        username:
          player.username,

        car:
          player.car,

        x,

        y,

        z,

        rotation,

        speed,

        lap,

        checkpoint,

        progress,

        finished:
          this.finishOrder.some(
            finisher =>
              finisher.playerId ===
              player.id
          ),

        timestamp:
          Date.now()
      };


      this.liveRaceStates.set(
        player.id,
        state
      );


      /*
        Broadcast to everyone, INCLUDING the sender.

        The sender also needs everybody's newest state
        to calculate its own race position.
      */

      this.broadcast({
        type:
          "race_state",

        state
      });


      return;
    }


    /* =====================================================
       RACER FINISHED
    ===================================================== */

    if (
      data.type ===
      "race_finish"
    ) {

      if (
        this.room.phase !==
        "racing"
        ||
        !this.room.raceStartAt
      ) {

        return;
      }


      const alreadyFinished =
        this.finishOrder.some(
          finisher =>
            finisher.playerId ===
            player.id
        );


      if (
        alreadyFinished
      ) {

        return;
      }


      const finishTime =
        Math.max(
          0,
          Date.now()
          -
          this.room.raceStartAt
        );


      const result = {
        playerId:
          player.id,

        username:
          player.username,

        car:
          player.car,

        place:
          this.finishOrder.length
          +
          1,

        finishTime
      };


      this.finishOrder.push(
        result
      );


      const existing =
        this.liveRaceStates.get(
          player.id
        );


      if (
        existing
      ) {

        existing.finished =
          true;


        existing.finishTime =
          finishTime;


        this.liveRaceStates.set(
          player.id,
          existing
        );
      }


      this.broadcast({
        type:
          "player_finished",

        result,

        finishOrder:
          this.finishOrder
      });


      return;
    }


    /* =====================================================
       RETURN TO LOBBY
    ===================================================== */

    if (
      data.type ===
      "return_lobby"
    ) {

      if (!player.host) {

        return;
      }


      this.room.phase =
        "lobby";


      this.room.raceStartAt =
        null;


      this.liveRaceStates.clear();

      this.finishOrder =
        [];


      for (
        const racer
        of this.room.players
      ) {

        racer.ready =
          false;
      }


      await this.persist();

      await this.syncDirectory();

      this.broadcastState();
    }
  }


  /* =======================================================
     DISCONNECT
  ======================================================= */

  async webSocketClose(ws) {

    await this.handleDisconnect(
      ws
    );
  }


  async webSocketError(ws) {

    await this.handleDisconnect(
      ws
    );
  }


  async handleDisconnect(ws) {

    if (!this.room) {

      return;
    }


    const attachment =
      ws.deserializeAttachment();


    const playerId =
      attachment?.playerId;


    if (!playerId) {

      return;
    }


    const player =
      this.room.players.find(
        candidate =>
          candidate.id ===
          playerId
      );


    if (!player) {

      return;
    }


    if (
      this.room.phase ===
      "lobby"
      ||
      this.room.phase ===
      "car_select"
    ) {

      this.room.players =
        this.room.players.filter(
          candidate =>
            candidate.id !==
            playerId
        );


      this.liveRaceStates.delete(
        playerId
      );


      if (
        this.room.players.length ===
        0
      ) {

        await this.removeFromDirectory();


        await this.ctx
          .storage
          .delete(
            "room"
          );


        this.room =
          null;


        return;
      }


      if (
        player.host
      ) {

        for (
          const racer
          of this.room.players
        ) {

          racer.host =
            false;
        }


        this.room.players[0].host =
          true;


        this.room.hostId =
          this.room.players[0].id;
      }
    }

    else {

      player.connected =
        false;


      this.liveRaceStates.delete(
        playerId
      );


      this.broadcast({
        type:
          "player_disconnected",

        playerId
      });
    }


    await this.persist();

    await this.syncDirectory();

    this.broadcastState();
  }


  /* =======================================================
     BEGIN COUNTDOWN
  ======================================================= */

  async beginCountdown() {

    if (
      !this.room
      ||
      this.room.phase !==
      "car_select"
    ) {

      return;
    }


    this.liveRaceStates.clear();

    this.finishOrder =
      [];


    this.room.phase =
      "countdown";


    this.room.raceStartAt =
      Date.now()
      +
      4000;


    await this.persist();

    await this.syncDirectory();


    await this.ctx
      .storage
      .setAlarm(
        this.room.raceStartAt
      );


    this.broadcast({
      type:
        "countdown",

      startAt:
        this.room.raceStartAt,

      room:
        publicRoom(
          this.room
        )
    });
  }


  /* =======================================================
     COUNTDOWN FINISHED
  ======================================================= */

  async alarm() {

    if (
      !this.room
      ||
      this.room.phase !==
      "countdown"
      ||
      !this.room.raceStartAt
    ) {

      return;
    }


    this.room.phase =
      "racing";


    await this.persist();

    await this.syncDirectory();


    this.broadcast({
      type:
        "race_started",

      startAt:
        this.room.raceStartAt,

      room:
        publicRoom(
          this.room
        )
    });
  }


  /* =======================================================
     STORAGE
  ======================================================= */

  async persist() {

    if (
      this.room
    ) {

      await this.ctx
        .storage
        .put(
          "room",
          this.room
        );
    }
  }


  /* =======================================================
     PUBLIC ROOM DIRECTORY
  ======================================================= */

  async syncDirectory() {

    if (
      !this.room
    ) {

      return;
    }


    const directory =
      directoryStub(
        this.env
      );


    const shouldBePublic =
      this.room.privacy ===
      "public"
      &&
      this.room.phase ===
      "lobby"
      &&
      this.room.players.length <
      this.room.maxPlayers;


    if (
      shouldBePublic
    ) {

      await directory.upsertRoom(
        roomSummary(
          this.room
        )
      );

    }

    else {

      await directory.removeRoom(
        this.room.code
      );
    }
  }


  async removeFromDirectory() {

    if (
      !this.room?.code
    ) {

      return;
    }


    await directoryStub(
      this.env
    )
      .removeRoom(
        this.room.code
      );
  }


  /* =======================================================
     WEBSOCKET HELPERS
  ======================================================= */

  send(
    ws,
    payload
  ) {

    try {

      ws.send(
        JSON.stringify(
          payload
        )
      );

    }

    catch {}
  }


  broadcast(payload) {

    const message =
      JSON.stringify(
        payload
      );


    for (
      const ws
      of this.ctx
        .getWebSockets()
    ) {

      try {

        ws.send(
          message
        );

      }

      catch {}
    }
  }


  broadcastState() {

    if (
      !this.room
    ) {

      return;
    }


    this.broadcast({
      type:
        "room_state",

      room:
        publicRoom(
          this.room
        )
    });
  }
}
