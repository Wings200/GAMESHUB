import {
  DurableObject
} from "cloudflare:workers";


/* =========================================================
   REDLINE MULTIPLAYER SERVER V1

   REAL:
   - Public rooms
   - Private rooms
   - 6-character room codes
   - 1-8 players
   - Host ownership
   - Live WebSocket lobby state
   - Map selection
   - Car selection
   - Ready / lock-in
   - Server-controlled countdown

   NEXT VERSION:
   - Live car positions
   - Race position
   - Checkpoints
   - Finish order
   - Race timer / DNF
========================================================= */


/* =========================================================
   CONSTANTS
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

  "Access-Control-Allow-Origin":
    "*",

  "Access-Control-Allow-Headers":
    "Content-Type",

  "Access-Control-Allow-Methods":
    "GET,POST,OPTIONS"

};


/* =========================================================
   RESPONSE HELPERS
========================================================= */

function json(
  data,
  status = 200,
  extraHeaders = {}
) {

  return new Response(

    JSON.stringify(
      data
    ),

    {
      status,

      headers: {

        "Content-Type":
          "application/json; charset=utf-8",

        "Cache-Control":
          "no-store",

        ...CORS_HEADERS,

        ...extraHeaders

      }
    }

  );

}


/* =========================================================
   SANITIZE
========================================================= */

function sanitizeUsername(
  value
) {

  return String(
    value ?? ""
  )

    .replace(
      /[<>]/g,
      ""
    )

    .trim()

    .slice(
      0,
      18
    );

}


function sanitizeRoomName(
  value,
  username
) {

  const cleaned =
    String(
      value ?? ""
    )

      .replace(
        /[<>]/g,
        ""
      )

      .trim()

      .slice(
        0,
        24
      );


  return (
    cleaned
    ||
    `${username}'s Room`
  );

}


/* =========================================================
   ROOM CODE
========================================================= */

