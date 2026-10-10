/** The reference gallery clamps at its ends and accepts a short, fast flick. */
export function galleryPosition(current:number,delta:number,count:number){
  return Math.max(0,Math.min(count-1,current+delta));
}
export function galleryGesture(dx:number,dy:number,elapsed:number):number {
  if(Math.abs(dx)<=Math.abs(dy))return 0;
  const distance=Math.abs(dx),velocity=distance/Math.max(1,elapsed);
  return distance>50||distance>20&&velocity>.3?(dx<0?1:-1):0;
}
