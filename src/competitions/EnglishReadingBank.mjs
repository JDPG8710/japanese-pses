// Short and long reading questions for the EIKEN/BASIC English practice.
//
// Each scenario row stays within one visit topic: index 0 is what the named
// pupil really did; indexes 1-3 change one place, task, purpose or result
// within the same topic, so recognising the topic cannot answer a question.
// The passage also mentions one of those alternatives as what a friend did
// (or where the pupil first wanted to go), so the answer is never the only
// option whose wording appears in the text: the child has to read who did
// what. Checked by src/runtime/ChoiceQuality.mjs (verbatim-echo rule).
const scenarios = [
  {
    places: ['the library', 'the bookshop', 'the classroom', 'the study room'],
    actions: ['borrow a book about space', 'borrow a book about oceans', 'borrow a book about insects', 'borrow a book about forests'],
    reasons: ['prepare for a science project', 'prepare for a reading contest', 'prepare for a history lesson', 'prepare for a writing test'],
    outcomes: ['found a useful diagram', 'found a useful photograph', 'found a useful timetable', 'found a useful address']
  },
  {
    places: ['the community center', 'the school meeting room', 'the town meeting room', 'the local youth center'],
    actions: ['practice a short speech', 'practice a short interview', 'practice a short debate', 'practice a short play'],
    reasons: ['welcome new students', 'thank former students', 'guide visiting teachers', 'introduce local artists'],
    outcomes: ['spoke with more confidence', 'spoke with a louder voice', 'spoke with better pronunciation', 'spoke with fewer notes']
  },
  {
    places: ['the school garden', 'the school greenhouse', 'the community garden', 'the community greenhouse'],
    actions: ['water the tomato plants', 'water the potato plants', 'water the bean plants', 'water the pumpkin plants'],
    reasons: ['help the plants grow', 'keep the garden tidy', 'study the soil color', 'count the garden insects'],
    outcomes: ['noticed three new flowers', 'noticed four new flowers', 'noticed five new flowers', 'noticed six new flowers']
  },
  {
    places: ['the science museum', 'the school science lab', 'the local robot club', 'the technology center'],
    actions: ['join a robot workshop', 'join a computer workshop', 'join a camera workshop', 'join a radio workshop'],
    reasons: ['learn how sensors work', 'learn how batteries work', 'learn how cameras work', 'learn how radios work'],
    outcomes: ['built a small moving car', 'built a small moving boat', 'built a small moving train', 'built a small moving plane']
  },
  {
    places: ['the riverside park', 'the lakeside park', 'the seaside park', 'the city nature park'],
    actions: ['collect plastic litter', 'collect paper litter', 'collect metal litter', 'collect glass litter'],
    reasons: ['protect birds and fish', 'protect trees and flowers', 'study birds and insects', 'study plants and soil'],
    outcomes: ['filled two recycling bags', 'filled three recycling bags', 'filled four recycling bags', 'filled five recycling bags']
  },
  {
    places: ['the train station', 'the bus station', 'the ferry terminal', 'the airport terminal'],
    actions: ['make a barrier-free map', 'make a bus-route map', 'make a bicycle-route map', 'make a sightseeing map'],
    reasons: ['help visitors move safely', 'help visitors buy tickets', 'help visitors find hotels', 'help visitors learn history'],
    outcomes: ['found a new elevator', 'found a new ticket gate', 'found a new waiting room', 'found a new information desk']
  },
  {
    places: ['the sports center', 'the swimming school', 'the fitness club', 'the outdoor pool'],
    actions: ['practice swimming', 'practice diving', 'practice rowing', 'practice sailing'],
    reasons: ['improve endurance', 'improve balance', 'improve flexibility', 'improve teamwork'],
    outcomes: ['completed ten laps', 'completed eight laps', 'completed twelve laps', 'completed fifteen laps']
  },
  {
    places: ['the town hall', 'the fire station', 'the police station', 'the health center'],
    actions: ['interview a city worker', 'interview a local firefighter', 'interview a police officer', 'interview a rescue volunteer'],
    reasons: ['study disaster preparation', 'study disaster recovery', 'study emergency medicine', 'study emergency transport'],
    outcomes: ['learned about emergency water', 'learned about emergency food', 'learned about emergency radios', 'learned about emergency blankets']
  },
  {
    places: ['the art museum', 'the art classroom', 'the art studio', 'the town gallery'],
    actions: ['sketch a landscape painting', 'sketch a portrait painting', 'sketch a flower painting', 'sketch an animal painting'],
    reasons: ['study the use of color', 'study the use of lines', 'study the use of light', 'study the use of shapes'],
    outcomes: ['shared the sketch with classmates', 'shared the sketch with neighbors', 'shared the sketch with relatives', 'shared the sketch with visitors']
  },
  {
    places: ['the local bakery', 'the school kitchen', 'the local cafe', 'the cooking school'],
    actions: ['learn how bread is made', 'learn how cake is made', 'learn how pasta is made', 'learn how yogurt is made'],
    reasons: ['write a report about local jobs', 'write a report about school meals', 'write a report about food prices', 'write a report about family recipes'],
    outcomes: ['watched the dough rise', 'watched the butter melt', 'watched the cream thicken', 'watched the sugar dissolve']
  },
  {
    places: ['the animal shelter', 'the animal hospital', 'the local pet shop', 'the animal rescue center'],
    actions: ['prepare clean water bowls', 'prepare fresh food bowls', 'prepare warm animal beds', 'prepare new animal toys'],
    reasons: ['support rescued animals', 'study wild animals', 'train working animals', 'photograph farm animals'],
    outcomes: ['helped five dogs', 'helped three dogs', 'helped seven dogs', 'helped nine dogs']
  },
  {
    places: ['the school kitchen', 'the community kitchen', 'the cooking classroom', 'the local restaurant'],
    actions: ['cook vegetable soup', 'cook chicken soup', 'cook potato curry', 'cook mushroom rice'],
    reasons: ['learn about healthy meals', 'learn about traditional meals', 'learn about festival meals', 'learn about emergency meals'],
    outcomes: ['used locally grown carrots', 'used locally grown potatoes', 'used locally grown onions', 'used locally grown tomatoes']
  },
  {
    places: ['the beach', 'the harbor', 'the island', 'the marina'],
    actions: ['count different shells', 'count different crabs', 'count different fish', 'count different birds'],
    reasons: ['compare the coastal environment', 'compare the mountain environment', 'compare the forest environment', 'compare the lake environment'],
    outcomes: ['recorded six kinds of shells', 'recorded four kinds of shells', 'recorded eight kinds of shells', 'recorded ten kinds of shells']
  },
  {
    places: ['the music room', 'the concert hall', 'the school stage', 'the music studio'],
    actions: ['rehearse a flute piece', 'rehearse a violin piece', 'rehearse a trumpet piece', 'rehearse a piano piece'],
    reasons: ['perform at the school festival', 'perform at the town festival', 'perform at the welcome party', 'perform at the graduation ceremony'],
    outcomes: ['kept the rhythm correctly', 'played the notes softly', 'played the melody quickly', 'held the flute differently']
  },
  {
    places: ['the history museum', 'the local history room', 'the old farming village', 'the school history room'],
    actions: ['examine an old farming tool', 'examine an old fishing tool', 'examine an old cooking tool', 'examine an old building tool'],
    reasons: ['understand life in the past', 'understand life in another country', 'understand life in the mountains', 'understand life in the city'],
    outcomes: ['wrote notes about its shape', 'wrote notes about its weight', 'wrote notes about its color', 'wrote notes about its price']
  },
  {
    places: ['the fire station', 'the rescue center', 'the police station', 'the ambulance station'],
    actions: ['ask about rescue equipment', 'ask about rescue vehicles', 'ask about rescue animals', 'ask about rescue signals'],
    reasons: ['make a community safety guide', 'make a school travel guide', 'make a community health guide', 'make a school exercise guide'],
    outcomes: ['learned how firefighters train', 'learned how firefighters cook', 'learned how firefighters travel', 'learned how firefighters rest']
  },
  {
    places: ['the recycling center', 'the school recycling room', 'the local collection point', 'the community repair shop'],
    actions: ['sort used containers', 'wash used containers', 'repair used containers', 'weigh used containers'],
    reasons: ['reduce waste at school', 'reduce waste at home', 'reduce waste at shops', 'reduce waste at parks'],
    outcomes: ['understood three recycling marks', 'understood four recycling marks', 'understood five recycling marks', 'understood six recycling marks']
  },
  {
    places: ['the weather station', 'the school weather club', 'the science classroom', 'the local weather office'],
    actions: ['check rainfall records', 'check temperature records', 'check snowfall records', 'check wind-speed records'],
    reasons: ['compare this month with last month', 'compare this month with last year', 'compare this town with another town', 'compare this week with last week'],
    outcomes: ['discovered a wetter week', 'discovered a drier week', 'discovered a warmer week', 'discovered a colder week']
  },
  {
    places: ['the nursing home', 'the community center', 'the local hospital', 'the retirement club'],
    actions: ['read a picture book aloud', 'read a travel book aloud', 'read a history book aloud', 'read a poetry book aloud'],
    reasons: ['spend time with older residents', 'spend time with younger children', 'spend time with local nurses', 'spend time with visiting families'],
    outcomes: ['received helpful storytelling advice', 'received helpful gardening advice', 'received helpful drawing advice', 'received helpful cooking advice']
  },
  {
    places: ['the shopping street', 'the shopping center', 'the outdoor market', 'the department store'],
    actions: ['survey reusable bag use', 'survey reusable bottle use', 'survey reusable lunchbox use', 'survey reusable cup use'],
    reasons: ['study environmentally friendly habits', 'study local shopping preferences', 'study local transport habits', 'study healthy eating habits'],
    outcomes: ['collected forty responses', 'collected thirty responses', 'collected fifty responses', 'collected sixty responses']
  }
];

