import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {load} from 'cheerio';
import {galleryGesture,galleryPosition} from '../lib/gallery';
import {pages,prepareHtml,products} from '../lib/catalog';

test('gallery swipes and fast flicks preserve vertical scrolling and small taps',()=>{
  assert.equal(galleryGesture(-80,3,500),1);
  assert.equal(galleryGesture(80,3,500),-1);
  assert.equal(galleryGesture(-25,3,50),1);
  assert.equal(galleryGesture(-25,3,500),0);
  assert.equal(galleryGesture(4,1,1),0);
  assert.equal(galleryGesture(-80,100,100),0);
});
test('product galleries stop at both ends instead of wrapping to the wrong document',()=>{
  assert.equal(galleryPosition(0,-1,4),0);
  assert.equal(galleryPosition(3,1,4),3);
  assert.equal(galleryPosition(0,1,4),1);
  assert.equal(galleryPosition(2,-1,3),1);
});
test('all catalog galleries retain every source slide and local scientific asset',()=>{
  const productPages=pages().filter(page=>page.route.startsWith('/products/'));
  assert.equal(productPages.length,products().length);
  for(const page of productPages){
    const source=load(page.html),$=load(prepareHtml(page));
    const track=$('[data-product-gallery-track]');
    assert.equal(track.length,1,page.route);
    const slides=track.children();
    assert.equal(slides.length,source('main .touch-pan-y').first().children().length,page.route);
    assert.equal(track.parent().attr('aria-label'),'Product images');
    assert.equal($('[data-gallery-dot]').length,slides.length>1?slides.length:0,page.route);
    if(slides.length>1){assert.equal($('[data-slide="previous"]').length,1);assert.equal($('[data-slide="next"]').length,1);}
    track.find('img').each((_,image)=>{const src=$(image).attr('src')!;assert.ok(src.startsWith('/reference/'),page.route+' '+src);assert.ok(existsSync('public'+src),page.route+' '+src);});
    slides.each((_,slide)=>{const node=$(slide);if(node.attr('data-gallery-kind')==='diagram'){assert.equal(node.attr('data-diagram-magnifier'),'true');assert.equal(node.attr('data-action'),'expand-image');}if(node.attr('data-gallery-kind')==='certificate')assert.equal(node.find('[data-gallery-certificate-label]').length,1);});
  }
});
test('blend galleries preserve each component structure and sequence',()=>{
  const page=pages().find(page=>page.route==='/products/klow')!,$=load(prepareHtml(page));
  assert.equal($('[data-gallery-kind="diagram"]').length,8);
  assert.equal($('[data-gallery-kind="certificate"]').length,1);
});
