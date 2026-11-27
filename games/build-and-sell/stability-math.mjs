
export function currentResponse(payload,session,started,current){
 return started===current&&!!session&&payload?.code===session.code&&payload?.id===session.id;
}
export function staleLayout(data,revision){
 return Number.isSafeInteger(data?.revision)&&data.revision<revision;
}
export function syncDelay(failures){
 return failures>0?Math.min(10000,1500*2**Math.min(3,failures-1)):250;
}