function generateRoomCode() {

  let code =
    "";


  const bytes =
    new Uint8Array(
      6
    );


  crypto.getRandomValues(
    bytes
  );


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


/* =========================================================
   DURABLE OBJECT HELPERS
========================================================= */

function roomStub(
  env,
  code
) {

  return env.ROOMS.getByName(
    `room:${code}`
  );

}


function directoryStub(
  env
) {

  return env.DIRECTORY.getByName(
    "public-room-directory"
  );

}


/* =========================================================
   REQUEST JSON
========================================================= */

async function readJson(
  request
) {

  try {

    return await request.json();

  }

  catch {

    return null;

  }

}


/* =========================================================
   PUBLIC PLAYER DATA
========================================================= */

function publicPlayer(
  player
) {

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


/* =========================================================
   PUBLIC ROOM DATA
========================================================= */

function publicRoom(
  room
) {

  if (!room) {
    return null;
  }


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

    createdAt:
      room.createdAt,

    hostId:
      room.hostId,

    raceStartAt:
      room.raceStartAt
      ??
      null,

    players:
      room.players.map(
        publicPlayer
      )

  };

}


/* =========================================================
   ROOM BROWSER SUMMARY
========================================================= */

function roomSummary(
  room
) {

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


/* =========================================================
   CORS WRAPPER
========================================================= */

async function addCors(
  response
) {

  /*
    Do NOT rebuild a WebSocket 101 response.
  */

  if (
    response.status ===
    101
  ) {

    return response;

  }


  const headers =
    new Headers(
      response.headers
    );


  for (
    const [
      key,
      value
    ]
    of
    Object.entries(
      CORS_HEADERS
    )
  ) {

    headers.set(
      key,
      value
    );

  }


  headers.set(
    "Cache-Control",
    "no-store"
  );


  return new Response(

    response.body,

    {
      status:
        response.status,

      statusText:
        response.statusText,

      headers
    }

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
       PREFLIGHT
    ----------------------------------------------------- */

    if (
      request.method ===
      "OPTIONS"
    ) {

      return new Response(
        null,
        {
          status:
            204,

          headers:
            CORS_HEADERS
        }
      );

    }


    /* -----------------------------------------------------
       HEALTH
    ----------------------------------------------------- */

    if (
      url.pathname ===
      "/"

      ||

      url.pathname ===
      "/health"
    ) {

      return json({

        ok:
          true,

        service:
          "REDLINE multiplayer"

      });

    }


    /* =====================================================
       PUBLIC ROOM LIST
    ===================================================== */

    if (
      url.pathname ===
      "/api/rooms"

      &&

      request.method ===
      "GET"
    ) {

      const response =
        await directoryStub(
          env
        )
        .fetch(

          new Request(
            "https://directory.internal/list"
          )

        );


      return addCors(
        response
      );

    }


    /* =====================================================
       CREATE ROOM
    ===================================================== */

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
              "Invalid JSON."
          },
          400
        );

      }


      const username =
        sanitizeUsername(
          body.username
        )
        ||
        "Racer";


      const privacy =
        body.privacy ===
        "private"

        ?

        "private"

        :

        "public";


      const maxPlayers =
        Math.max(

          1,

          Math.min(

            8,

            Number(
              body.maxPlayers
            )
            ||
            8

          )

        );


      const name =
        sanitizeRoomName(
          body.name,
          username
        );


      let code =
        null;


      let stub =
        null;


      /*
        Try several random codes.

        Collision odds are tiny,
        but we still check.
      */

      for (
        let attempt = 0;
        attempt < 12;
        attempt++
      ) {

        const candidate =
          generateRoomCode();


        const candidateStub =
          roomStub(
            env,
            candidate
          );


        const existsResponse =
          await candidateStub.fetch(

            new Request(
              "https://room.internal/exists"
            )

          );


        const existsData =
          await existsResponse.json();


        if (
          !existsData.exists
        ) {

          code =
            candidate;


          stub =
            candidateStub;


          break;

        }

      }


      if (
        !code
        ||
        !stub
      ) {

        return json(

          {
            error:
              "Could not allocate a room code. Try again."
          },

          503

        );

      }


      const createResponse =
        await stub.fetch(

          new Request(

            "https://room.internal/create",

            {

              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({

                  code,

                  name,

                  privacy,

                  maxPlayers,

                  username

                })

            }

          )

        );


      return addCors(
        createResponse
      );

    }


    /* =====================================================
       /api/rooms/CODE
       /api/rooms/CODE/join
       /api/rooms/CODE/ws
    ===================================================== */

    const match =
      url.pathname.match(

        /^\/api\/rooms\/([A-Z0-9]{6})(?:\/(join|ws|snapshot))?$/i

      );


    if (match) {

      const code =
        match[1]
          .toUpperCase();


      const action =
        match[2]
        ||
        "snapshot";


      const stub =
        roomStub(
          env,
          code
        );


      /* ---------------------------------------------------
         SNAPSHOT
      --------------------------------------------------- */

      if (
        action ===
        "snapshot"

        &&

        request.method ===
        "GET"
      ) {

        return addCors(

          await stub.fetch(

            new Request(
              "https://room.internal/snapshot"
            )

          )

        );

      }


      /* ---------------------------------------------------
         JOIN ROOM
      --------------------------------------------------- */

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


        return addCors(

          await stub.fetch(

            new Request(

              "https://room.internal/join",

              {

                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json"
                },

                body:
                  JSON.stringify(
                    body ?? {}
                  )

              }

            )

          )

        );

      }


      /* ---------------------------------------------------
         WEBSOCKET
      --------------------------------------------------- */

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


        const token =
          url.searchParams.get(
            "token"
          )
          ||
          "";


        const internalUrl =
          new URL(
            "https://room.internal/ws"
          );


        internalUrl
          .searchParams
          .set(
            "token",
            token
          );


        const forwarded =
          new Request(
            internalUrl,
            request
          );


        return stub.fetch(
          forwarded
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
              await this.ctx.storage.get(
                "rooms"
              )
            )
            ||
            {};

        }

      );

  }


  async fetch(
    request
  ) {

    const url =
      new URL(
        request.url
      );


    /* -----------------------------------------------------
       LIST ROOMS
    ----------------------------------------------------- */

    if (
      url.pathname ===
      "/list"

      &&

      request.method ===
      "GET"
    ) {

      const rooms =
        Object.values(
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


      return json({
        rooms
      });

    }


    /* -----------------------------------------------------
       ADD / UPDATE ROOM
    ----------------------------------------------------- */

    if (
      url.pathname ===
      "/upsert"

      &&

      request.method ===
      "POST"
    ) {

      const body =
        await readJson(
          request
        );


      if (
        !body?.code
      ) {

        return json(

          {
            error:
              "Missing room code."
          },

          400

        );

      }


      this.rooms[
        body.code
      ] =
        body;


      await this.ctx.storage.put(

        "rooms",

        this.rooms

      );


      return json({
        ok:
          true
      });

    }


    /* -----------------------------------------------------
       REMOVE ROOM
    ----------------------------------------------------- */

    if (
      url.pathname ===
      "/remove"

      &&

      request.method ===
      "POST"
    ) {

      const body =
        await readJson(
          request
        );


      if (
        body?.code

        &&

        this.rooms[
          body.code
        ]
      ) {

        delete this.rooms[
          body.code
        ];


        await this.ctx.storage.put(

          "rooms",

          this.rooms

        );

      }


      return json({
        ok:
          true
      });

    }


    return json(

      {
        error:
          "Directory endpoint not found."
      },

      404

    );

  }

}