export function makeEnglishReadingBank(longMode = false) {
  const names = ['Aki', 'Ben', 'Mika', 'Ken', 'Yui', 'Sora', 'Emma', 'Leo', 'Hana', 'Riku'];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  return Array.from({ length: 200 }, (_, index) => {
    const name = names[index % names.length];
    const friend = names[(index + 3) % names.length];
    const day = days[index % days.length];
    const { places, actions, reasons, outcomes } = scenarios[Math.floor(index / names.length)];
    // Rotate which same-topic alternative is mentioned as the decoy.
    const d = 1 + (Math.floor(index / 4) % 3);
    const [place, action, reason, outcome] = [places[0], actions[0], reasons[0], outcomes[0]];
    const [dPlace, dAction, dReason, dOutcome] = [places[d], actions[d], reasons[d], outcomes[d]];
    const passage = longMode
      ? `On ${day}, ${name} visited ${place} with a small school team. The team had first planned to go to ${dPlace}, but that visit was moved to another week. ${name}'s team was asked to ${action}, while ${friend}'s group was asked to ${dAction}. Before starting, they discussed safety rules and divided the work fairly. ${name}'s team chose this activity because they wanted to ${reason}. ${friend}'s group wanted to ${dReason}. Although one part of the task was difficult, ${name}'s team exchanged ideas and continued carefully. By the end of the visit, ${friend} ${dOutcome}, while ${name} ${outcome} and wrote a reflection for the next class.`
      : `On ${day}, ${name} and ${friend} wanted to go to ${dPlace} after school, but it was closed. ${name} went to ${place} instead. ${name} planned to ${action}, and ${friend} planned to ${dAction}. ${name}'s class hoped to ${reason}, but ${friend} wanted to ${dReason}. In the end, ${friend} ${dOutcome}, and ${name} ${outcome}.`;
    const specs = [
      [`Where did ${name} go?`, places],
      [`What did ${name} plan to do?`, actions],
      [`Why did ${name} choose the activity?`, reasons.map(value => `To ${value}.`)],
      [`What was the result of ${name}'s visit?`, outcomes.map(value => `${name} ${value}.`)]
    ];
    const [question, options] = specs[index % 4];
    return {
      id: `${longMode ? 'LONG' : 'SHORT'}_${index}`,
      passage,
      prompt: `${passage}\n\n${question}`,
      correct: options[0],
      options: [...options]
    };
  });
}
