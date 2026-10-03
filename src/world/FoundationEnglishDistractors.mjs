// Reviewed alternatives for the T1–T54 bilingual sentence pairs in
// FoundationEnglish.mjs, keyed by pair id. None is a correct translation of
// its pair.
//
// Sentences from T5 on use a 2x2 design over two details of the sentence
// (e.g. open/close × book/bag): [first detail changed], [second detail
// changed], [both changed]. Every option then shares exactly one detail with
// two others, so a child cannot find the answer as "the one that looks like
// all the others" and has to understand both details. The short formulaic
// phrases (greetings, classroom commands, set questions) instead swap the
// whole phrase within the same family. Checked by src/runtime/ChoiceQuality.mjs.
export const TRANSLATION_DISTRACTORS = Object.fromEntries([
 ['T1', ['Goodbye.', '再见。'], ['Sorry.', '抱歉。'], ['Thanks.', '谢谢。']],
 ['T2', ['Good evening.', '晚上好。'], ['Good afternoon.', '下午好。'], ['Good night.', '晚安。']],
 ['T3', ['See you.', '再见。'], ['Excuse me.', '打扰一下。'], ['Sorry.', '抱歉。']],
 ['T4', ['Hello.', '你好。'], ['Thanks.', '谢谢。'], ['Sorry.', '抱歉。']],
 ['T5', ['Her name is Mia.', '她叫米娅。'], ['My name is Amy.', '我叫艾米。'], ['Her name is Amy.', '她叫艾米。']],
 ['T6', ['He is eight years old.', '他八岁。'], ['I am nine years old.', '我九岁。'], ['He is nine years old.', '他九岁。']],
 ['T7', ['That is my schoolbag.', '那是我的书包。'], ['This is your schoolbag.', '这是你的书包。'], ['That is your schoolbag.', '那是你的书包。']],
 ['T8', ["I don't like apples.", '我不喜欢苹果。'], ['I like oranges.', '我喜欢橙子。'], ["I don't like oranges.", '我不喜欢橙子。']],
 ['T9', ['It is a blue ball.', '这是一个蓝色的球。'], ['It is a red bag.', '这是一个红色的包。'], ['It is a blue bag.', '这是一个蓝色的包。']],
 ['T10', ['You have a dog.', '你有一只狗。'], ['I have a cat.', '我有一只猫。'], ['You have a cat.', '你有一只猫。']],
 ['T11', ['Please stand up.', '请起立。'], ['Please come here.', '请到这里来。'], ['Please turn around.', '请转过身。']],
 ['T12', ['Please sit down.', '请坐下。'], ['Please come here.', '请到这里来。'], ['Please turn around.', '请转过身。']],
 ['T13', ['Close your book.', '合上你的书。'], ['Open your bag.', '打开你的包。'], ['Close your bag.', '合上你的包。']],
 ['T14', ['Open the door.', '打开门。'], ['Close the window.', '关上窗户。'], ['Open the window.', '打开窗户。']],
 ['T15', ['See you on Monday.', '星期一见。'], ['See you next week.', '下周见。'], ['See you tonight.', '今晚见。']],
 ['T16', ['How old are you?', '你几岁？'], ['Who are you?', '你是谁？'], ['Where are you?', '你在哪里？']],
 ['T17', ['I am tired.', '我很累。'], ['I am hungry.', '我很饿。'], ['I am sad.', '我很难过。']],
 ['T18', ['Who is this?', '这是谁？'], ['What is that?', '那是什么？'], ['Who is that?', '那是谁？']],
 ['T19', ['I go to school at nine.', '我九点去上学。'], ['I go home at eight.', '我八点回家。'], ['I go home at nine.', '我九点回家。']],
 ['T20', ['He plays tennis on Sunday.', '他星期日打网球。'], ['She plays tennis on Saturday.', '她星期六打网球。'], ['He plays tennis on Saturday.', '他星期六打网球。']],
 ['T21', ['We eat breakfast at school.', '我们在学校吃早饭。'], ['We eat lunch at home.', '我们在家吃午饭。'], ['We eat breakfast at home.', '我们在家吃早饭。']],
 ['T22', ['She can swim well.', '她游泳游得很好。'], ['He can run well.', '他跑步跑得很好。'], ['She can run well.', '她跑步跑得很好。']],
 ['T23', ['There are three books on the desk.', '桌子上有三本书。'], ['There are two books under the desk.', '桌子下面有两本书。'], ['There are three books under the desk.', '桌子下面有三本书。']],
 ['T24', ['Where is the museum?', '博物馆在哪里？'], ['Where is the station?', '车站在哪里？'], ['Where is the hospital?', '医院在哪里？']],
 ['T25', ['It is behind the park.', '它在公园后面。'], ['It is next to the bank.', '它在银行旁边。'], ['It is behind the bank.', '它在银行后面。']],
 ['T26', ['What day is it?', '今天星期几？'], ['What color is it?', '它是什么颜色？'], ['Where is it?', '它在哪里？']],
 ['T27', ['It is a quarter past three.', '现在三点一刻。'], ['It is half past four.', '现在四点半。'], ['It is a quarter past four.', '现在四点一刻。']],
 ['T28', ['She wants some water.', '她想喝点水。'], ['I want some milk.', '我想喝点牛奶。'], ['She wants some milk.', '她想喝点牛奶。']],
 ['T29', ['Does she like music?', '她喜欢音乐吗？'], ['Do you like science?', '你喜欢科学吗？'], ['Does she like science?', '她喜欢科学吗？']],
 ['T30', ["A: Do you like music? B: No, I don't.", '甲：你喜欢音乐吗？乙：不，我不喜欢。'], ['A: Do you like science? B: Yes, I do.', '甲：你喜欢科学吗？乙：是的，我喜欢。'], ["A: Do you like science? B: No, I don't.", '甲：你喜欢科学吗？乙：不，我不喜欢。']],
 ['T31', ['My younger sister is reading a book.', '我妹妹正在读书。'], ['My older sister is writing a letter.', '我姐姐正在写信。'], ['My younger sister is writing a letter.', '我妹妹正在写信。']],
 ['T32', ['We visited the museum yesterday.', '我们昨天去了博物馆。'], ['We visited the zoo last week.', '我们上周去了动物园。'], ['We visited the museum last week.', '我们上周去了博物馆。']],
 ['T33', ['Please help me open this box.', '请帮我打开这个箱子。'], ['Please help me carry this bag.', '请帮我搬这个袋子。'], ['Please help me open this bag.', '请帮我打开这个袋子。']],
 ['T34', ['Turn right at the bank.', '在银行右转。'], ['Turn left at the store.', '在商店左转。'], ['Turn right at the store.', '在商店右转。']],
 ['T35', ['The bus stop is behind the store.', '公共汽车站在商店后面。'], ['The bus stop is in front of the school.', '公共汽车站在学校前面。'], ['The bus stop is behind the school.', '公共汽车站在学校后面。']],
 ['T36', ['I sometimes get up at seven.', '我有时七点起床。'], ['I usually get up at six.', '我通常六点起床。'], ['I sometimes get up at six.', '我有时六点起床。']],
 ['T37', ['If it snows, we will stay inside.', '如果下雪，我们就待在室内。'], ['If it rains, we will go outside.', '如果下雨，我们就去室外。'], ['If it snows, we will go outside.', '如果下雪，我们就去室外。']],
 ['T38', ['I have already been to London.', '我已经去过伦敦。'], ['I have never been to Paris.', '我从未去过巴黎。'], ['I have already been to Paris.', '我已经去过巴黎。']],
 ['T39', ['The red schoolbag is cheaper than the blue one.', '红色书包比蓝色书包便宜。'], ['The blue schoolbag is heavier than the red one.', '蓝色书包比红色书包重。'], ['The red schoolbag is heavier than the blue one.', '红色书包比蓝色书包重。']],
 ['T40', ['Could you tell me the way to the station?', '你能告诉我去车站的路吗？'], ['Could you show me a map of the museum?', '你能给我看看博物馆的地图吗？'], ['Could you show me a map of the station?', '你能给我看看车站的地图吗？']],
 ['T41', ['We should save paper at home.', '我们应该在家节约用纸。'], ['We should save water at school.', '我们应该在学校节约用水。'], ['We should save paper at school.', '我们应该在学校节约用纸。']],
 ['T42', ['She was busy, but she finished her homework.', '她很忙，但还是完成了作业。'], ['She was tired, so she left her homework unfinished.', '她很累，所以没有完成作业。'], ['She was busy, so she left her homework unfinished.', '她很忙，所以没有完成作业。']],
 ['T43', ['I chose this game because I like science.', '我选这个游戏是因为我喜欢科学。'], ['I chose this book because I like history.', '我选这本书是因为我喜欢历史。'], ['I chose this game because I like history.', '我选这个游戏是因为我喜欢历史。']],
 ['T44', ['The bus arrived ten minutes late.', '公共汽车晚到了十分钟。'], ['The train arrived ten minutes early.', '火车早到了十分钟。'], ['The bus arrived ten minutes early.', '公共汽车早到了十分钟。']],
 ['T45', ['This museum is popular with local families.', '这个博物馆很受当地家庭欢迎。'], ['This park is popular with local students.', '这个公园很受当地学生欢迎。'], ['This museum is popular with local students.', '这个博物馆很受当地学生欢迎。']],
 ['T46', ['Please remember to buy an umbrella.', '请记得买伞。'], ['Please remember to bring your coat.', '请记得带外套。'], ['Please remember to buy a coat.', '请记得买外套。']],
 ['T47', ['I am worried about the school trip.', '我很担心学校旅行。'], ['I am looking forward to the school concert.', '我很期待学校音乐会。'], ['I am worried about the school concert.', '我很担心学校音乐会。']],
 ['T48', ['We worked alone to solve the problem.', '我们各自解决了这个问题。'], ['We worked together to make the poster.', '我们一起制作了这张海报。'], ['We worked alone to make the poster.', '我们各自制作了这张海报。']],
 ['T49', ['The library opens earlier on Fridays.', '图书馆每周五会早些开门。'], ['The library closes earlier on Mondays.', '图书馆每周一会早些关门。'], ['The library opens earlier on Mondays.', '图书馆每周一会早些开门。']],
 ['T50', ['He has worked here for three years.', '他在这里工作了三年。'], ['He has lived here for two years.', '他在这里住了两年。'], ['He has worked here for two years.', '他在这里工作了两年。']],
 ['T51', ['Would you like to help our team?', '你愿意帮助我们队吗？'], ['Would you like to join their team?', '你愿意加入他们队吗？'], ['Would you like to help their team?', '你愿意帮助他们队吗？']],
 ['T52', ['The weather will stay the same this afternoon.', '今天下午天气会保持不变。'], ['The weather may change tomorrow afternoon.', '明天下午天气可能会变。'], ['The weather will stay the same tomorrow afternoon.', '明天下午天气会保持不变。']],
 ['T53', ['Finally, wash the vegetables carefully.', '最后，仔细清洗蔬菜。'], ['First, wash the fruit carefully.', '首先，仔细清洗水果。'], ['Finally, wash the fruit carefully.', '最后，仔细清洗水果。']],
 ['T54', ['The book explains how to recycle bottles.', '书中说明了怎样回收瓶子。'], ['The poster explains how to recycle paper.', '海报说明了怎样回收纸张。'], ['The book explains how to recycle paper.', '书中说明了怎样回收纸张。']]
].map(([id, ...pairs]) => [id, pairs.map(([en, zh]) => ({en, zh}))]));
