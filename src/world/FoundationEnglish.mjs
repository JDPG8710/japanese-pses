// Original practice material. It follows CEFR communication goals and uses
// EIKEN-like task families (gap fill, dialogue completion and word order), but
// it does not reproduce or claim to be an official EIKEN examination.
export const ENGLISH_FRAMEWORK_SOURCES={
 cefr:'https://www.coe.int/en/web/common-european-framework-reference-languages/level-descriptions',
 eiken:'https://www.eiken.or.jp/eiken/en/grades/grade_5/'
};

export const CEFR_BY_STAGE=['Pre-A1','Pre-A1','Pre-A1','A1','A1','A1+','A2 bridge'];

// Every pair was written and reviewed as a complete utterance. Do not create
// translations by attaching tense endings to an unconjugated word fragment.
export const EN_ZH_TRANSLATIONS=[
 ['Hello.','你好。','Pre-A1'],['Good morning.','早上好。','Pre-A1'],['Thank you.','谢谢。','Pre-A1'],['Goodbye.','再见。','Pre-A1'],
 ['My name is Mia.','我叫米娅。','Pre-A1'],['I am eight years old.','我八岁。','Pre-A1'],['This is my bag.','这是我的书包。','Pre-A1'],['I like apples.','我喜欢苹果。','Pre-A1'],
 ['It is a red ball.','这是一个红色的球。','Pre-A1'],['I have a dog.','我有一只狗。','Pre-A1'],['Please sit down.','请坐下。','Pre-A1'],['Please stand up.','请起立。','Pre-A1'],
 ['Open your book.','打开你的书。','Pre-A1'],['Close the door.','关上门。','Pre-A1'],['See you tomorrow.','明天见。','Pre-A1'],['How are you?','你好吗？','Pre-A1'],
 ['I am fine.','我很好。','Pre-A1'],['What is this?','这是什么？','Pre-A1'],

 ['I go to school at eight.','我八点去上学。','A1'],['She plays tennis on Sunday.','她星期日打网球。','A1'],['We eat lunch at school.','我们在学校吃午饭。','A1'],['He can swim well.','他游泳游得很好。','A1'],
 ['There are two books on the desk.','桌子上有两本书。','A1'],['Where is the library?','图书馆在哪里？','A1'],['It is next to the park.','它在公园旁边。','A1'],['What time is it?','现在几点？','A1'],
 ["It is half past three.",'现在三点半。','A1'],['I want some water.','我想喝点水。','A1'],['Do you like music?','你喜欢音乐吗？','A1'],['Yes, I do.','是的，我喜欢。','A1'],
 ['My sister is reading a book.','我姐姐正在读书。','A1'],['We visited the zoo yesterday.','我们昨天去了动物园。','A1'],['Please help me with this box.','请帮我搬这个箱子。','A1'],['Turn left at the bank.','在银行左转。','A1'],
 ['The bus stop is in front of the store.','公共汽车站在商店前面。','A1'],['I usually get up at seven.','我通常七点起床。','A1'],

 ['If it rains, we will stay inside.','如果下雨，我们就待在室内。','A2'],['I have never been to London.','我从未去过伦敦。','A2'],['The blue bag is cheaper than the red one.','蓝色书包比红色书包便宜。','A2'],['Could you tell me the way to the museum?','你能告诉我去博物馆的路吗？','A2'],
 ['We should save water at home.','我们应该在家节约用水。','A2'],['She was tired, but she finished her homework.','她很累，但还是完成了作业。','A2'],['I chose this book because I like science.','我选这本书是因为我喜欢科学。','A2'],['The train arrived ten minutes late.','火车晚到了十分钟。','A2'],
 ['This park is popular with local families.','这个公园很受当地家庭欢迎。','A2'],['Please remember to bring your umbrella.','请记得带伞。','A2'],['I am looking forward to the school trip.','我很期待学校旅行。','A2'],['We worked together to solve the problem.','我们一起解决了这个问题。','A2'],
 ['The library closes earlier on Fridays.','图书馆每周五会早些关门。','A2'],['He has lived here for three years.','他在这里住了三年。','A2'],['Would you like to join our team?','你愿意加入我们队吗？','A2'],['The weather may change this afternoon.','今天下午天气可能会变。','A2'],
 ['First, wash the vegetables carefully.','首先，仔细清洗蔬菜。','A2'],['The poster explains how to recycle bottles.','海报说明了怎样回收瓶子。','A2']
].map(([en,zh,cefr],index)=>({id:`T${index+1}`,en,zh,cefr}));

