// IMPORTANT: This module is a presentation boundary for score data.
// Connect it to your existing scoring engine/backend without changing the existing formula.
export function getScoreSnapshot(source){
  return {overall:Number(source?.overall ?? 0), checklist:Number(source?.checklist ?? 0), delegation:Number(source?.delegation ?? 0)}
}
