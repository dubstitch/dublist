/* Published activity digest, not an invented push-notification service.
   Maintain data/activity.json alongside catalog edits. */
async function loadActivity(){
 const cards=[...document.querySelectorAll(".shopper-updates__card")];
 if(!cards.length)return;
 try{
  const response=await fetch("data/activity.json",{cache:"no-cache"});
  if(!response.ok)throw new Error("Activity log unavailable");
  const data=await response.json();
  const changes=Array.isArray(data.changes)?data.changes:[];
  for(const card of cards){
   const type=card.dataset.status;
   const count=changes.filter(item=>item.type===type).length;
   card.dataset.active=String(count>0);
   const output=card.querySelector("[data-status-count]");
   if(output){output.textContent=String(count);output.setAttribute("aria-label",count+" "+type+" requests");}
  }
 }catch(error){
  const note=document.querySelector(".shopper-updates__intro p");
  if(note)note.textContent="Activity details are unavailable. The published wishlist can still be browsed.";
 }
}
loadActivity();
