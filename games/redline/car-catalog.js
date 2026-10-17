/*
 * REDLINE original dealership lineup. Shared by the Worker and game.
 * The original three cars stay free for every existing and new account.
 * All other models are fictional and only inspired by vehicle classes.
 */
export const STARTER_CAR_IDS=Object.freeze(["gt","vortex","apex"]);
export const REDLINE_CAR_CATALOG=Object.freeze({
 gt:{name:"REDLINE GT",style:"Balanced sport coupe",price:0,
  spec:{topSpeed:50,nitroSpeed:61,boostSpeed:70,acceleration:19,
   reverseAcceleration:10.5,braking:34,grip:8.5,driftGrip:1.36,
   steer:1.32,highSpeedSteer:.82,drag:.34,
   stats:{speed:76,accel:78,grip:75,drift:70},
   body:0xe9edf2,accent:0x315fbd,glass:0x111820,model:"gt"}},
 vortex:{name:"VORTEX R",style:"High-speed supercar",price:0,
  spec:{topSpeed:64,nitroSpeed:76,boostSpeed:84,acceleration:18.5,
   reverseAcceleration:9.5,braking:31,grip:7.1,driftGrip:.95,
   steer:1.08,highSpeedSteer:.68,drag:.20,
   stats:{speed:98,accel:74,grip:58,drift:63},
   body:0xb72f43,accent:0x191d24,glass:0x080c11,model:"vortex"}},
 apex:{name:"APEX S",style:"Agile track coupe",price:0,
  spec:{topSpeed:46,nitroSpeed:56,boostSpeed:64,acceleration:21.5,
   reverseAcceleration:11.5,braking:38,grip:10.2,driftGrip:1.18,
   steer:1.52,highSpeedSteer:.92,drag:.40,
   stats:{speed:68,accel:90,grip:92,drift:86},
   body:0x36a697,accent:0x15282c,glass:0x0c1a20,model:"apex"}},
 bayside:{name:"BAYSIDE NX",style:"Tuned street coupe",price:165,
  spec:{topSpeed:56,nitroSpeed:70,boostSpeed:79,acceleration:23.0,
   reverseAcceleration:11.0,braking:36,grip:9.3,driftGrip:1.74,
   steer:1.57,highSpeedSteer:.95,drag:.29,softLimiterStart:48,
   stats:{speed:83,accel:86,grip:82,drift:97},
   body:0x2377b1,accent:0x111b2b,glass:0x132631,model:"bayside"}},
 aurora:{name:"AURORA RALLY",style:"Rally-inspired AWD coupe",price:245,
  spec:{topSpeed:53,nitroSpeed:65,boostSpeed:74,acceleration:24.0,
   reverseAcceleration:13.0,braking:43,grip:11.8,driftGrip:1.18,
   steer:1.66,highSpeedSteer:1.04,drag:.35,softLimiterStart:47,
   stats:{speed:77,accel:91,grip:99,drift:79},
   body:0xe7b84a,accent:0x1b2530,glass:0x141d28,model:"aurora"}},
 ironclad:{name:"IRONCLAD 440",style:"Old-school V8 muscle",price:365,
  spec:{topSpeed:65,nitroSpeed:78,boostSpeed:89,acceleration:27.0,
   reverseAcceleration:10.2,braking:31,grip:7.5,driftGrip:.79,
   steer:1.08,highSpeedSteer:.73,drag:.25,softLimiterStart:56,
   stats:{speed:91,accel:97,grip:61,drift:54},
   body:0x7f2536,accent:0xeadaba,glass:0x1a2327,model:"ironclad"}},
 cirrus:{name:"CIRRUS GT",style:"Long-distance grand tourer",price:550,
  spec:{topSpeed:69,nitroSpeed:81,boostSpeed:91,acceleration:23.8,
   reverseAcceleration:11.0,braking:41,grip:9.2,driftGrip:1.11,
   steer:1.35,highSpeedSteer:.96,drag:.20,softLimiterStart:59,
   stats:{speed:95,accel:88,grip:83,drift:68},
   body:0xc4c8d1,accent:0x304868,glass:0x10252f,model:"cirrus"}},
 obsidian:{name:"OBSIDIAN RS",style:"Mid-engine track supercar",price:850,
  spec:{topSpeed:76,nitroSpeed:89,boostSpeed:99,acceleration:29.2,
   reverseAcceleration:11.0,braking:49,grip:11.1,driftGrip:1.10,
   steer:1.49,highSpeedSteer:1.10,drag:.17,softLimiterStart:67,
   stats:{speed:98,accel:99,grip:95,drift:78},
   body:0x383b45,accent:0xf05e32,glass:0x101218,model:"obsidian"}},
 phantom:{name:"PHANTOM XR",style:"Experimental hypercar",price:1250,
  spec:{topSpeed:86,nitroSpeed:100,boostSpeed:111,acceleration:31.5,
   reverseAcceleration:11.6,braking:46,grip:10.7,driftGrip:.94,
   steer:1.36,highSpeedSteer:1.02,drag:.14,softLimiterStart:78,
   stats:{speed:100,accel:100,grip:92,drift:64},
   body:0x693a92,accent:0x26d8c9,glass:0x0c1024,model:"phantom"}}
});
export const REDLINE_CAR_IDS=Object.freeze(Object.keys(REDLINE_CAR_CATALOG));
export function carPrice(id){
 return Object.hasOwn(REDLINE_CAR_CATALOG,id)
   ?REDLINE_CAR_CATALOG[id].price:null;
}
export function garageCarOwnership(input){
 const owned=new Set(STARTER_CAR_IDS);
 if(Array.isArray(input?.owned))for(const id of input.owned){
   if(typeof id==="string"&&Object.hasOwn(REDLINE_CAR_CATALOG,id))owned.add(id);
 }
 const selected=typeof input?.selected==="string"&&owned.has(input.selected)
   ?input.selected:"gt";
 return {owned:[...owned],selected};
}
export function ownsRedlineCar(profile,id){
 return typeof id==="string" && garageCarOwnership(profile).owned.includes(id);
}
