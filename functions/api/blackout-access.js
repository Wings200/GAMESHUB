import {
  verifiedBlackoutAccount, blackoutRole, blackoutJson
} from "../_lib/blackout-access.js";

export async function onRequestGet(context) {
  try {
    const user = await verifiedBlackoutAccount(context);
    const role = await blackoutRole(context,user);
    return blackoutJson({
      ok:true,
      role,
      allowed:role==="admin" || role==="tester",
      admin:role==="admin",
      username:user?.username || null
    });
  } catch (error) {
    console.error("BLACKOUT access lookup failed",error);
    return blackoutJson({ok:false,role:"locked",allowed:false,admin:false},503);
  }
}
