// Original practice material. It follows CEFR communication goals and uses
// EIKEN-like task families (gap fill, dialogue completion and word order), but
// it does not reproduce or claim to be an official EIKEN examination.
// Option sets are checked by src/runtime/ChoiceQuality.mjs: wrong options are
// written to look and sound like the answer so they cannot be ruled out by
// length, punctuation or topic alone.
import {auditChoiceSet,pickDistractors} from '../runtime/ChoiceQuality.mjs';
export const ENGLISH_FRAMEWORK_SOURCES={
 cefr:'https://www.coe.int/en/web/common-european-framework-reference-languages/level-descriptions',
 eiken:'https://www.eiken.or.jp/eiken/en/grades/grade_5/'
};

export const CEFR_BY_STAGE=['Pre-A1','Pre-A1','Pre-A1','A1','A1','A1+','A2 bridge'];

// Every pair was written and reviewed as a complete utterance. Do not create
// translations by attaching tense endings to an unconjugated word fragment.
export const EN_ZH_TRANSLATIONS=[
 ['Hello.','你好。','Pre-A1'],['Good morning.','早上好。','Pre-A1'],['Thank you.','谢谢。','Pre-A1'],['Goodbye.','再见。','Pre-A1'],
 ['My name is Mia.','我叫米娅。','Pre-A1'],['I am eight years old.','我八岁。','Pre-A1'],['This is my schoolbag.','这是我的书包。','Pre-A1'],['I like apples.','我喜欢苹果。','Pre-A1'],
 ['It is a red ball.','这是一个红色的球。','Pre-A1'],['I have a dog.','我有一只狗。','Pre-A1'],['Please sit down.','请坐下。','Pre-A1'],['Please stand up.','请起立。','Pre-A1'],
 ['Open your book.','打开你的书。','Pre-A1'],['Close the door.','关上门。','Pre-A1'],['See you tomorrow.','明天见。','Pre-A1'],['How are you?','你好吗？','Pre-A1'],
 ['I am fine.','我很好。','Pre-A1'],['What is this?','这是什么？','Pre-A1'],

 ['I go to school at eight.','我八点去上学。','A1'],['She plays tennis on Sunday.','她星期日打网球。','A1'],['We eat lunch at school.','我们在学校吃午饭。','A1'],['He can swim well.','他游泳游得很好。','A1'],
 ['There are two books on the desk.','桌子上有两本书。','A1'],['Where is the library?','图书馆在哪里？','A1'],['It is next to the park.','它在公园旁边。','A1'],['What time is it?','现在几点？','A1'],
 ["It is half past three.",'现在三点半。','A1'],['I want some water.','我想喝点水。','A1'],['Do you like music?','你喜欢音乐吗？','A1'],['A: Do you like music? B: Yes, I do.','甲：你喜欢音乐吗？乙：是的，我喜欢。','A1'],
 ['My older sister is reading a book.','我姐姐正在读书。','A1'],['We visited the zoo yesterday.','我们昨天去了动物园。','A1'],['Please help me carry this box.','请帮我搬这个箱子。','A1'],['Turn left at the bank.','在银行左转。','A1'],
 ['The bus stop is in front of the store.','公共汽车站在商店前面。','A1'],['I usually get up at seven.','我通常七点起床。','A1'],

 ['If it rains, we will stay inside.','如果下雨，我们就待在室内。','A2'],['I have never been to London.','我从未去过伦敦。','A2'],['The blue schoolbag is cheaper than the red one.','蓝色书包比红色书包便宜。','A2'],['Could you tell me the way to the museum?','你能告诉我去博物馆的路吗？','A2'],
 ['We should save water at home.','我们应该在家节约用水。','A2'],['She was tired, but she finished her homework.','她很累，但还是完成了作业。','A2'],['I chose this book because I like science.','我选这本书是因为我喜欢科学。','A2'],['The train arrived ten minutes late.','火车晚到了十分钟。','A2'],
 ['This park is popular with local families.','这个公园很受当地家庭欢迎。','A2'],['Please remember to bring your umbrella.','请记得带伞。','A2'],['I am looking forward to the school trip.','我很期待学校旅行。','A2'],['We worked together to solve the problem.','我们一起解决了这个问题。','A2'],
 ['The library closes earlier on Fridays.','图书馆每周五会早些关门。','A2'],['He has lived here for three years.','他在这里住了三年。','A2'],['Would you like to join our team?','你愿意加入我们队吗？','A2'],['The weather may change this afternoon.','今天下午天气可能会变。','A2'],
 ['First, wash the vegetables carefully.','首先，仔细清洗蔬菜。','A2'],['The poster explains how to recycle bottles.','海报说明了怎样回收瓶子。','A2']
].map(([en,zh,cefr],index)=>({id:`T${index+1}`,en,zh,cefr}));

