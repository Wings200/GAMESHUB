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
 bayside:{name:"BAYSIDE NX",style:"Tuned street coupe",price:65,
  spec:{topSpeed:52,nitroSpeed:63,boostSpeed:72,acceleration:20.2,
   reverseAcceleration:10.8,braking:33,grip:8.9,driftGrip:1.52,
   steer:1.48,highSpeedSteer:.86,drag:.33,
   stats:{speed:79,accel:83,grip:81,drift:94},
   body:0x2377b1,accent:0x111b2b,glass:0x132631,model:"bayside"}},
 aurora:{name:"AURORA RALLY",style:"Rally-inspired AWD coupe",price:85,
  spec:{topSpeed:49,nitroSpeed:59,boostSpeed:67,acceleration:20.8,
   reverseAcceleration:12.2,braking:38,grip:9.8,driftGrip:1.22,
   steer:1.51,highSpeedSteer:.91,drag:.41,
   stats:{speed:73,accel:87,grip:90,drift:78},
   body:0xe7b84a,accent:0x1b2530,glass:0x141d28,model:"aurora"}},
 ironclad:{name:"IRONCLAD 440",style:"Old-school V8 muscle",price:110,
  spec:{topSpeed:55,nitroSpeed:66,boostSpeed:74,acceleration:20.5,
   reverseAcceleration:9.4,braking:29,grip:7.3,driftGrip:.89,
   steer:1.07,highSpeedSteer:.66,drag:.29,
   stats:{speed:84,accel:86,grip:60,drift:65},
   body:0x7f2536,accent:0xeadaba,glass:0x1a2327,model:"ironclad"}},
 cirrus:{name:"CIRRUS GT",style:"Long-distance grand tourer",price:160,
  spec:{topSpeed:58,nitroSpeed:69,boostSpeed:77,acceleration:19.4,
   reverseAcceleration:10.5,braking:37,grip:8.6,driftGrip:1.15,
   steer:1.23,highSpeedSteer:.82,drag:.24,
   stats:{speed:89,accel:78,grip:79,drift:72},
   body:0xc4c8d1,accent:0x304868,glass:0x10252f,model:"cirrus"}},
 obsidian:{name:"OBSIDIAN RS",style:"Mid-engine track supercar",price:235,
  spec:{topSpeed:62,nitroSpeed:74,boostSpeed:82,acceleration:22.0,
   reverseAcceleration:10.2,braking:40,grip:9.1,driftGrip:1.04,
   steer:1.29,highSpeedSteer:.83,drag:.23,
   stats:{speed:95,accel:92,grip:83,drift:71},
   body:0x383b45,accent:0xf05e32,glass:0x101218,model:"obsidian"}},
 phantom:{name:"PHANTOM XR",style:"Experimental hypercar",price:380,
  spec:{topSpeed:68,nitroSpeed:79,boostSpeed:86,acceleration:20.8,
   reverseAcceleration:9.0,braking:36,grip:8.2,driftGrip:.98,
   steer:1.08,highSpeedSteer:.76,drag:.18,
   stats:{speed:100,accel:85,grip:72,drift:66},
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