const LEVEL_ORDER={'Pre-A1':0,A1:1,A2:2};
const normalizedLevel=value=>value.startsWith('A2')?'A2':value.startsWith('A1')?'A1':'Pre-A1';
const copy={
 zh:{toZh:en=>`“${en}”最合适的中文意思是？`,toEn:zh=>`“${zh}”最合适的英文表达是？`,hint:'先找认识的关键词，再看整句话。',explain:'这组英文和中文表达相同的意思。'},
 en:{toZh:en=>`Choose the matching Chinese meaning for “${en}”`,toEn:zh=>`Choose the matching English expression for “${zh}”`,hint:'Find a familiar key word, then read the whole sentence.',explain:'These English and Chinese sentences express the same meaning.'},
 ja:{toZh:en=>`「${en}」と おなじ いみの 中国語は？`,toEn:zh=>`「${zh}」と おなじ いみの 英語は？`,hint:'しっている ことばを みつけて、文ぜんたいを よもう。',explain:'英語と中国語で おなじ いみを あらわしています。'}
};

const DIALOGUES=[
 ['A: Good morning.\nB: ___','Good morning.',['Good night.','I am a book.','Eight pencils.'],'Pre-A1','A greeting needs a greeting in reply.'],
 ['A: Thank you.\nB: ___',"You're welcome.",['Hello.','I am seven.','A red bag.'],'Pre-A1',"“You're welcome” is a polite reply to thanks."],
 ['A: What is this?\nB: ___','It is a pencil.',['I am fine.','At eight.','Yes, I do.'],'Pre-A1','The question asks for the name of an object.'],
 ['A: How are you?\nB: ___','I am fine, thank you.',['It is Monday.','Two cats.','Open the door.'],'Pre-A1','This response says how the speaker feels.'],
 ['A: Where is the library?\nB: ___','It is next to the park.',['It is three o’clock.','I like books.','Yes, she can.'],'A1','Where asks for a place.'],
 ['A: What time do you get up?\nB: ___','At seven.',['In the kitchen.','On Monday books.','Because it is red.'],'A1','What time asks for a time.'],
 ['A: Do you like music?\nB: ___','Yes, I do.',['Yes, I am.','Yes, it is.','At the station.'],'A1','A do-question is answered with do or do not.'],
 ['A: Why did you choose this book?\nB: ___','Because I like science.',['At the library.','For three years old.','It is on the desk.'],'A2','Why asks for a reason.'],
 ['A: Could you help me carry this box?\nB: ___','Of course.',['The box is blue.','Yesterday morning.','Two kilometres.'],'A2','“Of course” accepts the request politely.'],
 ['A: Which bag is cheaper?\nB: ___','The blue one is.',['At half past three.','Yes, it can.','Because I walked.'],'A2','Which asks the speaker to select one item.']
];

// Multiple-choice word-order and short-reading questions use wholly original
// sentences. They exercise the same skill families as an elementary English
// proficiency challenge without copying any examination material.
const WORD_ORDERS=[
 ['Put the words in order: am / I / Mia','I am Mia.',['Am I Mia.','Mia I am.','I Mia am.'],'Pre-A1','A statement begins with “I am”.'],
 ['Put the words in order: is / This / my bag','This is my bag.',['Is this my bag.','My bag this is.','This my is bag.'],'Pre-A1','Use “This is” before the object.'],
 ['Put the words in order: like / I / apples','I like apples.',['Like I apples.','Apples like I.','I apples like.'],'Pre-A1','The order is subject, verb, then object.'],
 ['Put the words in order: your / Open / book','Open your book.',['Your open book.','Book your open.','Open book your.'],'Pre-A1','An instruction begins with the action word.'],
 ['Put the words in order: school / at eight / I / go to','I go to school at eight.',['I at eight go to school.','Go to I school at eight.','At school I eight go to.'],'A1','Place the subject first and the time expression last.'],
 ['Put the words in order: tennis / on Sunday / She / plays','She plays tennis on Sunday.',['She tennis plays on Sunday.','On Sunday plays she tennis.','Plays she on Sunday tennis.'],'A1','A statement uses subject, verb, object, then time.'],
 ['Put the words in order: the library / Where / is','Where is the library?',['Where the library is?','Is where the library?','The library where is?'],'A1','A where-question puts “is” before the subject.'],
 ['Put the words in order: some water / want / I','I want some water.',['I some water want.','Want I some water.','Some water I want?'],'A1','Use subject, verb, then object.'],
 ['Put the words in order: because / science / I / like / it','I chose it because I like science.',['Because science I chose it like.','I because chose it science like.','I chose because science it like.'],'A2','Join the choice and its reason with “because”.'],
 ['Put the words in order: has lived / for three years / He / here','He has lived here for three years.',['He here has lived three years for.','For three years has he here lived.','He lived has for here three years.'],'A2','Use present perfect, place, then duration.'],
 ['Put the words in order: should / at home / save water / We','We should save water at home.',['We save should at home water.','Should we at home save water.','At home should water we save.'],'A2','Place the modal before the main verb.']
];

