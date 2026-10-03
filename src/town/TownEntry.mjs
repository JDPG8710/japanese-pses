const COPY={zh:['小镇生活 · 新冒险','Piko 学习小镇','看懂英文订单，用数学开小店，再把小屋布置成你喜欢的样子。','进入小镇'],en:['TOWN LIFE · NEW ADVENTURE','Piko Town','Read English orders, do the maths in your shop and make your home just the way you like.','Go to town'],ja:['まちでくらそう · あたらしいぼうけん','ピコタウン','えいごのちゅうもんを読んで、さんすうでおかいけい。おみせとおうちをたのしもう！','まちに入る']};
export function townEntry(locale='en',country=''){
  const words=COPY[locale]||COPY.en,q=new URLSearchParams({locale:COPY[locale]?locale:'en'});if(/^[A-Z]{2}$/.test(country))q.set('country',country);
  return `<a class="town-entry" href="town?${q.toString().replaceAll('&','&amp;')}"><span class="town-entry-art" aria-hidden="true">⌂</span><div><small>${words[0]}</small><strong>${words[1]}</strong><p>${words[2]}</p></div><b>${words[3]} ↗</b></a>`;
}