// Near-miss sentence pairs used as distractors for each translation pair.
// Each one changes exactly one meaningful detail (person, number, time,
// place, polarity, tense or key verb) so the options look alike and the
// child has to understand the whole sentence. None of them is a correct
// translation of the original.
const NEAR_MISSES={
 'Hello.':[['Goodbye.','再见。'],['Good night.','晚安。'],['Sorry.','对不起。']],
 'Good morning.':[['Good night.','晚安。'],['Good evening.','晚上好。'],['Good afternoon.','下午好。']],
 'Thank you.':[["I'm sorry.",'对不起。'],['Excuse me.','打扰一下。'],["You're welcome.",'不客气。']],
 'Goodbye.':[['Hello.','你好。'],['Good night.','晚安。'],['Welcome.','欢迎。']],
 'My name is Mia.':[['Her name is Mia.','她叫米娅。'],['My name is Mike.','我叫迈克。'],['Your name is Mia.','你叫米娅。']],
 'I am eight years old.':[['I am nine years old.','我九岁。'],['I am eighteen years old.','我十八岁。'],['He is eight years old.','他八岁。']],
 'This is my schoolbag.':[['This is your schoolbag.','这是你的书包。'],['That is my schoolbag.','那是我的书包。'],['This is my pencil box.','这是我的文具盒。']],
 'I like apples.':[['I like oranges.','我喜欢橙子。'],['I have apples.','我有苹果。'],["I don't like apples.",'我不喜欢苹果。']],
 'It is a red ball.':[['It is a blue ball.','这是一个蓝色的球。'],['It is a red box.','这是一个红色的盒子。'],['It is a red hat.','这是一顶红色的帽子。']],
 'I have a dog.':[['I have a cat.','我有一只猫。'],['I have two dogs.','我有两只狗。'],['I want a dog.','我想要一只狗。']],
 'Please sit down.':[['Please stand up.','请起立。'],['Please come in.','请进。'],['Please sit here.','请坐这里。']],
 'Please stand up.':[['Please sit down.','请坐下。'],['Please stand here.','请站在这里。'],['Please look up.','请往上看。']],
 'Open your book.':[['Close your book.','合上你的书。'],['Open your bag.','打开你的书包。'],['Open my book.','打开我的书。']],
 'Close the door.':[['Open the door.','打开门。'],['Close the window.','关上窗户。'],['Close the box.','关上盒子。']],
 'See you tomorrow.':[['See you later.','回头见。'],['See you on Monday.','星期一见。'],['See you next week.','下周见。']],
 'How are you?':[['Who are you?','你是谁？'],['How old are you?','你几岁？'],['Where are you?','你在哪里？']],
 'I am fine.':[['I am five.','我五岁。'],['I am tired.','我很累。'],['I am hungry.','我饿了。']],
 'What is this?':[['What is that?','那是什么？'],['Who is this?','这是谁？'],['Where is this?','这是哪里？']],
 'I go to school at eight.':[['I go to school at nine.','我九点去上学。'],['I go home at eight.','我八点回家。'],['I went to school at eight.','我八点去了学校。']],
 'She plays tennis on Sunday.':[['She plays tennis on Saturday.','她星期六打网球。'],['He plays tennis on Sunday.','他星期日打网球。'],['She watches tennis on Sunday.','她星期日看网球。']],
 'We eat lunch at school.':[['We eat lunch at home.','我们在家吃午饭。'],['We eat breakfast at school.','我们在学校吃早饭。'],['They eat lunch at school.','他们在学校吃午饭。']],
 'He can swim well.':[["He can't swim well.",'他游泳游得不好。'],['She can swim well.','她游泳游得很好。'],['He can run well.','他跑步跑得很好。']],
 'There are two books on the desk.':[['There are two books under the desk.','桌子下面有两本书。'],['There are three books on the desk.','桌子上有三本书。'],['There are two pens on the desk.','桌子上有两支笔。']],
 'Where is the library?':[['Where is the park?','公园在哪里？'],['Is this the library?','这是图书馆吗？'],['Who is in the library?','谁在图书馆里？']],
 'It is next to the park.':[['It is in the park.','它在公园里。'],['It is next to the bank.','它在银行旁边。'],['It is behind the park.','它在公园后面。']],
 'What time is it?':[['What day is it?','今天星期几？'],['What color is it?','它是什么颜色？'],['Where is it?','它在哪里？']],
 'It is half past three.':[["It is three o'clock.",'现在三点。'],['It is half past four.','现在四点半。'],['It is a quarter past three.','现在三点一刻。']],
 'I want some water.':[['I want some milk.','我想喝点牛奶。'],['I want some bread.','我想吃点面包。'],["I don't want any water.",'我不想喝水。']],
 'Do you like music?':[['Do you like sports?','你喜欢运动吗？'],['Does he like music?','他喜欢音乐吗？'],['Do you like art?','你喜欢美术吗？']],
 'A: Do you like music? B: Yes, I do.':[["A: Do you like music? B: No, I don't.",'甲：你喜欢音乐吗？乙：不，我不喜欢。'],['A: Do you like art? B: Yes, I do.','甲：你喜欢美术吗？乙：是的，我喜欢。'],['A: Does he like music? B: Yes, he does.','甲：他喜欢音乐吗？乙：是的，他喜欢。']],
 'My older sister is reading a book.':[['My younger sister is reading a book.','我妹妹正在读书。'],['My older brother is reading a book.','我哥哥正在读书。'],['My older sister is writing a book.','我姐姐正在写书。']],
 'We visited the zoo yesterday.':[['We will visit the zoo tomorrow.','我们明天要去动物园。'],['We visited the park yesterday.','我们昨天去了公园。'],['We visited the zoo last week.','我们上周去了动物园。']],
 'Please help me carry this box.':[['Please help me open this box.','请帮我打开这个箱子。'],['Please help me carry this bag.','请帮我拿这个包。'],['Please help me find this box.','请帮我找这个箱子。']],
 'Turn left at the bank.':[['Turn right at the bank.','在银行右转。'],['Turn left at the park.','在公园左转。'],['Stop at the bank.','在银行停下。']],
 'The bus stop is in front of the store.':[['The bus stop is behind the store.','公共汽车站在商店后面。'],['The bus stop is in front of the school.','公共汽车站在学校前面。'],['The bus stop is next to the store.','公共汽车站在商店旁边。']],
 'I usually get up at seven.':[['I usually go to bed at seven.','我通常七点睡觉。'],['I usually get up at six.','我通常六点起床。'],['I sometimes get up at seven.','我有时七点起床。']],
 'If it rains, we will stay inside.':[['If it rains, we will go outside.','如果下雨，我们就去室外。'],['If it is sunny, we will stay inside.','如果天晴，我们就待在室内。'],['Because it rained, we stayed inside.','因为下雨，我们待在了室内。']],
 'I have never been to London.':[['I have been to London twice.','我去过伦敦两次。'],['I have never been to Paris.','我从未去过巴黎。'],['I will go to London next year.','我明年要去伦敦。']],
 'The blue schoolbag is cheaper than the red one.':[['The red schoolbag is cheaper than the blue one.','红色书包比蓝色书包便宜。'],['The blue schoolbag is bigger than the red one.','蓝色书包比红色书包大。'],['The blue schoolbag is as cheap as the red one.','蓝色书包和红色书包一样便宜。']],
 'Could you tell me the way to the museum?':[['Could you tell me the way to the station?','你能告诉我去车站的路吗？'],['Could you take me to the museum?','你能带我去博物馆吗？'],['Could you tell me when the museum opens?','你能告诉我博物馆什么时候开门吗？']],
 'We should save water at home.':[['We should save water at school.','我们应该在学校节约用水。'],['We should save electricity at home.','我们应该在家节约用电。'],['We used a lot of water at home.','我们在家用了很多水。']],
 'She was tired, but she finished her homework.':[['She was tired, so she did not finish her homework.','她很累，所以没有完成作业。'],['She was hungry, but she finished her homework.','她很饿，但还是完成了作业。'],['She was tired, but she finished her lunch.','她很累，但还是吃完了午饭。']],
 'I chose this book because I like science.':[['I chose this book because I like history.','我选这本书是因为我喜欢历史。'],['I chose this game because I like science.','我选这个游戏是因为我喜欢科学。'],['I like science because I chose this book.','我喜欢科学是因为我选了这本书。']],
 'The train arrived ten minutes late.':[['The train arrived ten minutes early.','火车早到了十分钟。'],['The bus arrived ten minutes late.','公共汽车晚到了十分钟。'],['The train left ten minutes late.','火车晚开了十分钟。']],
 'This park is popular with local families.':[['This park is popular with foreign visitors.','这个公园很受外国游客欢迎。'],['This museum is popular with local families.','这个博物馆很受当地家庭欢迎。'],['This park is not popular with local families.','这个公园不太受当地家庭欢迎。']],
 'Please remember to bring your umbrella.':[['Please remember to bring your lunch.','请记得带午饭。'],['Please remember to dry your umbrella.','请记得晾干你的伞。'],['Did you remember to bring your umbrella?','你记得带伞了吗？']],
 'I am looking forward to the school trip.':[['I am looking forward to the sports day.','我很期待运动会。'],['I am worried about the school trip.','我很担心学校旅行。'],['I am looking for the school bus.','我在找校车。']],
 'We worked together to solve the problem.':[['We worked alone to solve the problem.','我们各自独立解决了这个问题。'],['We worked together to find the problem.','我们一起找出了这个问题。'],['We will work together to solve the problem.','我们将一起解决这个问题。']],
 'The library closes earlier on Fridays.':[['The library opens earlier on Fridays.','图书馆每周五会早些开门。'],['The library closes later on Fridays.','图书馆每周五会晚些关门。'],['The library closes earlier on Mondays.','图书馆每周一会早些关门。']],
 'He has lived here for three years.':[['He lived here three years ago.','他三年前住在这里。'],['He has lived here for three months.','他在这里住了三个月。'],['He has worked here for three years.','他在这里工作了三年。']],
 'Would you like to join our team?':[['Would you like to watch our team?','你想看我们队比赛吗？'],['Would you like to join their team?','你愿意加入他们队吗？'],['Did you join our team?','你加入我们队了吗？']],
 'The weather may change this afternoon.':[['The weather will not change this afternoon.','今天下午天气不会变。'],['The weather may change tomorrow morning.','明天上午天气可能会变。'],['The weather changed this afternoon.','今天下午天气变了。']],
 'First, wash the vegetables carefully.':[['First, cut the vegetables carefully.','首先，仔细切蔬菜。'],['Finally, wash the vegetables carefully.','最后，仔细清洗蔬菜。'],['First, wash the fruit carefully.','首先，仔细清洗水果。']],
 'The poster explains how to recycle bottles.':[['The poster explains how to recycle paper.','海报说明了怎样回收纸张。'],['The poster explains why we buy bottles.','海报说明了我们为什么买瓶子。'],['The letter explains how to recycle bottles.','这封信说明了怎样回收瓶子。']]
};