const SHORT_READINGS=[
 ['Mia has a red bag. It has one book.\nWhat color is the bag?','Red.',['Blue.','Green.','Yellow.'],'Pre-A1','The first sentence says the bag is red.'],
 ['Tom has a dog and a cat.\nHow many pets does Tom have?','Two.',['One.','Three.','Four.'],'Pre-A1','A dog and a cat make two pets.'],
 ['Ben gets up at seven. He goes to school at eight.\nWhen does Ben go to school?','At eight.',['At seven.','At nine.','On Sunday.'],'A1','The second sentence gives the school time.'],
 ['The library is next to the park. The bank is across from it.\nWhat is next to the park?','The library.',['The bank.','The station.','The school.'],'A1','The first sentence names the place next to the park.'],
 ['Amy likes music, but her brother likes science.\nWhat does Amy like?','Music.',['Science.','Tennis.','Art.'],'A1','The first part tells us Amy likes music.'],
 ['The class planned a picnic for Friday. It may rain, so they will meet in the gym instead.\nWhy will they meet in the gym?','It may rain.',['It is Friday.','The gym is new.','They lost the food.'],'A2','The text gives rain as the reason for changing the place.'],
 ['Leo chose the blue bag because it was cheaper than the red one.\nWhy did Leo choose the blue bag?','It was cheaper.',['It was bigger.','It was red.','It was heavier.'],'A2','The word “because” introduces Leo’s reason.'],
 ['The museum opens at nine, but our train arrives at ten.\nCan we enter the museum when it opens?','No, we cannot.',['Yes, at nine.','Yes, before nine.','The text does not say.'],'A2','The train arrives after the museum opens.']
];

export function englishPool(stage,locale='zh'){
 const cefr=CEFR_BY_STAGE[Math.max(0,Math.min(6,Number(stage)||0))],maximum=LEVEL_ORDER[normalizedLevel(cefr)],strings=copy[locale]||copy.en;
 const pairs=EN_ZH_TRANSLATIONS.filter(pair=>LEVEL_ORDER[normalizedLevel(pair.cefr)]<=maximum);
 const pairChoices=(pair,key)=>[pair,...pairs.filter(item=>item.id!==pair.id&&item[key]!==pair[key])].slice(0,4).map(item=>item[key]);
 const translations=pairs.flatMap(pair=>[
  {id:`${pair.id}-en-zh`,kind:'choice',format:'translation-en-zh',cefr,prompt:strings.toZh(pair.en),correct:pair.zh,choices:pairChoices(pair,'zh'),hint:strings.hint,explanation:`${pair.en} — ${pair.zh}`,lang:'zh-en'},
  {id:`${pair.id}-zh-en`,kind:'choice',format:'translation-zh-en',cefr,prompt:strings.toEn(pair.zh),correct:pair.en,choices:pairChoices(pair,'en'),hint:strings.hint,explanation:`${pair.zh} — ${pair.en}`,lang:'zh-en'}
 ]);
 const dialogues=DIALOGUES.filter(item=>LEVEL_ORDER[normalizedLevel(item[3])]<=maximum).map((item,index)=>({id:`D${maximum}-${index}`,kind:'choice',format:'dialogue-completion',cefr,prompt:item[0],correct:item[1],choices:[item[1],...item[2]],hint:locale==='zh'?'先判断对话在问候、提问，还是请求。':'Identify whether the speaker is greeting, asking or requesting.',explanation:item[4],lang:'en'}));
 const wordOrders=WORD_ORDERS.filter(item=>LEVEL_ORDER[normalizedLevel(item[3])]<=maximum).map((item,index)=>({id:`W${maximum}-${index}`,kind:'choice',format:'word-order',cefr,prompt:item[0],correct:item[1],choices:[item[1],...item[2]],hint:locale==='zh'?'先找主语，再找动作，最后放时间或地点。':'Find the subject and action first, then add time or place.',explanation:item[4],lang:'en'}));
 const shortReadings=SHORT_READINGS.filter(item=>LEVEL_ORDER[normalizedLevel(item[3])]<=maximum).map((item,index)=>({id:`R${maximum}-${index}`,kind:'choice',format:'short-reading',cefr,prompt:item[0],correct:item[1],choices:[item[1],...item[2]],hint:locale==='zh'?'读完短文，再回到文中找依据。':'Read the whole passage, then find the evidence.',explanation:item[4],lang:'en'}));
 return [...translations,...dialogues,...wordOrders,...shortReadings];
}
