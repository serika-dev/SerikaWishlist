/**
 * The "Add to Serika Wishlist" bookmarklet.
 *
 * Runs on whatever page the person is looking at, so it can read pages that
 * would never answer our server (stores behind bot checks, Throne, Wishlist.com).
 * It opens a popup on our origin first, while the click still counts as a user
 * gesture, then reads the page and posts what it found to the popup:
 *
 *   { kind: 'product', product }            a single product page
 *   { kind: 'import', source, url, title, items }   a whole list on Throne,
 *                                            MyWishlist or Wishlist.com
 *
 * The popup only ever shows the data for the person to confirm; nothing is
 * saved until they press the button there. Popups blocked? It falls back to
 * opening /clip?u=<page> in the same tab, which reads the link server-side.
 *
 * Kept as plain ES5 in one string: no comments inside, every statement ends
 * with a semicolon or brace, so collapsing whitespace is a safe minifier.
 */

const SOURCE = String.raw`
(function(){
var B="__BASE__";
var h=location.hostname.replace(/^www\./,"");
var w=window.open(B+"/clip","serika_wishlist_clip","popup,width=480,height=800,left="+Math.max(0,(screen.availWidth||1200)-520)+",top=40");
if(!w){location.href=B+"/clip?u="+encodeURIComponent(location.href);return;}
var payload=null,ready=false;
function send(){if(payload&&ready){try{w.postMessage({type:"serika-wishlist:payload",payload:payload},B);}catch(e){}}}
function onMsg(e){if(e.origin!==B||!e.data)return;if(e.data.type==="serika-wishlist:ready"){ready=true;send();}if(e.data.type==="serika-wishlist:got"){window.removeEventListener("message",onMsg);}}
window.addEventListener("message",onMsg);
function done(p){payload=p;send();}
function meta(n){var e=document.querySelector('meta[property="'+n+'"],meta[name="'+n+'"],meta[itemprop="'+n+'"]');return e?(e.getAttribute("content")||"").trim():"";}
function abs(u){try{return u?new URL(u,location.href).href:"";}catch(e){return "";}}
function str(v){if(!v)return "";if(typeof v==="string")return v;if(typeof v==="number")return String(v);if(Array.isArray(v))return str(v[0]);if(typeof v==="object")return str(v.url||v.contentUrl||v.src||v.href||v.large||v.original||v["@id"]||"");return "";}
function clean(t){return String(t||"").replace(/\s+/g," ").trim();}
function lds(){var out=[];var walk=function(j){if(!j||typeof j!=="object")return;if(Array.isArray(j)){j.forEach(walk);return;}out.push(j);if(j["@graph"])walk(j["@graph"]);if(j.mainEntity)walk(j.mainEntity);if(j.itemListElement)walk(j.itemListElement);if(j.item)walk(j.item);};document.querySelectorAll('script[type="application/ld+json"]').forEach(function(s){try{walk(JSON.parse(s.textContent));}catch(e){}});return out;}
function isT(n,t){var x=n["@type"];return x===t||(Array.isArray(x)&&x.indexOf(t)>-1);}
function offer(o){o=Array.isArray(o)?o[0]:o;if(!o||typeof o!=="object")return {};var s=Array.isArray(o.priceSpecification)?o.priceSpecification[0]:(o.priceSpecification||{});return {price:o.price||o.lowPrice||s.price||null,currency:o.priceCurrency||s.priceCurrency||null};}
function bigImg(){var best=null,ba=0;document.querySelectorAll("img").forEach(function(i){var r=i.getBoundingClientRect();var a=r.width*r.height;if(a>ba&&r.width>140&&r.height>140&&r.top<innerHeight*1.5){ba=a;best=i;}});return best?(best.currentSrc||best.src):"";}
function priceText(){var sels=["#corePrice_feature_div .a-offscreen",".a-price .a-offscreen","[itemprop=price]","[data-testid*=price]","[class*=Price]","[class*=price]"];for(var i=0;i<sels.length;i++){var e=document.querySelector(sels[i]);if(e){var t=clean(e.getAttribute("content")||e.textContent);if(/\d/.test(t)&&t.length<32)return t;}}return "";}
function product(){var p=lds().filter(function(n){return isT(n,"Product")||isT(n,"ProductGroup");})[0]||{};var of=offer(p.offers);var pt=document.getElementById("productTitle");var li=document.getElementById("landingImage")||document.getElementById("imgBlkFront");var t=(pt&&pt.textContent)||str(p.name)||meta("og:title")||meta("twitter:title")||document.title;var img=(li&&(li.getAttribute("data-old-hires")||li.currentSrc||li.src))||str(p.image)||meta("og:image")||meta("twitter:image")||bigImg();var pr=of.price||meta("product:price:amount")||meta("og:price:amount")||priceText();var sel=clean(window.getSelection?String(window.getSelection()):"");return {kind:"product",product:{title:clean(t).slice(0,200),url:location.href,imageUrl:abs(img),price:pr?String(pr):null,currency:of.currency||meta("product:price:currency")||meta("og:price:currency")||null,store:meta("og:site_name")||h,note:sel.slice(0,500)}};}
var TK=["title","name","productName","product_name","itemName"],UK=["url","link","productUrl","product_url","externalUrl","external_url","href","sourceUrl","source_url","purchaseUrl"],IK=["image","imageUrl","image_url","img","imgUrl","imgLink","thumbnail","thumbnailUrl","photo","picture","images"],PK=["price","priceAmount","price_amount","amount","currentPrice","salePrice"],CK=["currency","priceCurrency","currencyCode","currency_code"];
function pick(o,ks){for(var i=0;i<ks.length;i++){var v=o[ks[i]];if(v!==undefined&&v!==null&&v!=="")return v;}return undefined;}
function like(o){if(!o||typeof o!=="object")return null;var t=str(pick(o,TK)),u=str(pick(o,UK)),im=str(pick(o,IK));if(!t||t.length>300||(!/^https?:/.test(u)&&!/^https?:/.test(im)))return null;var pv=pick(o,PK),of=o.offers?offer(o.offers):{};var nested=pv&&typeof pv==="object"?pv:null;return {title:clean(t),url:/^https?:/.test(u)?u:null,imageUrl:/^https?:/.test(im)?im:null,price:of.price||(nested?(nested.amount||nested.value):pv)||null,currency:of.currency||(nested&&(nested.currency||nested.currencyCode))||str(pick(o,CK))||null,note:str(o.note||o.notes||o.comment||"").slice(0,1000)};}
function deep(state){var best=[],seen=new WeakSet();var walk=function(v,d){if(!v||typeof v!=="object"||d>14||seen.has(v))return;seen.add(v);if(Array.isArray(v)){if(v.length&&typeof v[0]==="object"){var got=v.map(function(x){return like(x)||(x&&like(x.product||x.item));}).filter(Boolean);if(got.length>best.length&&got.length>=v.length*0.6)best=got;}v.forEach(function(x){walk(x,d+1);});return;}for(var k in v){if(Object.prototype.hasOwnProperty.call(v,k))walk(v[k],d+1);}};walk(state,0);return best;}
function domCards(){var groups={};document.querySelectorAll("a[href]").forEach(function(a){var img=a.querySelector("img")||(a.parentElement&&a.parentElement.querySelector("img"));if(!img)return;var card=a.closest("li,article,[class*=card],[class*=Card],[class*=item],[class*=Item],[class*=product],[class*=Product]")||a;var key=card.tagName+"."+String(card.className||"").split(" ")[0];var text=clean(card.innerText||"");var m=text.match(/([€£$¥]\s?[\d.,]+|[\d.,]+\s?(?:€|EUR|USD|GBP|kr))/);(groups[key]=groups[key]||[]).push({title:clean(img.alt)||clean(a.textContent)||text.split("\n")[0],url:a.href,imageUrl:img.currentSrc||img.src,price:m?m[1]:null,currency:null});});var best=[];for(var k in groups){if(groups[k].length>best.length)best=groups[k];}var seenU={};return best.length>=2?best.filter(function(x){if(!x.title||seenU[x.url])return false;seenU[x.url]=1;return true;}):[];}
function states(){var s=[];if(window.__NEXT_DATA__)s.push(window.__NEXT_DATA__);if(window.__NUXT__)s.push(window.__NUXT__);if(window.__APOLLO_STATE__)s.push(window.__APOLLO_STATE__);if(window.__INITIAL_STATE__)s.push(window.__INITIAL_STATE__);document.querySelectorAll('script[type="application/json"]').forEach(function(x){try{s.push(JSON.parse(x.textContent));}catch(e){}});return s;}
function listTitle(){return clean((document.querySelector("h1")||{}).textContent)||meta("og:title")||document.title;}
function genericList(source){var items=lds().filter(function(n){return isT(n,"Product");}).map(like).filter(Boolean);states().forEach(function(s){var f=deep(s);if(f.length>items.length)items=f;});if(items.length<2){var d=domCards();if(d.length>items.length)items=d;}return {kind:"import",source:source,url:location.href,title:listTitle(),items:items};}
function throne(){var slug=location.pathname.split("/").filter(Boolean)[0]||"";var nd=window.__NEXT_DATA__||{};var first=(nd.props&&nd.props.pageProps&&nd.props.pageProps.ssrWishlistItems)||[];var map=function(list,name){return {kind:"import",source:"throne",url:"https://throne.com/"+slug,title:(name||slug)+"'s wishlist",items:list.filter(function(i){return !i.isHidden&&!i.isSavedForLater;}).sort(function(a,b){return (b.itemIndex||0)-(a.itemIndex||0);}).map(function(i){return {title:i.name,url:i.link||null,imageUrl:i.imgLink||null,price:typeof i.price==="number"?i.price/100:null,currency:i.currency||null,store:i.domainBase||null,note:i.description||"",quantity:i.quantity||1,priority:i.isFavorite?1:0};})};};if(first.length){done(map(first,""));return;}if(!nd.buildId||!slug){done({kind:"import",source:"throne",url:location.href,title:"",items:[]});return;}fetch("/_next/data/"+nd.buildId+"/"+slug+".json?slug="+encodeURIComponent(slug)).then(function(r){return r.json();}).then(function(j){var pp=(j&&j.pageProps)||{};var c=pp.fallback&&pp.fallback["public/useCreatorByUsername/"+slug];done(map(pp.ssrWishlistItems||[],c&&c.displayName));}).catch(function(){done({kind:"import",source:"throne",url:location.href,title:"",items:[]});});}
function mywishlist(){var wp=window.wishlist_products||{};var order=[].map.call(document.querySelectorAll(".wishlist > .product"),function(e){return String(e.getAttribute("data-id"));});var ids=order.length?order:Object.keys(wp);done({kind:"import",source:"mywishlist",url:location.href,title:listTitle(),items:ids.filter(function(id){return wp[id];}).map(function(id){var p=wp[id];return {title:p.title,url:p.redirect_url||null,imageUrl:p.image&&p.image.url||null,price:p.price||null,currency:p.currency||null,store:p.shop||null,note:p.description||""};})});}
try{if(/(^|\.)throne\.(com|me)$/.test(h)&&location.pathname.split("/").filter(Boolean).length){throne();}else if(/(^|\.)(my)?wishlist\.online$/.test(h)&&/^\/w\//.test(location.pathname)){mywishlist();}else if(/(^|\.)wishlist\.com$/.test(h)){done(genericList("wishlistcom"));}else{done(product());}}catch(err){done({kind:"product",product:{title:clean(document.title).slice(0,200),url:location.href}});}
})();
`;

export function bookmarkletCode(baseUrl: string): string {
  const code = SOURCE.replace('__BASE__', baseUrl.replace(/\/$/, ''))
    .split('\n')
    .map((line) => line.trim())
    .join('');
  return `javascript:${encodeURIComponent(code)}`;
}