const LEVEL_ORDER={'Pre-A1':0,A1:1,A2:2};
const normalizedLevel=value=>value.startsWith('A2')?'A2':value.startsWith('A1')?'A1':'Pre-A1';
const copy={
 zh:{toZh:en=>`“${en}”最合适的中文意思是？`,toEn:zh=>`“${zh}”最合适的英文表达是？`,hint:'先找认识的关键词，再看整句话。',explain:'这组英文和中文表达相同的意思。'},
 en:{toZh:en=>`Choose the matching Chinese meaning for “${en}”`,toEn:zh=>`Choose the matching English expression for “${zh}”`,hint:'Find a familiar key word, then read the whole sentence.',explain:'These English and Chinese sentences express the same meaning.'},
 ja:{toZh:en=>`「${en}」と おなじ いみの 中国語は？`,toEn:zh=>`「${zh}」と おなじ いみの 英語は？`,hint:'しっている ことばを みつけて、文ぜんたいを よもう。',explain:'英語と中国語で おなじ いみを あらわしています。'}
};

const DIALOGUES=[
 ['A: Good morning.\nB: ___','Good morning.',['Good night.','Goodbye.','Thank you.'],'Pre-A1','A greeting needs the same greeting in reply.'],
 ['A: Thank you.\nB: ___',"You're welcome.",['Excuse me.',"I'm sorry.","You're right."],'Pre-A1',"“You're welcome” is a polite reply to thanks."],
 ['A: What is this?\nB: ___','It is a pencil.',['Yes, it is.','It is Monday.','I like pencils.'],'Pre-A1','The question asks for the name of an object.'],
 ['A: How are you?\nB: ___','I am fine, thank you.',['I am eight years old.','I am from Japan.','I am at school.'],'Pre-A1','This response says how the speaker feels.'],
 ['A: Where is the library?\nB: ___','It is next to the park.',['It is open until five.','It is a big library.','It is my favorite book.'],'A1','Where asks for a place.'],
 ['A: What time do you get up?\nB: ___','At seven.',['On Monday.','In my room.','For an hour.'],'A1','What time asks for a time.'],
 ['A: Do you like music?\nB: ___','Yes, I do.',['Yes, I am.','Yes, it is.','Yes, I like.'],'A1','A do-question is answered with do or do not.'],
 ['A: Why did you choose this book?\nB: ___','Because I like science.',['At the school library.','I chose it last week.','Yes, I chose this book.'],'A2','Why asks for a reason.'],
 ['A: Could you help me carry this box?\nB: ___','Of course.',['Yes, I do.','Yes, it is.','Me too.'],'A2','“Of course” accepts the request politely.'],
 ['A: Which bag is cheaper?\nB: ___','The blue one is.',['The blue one does.','Yes, it is cheaper.','Because it is blue.'],'A2','Which asks the speaker to select one item.']
];

