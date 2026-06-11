// verses.js — the daily verse deck.
//
// Translation: World English Bible (WEB), which is public domain — no license,
// no attribution required, ever. (WEB renders the OT divine name as "Yahweh";
// if you'd rather see "the LORD", these are just strings — edit freely.)
//
// Themes lean where the spec asked: the race, self-control, purity, work,
// courage, perseverance. 37 verses — add your own to the array anytime.

import { dayOfYear } from './dates.js'

export const VERSES = [
  {
    ref: '1 Corinthians 9:24–27',
    theme: 'the race',
    text:
      "Don't you know that those who run in a race all run, but one receives the prize? Run like that, so that you may win. Every man who strives in the games exercises self-control in all things. Now they do it to receive a corruptible crown, but we an incorruptible. I therefore run like that, not aimlessly. I fight like that, not beating the air, but I beat my body and bring it into submission.",
  },
  {
    ref: 'Philippians 4:13',
    theme: 'strength',
    text: 'I can do all things through Christ, who strengthens me.',
  },
  {
    ref: '1 Corinthians 10:13',
    theme: 'temptation',
    text:
      'No temptation has taken you except what is common to man. God is faithful, who will not allow you to be tempted above what you are able, but will with the temptation also make the way of escape, that you may be able to endure it.',
  },
  {
    ref: 'Proverbs 16:3',
    theme: 'work',
    text: 'Commit your deeds to Yahweh, and your plans shall succeed.',
  },
  {
    ref: 'Joshua 1:9',
    theme: 'courage',
    text:
      "Haven't I commanded you? Be strong and courageous. Don't be afraid. Don't be dismayed, for Yahweh your God is with you wherever you go.",
  },
  {
    ref: 'Romans 12:1–2',
    theme: 'identity',
    text:
      'Therefore I urge you, brothers, by the mercies of God, to present your bodies a living sacrifice, holy, acceptable to God, which is your spiritual service. Don’t be conformed to this world, but be transformed by the renewing of your mind, so that you may prove what is the good, well-pleasing, and perfect will of God.',
  },
  {
    ref: '1 Corinthians 6:19–20',
    theme: 'purity',
    text:
      "Or don't you know that your body is a temple of the Holy Spirit who is in you, whom you have from God? You are not your own, for you were bought with a price. Therefore glorify God in your body and in your spirit, which are God's.",
  },
  {
    ref: 'Psalm 119:9–11',
    theme: 'purity',
    text:
      "How can a young man keep his way pure? By living according to your word. With my whole heart I have sought you. Don't let me wander from your commandments. I have hidden your word in my heart, that I might not sin against you.",
  },
  {
    ref: 'James 1:12',
    theme: 'perseverance',
    text:
      'Blessed is a person who endures temptation, for when he has been approved, he will receive the crown of life, which the Lord promised to those who love him.',
  },
  {
    ref: '2 Timothy 1:7',
    theme: 'self-control',
    text: "For God didn't give us a spirit of fear, but of power, love, and self-control.",
  },
  {
    ref: 'Hebrews 12:1–2',
    theme: 'the race',
    text:
      'Therefore let us also, seeing we are surrounded by so great a cloud of witnesses, lay aside every weight and the sin which so easily entangles us, and let us run with perseverance the race that is set before us, looking to Jesus, the author and perfecter of faith.',
  },
  {
    ref: 'Colossians 3:23',
    theme: 'work',
    text: 'And whatever you do, work heartily, as for the Lord, and not for men.',
  },
  {
    ref: 'Galatians 5:22–23',
    theme: 'self-control',
    text:
      'But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faith, gentleness, and self-control. Against such things there is no law.',
  },
  {
    ref: 'Proverbs 4:23',
    theme: 'purity',
    text: 'Keep your heart with all diligence, for out of it is the wellspring of life.',
  },
  {
    ref: 'Isaiah 40:31',
    theme: 'strength',
    text:
      'But those who wait for Yahweh will renew their strength. They will mount up with wings like eagles. They will run, and not be weary. They will walk, and not faint.',
  },
  {
    ref: 'Proverbs 3:5–6',
    theme: 'trust',
    text:
      "Trust in Yahweh with all your heart, and don't lean on your own understanding. In all your ways acknowledge him, and he will make your paths straight.",
  },
  {
    ref: 'Philippians 4:6–7',
    theme: 'peace',
    text:
      'In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God. And the peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus.',
  },
  {
    ref: 'Romans 5:3–4',
    theme: 'perseverance',
    text:
      'We also rejoice in our sufferings, knowing that suffering produces perseverance; and perseverance, proven character; and proven character, hope.',
  },
  {
    ref: 'Galatians 6:9',
    theme: 'perseverance',
    text:
      "Let us not be weary in doing good, for we will reap in due season, if we don't give up.",
  },
  {
    ref: '1 Peter 5:6–7',
    theme: 'trust',
    text:
      'Humble yourselves therefore under the mighty hand of God, that he may exalt you in due time, casting all your worries on him, because he cares for you.',
  },
  {
    ref: '2 Corinthians 12:9',
    theme: 'strength',
    text:
      "He has said to me, 'My grace is sufficient for you, for my power is made perfect in weakness.' Most gladly therefore I will rather glory in my weaknesses, that the power of Christ may rest on me.",
  },
  {
    ref: 'Psalm 1:1–3',
    theme: 'discipline',
    text:
      "Blessed is the man who doesn't walk in the counsel of the wicked, nor stand on the path of sinners; but his delight is in Yahweh's law. On his law he meditates day and night. He will be like a tree planted by the streams of water, that produces its fruit in its season.",
  },
  {
    ref: 'Matthew 6:33',
    theme: 'priorities',
    text:
      "Seek first God's Kingdom and his righteousness; and all these things will be given to you as well.",
  },
  {
    ref: 'Proverbs 27:17',
    theme: 'accountability',
    text: "Iron sharpens iron; so a man sharpens his friend's countenance.",
  },
  {
    ref: '1 Timothy 4:7–8',
    theme: 'training',
    text:
      'Exercise yourself toward godliness. For bodily exercise has some value, but godliness has value in all things, having the promise of the life which is now, and of that which is to come.',
  },
  {
    ref: 'Hebrews 12:11',
    theme: 'discipline',
    text:
      'All chastening seems for the present to be not joyous but grievous; yet afterward it yields the peaceful fruit of righteousness to those who have been trained by it.',
  },
  {
    ref: 'James 1:2–4',
    theme: 'perseverance',
    text:
      'Count it all joy, my brothers, when you fall into various trials, knowing that the testing of your faith produces endurance. Let endurance have its perfect work, that you may be perfect and complete, lacking in nothing.',
  },
  {
    ref: 'Romans 8:28',
    theme: 'trust',
    text:
      'We know that all things work together for good for those who love God, for those who are called according to his purpose.',
  },
  {
    ref: 'John 16:33',
    theme: 'courage',
    text:
      'I have told you these things, that in me you may have peace. In the world you have trouble; but cheer up! I have overcome the world.',
  },
  {
    ref: 'Ephesians 6:10–11',
    theme: 'strength',
    text:
      'Finally, be strong in the Lord, and in the strength of his might. Put on the whole armor of God, that you may be able to stand against the wiles of the devil.',
  },
  {
    ref: 'Lamentations 3:22–23',
    theme: 'morning',
    text:
      "It is because of Yahweh's loving kindnesses that we are not consumed, because his mercies don't fail. They are new every morning. Great is your faithfulness.",
  },
  {
    ref: '2 Timothy 4:7',
    theme: 'the race',
    text: 'I have fought the good fight. I have finished the course. I have kept the faith.',
  },
  {
    ref: 'Isaiah 41:10',
    theme: 'courage',
    text:
      "Don't be afraid, for I am with you. Don't be dismayed, for I am your God. I will strengthen you. Yes, I will help you. Yes, I will uphold you with the right hand of my righteousness.",
  },
  {
    ref: '1 Corinthians 15:58',
    theme: 'work',
    text:
      "Be steadfast, immovable, always abounding in the Lord's work, because you know that your labor is not in vain in the Lord.",
  },
  {
    ref: 'Proverbs 21:5',
    theme: 'work',
    text:
      'The plans of the diligent surely lead to profit; and everyone who is hasty surely rushes to poverty.',
  },
  {
    ref: 'Matthew 11:28–30',
    theme: 'rest',
    text:
      'Come to me, all you who labor and are heavily burdened, and I will give you rest. Take my yoke upon you and learn from me, for I am gentle and humble in heart; and you will find rest for your souls.',
  },
]

// Stable for the whole day: the same verse from wake to sleep, rotating by date.
export function verseForDay(d = new Date()) {
  return VERSES[dayOfYear(d) % VERSES.length]
}
