import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {countryResponse,languageForCountry,nativeRegionName,normalizeCountry,readCountry,saveCountry} from '../src/location/Country.mjs';
import {project,unproject,findCountry} from '../src/location/Globe.mjs';
const data=JSON.parse(await readFile('assets/maps/countries-50m.json','utf8')).countries;
assert.equal(data.filter(c=>c.code).length,239);
assert.equal(new Set(data.filter(c=>c.code).map(c=>c.code)).size,237);
for(const c of data.filter(c=>c.code))assert.equal(languageForCountry(c.code),c.code==='JP'?'ja':c.code==='CN'?'zh':'en');
for(const [code,locale]of [['JP','ja'],['CN','zh'],['US','en'],['GB','en'],['AU','en'],['NZ','en'],[null,'en'],['XX','en']]){
  const request=new Request('https://example.com/api/location');Object.defineProperty(request,'cf',{value:{country:code}});
  const response=countryResponse(request),body=await response.json();
  assert.equal(body.locale,locale);assert.equal(body.country,normalizeCountry(code));assert.equal(response.headers.get('cache-control'),'private, no-store');
  assert.deepEqual(Object.keys(body).sort(),['country','locale','source']);
}
assert.equal((await countryResponse(new Request('https://example.com/api/location',{headers:{'cf-ipcountry':'JP','x-forwarded-for':'1.2.3.4'}})).json()).country,null);
const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
assert.equal(readCountry(storage),null);assert.ok(saveCountry(storage,'JP'));assert.equal(readCountry(storage),'JP');assert.equal(values.get('world-locale'),'ja');
assert.ok(saveCountry(storage,'CN'));assert.equal(values.get('world-locale'),'zh');assert.ok(saveCountry(storage,'FR'));assert.equal(values.get('world-locale'),'en');
assert.equal(saveCountry(storage,'<script>'),false);assert.equal(readCountry({getItem(){throw Error();}}),null);assert.equal(saveCountry({setItem(){throw Error();}},'JP'),false);
for(const [code,name] of [['JP','日本'],['CN','中国'],['US','United States'],['DE','Deutschland'],['ES','España'],['KR','대한민국'],['BR','Brasil']])assert.equal(nativeRegionName(code),name);
assert.equal(nativeRegionName('<script>'),'');
for(const [code,lon,lat]of [['JP',139.76,35.68],['CN',116.4,39.9],['US',-77.04,38.9],['GB',-.12,51.5],['AU',151.2,-33.86],['NZ',175.28,-37.78]])assert.equal(findCountry(data,lon,lat)?.code,code);
assert.equal(findCountry(data,-140,0),null);
for(let lon=-180;lon<180;lon+=15)for(let lat=-75;lat<80;lat+=15){const p=project(lon,lat,110,25);if(p[2]>.01){const q=unproject(p[0],p[1],110,25);assert.ok(Math.abs(((q[0]-lon+540)%360)-180)<1e-8);assert.ok(Math.abs(q[1]-lat)<1e-8);}}
assert.equal(unproject(2,0,0,0),null);
const homeSource=await readFile('src/location/CountryHome.mjs','utf8');
assert.ok(homeSource.includes("chosen==='JP'?'?course=jp':`grades.html?country=${chosen}`"),'primary start must open the selected school-year adventure');
assert.ok(homeSource.includes('nativeRegionName(c.code)'),'country picker must use each country’s own language');
console.log('Country homepage: country/language rules, trusted IP metadata, storage failures, 239 map regions, hit testing and 3D projection passed.');
