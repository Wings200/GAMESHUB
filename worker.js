import { DurableObject } from "cloudflare:workers";

const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const VALID_CARS = new Set(["gt", "vortex", "apex"]);
const VALID_MAPS = new Set(["neon", "canyon", "arctic"]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...CORS_HEADERS
    }
  });
}

function cleanUsername(value) {
  const name = String(value ?? "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 18);

  return name || "Racer";
}

function cleanRoomName(value, username) {
  const name = String(value ?? "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 24);

  return name || `${username}'s Room`;
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

function finiteNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function clamp(value, min, max) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}

function makeRoomCode() {
  const bytes = new Uint8Array(6);

  crypto.getRandomValues(bytes);

  let code = "";

  for (const byte of bytes) {
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
    id: player.id,
    username: player.username,
    host: player.host,
    connected: player.connected,
    car: player.car,
    ready: player.ready
  };
}

function publicRoom(room) {
  const finishOrder =
    Array.isArray(room.finishOrder)
      ? room.finishOrder
      : [];

  return {
    code: room.code,
    name: room.name,
    privacy: room.privacy,
    maxPlayers: room.maxPlayers,
    map: room.map,
    phase: room.phase,
    hostId: room.hostId,
    createdAt: room.createdAt,
    raceStartAt:
      room.raceStartAt ?? null,
    raceComplete:
      room.phase === "results",
    finishOrder,
    players:
      room.players.map(
        publicPlayer
      )
  };
}

function roomSummary(room) {
  return {
    code: room.code,
    name: room.name,
    players:
      room.players.length,
    maxPlayers:
      room.maxPlayers,
    map: room.map,
    phase: room.phase,
    createdAt:
      room.createdAt
  };
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function roomStub(env, code) {
  return env.ROOMS.getByName(
    `room:${code}`
  );
}

function directoryStub(env) {
  return env.DIRECTORY.getByName(
    "redline-public-directory"
  );
}

export default {
  async fetch(request, env) {
    const url =
      new URL(request.url);

    if (
      request.method ===
      "OPTIONS"
    ) {
      return new Response(
        null,
        {
          status: 204,
          headers: CORS_HEADERS
        }
      );
    }

    if (
      url.pathname === "/" ||
      url.pathname === "/health"
    ) {
      return json({
        ok: true,
        service:
          "REDLINE multiplayer",
        version: 3
      });
    }

    if (
      url.pathname ===
      "/api/rooms" &&
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

    if (
      url.pathname ===
      "/api/rooms" &&
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
          ? "private"
          : "public";

      const maxPlayers =
        clampPlayerCount(
          body.maxPlayers
        );

      const name =
        cleanRoomName(
          body.name,
          username
        );

      let code = null;
      let room = null;

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
            await candidateRoom
              .exists()
          )
        ) {
          code = candidate;
          room = candidateRoom;
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

    const roomMatch =
      url.pathname.match(
        /^\/api\/rooms\/([A-Z0-9]{6})(?:\/(join|ws))?$/i
      );

    if (roomMatch) {
      const code =
        roomMatch[1]
          .toUpperCase();

      const action =
        roomMatch[2] ||
        "snapshot";

      const room =
        roomStub(
          env,
          code
        );

      if (
        action ===
        "snapshot" &&
        request.method ===
        "GET"
      ) {
        const snapshot =
          await room
            .getSnapshot();

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
          room: snapshot
        });
      }

      if (
        action ===
        "join" &&
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

      if (
        action ===
        "ws" &&
        request.method ===
        "GET"
      ) {
        if (
          (
            request.headers
              .get("Upgrade") ||
            ""
          ).toLowerCase() !==
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

    this.rooms = {};

    this.ctx
      .blockConcurrencyWhile(
        async () => {
          this.rooms =
            (
              await this.ctx
                .storage
                .get("rooms")
            ) || {};
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
          "lobby" &&
          room.players <
          room.maxPlayers
      )
      .sort(
        (a, b) =>
          b.createdAt -
          a.createdAt
      )
      .slice(
        0,
        100
      );
  }

  async upsertRoom(
    summary
  ) {
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

  async removeRoom(
    code
  ) {
    if (
      !this.rooms[
        code
      ]
    ) {
      return;
    }

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

    this.env = env;
    this.room = null;

    this.liveRaceStates =
      new Map();

    this.ctx
      .blockConcurrencyWhile(
        async () => {
          this.room =
            (
              await this.ctx
                .storage
                .get("room")
            ) || null;

          if (
            this.room &&
            !Array.isArray(
              this.room.finishOrder
            )
          ) {
            this.room.finishOrder =
              [];

            await this.persist();
          }
        }
      );
  }

  async exists() {
    return Boolean(
      this.room
    );
  }

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

      finishOrder:
        [],

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

    this.liveRaceStates
      .clear();

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

  async getSnapshot() {
    return this.room
      ? publicRoom(
          this.room
        )
      : null;
  }

  async joinRoom({
    username
  }) {
    if (!this.room) {
      return {
        ok: false,
        status: 404,
        error:
          "Room not found."
      };
    }

    if (
      this.room.phase !==
      "lobby"
    ) {
      return {
        ok: false,
        status: 409,
        error:
          "This race has already started."
      };
    }

    if (
      this.room.players
        .length >=
      this.room.maxPlayers
    ) {
      return {
        ok: false,
        status: 409,
        error:
          "Room is full."
      };
    }

    const playerId =
      crypto.randomUUID();

    const playerToken =
      crypto.randomUUID();

    this.room.players
      .push({
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
      ok: true,

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

  async fetch(
    request
  ) {
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
        request.headers
          .get("Upgrade") ||
        ""
      ).toLowerCase() !==
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
      url.searchParams
        .get("token") ||
      "";

    const player =
      this.room.players
        .find(
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

    this.ctx
      .acceptWebSocket(
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

    if (
      this.room.phase ===
      "racing" ||
      this.room.phase ===
      "results"
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
              this.liveRaceStates
                .values()
            ),

          finishOrder:
            this.room.finishOrder ||
            [],

          raceComplete:
            this.room.phase ===
            "results",

          room:
            publicRoom(
              this.room
            )
        }
      );
    }

    return new Response(
      null,
      {
        status: 101,
        webSocket:
          client
      }
    );
  }

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
          ? message
          : new TextDecoder()
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
      this.room.players
        .find(
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
        "lobby" ||
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

      this.room.finishOrder =
        [];

      this.liveRaceStates
        .clear();

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

    if (
      data.type ===
      "select_car"
    ) {
      if (
        this.room.phase !==
        "car_select" ||
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
        this.room.players
          .length >= 1 &&
        this.room.players
          .every(
            racer =>
              racer.car &&
              racer.ready
          );

      if (
        everyoneReady
      ) {
        await this.beginCountdown();
      }

      return;
    }

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

      const state = {
        playerId:
          player.id,

        username:
          player.username,

        car:
          player.car,

        x:
          clamp(
            finiteNumber(
              data.x
            ),
            -10000,
            10000
          ),

        y:
          clamp(
            finiteNumber(
              data.y
            ),
            -1000,
            1000
          ),

        z:
          clamp(
            finiteNumber(
              data.z
            ),
            -10000,
            10000
          ),

        rotation:
          finiteNumber(
            data.rotation
          ),

        speed:
          clamp(
            finiteNumber(
              data.speed
            ),
            -500,
            500
          ),

        lap:
          clamp(
            Math.floor(
              finiteNumber(
                data.lap,
                1
              )
            ),
            1,
            100
          ),

        checkpoint:
          clamp(
            Math.floor(
              finiteNumber(
                data.checkpoint
              )
            ),
            0,
            1000
          ),

        progress:
          clamp(
            finiteNumber(
              data.progress
            ),
            0,
            1
          ),

        finished:
          (
            this.room
              .finishOrder ||
            []
          ).some(
            finisher =>
              finisher.playerId ===
              player.id
          ),

        timestamp:
          Date.now()
      };

      const officialFinish =
        (
          this.room
            .finishOrder ||
          []
        ).find(
          finisher =>
            finisher.playerId ===
            player.id
        );

      if (
        officialFinish
      ) {
        state.finishTime =
          officialFinish.finishTime;
      }

      this.liveRaceStates
        .set(
          player.id,
          state
        );

      this.broadcast({
        type:
          "race_state",

        state
      });

      return;
    }

    if (
      data.type ===
      "race_finish"
    ) {
      if (
        this.room.phase !==
        "racing" ||
        !this.room.raceStartAt
      ) {
        return;
      }

      this.room.finishOrder ||=
        [];

      if (
        this.room
          .finishOrder
          .some(
            finisher =>
              finisher.playerId ===
              player.id
          )
      ) {
        return;
      }

      const finishTime =
        Math.max(
          0,
          Date.now() -
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
          this.room
            .finishOrder
            .length +
          1,

        finishTime
      };

      this.room
        .finishOrder
        .push(
          result
        );

      const existing =
        this.liveRaceStates
          .get(
            player.id
          );

      if (existing) {
        existing.finished =
          true;

        existing.finishTime =
          finishTime;

        this.liveRaceStates
          .set(
            player.id,
            existing
          );
      }

      const everyoneFinished =
        this.room.players
          .length > 0 &&
        this.room
          .finishOrder
          .length >=
        this.room.players
          .length;

      if (
        everyoneFinished
      ) {
        this.room.phase =
          "results";
      }

      await this.persist();

      await this.syncDirectory();

      this.broadcast({
        type:
          "player_finished",

        result,

        finishOrder:
          this.room.finishOrder,

        raceComplete:
          everyoneFinished,

        room:
          publicRoom(
            this.room
          )
      });

      if (
        everyoneFinished
      ) {
        this.broadcast({
          type:
            "race_complete",

          finishOrder:
            this.room.finishOrder,

          room:
            publicRoom(
              this.room
            )
        });
      }

      this.broadcastState();

      return;
    }

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

      this.room.finishOrder =
        [];

      this.liveRaceStates
        .clear();

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
  }

  async webSocketClose(
    ws
  ) {
    await this.handleDisconnect(
      ws
    );
  }

  async webSocketError(
    ws
  ) {
    await this.handleDisconnect(
      ws
    );
  }

  async handleDisconnect(
    ws
  ) {
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
      this.room.players
        .find(
          candidate =>
            candidate.id ===
            playerId
        );

    if (!player) {
      return;
    }

    if (
      this.room.phase ===
      "lobby" ||
      this.room.phase ===
      "car_select"
    ) {
      this.room.players =
        this.room.players
          .filter(
            candidate =>
              candidate.id !==
              playerId
          );

      this.liveRaceStates
        .delete(
          playerId
        );

      if (
        this.room.players
          .length === 0
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

      if (player.host) {
        for (
          const racer
          of this.room.players
        ) {
          racer.host =
            false;
        }

        this.room
          .players[0]
          .host =
          true;

        this.room.hostId =
          this.room
            .players[0]
            .id;
      }
    }

    else {
      player.connected =
        false;

      this.liveRaceStates
        .delete(
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

  async beginCountdown() {
    if (
      !this.room ||
      this.room.phase !==
      "car_select"
    ) {
      return;
    }

    this.liveRaceStates
      .clear();

    this.room.finishOrder =
      [];

    this.room.phase =
      "countdown";

    this.room.raceStartAt =
      Date.now() +
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

  async alarm() {
    if (
      !this.room ||
      this.room.phase !==
      "countdown" ||
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

    this.broadcastState();
  }

  async persist() {
    if (this.room) {
      await this.ctx
        .storage
        .put(
          "room",
          this.room
        );
    }
  }

  async syncDirectory() {
    if (!this.room) {
      return;
    }

    const directory =
      directoryStub(
        this.env
      );

    const shouldBePublic =
      this.room.privacy ===
      "public" &&
      this.room.phase ===
      "lobby" &&
      this.room.players
        .length <
      this.room.maxPlayers;

    if (
      shouldBePublic
    ) {
      await directory
        .upsertRoom(
          roomSummary(
            this.room
          )
        );
    }

    else {
      await directory
        .removeRoom(
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
    ).removeRoom(
      this.room.code
    );
  }

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
    } catch {}
  }

  broadcast(
    payload
  ) {
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
      } catch {}
    }
  }

  broadcastState() {
    if (!this.room) {
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
