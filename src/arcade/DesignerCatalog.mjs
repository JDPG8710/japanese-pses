/** Editable product kits: every visible mechanical detail is an independent layer. */
import {EXTRA_DESIGN_KITS} from './DesignerExtraKits.mjs';
const part=(id,zh,en,ja,kind,x,y,w,h,extra={})=>({id,names:{zh,en,ja},kind,x,y,tx:x,ty:y,w,h,z:2,required:true,color:'#b9c8d8',...extra});
const p=part;
const carBody='M -337 31 Q -335 -11 -276 -27 L -190 -42 L -123 -78 Q -84 -96 -24 -94 L 91 -87 Q 140 -79 199 -43 L 288 -14 Q 330 -4 338 26 L 330 61 L -328 61 Z';
const wing='M -70 -12 L 113 -97 Q 130 -102 138 -91 L 13 26 L -66 20 Z';
const names=(zh,en,ja)=>({zh,en,ja});
const kits={
 airliner:{category:'plane',name:names('远航大客机','Sky Cruiser','ジャンボりょかくき'),subtitle:names('流线机身 · 两台引擎 · 彩色涂装','Sleek body · Two big engines','スマートなきたい・エンジン2つ'),bounds:{x:95,y:155,w:740,h:290},color:'#e7edf3',parts:[
 p('fuselage','机身','Plane body','きたい','path',460,285,660,92,{z:1,path:'M -330 -8 L -236 -28 Q -220 -37 -190 -36 L 212 -35 Q 300 -30 333 5 Q 343 18 303 30 L -230 36 Q -286 26 -330 -8 Z',color:'#e5edf3'}),
 p('tail','尾翼','Tail fin','しっぽのつばさ','path',218,235,115,135,{z:0,path:'M -58 56 L -30 -65 L 15 -68 L 58 54 Z',color:'#2b78ab'}),
 p('far-wing','后面的机翼','Back wing','おくのつばさ','path',490,251,230,108,{z:0,path:'M -109 33 L 41 -52 L 99 -46 L 6 45 Z',color:'#adbccc'}),
 p('near-wing','前面的机翼','Front wing','てまえのつばさ','path',485,333,240,164,{z:3,path:wing,color:'#c6d3df'}),
 p('tailplane','小尾翼','Little tail wings','しっぽのよこばね','path',238,297,155,60,{z:3,path:'M -75 -12 L 4 -27 L 76 27 L -14 22 Z',color:'#97afc4'}),
 p('cockpit','驾驶舱窗户','Cockpit window','コックピット','path',742,274,68,32,{z:3,path:'M -34 -13 L 0 -12 Q 17 -8 34 9 L -23 12 Z',color:'#25475c'}),
 ...[0,1,2,3,4,5].map(i=>p('window-'+i,'舷窗 '+(i+1),'Window '+(i+1),'まど '+(i+1),'window',370+i*45,278,17,23,{z:4,color:'#263e58'})),
 p('engine-a','前面的引擎','Front engine','てまえのエンジン','engine',539,370,91,50,{z:5,color:'#cad7e4'}),
 p('engine-b','后面的引擎','Back engine','おくのエンジン','engine',587,250,64,35,{z:0,color:'#cad7e4'}),
 p('gear-a','大轮子','Main wheels','うしろのタイヤ','gear',446,352,45,52,{z:0,color:'#405366'}),
 p('gear-b','机头轮子','Nose wheel','まえのタイヤ','gear',711,328,27,40,{z:0,color:'#405366'}),
 p('livery','机身彩带','Colour stripe','ライン','stripe',457,299,465,9,{z:4,color:'#277cbe'}),
 p('emblem','航空公司标志','Airline badge','マーク','badge',235,228,32,32,{z:4,color:'#f3b544',required:false}),
 p('wing-light','翼尖小灯','Wingtip light','つばさのライト','light',621,247,14,9,{z:5,color:'#ec725b',required:false})]},
 jet:{category:'plane',name:names('彗星小飞机','Comet Jet','コメットジェット'),subtitle:names('引擎在后面 · 斜斜的机翼','Engines at the back · Swept-back wings','うしろにエンジン・ななめのつばさ'),bounds:{x:95,y:155,w:740,h:290},color:'#a1b9cc',parts:[]},
 sport:{category:'car',name:names('巅峰 GT 跑车','Apex GT','エイペックスGT'),subtitle:names('低低的车身 · 酷炫轮毂 · 大尾翼','Low body · Shiny wheels · Big wing','ひくいボディ・かっこいいホイール'),bounds:{x:88,y:134,w:758,h:310},color:'#e65843',parts:[
 p('body','车身','Car body','ボディ','path',463,290,688,205,{z:1,path:carBody,color:'#e65843'}),
 p('rear-wheel','后轮','Back wheel','うしろのタイヤ','wheel',247,352,115,115,{z:4,color:'#c2ccd6'}),
 p('front-wheel','前轮','Front wheel','まえのタイヤ','wheel',677,352,115,115,{z:4,color:'#c2ccd6'}),
 p('rear-glass','后车窗','Back window','うしろのまど','path',343,236,122,87,{z:2,path:'M -61 29 L -8 -35 Q 15 -42 58 -36 L 45 27 Z',color:'#243e51'}),
 p('front-glass','前挡风玻璃','Windscreen','まえのまど','path',497,234,184,85,{z:2,path:'M -86 -37 L 16 -32 Q 49 -22 85 33 L -85 33 Z',color:'#243e51'}),
 p('door','车门','Door','ドア','door',483,302,231,68,{z:3,color:'#e65843'}),
 p('mirror','后视镜','Wing mirror','ミラー','mirror',566,265,43,22,{z:4,color:'#202a3a'}),
 p('lamp','前大灯','Headlight','ヘッドライト','headlight',750,295,75,23,{z:4,color:'#d8f5ff'}),
 p('tail-light','尾灯','Rear light','テールライト','light',142,300,48,15,{z:4,color:'#ff5f6a'}),
 p('intake','前进气口','Front air vent','まえのくうきあな','vent',766,333,64,23,{z:4,color:'#172431'}),
 p('side-vent','侧进气口','Side air vent','よこのくうきあな','vent',349,306,61,24,{z:4,color:'#172431'}),
 p('splitter','前铲','Front lip','まえのリップ','round',724,356,155,10,{z:3,color:'#263342',radius:3}),
 p('spoiler','尾翼','Rear wing','リアウイング','spoiler',191,237,124,41,{z:5,color:'#263342'}),
 p('side-skirt','侧裙','Side skirt','サイドスカート','round',454,354,278,11,{z:3,color:'#263342',radius:4}),
 p('handle','门把手','Door handle','ドアのとって','round',472,287,31,6,{z:4,color:'#e1e8ef',radius:3}),
 p('exhaust','排气管','Twin exhaust','マフラー','exhaust',159,350,45,17,{z:4,color:'#c6d4de'}),
 p('stripe','赛车拉花','Racing stripe','レーシングライン','stripe',493,326,240,9,{z:5,color:'#ffe8a2',required:false}),
 p('number','赛车号码','Race number','ゼッケン','badge',487,302,38,38,{z:5,color:'#edf1f5',required:false})]},
 suv:{category:'car',name:names('小径越野车','Trail Explorer','トレイルSUV'),subtitle:names('方方的车身 · 越野轮胎 · 车顶行李架','Boxy body · Off-road tyres','しかくいボディ・オフロードタイヤ'),bounds:{x:88,y:120,w:758,h:325},color:'#5c8972',parts:[]},
 truck:{category:'car',name:names('大力货运卡车','Cargo Hauler','カーゴトラック'),subtitle:names('驾驶室 · 大货箱 · 好多轮子','Cab · Cargo box · Extra wheels','うんてんせき・にもつばこ・ダブルタイヤ'),bounds:{x:70,y:125,w:780,h:330},color:'#3887b0',parts:[
 p('chassis','底盘','Base frame','したのフレーム','round',455,354,680,32,{z:0,color:'#27394a',radius:8}),
 p('cargo','货箱','Cargo box','にもつばこ','cargo',596,258,357,181,{z:1,color:'#d5dfe7'}),
 p('cab','驾驶室','Cab','うんてんせき','path',248,276,239,185,{z:2,path:'M -116 76 L -116 3 L -71 -89 L 88 -89 Q 114 -89 114 -63 L 114 81 Z',color:'#3887b0'}),
 p('windshield','前挡风玻璃','Windscreen','フロントガラス','path',218,236,114,94,{z:3,path:'M -55 42 L -20 -40 L 53 -40 L 53 42 Z',color:'#233f53'}),
 p('cab-window','侧车窗','Side window','よこのまど','round',311,235,60,86,{z:3,color:'#29495c',radius:8}),
 p('front-wheel','前轮','Front wheel','まえのタイヤ','wheel',231,372,116,116,{z:5,color:'#b3c3d1'}),
 p('rear-wheel-a','后轮 1','Back wheel 1','うしろのタイヤ 1','wheel',608,372,109,109,{z:5,color:'#b3c3d1'}),
 p('rear-wheel-b','后轮 2','Back wheel 2','うしろのタイヤ 2','wheel',725,372,109,109,{z:5,color:'#b3c3d1'}),
 p('grille','车头格栅','Front grille','グリル','vent',149,311,40,61,{z:4,color:'#1b2d3d'}),
 p('headlight','前大灯','Headlight','ヘッドライト','headlight',150,345,42,16,{z:4,color:'#eaf8fa'}),
 p('mirror','后视镜','Mirror','ミラー','mirror',155,232,28,46,{z:4,color:'#273d4b'}),
 p('step','上车踏板','Step','ステップ','vent',356,349,57,18,{z:4,color:'#adbccb'}),
 p('bumper','保险杠','Bumper','バンパー','round',143,371,73,17,{z:4,color:'#a9bac9',radius:5}),
 p('fuel','油箱','Fuel tank','ガソリンタンク','round',449,365,113,40,{z:3,color:'#a2b4c6',radius:10}),
 p('door-seam','车门','Cab door','ドア','door',309,309,75,56,{z:4,color:'#3887b0'}),
 p('cargo-lock','货箱门锁','Cargo locks','にもつばこのカギ','locks',765,263,20,152,{z:3,color:'#839eb1'}),
 p('roof-light','车顶警示灯','Roof light','やねのランプ','light',263,180,55,13,{z:4,color:'#ffbb55',required:false}),
 p('cargo-decal','货箱图案','Cargo sticker','ステッカー','cargo-mark',590,262,144,75,{z:4,color:'#3887b0',required:false})]},
 pro:{category:'phone',name:names('钛金属 Pro','Titanium Pro','チタンPro'),subtitle:names('像 iPhone 的外形 · 三颗镜头 · 超窄边框','iPhone-style · Three cameras','iPhoneみたいなかたち・カメラ3つ'),bounds:{x:165,y:66,w:548,h:464},color:'#b7a694',parts:[]},
 ring:{category:'phone',name:names('星环旗舰','Orbit Phone','オービットスマホ'),subtitle:names('像华为的外形 · 圆环镜头 · 弯弯的玻璃','Huawei-style · Ring camera','Huaweiみたいなかたち・まるいカメラ'),bounds:{x:165,y:66,w:548,h:464},color:'#a2beaf',parts:[]}
};
kits.jet.parts=kits.airliner.parts.filter(p=>!['gear-a','gear-b','engine-b','window-4','window-5'].includes(p.id)).map(p=>({...p}));
kits.jet.parts.find(p=>p.id==='engine-a').x=280;kits.jet.parts.find(p=>p.id==='engine-a').tx=280;kits.jet.parts.find(p=>p.id==='engine-a').y=285;kits.jet.parts.find(p=>p.id==='engine-a').ty=285;kits.jet.parts.find(p=>p.id==='near-wing').color='#9bacbc';kits.jet.parts.push(p('engine-b','后面的引擎','Rear engine','うしろのエンジン','engine',293,250,75,42,{z:0,color:'#c8d5df'}),p('winglet','翼尖小翅膀','Wingtip fin','つばさのさきっぽ','path',613,256,40,46,{z:6,path:'M -18 20 L 8 -23 L 19 -18 L 10 21 Z',color:'#2b78ab'}));
kits.suv.parts=kits.sport.parts.filter(p=>!['spoiler','side-vent','stripe','splitter'].includes(p.id)).map(p=>({...p}));
const suvBody=kits.suv.parts.find(p=>p.id==='body');Object.assign(suvBody,{color:'#5c8972',path:'M -332 61 L -332 -61 Q -329 -84 -303 -85 L -190 -85 L -139 -153 L 145 -153 L 197 -84 L 317 -59 Q 337 -51 337 -24 L 337 64 Z',h:228});
Object.assign(kits.suv.parts.find(p=>p.id==='rear-glass'),{x:353,tx:353,y:180,ty:180,path:'M -57 29 L -24 -36 L 56 -36 L 56 29 Z'});Object.assign(kits.suv.parts.find(p=>p.id==='front-glass'),{x:505,tx:505,y:180,ty:180,path:'M -76 -35 L 30 -35 L 76 29 L -76 29 Z'});kits.suv.parts.push(p('roof-rack','车顶行李架','Roof rack','ルーフラック','rack',465,126,247,20,{z:4,color:'#263342'}),p('bullbar','车头防护杠','Front guard','まえのガード','round',796,324,20,65,{z:5,color:'#263342',radius:7}),p('spare','备胎','Spare tyre','スペアタイヤ','wheel',126,282,65,90,{z:5,color:'#b6c1cb'}));
function phoneParts(ring=false){return [
 p('front-frame','正面边框','Front frame','おもてのフレーム','phone-body',287,294,188,403,{z:0,color:ring?'#a2beaf':'#b7a694'}),
 p('back-frame','背面边框','Back frame','うらのフレーム','phone-body',590,294,188,403,{z:0,color:ring?'#a2beaf':'#b7a694'}),
 p('back-glass','磨砂后盖','Frosted back','うらのガラス','phone-back',590,294,175,389,{z:1,color:ring?'#adc7b7':'#b7a694'}),
 p('screen','大屏幕','Big screen','がめん','screen',287,294,173,387,{z:2,color:'#1a2a46'}),
 p('camera-island',ring?'星环镜头底座':'三摄镜头底座',ring?'Orbit housing':'Camera island','カメラベース',ring?'camera-ring':'camera-island',ring?590:553,ring?199:169,ring?142:105,ring?142:122,{z:2,color:ring?'#7a9b89':'#a99987'}),
 ...[0,1,2].map((i)=>{const pos=ring?[[557,172],[623,172],[590,231]][i]:[[528,139],[577,171],[528,202]][i];return p('lens-'+i,'光学镜头 '+(i+1),'Optical lens '+(i+1),'レンズ '+(i+1),'lens',...pos,39,39,{z:4,color:'#d0d6d8'});}),
 p('flash','闪光灯','Flash','フラッシュ','flash',ring?625:577,ring?230:133,13,13,{z:4,color:'#eee8cd'}),
 p('sensor','对焦小镜头','Focus sensor','センサー','sensor',ring?555:578,ring?231:205,12,12,{z:4,color:'#263442'}),
 p('front-camera',ring?'屏幕双孔镜头':'灵动岛镜头','Front camera pill','フロントカメラ','camera-pill',287,120,ring?46:64,19,{z:5,color:'#10171e'}),
 p('status','状态栏','Status bar','ステータスバー','status',287,125,149,16,{z:4,color:'#f9fafc'}),
 p('power','电源键','Power button','でんげんボタン','round',688,238,5,44,{z:3,color:'#889eaa',radius:2}),
 p('volume','音量键','Volume buttons','おんりょうボタン','volume',189,207,5,75,{z:3,color:'#889eaa'}),
 p('speaker','扬声器','Speaker','スピーカー','speaker',259,486,36,6,{z:4,color:'#31404b'}),
 p('charging','USB-C 充电口','USB-C port','じゅうでんポート','port',591,491,28,7,{z:4,color:'#253747'}),
 p('home','底部小横条','Home bar','ホームバー','round',287,474,62,4,{z:5,color:'#d7dfe7',radius:2}),
 p('wallpaper','桌面图标','Home screen icons','アプリのアイコン','icons',287,385,138,106,{z:5,color:'#eff3ff',required:false}),
 p('brand','我的品牌标志','My brand badge','じぶんのブランドマーク','wordmark',590,377,84,20,{z:3,color:'#5c746d',required:false}),
 p('case','透明手机壳','Clear case','クリアケース','case',590,294,198,413,{z:6,color:'#cbded6',required:false})];}
kits.pro.parts=phoneParts();kits.ring.parts=phoneParts(true);
export const DESIGN_CATEGORIES=Object.freeze(['plane','car','phone','rocket','robot','boat','building']);
export const DESIGN_KITS=Object.freeze({...kits,...EXTRA_DESIGN_KITS});
export const DESIGN_PALETTE=['#eceff2','#b7a694','#313e51','#e65843','#eab85f','#5c8972','#3887b0','#7e6ac4','#e6a2b6','#111a27'];
export const resolveKit=id=>DESIGN_KITS[id]||DESIGN_KITS[{plane:'airliner',car:'sport',phone:'pro',boat:'yacht',building:'house'}[id]]||null;
