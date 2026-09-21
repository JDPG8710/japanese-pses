const COPY={zh:['角色扮演 · 全新冒险','Piko 学习小镇','读懂英文订单，用数学经营小店，把小屋布置成喜欢的样子。','走进小镇'],en:['ROLEPLAY · A NEW ADVENTURE','Piko Learning Town','Read English orders, run a shop with maths, and make a little home your own.','Enter the town'],ja:['ロールプレイ · あたらしい冒険','Piko まなびタウン','英語の注文、算数のお会計。自分のお店とおうちを楽しもう。','まちにはいる']};
export function townEntry(locale='en',country=''){
  const words=COPY[locale]||COPY.en,q=new URLSearchParams({locale:COPY[locale]?locale:'en'});if(/^[A-Z]{2}$/.test(country))q.set('country',country);
  return `<a class="town-entry" href="town?${q.toString().replaceAll('&','&amp;')}"><span class="town-entry-art" aria-hidden="true">⌂</span><div><small>${words[0]}</small><strong>${words[1]}</strong><p>${words[2]}</p></div><b>${words[3]} ↗</b></a>`;
}
