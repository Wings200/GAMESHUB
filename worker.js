import { DurableObject } from "cloudflare:workers";

// Keep the retired BLACKOUT Durable Object namespace registered without
// restoring its endpoints or binding. This preserves existing stored data.
// Removal requires an explicit, potentially destructive namespace retirement.
export class BlackoutRoom extends DurableObject {}

import { UPGRADE_CATALOG, upgradePrice, sanitizeGarage, sanitizeUpgrades, stockUpgrades } from "./games/redline/upgrade-parts.js";
import { REDLINE_CAR_IDS, STARTER_CAR_IDS, carPrice, garageCarOwnership, ownsRedlineCar }
  from "./games/redline/car-catalog.js";
import {advanceChallenges,challengeSnapshot} from "./games/redline/challenges.js";

const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const GAMESHUB_IDENTITY_VERIFY_URL =
  "https://gameshub-dnk.pages.dev/api/account/multiplayer-verify";

const VALID_CARS = new Set(REDLINE_CAR_IDS);

/*
 * Vehicle-specific performance storage. Migrates a legacy account-wide
 * paid garage to the previously saved selected car exactly once, on write.
 */
function ensurePerCarUpgrades(stats) {
  const original=stats.carUpgrades;
  const present=original&&typeof original==="object"&&!Array.isArray(original);
  // Plain objects only: this map crosses Cloudflare RPC and storage
  // serialization boundaries. No null-prototype/custom objects are returned.
  const map={};
  if(present) {
    for(const id of REDLINE_CAR_IDS)
      if(Object.hasOwn(original,id))map[id]=sanitizeGarage(original[id]);
  }else{
    const legacyCar=garageCarOwnership(stats.carGarage).selected;
    map[legacyCar]=sanitizeGarage(stats.garage);
  }
  stats.carUpgrades=map;
  return map;
}
function savedCarGarage(stats,carId){
  return sanitizeGarage(ensurePerCarUpgrades(stats)[carId]);
}
function ownedUpgradeCar(stats,carId){
  return typeof carId==="string"&&VALID_CARS.has(carId)&&
    ownsRedlineCar(stats.carGarage,carId);
}

const VALID_MAPS =
  new Set([
    "neon",
    "canyon",
    "arctic"
  ]);

// Neon now requires 3 laps: era 2, independent of previous one-lap records.
const NEON_RECORD_RULES_VERSION=2;
function validMapBest(best,map){
  return map==="neon"&&best?.rulesVersion!==NEON_RECORD_RULES_VERSION?null:best||null;
}

const VALID_BODIES =
  new Set([
    "coupe",
    "supercar",
    "muscle",
    "track"
  ]);


// REDLINE V19: server-authoritative race and challenge rewards.
function raceCashPrize(playerCount,place) {
  const racers=Number(playerCount),rank=Number(place);
  if(!Number.isInteger(racers)||racers<1||racers>8||
     !Number.isInteger(rank)||rank<1||rank>racers)return 0;
  if(racers===1)return rank===1?35:0;
  const winner=Math.min(160,racers*20);
  if(rank===1)return winner;
  if(rank===2)return Math.round(winner/2);
  if(rank===3)return Math.round(winner/3);
  return 12;
}
function raceProgressionBonuses(previousFinishes,previousBest,finishTime) {
  const finishes=Math.max(0,Math.floor(Number(previousFinishes)||0))+1;
  const before=Number(previousBest?.time);
  const priorValid=previousBest!=null&&Number.isFinite(before)&&before>0;
  const newTime=Number(finishTime);
  const improvedBest=priorValid&&Number.isFinite(newTime)&&newTime>0&&
    newTime<=before*.98;
  // Keep the existing personal-best reward, including the first finish
  // on a map. Remove the retired every-five-finish career award entirely.
  return {personalBestBonus:(!priorValid||improvedBest)?15:0,
    improvedBest,finishCount:finishes};
}

const CORS_HEADERS = {

  "Access-Control-Allow-Origin":
    "*",

  "Access-Control-Allow-Headers":
    "Content-Type",

  "Access-Control-Allow-Methods":
    "GET,POST,OPTIONS"

};


/* =========================================================
   HELPERS
========================================================= */

function json(
  data,
  status = 200
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

        ...CORS_HEADERS

      }

    }
  );

}


function cleanUsername(
  value
) {

  const name =
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
        18
      );


  return (
    name ||
    "Racer"
  );

}


function cleanRoomName(
  value,
  username
) {

  const name =
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
    name ||
    `${username}'s Room`
  );

}


function clampPlayerCount(
  value
) {

  return Math.max(
    1,
    Math.min(
      8,
      Number(
        value
      )
      ||
      8
    )
  );

}


function finiteNumber(
  value,
  fallback = 0
) {

  const number =
    Number(
      value
    );


  return Number.isFinite(
    number
  )
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


function cleanHex(
  value,
  fallback
) {

  const text =
    String(
      value ?? ""
    )
      .trim();


  return /^#[0-9a-f]{6}$/i.test(
    text
  )
    ?
    text.toLowerCase()
    :
    fallback;

}


