// Usage: node scripts/prepare-country-map.mjs path/to/ne_50m_admin_0_countries.geojson
// Natural Earth public domain data. Keep topology coordinates (rounded only).
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const data=JSON.parse(await readFile(process.argv[2],'utf8'));
const countries=data.features.map(f=>{
  const p=f.properties, code=/^[A-Z]{2}$/.test(p.ISO_A2_EH)?p.ISO_A2_EH:null;
  const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
  return {code,names:{en:p.NAME_EN||p.NAME,ja:p.NAME_JA||p.NAME,zh:p.NAME_ZH||p.NAME},center:[p.LABEL_X,p.LABEL_Y],
    polygons:polygons.map(poly=>poly.map(ring=>ring.map(point=>point.map(n=>Math.round(n*1000)/1000))))};
});
await mkdir('assets/maps',{recursive:true});
await writeFile('assets/maps/countries-50m.json',JSON.stringify({source:'Natural Earth 1:50m Admin 0',countries}));
await mkdir('src/location',{recursive:true});
await writeFile('src/location/CountryCodes.mjs',`// Country/region codes present in the bundled Natural Earth map.\nexport const COUNTRY_CODES = ${JSON.stringify([...new Set(countries.map(c=>c.code).filter(Boolean))].sort())};\n`);
console.log(`${countries.length} map regions, ${new Set(countries.map(c=>c.code).filter(Boolean)).size} country/region choices`);
