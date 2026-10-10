import {vialDiscount} from '@/lib/interactions';

/** Preview the whole regional cart, including packs and the quantity on this page. */
export function updateVialSummary(container:HTMLElement){
  const quantity=Math.max(1,Number(container.querySelector<HTMLInputElement>('input[aria-label="Quantity"]')?.value||1));
  const here=Number(container.dataset.pack||1)*quantity,cart=Math.max(0,Number(container.dataset.cartVials||0)),count=cart+here;
  const percent=vialDiscount(count),summary=container.querySelector<HTMLElement>('[data-vial-summary]');
  if(summary){
    summary.textContent=`${count} vial${count===1?'':'s'}${cart?` (${cart} in your cart + ${here} here)`:''} — ${percent?`${percent}% off your whole order at checkout.`:'no vial discount yet.'}`;
    summary.parentElement?.classList.toggle('clone-vial-earned',percent>0);
  }
  const next=container.querySelector<HTMLElement>('[data-vial-next]');
  if(next){const target=count<3?3:count<5?5:10;next.hidden=count>=10;next.textContent=`Add ${target-count} more vial${target-count===1?'':'s'} for ${vialDiscount(target)}% off.`;}
  const after=container.querySelector<HTMLElement>('[data-vial-after]');
  if(after){after.hidden=count>=5;after.textContent=count<3?'After that, 10% at 5 vials, 20% at 10 vials.':'After that, 20% at 10 vials.';}
  container.querySelector<HTMLButtonElement>('[data-action="quantity-down"]')?.toggleAttribute('disabled',quantity<=1);
  container.dispatchEvent(new container.ownerDocument.defaultView!.Event('clone:purchase-change'));
}
