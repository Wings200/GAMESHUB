(() => {

  const STORAGE_KEY =
    "redline_garage_build_v1";


  const DEFAULT_BUILD = {

    stats: {
      speed: 4,
      acceleration: 4,
      grip: 4,
      turning: 4
    },

    appearance: {
      body: "coupe",
      color: "#e9edf2",
      accent: "#315fbd"
    }

  };


  function clamp(
    value,
    min,
    max
  ) {

    return Math.max(
      min,
      Math.min(
        max,
        Number(value) || 0
      )
    );

  }


  function cleanHex(
    value,
    fallback
  ) {

    const text =
      String(
        value || ""
      ).trim();


    return /^#[0-9a-f]{6}$/i.test(
      text
    )
      ?
      text
      :
      fallback;

  }


  function hexNumber(
    value,
    fallback
  ) {

    const clean =
      cleanHex(
        value,
        fallback
      );


    return Number.parseInt(
      clean.slice(1),
      16
    );

  }


  function getBuild() {

    const live =
      window.REDLINE_GARAGE
        ?.build;


    if (
      live
    ) {

      return live;

    }


    try {

      const saved =
        JSON.parse(
          localStorage.getItem(
            STORAGE_KEY
          )
        );


      return (
        saved
        ??
        DEFAULT_BUILD
      );

    }

    catch {

      return {
        ...DEFAULT_BUILD
      };

    }

  }


  function getStats() {

    const build =
      getBuild();


    return {

      speed:
        clamp(
          build?.stats?.speed
          ??
          4,
          0,
          8
        ),

      acceleration:
        clamp(
          build?.stats?.acceleration
          ??
          4,
          0,
          8
        ),

      grip:
        clamp(
          build?.stats?.grip
          ??
          4,
          0,
          8
        ),

      turning:
        clamp(
          build?.stats?.turning
          ??
          4,
          0,
          8
        )

    };

  }


  function getAppearance() {

    const build =
      getBuild();


    const allowedBodies = [
      "coupe",
      "supercar",
      "muscle",
      "track"
    ];


    const body =
      allowedBodies.includes(
        build?.appearance?.body
      )
        ?
        build.appearance.body
        :
        "coupe";


    return {

      body,

      color:
        cleanHex(
          build?.appearance?.color,
          "#e9edf2"
        ),

      accent:
        cleanHex(
          build?.appearance?.accent,
          "#315fbd"
        )

    };

  }


  function getPhysicsSpec(
    baseSpec
  ) {

    const stats =
      getStats();


    const appearance =
      getAppearance();


    const modelMap = {

      coupe:
        "gt",

      supercar:
        "vortex",

      muscle:
        "muscle",

      track:
        "apex"

    };


    return {

      ...baseSpec,


      /* =========================
         APPEARANCE
      ========================= */

      model:
        modelMap[
          appearance.body
        ]
        ??
        "gt",

      body:
        hexNumber(
          appearance.color,
          "#e9edf2"
        ),

      accent:
        hexNumber(
          appearance.accent,
          "#315fbd"
        ),

      garageAppearance: {
        ...appearance
      },


      /* =========================
         SPEED
      ========================= */

      topSpeed:
        38 +
        stats.speed *
        3,

      nitroSpeed:
        48 +
        stats.speed *
        3.25,

      boostSpeed:
        56 +
        stats.speed *
        3.5,

      drag:
        0.42 -
        stats.speed *
        0.02,


      /* =========================
         ACCELERATION
      ========================= */

      acceleration:
        11 +
        stats.acceleration *
        2,

      reverseAcceleration:
        7 +
        stats.acceleration *
        0.875,


      /* =========================
         GRIP
      ========================= */

      grip:
        5.3 +
        stats.grip *
        0.8,

      driftGrip:
        0.8 +
        stats.grip *
        0.14,

      braking:
        26 +
        stats.grip *
        2,


      /* =========================
         TURNING
      ========================= */

      steer:
        0.84 +
        stats.turning *
        0.12,

      highSpeedSteer:
        0.62 +
        stats.turning *
        0.05,


      garageStats: {
        ...stats
      },


      stats: {

        speed:
          stats.speed /
          8 *
          100,

        accel:
          stats.acceleration /
          8 *
          100,

        grip:
          stats.grip /
          8 *
          100,

        drift:
          stats.turning /
          8 *
          100

      }

    };

  }


  window.REDLINE_GARAGE_PHYSICS = {

    get stats() {

      return getStats();

    },


    get appearance() {

      return getAppearance();

    },


    getPhysicsSpec,


    debug() {

      return {

        stats:
          getStats(),

        appearance:
          getAppearance(),

        spec:
          getPhysicsSpec({
            name:
              "TEST"
          })

      };

    }

  };

})();
