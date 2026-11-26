
import {groundHeight,LOT} from "./terrain.mjs";
export const LASER_HEIGHT=1.35,LASER_RANGE=35;
export const emptySurvey=()=>({mode:"none",station:null});
export function cleanStation(a){
 return a&&typeof a.x==="number"&&typeof a.z==="number"&&Number.isFinite(a.x)&&Number.isFinite(a.z)&&Math.abs(a.x)<=LOT-.5&&Math.abs(a.z)<=LOT-.5?{x:a.x,z:a.z}:null;
}
export function sanitizeSurvey(v){
 return {mode:v?.mode==="laser"||v?.mode==="rod"?v.mode:"none",station:cleanStation(v?.station)};
}
export function surveyReading(station,point){
 if(!station||!point)return null;
 const distance=Math.hypot(station.x-point.x,station.z-point.z);
 if(distance>LASER_RANGE)return null;
 const elevation=groundHeight(point.x,point.z)-groundHeight(station.x,station.z);
 return {distance,elevation,rod:LASER_HEIGHT-elevation,plane:groundHeight(station.x,station.z)+LASER_HEIGHT};
}
export function nearestStation(stations,point){
 let best=null,dist=Infinity;
 for(const station of stations){if(!station)continue;const d=Math.hypot(station.x-point.x,station.z-point.z);if(d<dist&&d<=LASER_RANGE){best=station;dist=d;}}
 return best;
}