// Multiple-choice word-order and short-reading questions use wholly original
// sentences. They exercise the same skill families as an elementary English
// proficiency challenge without copying any examination material.
const WORD_ORDERS=[
 ['Put the words in order: am / I / Mia','I am Mia.',['Am I Mia.','Mia I am.','I Mia am.'],'Pre-A1','A statement begins with “I am”.'],
 ['Put the words in order: is / This / my bag','This is my bag.',['Is this my bag.','My bag this is.','This my is bag.'],'Pre-A1','Use “This is” before the object.'],
 ['Put the words in order: like / I / apples','I like apples.',['Like I apples.','Apples like I.','I apples like.'],'Pre-A1','The order is subject, verb, then object.'],
 ['Put the words in order: your / Open / book','Open your book.',['Your open book.','Book your open.','Open book your.'],'Pre-A1','An instruction begins with the action word.'],
 ['Put the words in order: school / at eight / I / go to','I go to school at eight.',['I go at school to eight.','Go to I school at eight.','At school I eight go to.'],'A1','Place the subject first and the time expression last.'],
 ['Put the words in order: tennis / on Sunday / She / plays','She plays tennis on Sunday.',['She tennis plays on Sunday.','On Sunday plays she tennis.','Plays she on Sunday tennis.'],'A1','A statement uses subject, verb, object, then time.'],
 ['Put the words in order: the library / Where / is','Where is the library?',['Where the library is?','Is where the library?','The library where is?'],'A1','A where-question puts “is” before the subject.'],
 ['Put the words in order: some water / want / I','I want some water.',['I some water want.','Want I some water.','Some water I want.'],'A1','Use subject, verb, then object.'],
 ['Put the words in order: because / science / I / like / it / chose / I','I chose it because I like science.',['Because science I chose it I like.','I because chose it I science like.','I chose because science it I like.'],'A2','Join the choice and its reason with “because”.'],
 ['Put the words in order: has lived / for three years / He / here','He has lived here for three years.',['He here has lived three years for.','For three years has he here lived.','He lived has for here three years.'],'A2','Use present perfect, place, then duration.'],
 ['Put the words in order: should / at home / save water / We','We should save water at home.',['We save should at home water.','Should we at home save water.','At home should water we save.'],'A2','Place the modal before the main verb.']
];