function cleanAppearance(
  value
) {

  return {

    body:
      VALID_BODIES.has(
        value?.body
      )
        ?
        value.body
        :
        "coupe",

    color:
      cleanHex(
        value?.color,
        "#e9edf2"
      ),

    accent:
      cleanHex(
        value?.accent,
        "#315fbd"
      )

  };

}


function makeRoomCode() {

  const bytes =
    new Uint8Array(
      6
    );


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
      player.ready,
    upgrades:sanitizeUpgrades(player.upgrades)

  };

}


function publicRoom(
  room
) {

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
      room.raceStartAt
      ??
      null,

    raceComplete:
      Boolean(
        room.raceComplete
      ),
    raceEntrantCount:room.raceEntrantCount ?? room.players.length,

    results:
      Array.isArray(
        room.results
      )
        ?
        room.results
        :
        [],

    players:
      room.players.map(
        publicPlayer
      )

  };

}


function roomSummary(
  room
) {

  const host =
    room.players.find(
      player =>
        player.id ===
        room.hostId
    )
    ||
    room.players.find(
      player =>
        player.host
    )
    ||
    room.players[0]
    ||
    null;


  return {

    code:
      room.code,

    name:
      room.name,

    hostUsername:
      host?.username
      ||
      "Racer",

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


function roomStub(
  env,
  code
) {

  return env
    .ROOMS
    .getByName(
      `room:${code}`
    );

}


function directoryStub(
  env
) {

  return env
    .DIRECTORY
    .getByName(
      "redline-public-directory"
    );

}


function statsStub(
  env
) {

  return env
    .STATS
    .getByName(
      "redline-global-stats"
    );

}


async function verifyGameShubIdentity(
  token
) {

  if (
    typeof token !==
    "string"
    ||
    token.length < 40
  ) {

    return {
      ok:
        false,

      status:
        401,

      error:
        "Sign in to GAMESHUB before using REDLINE multiplayer."
    };

  }


  let response;


  try {

    response =
      await fetch(
        GAMESHUB_IDENTITY_VERIFY_URL,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              token
            })
        }
      );

  }

  catch {

    return {
      ok:
        false,

      status:
        503,

      error:
        "GAMESHUB account verification is unavailable."
    };

  }


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
    !data.user?.id
    ||
    !data.user?.username
  ) {

    return {
      ok:
        false,

      status:
        response.status >=
        500
          ?
          503
          :
          401,

      error:
        data?.error
        ||
        "Could not verify your GAMESHUB account."
    };

  }


  return {
    ok:
      true,

    user: {
      id:
        String(
          data.user.id
        ),

      username:
        cleanUsername(
          data.user.username
        )
    }
  };

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


    /* =====================================================
       CORS
    ===================================================== */

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


    /* =====================================================
       HEALTH
    ===================================================== */

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
          "REDLINE multiplayer",

        version:
          9,
        features:{
          perCarGarage:true,
          stockStarterOfflineReady:true,
          accountStorageDiagnostics:true,
          rpcSafeAccountStats:true
        }

      });

    }


    /* =====================================================
       PUBLIC ROOMS
    ===================================================== */

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


      if (
        !body
      ) {

        return json(
          {
            error:
              "Invalid JSON body."
          },
          400
        );

      }


      const identity =
        await verifyGameShubIdentity(
          body.accountToken
        );


      if (
        !identity.ok
      ) {

        return json(
          {
            error:
              identity.error
          },
          identity.status
        );

      }


      const username =
        identity.user.username;


      const accountId =
        identity.user.id;


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
        !code
        ||
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

          username,

          accountId

        });


      return json(
        created,
        201
      );

    }


    /* ACCOUNT CAR DEALERSHIP */
    if(url.pathname==="/api/dealership/purchase" &&
       request.method==="POST") {
      const body=await readJson(request);
      const identity=await verifyGameShubIdentity(body?.accountToken);
      if(!identity.ok)return json({ok:false,error:identity.error},identity.status);
      try{
        const result=await statsStub(env).purchaseCar(identity.user.id,body?.carId);
        return json(result,result.ok?200:400);
      }catch(error){
        console.error("REDLINE dealership transaction unavailable:",error);
        return json({ok:false,error:"REDLINE account storage is unavailable. No car was purchased."},503);
      }
    }

    /* AUTHENTICATED PERFORMANCE GARAGE */
    if((url.pathname==="/api/garage/purchase" ||
        url.pathname==="/api/garage/equip") &&
       request.method==="POST") {
      const body=await readJson(request);
      const identity=await verifyGameShubIdentity(body?.accountToken);
      if(!identity.ok)return json({ok:false,error:identity.error},identity.status);
      const category=body?.category,carId=body?.carId;
      try{
        const result=await (url.pathname.endsWith("/purchase")
          ?statsStub(env).purchaseUpgrade(identity.user.id,carId,category)
          :statsStub(env).equipUpgrade(identity.user.id,carId,category,body?.tier));
        return json(result,result.ok?200:400);
      }catch(error){
        console.error("REDLINE performance garage unavailable:",error);
        return json({ok:false,error:"REDLINE account storage is unavailable. No part purchase was confirmed."},503);
      }
    }

    /* =====================================================
       PLAYER STATS
    ===================================================== */

    if (
      url.pathname ===
      "/api/stats/me"
      &&
      request.method ===
      "POST"
    ) {

      const body =
        await readJson(
          request
        );


      const identity =
        await verifyGameShubIdentity(
          body?.accountToken
        );


      if (
        !identity.ok
      ) {

        return json(
          {
            error:
              identity.error
          },
          identity.status
        );

      }


      try{
        const stats=await statsStub(env).getPlayerStats(
          identity.user.id,identity.user.username
        );
        return json({ok:true,stats});
      }catch(error){
        console.error("REDLINE saved player statistics unavailable:",error);
        const stage=error?.message==="REDLINE_STATS_READ_FAILED"?"READ":
          error?.message==="REDLINE_STATS_NORMALIZE_FAILED"?"FORMAT":"RPC";
        return json({ok:false,code:"REDLINE_STATS_"+stage+"_FAILED",
          error:"REDLINE account data could not be loaded ("+stage+
            "). Your saved cash and cars have not been reset."},503);
      }

    }


    /* =====================================================
       GLOBAL LEADERBOARD
    ===================================================== */

    if (
      url.pathname ===
      "/api/stats/leaderboard"
      &&
      request.method ===
      "GET"
    ) {

      const map =
        String(
          url.searchParams.get(
            "map"
          )
          ||
          ""
        )
          .toLowerCase();


      if (
        !VALID_MAPS.has(
          map
        )
      ) {

        return json(
          {
            error:
              "Unknown REDLINE map."
          },
          400
        );

      }


      const leaderboard =
        await statsStub(
          env
        ).getLeaderboard(
          map
        );


      return json({
        ok:
          true,

        map,

        leaderboard
      });

    }


    /* =====================================================
       ROOM ROUTES
    ===================================================== */

    const roomMatch =
      url.pathname.match(
        /^\/api\/rooms\/([A-Z0-9]{6})(?:\/(join|ws))?$/i
      );


    if (
      roomMatch
    ) {

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

        const snapshot =
          await room.getSnapshot();


        if (
          !snapshot
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
            snapshot
        });

      }


      /* ---------------------------------------------------
         JOIN
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


        const identity =
          await verifyGameShubIdentity(
            body?.accountToken
          );


        if (
          !identity.ok
        ) {

          return json(
            {
              error:
                identity.error
            },
            identity.status
          );

        }


        const result =
          await room.joinRoom({

            username:
              identity.user.username,

            accountId:
              identity.user.id

          });


        if (
          !result.ok
        ) {

          return json(
            {
              error:
                result.error
            },
            result.status
            ||
            400
          );

        }


        return json(
          result.data
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
      High frequency movement stays in memory.
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


          /*
            Restore finished race results after
            a Durable Object wake-up.
          */

          if (
            Array.isArray(
              this.room?.results
            )
          ) {

            this.finishOrder =
              [
                ...this.room.results
              ];

          }

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
     CREATE ROOM
  ======================================================= */

  async createRoom({
    code,
    name,
    privacy,
    maxPlayers,
    username,
    accountId
  }) {

    if (
      this.room
    ) {

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

      raceId:
        null,
      raceEntrantCount:0,

      raceComplete:
        false,

      results:
        [],

      players: [

        {

          id:
            playerId,

          token:
            playerToken,

          accountId,

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
     JOIN ROOM
  ======================================================= */

  async joinRoom({
    username,
    accountId
  }) {

    if (
      !this.room
    ) {

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


    if (
      accountId
      &&
      this.room.players.some(
        candidate =>
          candidate.accountId ===
          accountId
      )
    ) {

      return {

        ok:
          false,

        status:
          409,

        error:
          "Your GAMESHUB account is already in this room."

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

      accountId,

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

  async fetch(
    request
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
      Reconnect during an active race.
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


    /*
      Reconnect while results are showing.
    */

    if (
      this.room.phase ===
      "results"
    ) {

      this.send(
        server,
        {

          type:
            "race_complete",

          results:
            this.finishOrder,

          finishOrder:
            this.finishOrder,

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

    if (
      !this.room
    ) {

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
            Date.now(),
          // Echo the client's send-time for midpoint RTT clock syncing.
          clientSentAt:Number.isFinite(data.clientSentAt)
            ? data.clientSentAt : null

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

      if (
        !player.host
      ) {

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


      this.room.raceId =
        null;


      this.room.raceComplete =
        false;


      this.room.results =
        [];


      this.liveRaceStates.clear();


      this.finishOrder =
        [];


      // Ensure every racer has a SERVER-VERIFIED owned car immediately
      // when selection opens. The free starter GT is always an owned
      // fallback even when the profile lookup is temporarily unavailable.
      // This avoids relying on a hidden browser selector to enable READY.
      for (const racer of this.room.players) {
        let initialCar="gt";
        try {
          const saved=await statsStub(this.env).getPlayerStats(
            racer.accountId,racer.username
          );
          const profile=garageCarOwnership(saved.carGarage);
          if(ownsRedlineCar(profile,profile.selected))
            initialCar=profile.selected;
        } catch(error) {
          // No wallet or upgrades are inferred during fallback selection.
          initialCar="gt";
        }
        racer.car=initialCar;
        racer.ready=false;
        racer.upgrades=stockUpgrades();
      }


      await this.persist();

      await this.syncDirectory();

      this.broadcastState();


      return;

    }


    /* =====================================================
       SELECT CAR

       Garage currently secretly selects GT so the old
       lobby protocol remains compatible.
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


      // A client may request ANY catalog ID, but the Worker verifies
      // it belongs to the authenticated account before showing it in-room.
      let selected;
      try {
        selected=await statsStub(this.env).chooseCar(
          player.accountId,data.car);
      } catch(error){
        this.send(ws,{type:"error",
          error:"Could not verify your saved garage. Try again."});
        return;
      }
      if(!selected?.ok){
        this.send(ws,{type:"error",
          error:selected?.error||"Vehicle is locked."});
        return;
      }
      player.car = data.car;
      player.ready = false;


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


      // The ready-state spec is loaded by account ID from our STATS
      // Durable Object, never accepted from client race-state packets.
      try {
        const saved=await statsStub(this.env).getPlayerStats(
          player.accountId,player.username
        );
        if(!ownsRedlineCar(saved.carGarage,player.car)){
          this.send(ws,{type:"error",
            error:"This car is not owned by your account."});
          player.ready=false;
          return;
        }
        player.upgrades=savedCarGarage(saved,player.car).equipped;
      } catch(error) {
        // The three starter cars are permanently free. A temporary
        // account-storage outage may NEVER grant paid cars or upgrades,
        // but can safely let racers drive a free stock car and finish.
        if(STARTER_CAR_IDS.includes(player.car)){
          player.upgrades=stockUpgrades();
          this.send(ws,{type:"notice",
            message:"Garage storage is offline; racing with stock starter-car parts."});
        }else{
          this.send(ws,{type:"error",
            error:"Cannot verify purchased car while garage storage is offline. Select a free starter car."});
          return;
        }
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


      /*
        NEW:
        sanitize and relay Garage appearance.
      */

      const appearance =
        cleanAppearance(
          data.appearance
        );


      const state = {

        playerId:
          player.id,

        username:
          player.username,

        car:
          player.car,

        appearance,

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
          Date.now() -
          this.room.raceStartAt
        );


      const state =
        this.liveRaceStates.get(
          player.id
        );


      const result = {

        playerId:
          player.id,

        username:
          player.username,

        car:
          player.car,

        appearance:
          state?.appearance
          ??
          cleanAppearance(
            null
          ),

        place:
          this.finishOrder.length +
          1,

        finishTime

      };


      this.finishOrder.push(
        result
      );


      if (
        state
      ) {

        state.finished =
          true;


        state.finishTime =
          finishTime;


        this.liveRaceStates.set(
          player.id,
          state
        );

      }


      this.broadcast({

        type:
          "player_finished",

        result,

        finishOrder:
          this.finishOrder

      });


      /*
        If everyone required has finished,
        automatically show results.
      */

      await this.maybeCompleteRace();


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


      /*
        Remove racers who disconnected during the race
        before returning to the lobby.
      */

      this.room.players =
        this.room.players.filter(
          racer =>
            racer.connected
            ||
            racer.id ===
            player.id
        );


      if (
        !this.room.players.some(
          racer =>
            racer.host
        )
      ) {

        this.room.players.forEach(
          racer => {

            racer.host =
              false;

          }
        );


        this.room.players[0].host =
          true;


        this.room.hostId =
          this.room.players[0].id;

      }


      this.room.phase =
        "lobby";


      this.room.raceStartAt =
        null;


      this.room.raceId =
        null;


      this.room.raceComplete =
        false;


      this.room.results =
        [];


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


      /*
        Explicit event for clients that listen for it.
      */

      this.broadcast({

        type:
          "returned_to_lobby",

        room:
          publicRoom(
            this.room
          )

      });


      /*
        And the normal room_state so the existing
        index flow also switches back to lobby.
      */

      this.broadcastState();


      return;

    }

  }


  /* =======================================================
     WEBSOCKET CLOSE / ERROR
  ======================================================= */

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


  /* =======================================================
     DISCONNECT
  ======================================================= */

  async handleDisconnect(
    ws
  ) {

    if (
      !this.room
    ) {

      return;

    }


    const attachment =
      ws.deserializeAttachment();


    const playerId =
      attachment?.playerId;


    if (
      !playerId
    ) {

      return;

    }


    const player =
      this.room.players.find(
        candidate =>
          candidate.id ===
          playerId
      );


    if (
      !player
    ) {

      return;

    }


    /* -----------------------------------------------------
       LOBBY / GARAGE

       Remove disconnected racer completely.
    ----------------------------------------------------- */

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

        this.assignHost();

      }

    }


    /* -----------------------------------------------------
       RACE / RESULTS

       Keep racer record temporarily so results can
       still reference them, but mark disconnected.
    ----------------------------------------------------- */

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


      /*
        A disconnected racer should not trap everybody
        forever on the finish screen.
      */

      if (
        this.room.phase ===
        "racing"
      ) {

        await this.maybeCompleteRace();

      }

    }


    await this.persist();

    await this.syncDirectory();

    this.broadcastState();

  }


  /* =======================================================
     HOST ASSIGNMENT
  ======================================================= */

  assignHost() {

    if (
      !this.room
        ?.players
        ?.length
    ) {

      return;

    }


    this.room.players.forEach(
      racer => {

        racer.host =
          false;

      }
    );


    const next =

      this.room.players.find(
        racer =>
          racer.connected
      )

      ||

      this.room.players[0];


    next.host =
      true;


    this.room.hostId =
      next.id;

  }


  /* =======================================================
     COMPLETE RACE
  ======================================================= */

  async maybeCompleteRace() {

    if (
      !this.room
      ||
      this.room.phase !==
      "racing"
    ) {

      return false;

    }


    /*
      Connected racers are the ones still required
      to finish.

      This prevents somebody closing their browser
      from holding the results screen hostage.
    */

    const requiredRacers =
      this.room.players.filter(
        racer =>
          racer.connected
      );


    const racersToCheck =
      requiredRacers.length
        ?
        requiredRacers
        :
        this.room.players;


    const complete =

      racersToCheck.length >
      0

      &&

      racersToCheck.every(
        racer =>
          this.finishOrder.some(
            result =>
              result.playerId ===
              racer.id
          )
      );


    if (
      !complete
    ) {

      return false;

    }


    this.room.phase =
      "results";


    this.room.raceComplete =
      true;


    this.room.results =
      [
        ...this.finishOrder
      ];


    await this.persist();

    await this.syncDirectory();


    /*
      Persist finished racers into the global REDLINE stats store.
      The stats Durable Object de-duplicates by raceId, so a retry or
      Durable Object wake-up cannot double-count a race.
    */

    const statResults =
      this.finishOrder
        .map(
          result => {

            const racer =
              this.room.players.find(
                player =>
                  player.id ===
                  result.playerId
              );


            if (
              !racer?.accountId
            ) {

              return null;

            }


            return {
              accountId:
                racer.accountId,

              username:
                racer.username,

              place:
                result.place,

              finishTime:
                result.finishTime
            };

          }
        )
        .filter(
          Boolean
        );


    if (
      statResults.length
    ) {

      try {

        const cashRecord=await statsStub(
          this.env
        ).recordRace({

          raceId:
            this.room.raceId
            ||
            `${this.room.code}:${this.room.raceStartAt}`,

          map:
            this.room.map,

          playerCount:this.room.raceEntrantCount || this.room.players.length,

          results:
            statResults

        });

        if(cashRecord?.ok && Array.isArray(cashRecord.payouts)){
          const awards=new Map(cashRecord.payouts.map(
            v=>[String(v.accountId),v]
          ));
          for(const result of this.finishOrder){
            const racer=this.room.players.find(p=>p.id===result.playerId);
            const reward=racer&&awards.get(String(racer.accountId));
            if(reward){
              result.cashEarned=reward.cash;
              result.cashBase=reward.baseCash;
              result.cashPersonalBest=reward.personalBestBonus;
              result.cashChallenges=reward.challengeBonus;
              result.challengesCompleted=reward.challengesCompleted;
            }
          }
          this.room.results=[...this.finishOrder];
          await this.persist();
        }

      }

      catch (
        error
      ) {

        console.error(
          "REDLINE stats recording failed:",
          error
        );

      }

    }


    const room =
      publicRoom(
        this.room
      );


    /*
      Main results event.
    */

    this.broadcast({

      type:
        "race_complete",

      results:
        this.finishOrder,

      finishOrder:
        this.finishOrder,

      room

    });


    /*
      Also send a normal room-state update so any
      phase-based UI knows we're in results.
    */

    this.broadcastState();


    return true;

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


    this.room.results =
      [];


    this.room.raceComplete =
      false;


    this.room.phase =
      "countdown";


    this.room.raceId =
      crypto.randomUUID();
    // Lock count at countdown; departures don't reduce prizes.
    this.room.raceEntrantCount=Math.min(8,new Set(
      this.room.players.map(p=>String(p.accountId||p.id))
    ).size);


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
     PUBLIC DIRECTORY
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
     SOCKET HELPERS
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


/* =========================================================
   GLOBAL REDLINE STATS
========================================================= */

export class RedlineStats
  extends DurableObject {

  constructor(
    ctx,
    env
  ) {

    super(
      ctx,
      env
    );


    this.ctx =
      ctx;


    this.env =
      env;

  }


  emptyPlayer(
    accountId,
    username = "Racer"
  ) {

    return {

      accountId,

      username:
        cleanUsername(
          username
        ),

      racesFinished:
        0,
      cashBalance:0,
      cashEarnedTotal:0,
      lastCashAward:0,
      lastCashBreakdown:{base:0,personalBest:0,challenges:0},
      challenges:null,
      lastChallengeAwards:[],
      cashSpentTotal:0,
      garage:sanitizeGarage(null),
      carGarage:garageCarOwnership(null),
      cashSpentOnCars:0,

      placements: {
        "1":
          0,

        "2":
          0,

        "3":
          0,

        "4":
          0,

        "5":
          0,

        "6":
          0,

        "7":
          0,

        "8":
          0
      },

      bestTimes: {
        neon:
          null,

        canyon:
          null,

        arctic:
          null
      },

      updatedAt:
        null

    };

  }


  // Transactional ownership: no client-supplied price, wallet, or owner.
  async purchaseCar(accountId,carId) {
    return this.ctx.storage.transaction(async tx=>{
      const id=String(accountId||"");
      const price=carPrice(carId);
      if(!id || !Number.isSafeInteger(price) || price<=0)
        return {ok:false,error:"This vehicle is not available for purchase."};
      const key="player:"+id;
      const stats=(await tx.get(key))||this.emptyPlayer(id);
      ensurePerCarUpgrades(stats);
      const owned=garageCarOwnership(stats.carGarage);
      if(owned.owned.includes(carId))
        return {ok:false,error:"You already own this vehicle."};
      const cash=Math.max(0,Math.floor(Number(stats.cashBalance)||0));
      if(cash<price)
        return {ok:false,error:"Earn $"+(price-cash)+" more race cash."};
      owned.owned.push(carId);
      owned.selected=carId;
      stats.carGarage=garageCarOwnership(owned);
      stats.cashBalance=cash-price;
      stats.cashSpentTotal=Math.max(0,Math.floor(Number(stats.cashSpentTotal)||0))+price;
      stats.cashSpentOnCars=Math.max(0,Math.floor(Number(stats.cashSpentOnCars)||0))+price;
      stats.updatedAt=Date.now();
      await tx.put(key,stats);
      return {ok:true,carId,price,cashBalance:stats.cashBalance,
        carGarage:stats.carGarage};
    });
  }

  // Room selections are verified against saved ownership, and last
  // selected car persists across race sessions on the same account.
  async chooseCar(accountId,carId) {
    return this.ctx.storage.transaction(async tx=>{
      const id=String(accountId||"");
      if(!id||!VALID_CARS.has(carId))
        return {ok:false,error:"Unknown car."};
      const key="player:"+id;
      const stats=(await tx.get(key))||this.emptyPlayer(id);
      ensurePerCarUpgrades(stats);
      const profile=garageCarOwnership(stats.carGarage);
      if(!ownsRedlineCar(profile,carId))
        return {ok:false,error:"Buy this car in the dealership first."};
      profile.selected=carId;
      stats.carGarage=profile;
      stats.updatedAt=Date.now();
      await tx.put(key,stats);
      return {ok:true,carId,carGarage:profile};
    });
  }

  // Car-part ownership and equipment never cross between vehicles.
  async purchaseUpgrade(accountId,carId,category) {
    return this.ctx.storage.transaction(async tx=>{
      const id=String(accountId||"");
      if(!id||!Object.hasOwn(UPGRADE_CATALOG,category)||!VALID_CARS.has(carId))
        return {ok:false,error:"Invalid car or upgrade."};
      const key="player:"+id;
      const stats=(await tx.get(key))||this.emptyPlayer(id);
      if(!ownedUpgradeCar(stats,carId))
        return {ok:false,error:"Own this vehicle before upgrading it."};
      const map=ensurePerCarUpgrades(stats);
      const garage=sanitizeGarage(map[carId]);
      const tier=garage.owned[category]+1;
      // Price is determined from this exact owned car on the Worker.
      const price=upgradePrice(category,tier,carId);
      if(price===null)return {ok:false,error:"Maximum level reached for this car."};
      const balance=Math.max(0,Math.floor(Number(stats.cashBalance)||0));
      if(balance<price)return {ok:false,error:"Not enough race cash."};
      garage.owned[category]=tier;
      garage.equipped[category]=tier;
      map[carId]=garage;
      stats.carUpgrades=map;
      stats.cashBalance=balance-price;
      stats.cashSpentTotal=Math.max(0,Math.floor(Number(stats.cashSpentTotal)||0))+price;
      stats.updatedAt=Date.now();
      await tx.put(key,stats);
      return {ok:true,carId,garage,cashBalance:stats.cashBalance,
        price,category,tier};
    });
  }

  async equipUpgrade(accountId,carId,category,tier) {
    return this.ctx.storage.transaction(async tx=>{
      const id=String(accountId||"");
      if(!id||!VALID_CARS.has(carId)||!Object.hasOwn(UPGRADE_CATALOG,category)||
         !Number.isInteger(tier)||tier<0||tier>3)
        return {ok:false,error:"Invalid car or part."};
      const key="player:"+id;
      const stats=(await tx.get(key))||this.emptyPlayer(id);
      if(!ownedUpgradeCar(stats,carId))
        return {ok:false,error:"Own this vehicle before equipping parts."};
      const map=ensurePerCarUpgrades(stats);
      const garage=sanitizeGarage(map[carId]);
      if(tier>garage.owned[category])
        return {ok:false,error:"Purchase that level for this car first."};
      garage.equipped[category]=tier;
      map[carId]=garage;
      stats.carUpgrades=map;
      stats.updatedAt=Date.now();
      await tx.put(key,stats);
      return {ok:true,carId,garage,cashBalance:Math.max(0,
        Math.floor(Number(stats.cashBalance)||0)),category,tier};
    });
  }

  // Return only known, JSON-safe fields from Durable Object RPC.
  // Legacy storage can contain data from many earlier game revisions.
  // Never rewrite an existing account during a read or erase paid items.
  async getPlayerStats(accountId,currentUsername) {
    const id=String(accountId??"");
    let stored;
    try{
      stored=await this.ctx.storage.get("player:"+id);
    }catch(error){
      console.error("REDLINE_STATS_READ_FAILED",error);
      throw new Error("REDLINE_STATS_READ_FAILED");
    }
    try{
      const stats=stored && typeof stored==="object" && !Array.isArray(stored)
        ?stored:this.emptyPlayer(id,currentUsername);
      const positive=n=>{
        const number=Number(n);
        return Number.isSafeInteger(number)&&number>=0?number:0;
      };
      const owned=garageCarOwnership(stats.carGarage);
      const garage=sanitizeGarage(stats.garage);
      // sanitize the old shared record as well as all paid vehicle records.
      const carUpgrades=ensurePerCarUpgrades({
        carGarage:owned,garage,carUpgrades:stats.carUpgrades
      });
      const bestTimes={};
      for(const map of VALID_MAPS){
        const item=validMapBest(stats.bestTimes?.[map],map);
        const time=Number(item?.time);
        const achievedAt=Number(item?.achievedAt);
        bestTimes[map]=item && Number.isFinite(time) && time>=0
          ?{time,achievedAt:Number.isFinite(achievedAt)?achievedAt:null}
          :null;
      }
      const placements={};
      for(let rank=1;rank<=8;rank++)
        placements[String(rank)]=positive(stats.placements?.[String(rank)]);
      return {
        accountId:id,
        username:cleanUsername(currentUsername||stats.username||"Racer"),
        // The dealership must show actual Worker-confirmed prices, not
        // optimistic frontend catalog data during staggered deployments.
        economyVersion:18,
        upgradePriceVersion:2,
        carPrices:Object.fromEntries(
          REDLINE_CAR_IDS.map(carId=>[carId,carPrice(carId)])
        ),
        racesFinished:positive(stats.racesFinished),
        challengeVersion:1,
        challenges:challengeSnapshot(stats.challenges,Date.now()),
        lastChallengeAwards:Array.isArray(stats.lastChallengeAwards)?
          stats.lastChallengeAwards.slice(0,6).map(a=>({
            id:String(a.id||""),title:String(a.title||""),
            period:a.period==="weekly"?"weekly":"daily",
            reward:positive(a.reward)
          })):[],
        cashBalance:positive(stats.cashBalance),
        cashEarnedTotal:positive(stats.cashEarnedTotal),
        lastCashAward:positive(stats.lastCashAward),
        lastCashBreakdown:{
          base:positive(stats.lastCashBreakdown?.base),
          personalBest:positive(stats.lastCashBreakdown?.personalBest),
          challenges:positive(stats.lastCashBreakdown?.challenges)
        },
        cashSpentTotal:positive(stats.cashSpentTotal),
        cashSpentOnCars:positive(stats.cashSpentOnCars),
        garage,carGarage:owned,carUpgrades,placements,bestTimes,
        updatedAt:stats.updatedAt!=null &&
          Number.isFinite(Number(stats.updatedAt))
          ?Number(stats.updatedAt):null
      };
    }catch(error){
      console.error("REDLINE_STATS_NORMALIZE_FAILED",error);
      throw new Error("REDLINE_STATS_NORMALIZE_FAILED");
    }
  }


  async getLeaderboard(
    map
  ) {

    if (
      !VALID_MAPS.has(
        map
      )
    ) {

      return [];

    }


    const rows =
      (
        await this.ctx
          .storage
          .get(
            `leaderboard:${map}`
          )
      )
      ||
      [];


    return (map==="neon" ?rows.filter(row=>row?.rulesVersion===NEON_RECORD_RULES_VERSION):rows)
      .slice(
        0,
        10
      )
      .map(
        (
          row,
          index
        ) => ({

          rank:
            index +
            1,

          username:
            row.username,

          time:
            row.time,

          achievedAt:
            row.achievedAt
            ??
            null

        })
      );

  }


  async recordRace(input) {
    return this.ctx.storage.transaction(async storage =>
      this.recordRaceAtomic(storage,input)
    );
  }

  async recordRaceAtomic(storage,{
    raceId,
    map,
    playerCount,
    results
  }) {

    if (
      !raceId
      ||
      !VALID_MAPS.has(
        map
      )
      ||
      !Array.isArray(
        results
      )
    ) {

      return {
        ok:
          false
      };

    }


    const recentRaceIds =
      (
        await storage.get(
            "recentRaceIds"
          )
      )
      ||
      [];


    if (
      recentRaceIds.includes(
        raceId
      )
    ) {

      return {
        ok:
          true,

        duplicate:
          true
      };

    }


    const now=Date.now();
    const raceSize=Number(playerCount);
    if(!Number.isInteger(raceSize)||raceSize<1||raceSize>8)
      return {ok:false,error:"Invalid race size"};
    const payouts=[];
    const seenAccounts=new Set();

    let leaderboard =
      (
        await storage.get(
            `leaderboard:${map}`
          )
      )
      ||
      [];
    if(map==="neon")leaderboard=leaderboard.filter(row=>row?.rulesVersion===NEON_RECORD_RULES_VERSION);


    for (
      const rawResult
      of results
    ) {

      const accountId =
        String(
          rawResult?.accountId
          ||
          ""
        );


      const place =
        clamp(
          Math.floor(
            finiteNumber(
              rawResult?.place
            )
          ),
          1,
          8
        );


      const finishTime =
        Math.floor(
          finiteNumber(
            rawResult?.finishTime,
            -1
          )
        );


      if(!accountId||seenAccounts.has(accountId)||
         place>raceSize||finishTime<=0||finishTime>86400000)continue;
      seenAccounts.add(accountId);


      const username =
        cleanUsername(
          rawResult?.username
        );


      const playerKey =
        `player:${accountId}`;


      const stats =
        (
          await storage.get(
              playerKey
            )
        )
        ||
        this.emptyPlayer(
          accountId,
          username
        );


      stats.username =
        username;


      const progression=raceProgressionBonuses(
        stats.racesFinished,validMapBest(stats.bestTimes?.[map],map),finishTime
      );
      const challengeUpdate=advanceChallenges(stats.challenges,{
        map,place,improvedBest:progression.improvedBest
      },now);
      const baseCash=raceCashPrize(raceSize,place);
      const cash=baseCash+progression.personalBestBonus+
        challengeUpdate.earned;
      stats.cashBalance=Math.max(0,Math.floor(Number(stats.cashBalance)||0))+cash;
      stats.cashEarnedTotal=Math.max(0,Math.floor(Number(stats.cashEarnedTotal)||0))+cash;
      stats.lastCashAward=cash;
      stats.lastCashBreakdown={
        base:baseCash,personalBest:progression.personalBestBonus,
        challenges:challengeUpdate.earned
      };
      stats.challenges=challengeUpdate.state;
      stats.lastChallengeAwards=challengeUpdate.awards;
      payouts.push({accountId,place,cash,baseCash,
        personalBestBonus:progression.personalBestBonus,
        challengeBonus:challengeUpdate.earned,
        challengesCompleted:challengeUpdate.awards});
      stats.racesFinished=progression.finishCount;


      stats.placements =
        {
          ...this.emptyPlayer(
            accountId,
            username
          ).placements,

          ...(
            stats.placements
            ||
            {}
          )
        };


      stats.placements[
        String(
          place
        )
      ] =
        Math.max(
          0,
          Number(
            stats.placements[
              String(
                place
              )
            ]
          )
          ||
          0
        )
        +
        1;


      stats.bestTimes =
        {
          ...this.emptyPlayer(
            accountId,
            username
          ).bestTimes,

          ...(
            stats.bestTimes
            ||
            {}
          )
        };


      const currentBest=validMapBest(stats.bestTimes[map],map);


      if (
        !currentBest
        ||
        finishTime <
        Number(
          currentBest.time
        )
      ) {

        stats.bestTimes[
          map
        ] = {

          time:
            finishTime,

          achievedAt:
            now,
          ...(map==="neon"?{rulesVersion:NEON_RECORD_RULES_VERSION}:{})

        };

      }


      stats.updatedAt =
        now;


      await storage.put(
          playerKey,
          stats
        );


      const bestTime =
        Number(
          stats.bestTimes[
            map
          ]?.time
        );


      const existingIndex =
        leaderboard.findIndex(
          row =>
            row.accountId ===
            accountId
        );


      if (
        existingIndex >=
        0
      ) {

        leaderboard[
          existingIndex
        ].username =
          username;


        if (
          Number.isFinite(
            bestTime
          )
          &&
          bestTime <
          Number(
            leaderboard[
              existingIndex
            ].time
          )
        ) {

          leaderboard[
            existingIndex
          ].time =
            bestTime;


          leaderboard[
            existingIndex
          ].achievedAt =
            stats.bestTimes[
              map
            ]?.achievedAt
            ??
            now;

        }

      }

      else if (
        Number.isFinite(
          bestTime
        )
      ) {

        leaderboard.push({

          accountId,

          username,

          time:
            bestTime,

          achievedAt:
            stats.bestTimes[
              map
            ]?.achievedAt
            ??
            now,
          ...(map==="neon"?{rulesVersion:NEON_RECORD_RULES_VERSION}:{})

        });

      }

    }


    leaderboard =
      leaderboard
        .filter(
          row =>
            Number.isFinite(
              Number(
                row.time
              )
            )
        )
        .sort(
          (
            a,
            b
          ) =>
            Number(
              a.time
            )
            -
            Number(
              b.time
            )
        )
        .slice(
          0,
          10
        );


    recentRaceIds.push(
      raceId
    );


    if (
      recentRaceIds.length >
      1000
    ) {

      recentRaceIds.splice(
        0,
        recentRaceIds.length -
        1000
      );

    }


    await storage.put({
        [
          `leaderboard:${map}`
        ]:
          leaderboard,

        recentRaceIds
      });


    return {ok:true,payouts};

  }

}
