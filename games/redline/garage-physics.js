(() => {

  const STORAGE_KEY =
    "redline_garage_build_v1";


  const DEFAULT_STATS = {
    speed: 4,
    acceleration: 4,
    grip: 4,
    turning: 4
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


  function getStats() {

    /*
      Prefer the live Garage UI.
    */

    const live =
      window.REDLINE_GARAGE
        ?.build
        ?.stats;


    if (
      live
    ) {

      return {
        speed:
          clamp(
            live.speed,
            0,
            8
          ),

        acceleration:
          clamp(
            live.acceleration,
            0,
            8
          ),

        grip:
          clamp(
            live.grip,
            0,
            8
          ),

        turning:
          clamp(
            live.turning,
            0,
            8
          )
      };

    }


    /*
      Fallback to saved build.
    */

    try {

      const saved =
        JSON.parse(
          localStorage.getItem(
            STORAGE_KEY
          )
        );


      return {
        speed:
          clamp(
            saved?.stats?.speed
            ??
            4,
            0,
            8
          ),

        acceleration:
          clamp(
            saved?.stats?.acceleration
            ??
            4,
            0,
            8
          ),

        grip:
          clamp(
            saved?.stats?.grip
            ??
            4,
            0,
            8
          ),

        turning:
          clamp(
            saved?.stats?.turning
            ??
            4,
            0,
            8
          )
      };

    }

    catch {

      return {
        ...DEFAULT_STATS
      };

    }

  }


  function getPhysicsSpec(
    baseSpec
  ) {

    const stats =
      getStats();


    /*
      =============================================
      SPEED

      0 = 38
      4 = 50  ← old GT
      8 = 62

      Nitro:
      0 = 48
      4 = 61
      8 = 74

      Boost:
      0 = 56
      4 = 70
      8 = 84
      =============================================
    */

    const topSpeed =
      38 +
      stats.speed *
      3;


    const nitroSpeed =
      48 +
      stats.speed *
      3.25;


    const boostSpeed =
      56 +
      stats.speed *
      3.5;


    /*
      Higher Speed builds also have
      slightly less aerodynamic drag.

      4 points = old GT's 0.34.
    */

    const drag =
      0.42 -
      stats.speed *
      0.02;


    /*
      =============================================
      ACCELERATION

      0 = 11
      4 = 19  ← old GT
      8 = 27
      =============================================
    */

    const acceleration =
      11 +
      stats.acceleration *
      2;


    const reverseAcceleration =
      7 +
      stats.acceleration *
      0.875;


    /*
      =============================================
      GRIP

      0 = 5.3
      4 = 8.5  ← old GT
      8 = 11.7
      =============================================
    */

    const grip =
      5.3 +
      stats.grip *
      0.8;


    /*
      Handbrake still allows drifting,
      but a high-grip build recovers
      sideways movement faster.
    */

    const driftGrip =
      0.8 +
      stats.grip *
      0.14;


    /*
      Grip also slightly affects braking.
    */

    const braking =
      26 +
      stats.grip *
      2;


    /*
      =============================================
      TURNING

      0 = 0.84
      4 = 1.32  ← old GT
      8 = 1.80
      =============================================
    */

    const steer =
      0.84 +
      stats.turning *
      0.12;


    /*
      Determines how much steering remains
      at very high speed.

      4 = old GT's 0.82.
    */

    const highSpeedSteer =
      0.62 +
      stats.turning *
      0.05;


    return {

      /*
        Keep anything unrelated to our
        four-point system intact.
      */

      ...baseSpec,


      /*
        Performance values.
      */

      topSpeed,
      nitroSpeed,
      boostSpeed,

      acceleration,
      reverseAcceleration,

      braking,

      grip,
      driftGrip,

      steer,
      highSpeedSteer,

      drag,


      /*
        Keep the actual Garage numbers
        attached for debugging later.
      */

      garageStats: {
        ...stats
      },


      /*
        Old hidden garage bars.
        Doesn't affect gameplay.
      */

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


    getPhysicsSpec,


    debug() {

      const stats =
        getStats();


      return {

        stats,

        spec:
          getPhysicsSpec({
            name:
              "TEST"
          })

      };

    }

  };

})();
