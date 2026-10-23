import test from "node:test";
import assert from "node:assert/strict";
import {normalizeBlackoutGameSettings,canStartBlackoutRound} from
  "./src/multiplayer-protocol.js";

const attacker=[{id:"1",side:"attacker"}];
const defender=[{id:"2",side:"defender"}];

test("standard rooms still need an attacker and defender",()=>{
 const room=normalizeBlackoutGameSettings({kind:"standard",maxPlayers:1,startRule:"any"});
 assert.equal(room.kind,"standard");
 assert.equal(room.maxPlayers,10);
 assert.equal(room.startRule,"opposing");
 assert.equal(room.winCondition,"elimination");
 assert.equal(canStartBlackoutRound(room,attacker),false);
 assert.equal(canStartBlackoutRound(room,[...attacker,...defender]),true);
});

test("custom free-roam rooms can start solo with one actual player",()=>{
 const room=normalizeBlackoutGameSettings({
  kind:"custom",maxPlayers:1,startRule:"any",winCondition:"freeplay",roomName:"Solo Ironvale"
 });
 assert.equal(room.maxPlayers,1);
 assert.equal(room.roomName,"Solo Ironvale");
 assert.equal(room.winCondition,"freeplay");
 assert.equal(canStartBlackoutRound(room,[]),false);
 assert.equal(canStartBlackoutRound(room,attacker),true);
});

test("custom lobbies can require opposing teams when host chooses",()=>{
 const room=normalizeBlackoutGameSettings({kind:"custom",startRule:"opposing"});
 assert.equal(canStartBlackoutRound(room,[...attacker, ...attacker]),false);
 assert.equal(canStartBlackoutRound(room,[...attacker,...defender]),true);
});

test("room setting normalization clamps caps and sanitizes labels",()=>{
 const tooLarge=normalizeBlackoutGameSettings({
  kind:"custom",maxPlayers:999,roomName:"<<<  The Range  >>>"
 });
 assert.equal(tooLarge.maxPlayers,10);
 assert.equal(tooLarge.roomName,"The Range");
 assert.equal(normalizeBlackoutGameSettings({kind:"custom",maxPlayers:-10}).maxPlayers,1);
 assert.equal(normalizeBlackoutGameSettings({kind:"custom",maxPlayers:"wat"}).maxPlayers,10);
});

test("invalid modes cannot bypass standard room safety",()=>{
 const malicious=normalizeBlackoutGameSettings({
  kind:"admin",startRule:"any",winCondition:"freeplay",maxPlayers:0
 });
 assert.equal(malicious.kind,"standard");
 assert.equal(malicious.startRule,"opposing");
 assert.equal(malicious.winCondition,"elimination");
 assert.equal(canStartBlackoutRound(malicious,attacker),false);
});