const SHORT_READINGS=[
 ['Mia has a red bag and a blue hat. The bag has one book.\nWhat color is the bag?','Red.',['Blue.','Pink.','Green.'],'Pre-A1','The first sentence says the bag is red; the hat is blue.'],
 ['Tom has a dog and a cat. His friend Ken has three fish.\nHow many pets does Tom have?','Two.',['One.','Three.','Four.'],'Pre-A1','A dog and a cat make two pets. The three fish belong to Ken.'],
 ['Ben gets up at seven. He goes to school at eight.\nWhen does Ben go to school?','At eight.',['At seven.','At nine.','At six.'],'A1','The second sentence gives the school time.'],
 ['The library is next to the park. The bank is across from it.\nWhat is next to the park?','The library.',['The bank.','The station.','The school.'],'A1','The first sentence names the place next to the park.'],
 ['Amy likes music, but her brother likes science.\nWhat does Amy like?','Music.',['Science.','Tennis.','Math.'],'A1','The first part tells us Amy likes music.'],
 ['The class planned a picnic for Friday. It may rain, so they will meet in the gym instead.\nWhy will they meet in the gym?','It may rain.',['It is Friday.','It may snow.','The gym is new.'],'A2','The text gives rain as the reason for changing the place.'],
 ['Leo chose the blue bag because it was cheaper than the red one. The red bag was bigger.\nWhy did Leo choose the blue bag?','It was cheaper.',['It was bigger.','It was newer.','It was heavier.'],'A2','The word “because” introduces Leo’s reason; the red bag was the bigger one.'],
 ['The museum opens at nine, but our train arrives at ten.\nCan we enter the museum when it opens?','No, we cannot.',['Yes, we can.','Yes, at nine.','No, it is closed.'],'A2','The train arrives after the museum opens, and the museum is open, not closed.']
];

