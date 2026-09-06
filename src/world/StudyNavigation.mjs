import {PROFILES} from './GradePaths.mjs';

export function gradeEntryUrl({country,locale,profile,year}){
 const selected=Object.hasOwn(PROFILES,profile||'')?profile:null;
 if(country==='JP'&&locale==='ja'&&!selected)return 'index.html?course=jp';
 const q=new URLSearchParams({locale});
 if(country)q.set('country',country);
 const curriculum=selected||((country==='JP'||!country)&&locale==='zh'?'CN63':null);
 if(curriculum)q.set('curriculum',curriculum);
 if(selected&&PROFILES[selected].years.includes(year))q.set('year',year);
 return `grades.html?${q}`;
}

export function freePlayUrl({country,locale,profile,year}){
 const q=new URLSearchParams({locale});if(country)q.set('country',country);
 if(Object.hasOwn(PROFILES,profile||'')){
  q.set('returnCurriculum',profile);
  if(PROFILES[profile].years.includes(year))q.set('returnYear',year);
 }
 return `world.html?${q}`;
}