/* =========================================================
   REDLINE ROOM
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


    this.sessions =
      new Map();


    /*
      Restore room data + existing hibernating sockets.
    */

    this.ctx
      .blockConcurrencyWhile(

        async () => {

          this.room =
            (
              await this.ctx.storage.get(
                "room"
              )
            )
            ||
            null;


          for (
            const ws
            of
            this.ctx.getWebSockets()
          ) {

            const attachment =
              ws.deserializeAttachment();


            if (
              attachment?.playerId
            ) {

              this.sessions.set(
                ws,
                attachment
              );

            }

          }

        }

      );

  }


  /* =======================================================
     HTTP
  ======================================================= */

  async fetch(
    request
  ) {

    const url =
      new URL(
        request.url
      );


    /* -----------------------------------------------------
       ROOM EXISTS
    ----------------------------------------------------- */

    if (
      url.pathname ===
      "/exists"
    ) {

      return json({

        exists:
          Boolean(
            this.room
          )

      });

    }


    /* =====================================================
       CREATE
    ===================================================== */

    if (
      url.pathname ===
      "/create"

      &&

      request.method ===
      "POST"
    ) {

      if (
        this.room
      ) {

        return json(

          {
            error:
              "Room already exists."
          },

          409

        );

      }


      const body =
        await readJson(
          request
        );


      const username =
        sanitizeUsername(
          body?.username
        )
        ||
        "Racer";


      const playerId =
        crypto.randomUUID();


      const token =
        crypto.randomUUID();


      this.room = {

        code:
          body.code,

        name:
          sanitizeRoomName(
            body.name,
            username
          ),

        privacy:
          body.privacy ===
          "private"

          ?

          "private"

          :

          "public",

        maxPlayers:
          Math.max(

            1,

            Math.min(

              8,

              Number(
                body.maxPlayers
              )
              ||
              8

            )

          ),

        map:
          "neon",

        phase:
          "lobby",

        createdAt:
          Date.now(),

        hostId:
          playerId,

        raceStartAt:
          null,

        players: [

          {

            id:
              playerId,

            token,

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


      await this.persist();

      await this.syncDirectory();


      return json(

        {

          code:
            this.room.code,

          playerToken:
            token,

          playerId,

          room:
            publicRoom(
              this.room
            )

        },

        201

      );

    }


    /* =====================================================
       SNAPSHOT
    ===================================================== */

    if (
      url.pathname ===
      "/snapshot"

      &&

      request.method ===
      "GET"
    ) {

      if (
        !this.room
      ) {

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
          publicRoom(
            this.room
          )

      });

    }


    /* =====================================================
       JOIN
    ===================================================== */

    if (
      url.pathname ===
      "/join"

      &&

      request.method ===
      "POST"
    ) {

      if (
        !this.room
      ) {

        return json(

          {
            error:
              "Room not found."
          },

          404

        );

      }


      if (
        this.room.phase !==
        "lobby"
      ) {

        return json(

          {
            error:
              "This race has already started."
          },

          409

        );

      }


      if (
        this.room.players.length >=
        this.room.maxPlayers
      ) {

        return json(

          {
            error:
              "Room is full."
          },

          409

        );

      }


      const body =
        await readJson(
          request
        );


      const username =
        sanitizeUsername(
          body?.username
        )
        ||
        "Racer";


      const playerId =
        crypto.randomUUID();


      const token =
        crypto.randomUUID();


      this.room.players.push({

        id:
          playerId,

        token,

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


      return json({

        playerToken:
          token,

        playerId,

        room:
          publicRoom(
            this.room
          )

      });

    }


    /* =====================================================
       WEBSOCKET
    ===================================================== */

    if (
      url.pathname ===
      "/ws"

      &&

      request.method ===
      "GET"
    ) {

      if (
        !this.room
      ) {

        return json(

          {
            error:
              "Room not found."
          },

          404

        );

      }


      const token =
        url.searchParams.get(
          "token"
        )
        ||
        "";


      const player =
        this.room.players.find(

          player =>
            player.token ===
            token

        );


      if (
        !player
      ) {

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


      /*
        Hibernatable WebSocket.
      */

      this.ctx.acceptWebSocket(
        server
      );


      const attachment = {

        playerId:
          player.id

      };


      server.serializeAttachment(
        attachment
      );


      this.sessions.set(
        server,
        attachment
      );


      player.connected =
        true;


      await this.persist();

      await this.syncDirectory();


      this.broadcastState();


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


    return json(

      {
        error:
          "Room endpoint not found."
      },

      404

    );

  }


  /* =======================================================
     WEBSOCKET MESSAGES
  ======================================================= */

  async webSocketMessage(
    ws,
    message
  ) {

    if (
      !this.room
    ) {

      return;

    }


    let data;


    try {

      data =
        JSON.parse(

          typeof message ===
          "string"

          ?

          message

          :

          new TextDecoder()
            .decode(
              message
            )

        );

    }

    catch {

      this.send(

        ws,

        {
          type:
            "error",

          error:
            "Invalid message."
        }

      );


      return;

    }


    const attachment =
      ws.deserializeAttachment();


    const player =
      this.room.players.find(

        player =>
          player.id ===
          attachment?.playerId

      );


    if (
      !player
    ) {

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
       SET MAP
    ===================================================== */

    if (
      data.type ===
      "set_map"
    ) {

      if (
        !player.host
      ) {

        return this.send(

          ws,

          {
            type:
              "error",

            error:
              "Only the host can choose the map."
          }

        );

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

      if (
        !player.host
      ) {

        return this.send(

          ws,

          {
            type:
              "error",

            error:
              "Only the host can start."
          }

        );

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


      if (
        !player.car
      ) {

        return this.send(

          ws,

          {
            type:
              "error",

            error:
              "Choose a car first."
          }

        );

      }


      player.ready =
        true;


      await this.persist();


      this.broadcastState();


      /*
        Automatically begin countdown once
        EVERY connected racer has locked in.
      */

      if (

        this.room.players.length >
        0

        &&

        this.room.players.every(

          racer =>
            racer.ready
            &&
            racer.car

        )

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
       RETURN TO LOBBY
    ===================================================== */

    if (
      data.type ===
      "return_lobby"
    ) {

      if (
        !player.host
      ) {

        return;

      }


      this.room.phase =
        "lobby";


      this.room.raceStartAt =
        null;


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

    }

  }


  /* =======================================================
     DISCONNECT
  ======================================================= */

  async webSocketClose(
    ws,
    code,
    reason
  ) {

    this.sessions.delete(
      ws
    );


    if (
      !this.room
    ) {

      return;

    }


    const attachment =
      ws.deserializeAttachment();


    const player =
      this.room.players.find(

        player =>
          player.id ===
          attachment?.playerId

      );


    if (
      !player
    ) {

      return;

    }


    /*
      Lobby:
      actually remove player.

      During race:
      keep racer in the room,
      but mark disconnected.
    */

    if (

      this.room.phase ===
      "lobby"

      ||

      this.room.phase ===
      "car_select"

    ) {

      this.room.players =
        this.room.players.filter(

          racer =>
            racer.id !==
            player.id

        );


      /* ---------------------------------------------------
         EMPTY ROOM
      --------------------------------------------------- */

      if (
        this.room.players.length ===
        0
      ) {

        await this.removeFromDirectory();


        await this.ctx.storage.delete(
          "room"
        );


        this.room =
          null;


        return;

      }


      /* ---------------------------------------------------
         HOST LEFT
      --------------------------------------------------- */

      if (
        player.host
      ) {

        this.room.players[0].host =
          true;


        this.room.hostId =
          this.room.players[0].id;

      }

    }

    else {

      player.connected =
        false;

    }


    await this.persist();

    await this.syncDirectory();


    this.broadcastState();

  }


  /* =======================================================
     SOCKET ERROR
  ======================================================= */

  async webSocketError(
    ws
  ) {

    try {

      ws.close(
        1011,
        "WebSocket error"
      );

    }

    catch {}

  }


  /* =======================================================
     COUNTDOWN ALARM
  ======================================================= */

  async alarm() {

    if (
      !this.room
    ) {

      return;

    }


    if (

      this.room.phase ===
      "countdown"

      &&

      this.room.raceStartAt

    ) {

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


    this.room.phase =
      "countdown";


    /*
      4 seconds gives everybody time to receive
      state and display 3 → 2 → 1 → GO.
    */

    this.room.raceStartAt =
      Date.now()
      +
      4000;


    await this.persist();

    await this.syncDirectory();


    await this.ctx.storage.setAlarm(
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
     STORAGE
  ======================================================= */

  async persist() {

    if (
      this.room
    ) {

      await this.ctx.storage.put(

        "room",

        this.room

      );

    }

  }


  /* =======================================================
     PUBLIC ROOM DIRECTORY SYNC
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


    const shouldList =
      this.room.privacy ===
      "public"

      &&

      this.room.phase ===
      "lobby";


    if (
      shouldList
    ) {

      await directory.fetch(

        new Request(

          "https://directory.internal/upsert",

          {

            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify(
                roomSummary(
                  this.room
                )
              )

          }

        )

      );

    }

    else {

      await this.removeFromDirectory();

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
    .fetch(

      new Request(

        "https://directory.internal/remove",

        {

          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              code:
                this.room.code

            })

        }

      )

    );

  }


  /* =======================================================
     WEBSOCKET SEND
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


  /* =======================================================
     BROADCAST
  ======================================================= */

  broadcast(
    payload
  ) {

    const text =
      JSON.stringify(
        payload
      );


    for (
      const ws
      of this.ctx.getWebSockets()
    ) {

      try {

        ws.send(
          text
        );

      }

      catch {}

    }

  }


  /* =======================================================
     BROADCAST FULL ROOM STATE
  ======================================================= */

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