export function englishPool(stage,locale='zh'){
 const cefr=CEFR_BY_STAGE[Math.max(0,Math.min(6,Number(stage)||0))],maximum=LEVEL_ORDER[normalizedLevel(cefr)],strings=copy[locale]||copy.en;
 const pairs=EN_ZH_TRANSLATIONS.filter(pair=>LEVEL_ORDER[normalizedLevel(pair.cefr)]<=maximum);
 const pairChoices=(pair,key)=>{
  const near=(NEAR_MISSES[pair.en]||[]).map(([en,zh])=>key==='en'?en:zh),choices=[pair[key],...near];
  if(near.length===3&&!auditChoiceSet({correct:pair[key],choices}).length)return choices;
  // Fallback for a new pair without authored near misses: same-shape sentences.
  return [pair[key],...pickDistractors(pair[key],[...near,...EN_ZH_TRANSLATIONS.filter(item=>item.id!==pair.id).map(item=>item[key])],{count:3,variety:pair.id.length})];
 };
 const translations=pairs.flatMap(pair=>[
  {id:`${pair.id}-en-zh`,kind:'choice',format:'translation-en-zh',cefr,prompt:strings.toZh(pair.en),correct:pair.zh,choices:pairChoices(pair,'zh'),hint:strings.hint,explanation:`${pair.en} — ${pair.zh}`,lang:'zh-en'},
  {id:`${pair.id}-zh-en`,kind:'choice',format:'translation-zh-en',cefr,prompt:strings.toEn(pair.zh),correct:pair.en,choices:pairChoices(pair,'en'),hint:strings.hint,explanation:`${pair.zh} — ${pair.en}`,lang:'zh-en'}
 ]);
 const dialogues=DIALOGUES.filter(item=>LEVEL_ORDER[normalizedLevel(item[3])]<=maximum).map((item,index)=>({id:`D${maximum}-${index}`,kind:'choice',format:'dialogue-completion',cefr,prompt:item[0],correct:item[1],choices:[item[1],...item[2]],hint:locale==='zh'?'先判断对话在问候、提问，还是请求。':'Identify whether the speaker is greeting, asking or requesting.',explanation:item[4],lang:'en'}));
 const wordOrders=WORD_ORDERS.filter(item=>LEVEL_ORDER[normalizedLevel(item[3])]<=maximum).map((item,index)=>({id:`W${maximum}-${index}`,kind:'choice',format:'word-order',cefr,prompt:item[0],correct:item[1],choices:[item[1],...item[2]],hint:locale==='zh'?'先找主语，再找动作，最后放时间或地点。':'Find the subject and action first, then add time or place.',explanation:item[4],lang:'en'}));
 const shortReadings=SHORT_READINGS.filter(item=>LEVEL_ORDER[normalizedLevel(item[3])]<=maximum).map((item,index)=>({id:`R${maximum}-${index}`,kind:'choice',format:'short-reading',cefr,prompt:item[0],correct:item[1],choices:[item[1],...item[2]],hint:locale==='zh'?'读完短文，再回到文中找依据。':'Read the whole passage, then find the evidence.',explanation:item[4],lang:'en'}));
 return [...translations,...dialogues,...wordOrders,...shortReadings];
}
