import { PrismaClient } from "../src/generated/prisma/client"

/**
 * Katrina Story Seed Script 
 * 
 * Run with: npx tsx prisma/seed-katrina-story.ts
 */

type Choice = {
  id: string
  text: string
  leads_to: string
  effects?: { money?: number; health?: number; time?: number }
}

type Passage = {
  title: string
  text: string[]
  emotion?: string
  intensity?: number
  image?: string
  audio?: string
  media?: {
    background?: { path: string }
    soundEffect?: { path: string }
  }
  choices?: Choice[]
  next?: string
}

type StoryData = {
  slug: string
  title: string
  summary: string
  avatar: {
    name: string
    age: number
    background: string
    appearance: Record<string, any>
    initialResources: {
      money: number
      time: number
      health: number
    }
    socialContext: {
      socioeconomicStatus: string
      location: string
      familyStructure: string
      educationLevel: string
      employmentStatus: string
      healthConditions: string[]
      socialIssues: {
        id: string
        type: string
        severity: string
        description: string
        impacts: string[]
      }[]
    }
    isPlayable: boolean
  }
  passages: Record<string, Passage>
}

// Default image for passages without specific backgrounds
const DEFAULT_IMAGE = "/scenes/neutral-image.png"

const STORY_DATA: StoryData = {
  slug: "katrina-guardian-week",
  title: "Days Without Mom",
  summary:
    "Spend some weeks in the life of Katrina Mahinay, a seventeen-year-old Filipino American trying to keep her younger siblings safe and her family together after her parents are wrongly deported.",
  avatar: {
    name: "Katrina Mahinay",
    age: 17,
    background:
      "Katrina is a seventeen-year-old high school student in the United States. After her parents were wrongly deported to the Philippines and their accounts frozen, she became the primary caregiver for her younger siblings while trying to balance school, work, and the immigration system.",
    appearance: {
      skinTone: "medium",
      hairColor: "dark brown",
      hairStyle: "simple ponytail",
      clothing: "hoodie over school shirt",
      accessories: ["backpack"],
      image: "/scenes/katrina-profile.png",
    },
    initialResources: {
      money: 120,
      time: 100,
      health: 70,
    },
    socialContext: {
      socioeconomicStatus: "working class",
      location: "Small apartment in a US city",
      familyStructure: "Oldest sibling caring for two younger siblings while parents are abroad",
      educationLevel: "High school student",
      employmentStatus: "Part time bakery worker",
      healthConditions: [],
      socialIssues: [
        {
          id: "family-separation",
          type: "immigration",
          severity: "high",
          description:
            "Parents were wrongly deported despite legal status, leaving US-born children behind with limited support.",
          impacts: ["emotional", "financial", "time", "stability"],
        },
        {
          id: "economic-precarity",
          type: "poverty",
          severity: "high",
          description:
            "Single income from a part-time teen job and frozen parental accounts create constant financial pressure.",
          impacts: ["money", "stress", "education"],
        },
      ],
    },
    isPlayable: true,
  },
  passages: {
    // Act One: Before Dawn
    
    start: {
      title: "Before Sunrise",
      text: [
        "I wake up before my alarm again. My body just does this now. Mornings are the only time the apartment is quiet enough for me to actually think.",
        "Ali is still curled at the end of my bed with her stuffed dolphin, and Miko is on the couch in the living room. He says he likes it there, but I know he is listening for anything that might go wrong. Lately, I have been trying to get them both to sleep in their actual beds, even if it is just for a few hours.",
        "I guess it is my way of holding on to something normal. Something Mom used to do too. Before she was taken away.",
      ],
      emotion: "anxiety",
      intensity: 0.6,
      image: "/scenes/bedroom-predawn.png",
      next: "morning-weight",
    },

    "morning-weight": {
      title: "The Weight of Morning",
      text: [
        "I just lie there for a minute and look at them. I keep telling myself I can hold everything together for one more day.",
        "The ceiling has a water stain in the corner that looks bigger than it did last week. I add it to the list of things I cannot fix right now. The list keeps getting longer.",
        "Ali shifts in her sleep, pulling the dolphin closer. Mom bought that for her third birthday. I wonder if she even remembers.",
      ],
      emotion: "melancholy",
      intensity: 0.5,
      image: "/scenes/bedroom-predawn.png",
      choices: [
        {
          id: "wake-gently",
          text: "Wake them gently and start the morning slowly",
          leads_to: "waking-siblings",
          effects: { health: 2 },
        },
        {
          id: "let-sleep",
          text: "Let them sleep a little longer and get up alone",
          leads_to: "alone-in-kitchen",
          effects: { health: 3 },
        },
        {
          id: "go-mail-first",
          text: "Get up quietly and check the mail pile",
          leads_to: "check-mail",
        },
      ],
    },

    "waking-siblings": {
      title: "Gentle Morning",
      text: [
        "I brush Ali's hair from her face and whisper that it is time to wake up. She blinks at me with those big brown eyes that look so much like Mom's. It hurts a little every time.",
        "\"Is it a school day?\" she asks, still half asleep.",
        "\"Yeah, baby. School day.\"",
        "She nods and reaches for her dolphin. She is okay for now. One down.",
      ],
      emotion: "tenderness",
      intensity: 0.4,
      image: "/scenes/bedroom-predawn.png",
      next: "waking-miko",
    },

    "waking-miko": {
      title: "Big Brother Awake",
      text: [
        "Miko is already sitting up when I walk into the living room. He does not sleep as deeply as he used to. None of us do.",
        "\"I heard you,\" he says. Not complaining, just letting me know.",
        "\"Breakfast soon,\" I tell him. He nods and starts folding the blanket he uses on the couch. He is so careful with it, like it actually matters. Maybe it does.",
        "The apartment feels a little less empty when they are both awake. But the mail pile on the counter is still there, and I know I cannot avoid it forever.",
      ],
      emotion: "neutral",
      intensity: 0.4,
      image: "/scenes/kitchen-neutral.png",
      next: "check-mail",
    },

    "alone-in-kitchen": {
      title: "Alone Before Dawn",
      text: [
        "The kitchen is cold and quiet. I can hear the refrigerator humming and cars passing outside. I have gotten used to these sounds.",
        "I start the coffee maker even though we are running low. Mom always said coffee was a necessity, not a luxury. I am starting to get what she meant.",
        "The mail pile is still sitting on the counter where I left it yesterday. And the day before that. I have been avoiding it.",
        "Maybe today I will actually go through it.",
      ],
      emotion: "anxiety",
      intensity: 0.5,
      image: "/scenes/kitchen-neutral.png",
      next: "check-mail",
    },

    "check-mail": {
      title: "The Letter",
      text: [
        "The mail pile looks harmless until I start going through it. Bills. Notices. A flyer from the elementary school.",
        "Then I see the white envelope with the blue seal. Government. My hands go cold before I even open it.",
        "The letter says there will be a home assessment for our family. There is a date. A time. Some stranger is going to come here and decide if I am enough to keep my siblings. And honestly, I am barely holding it together as it is.",
      ],
      emotion: "fear",
      intensity: 0.8,
      image: "/scenes/kitchen-letter.png",
      next: "letter-reaction",
    },

    "letter-reaction": {
      title: "The Weight of Paper",
      text: [
        "I read the letter three times. Each time it feels worse.",
        "Home assessment. That means someone coming here. Looking at our apartment. Looking at me. Deciding if a seventeen year old can really take care of two kids.",
        "I fold the paper and shove it in a drawer. I feel like I cannot breathe. I want to throw it away and pretend I never saw it, but I know that will not help.",
        "The kids cannot see me like this. I have to figure out what to tell them.",
      ],
      emotion: "fear",
      intensity: 0.8,
      image: "/scenes/kitchen-letter.png",
      choices: [
        {
          id: "hide-letter",
          text: "Hide the letter and pretend the day is normal",
          leads_to: "hiding-fear",
          effects: { health: -3 },
        },
        {
          id: "tell-miko",
          text: "Tell Miko about the letter before Ali wakes up",
          leads_to: "tell-miko",
          effects: { health: -2 },
        },
        {
          id: "tell-both",
          text: "Wake both kids and tell them together",
          leads_to: "tell-both-kids",
          effects: { health: -4 },
        },
      ],
    },

    "hiding-fear": {
      title: "A Mask for Morning",
      text: [
        "I close the drawer and lean against the counter. My hands are shaking so I press them flat against the surface until they stop.",
        "I can freak out later. Right now, I have to be the person they think I am. The one who has everything figured out.",
        "I splash water on my face and try to look normal. It does not really work, but it will have to do.",
        "By the time I hear Ali's feet coming down the hallway, I have almost convinced myself that today is just another day.",
      ],
      emotion: "anxiety",
      intensity: 0.6,
      image: "/scenes/kitchen-neutral.png",
      next: "breakfast-math",
    },

    "flashback-frozen-account": {
      title: "Frozen Accounts",
      text: [
        "The memory hits me before I can stop it. Three months ago, I was standing at a payment counter with the electric bill, reading off Dad's checking account number like I had seen him do a hundred times.",
        "Mom had already called and told me exactly what to say and how to handle everything. I just had to make the payment like normal.",
        "But the woman's face changed when she typed in the numbers. First confused, then sorry, then something that looked a lot like pity.",
      ],
      emotion: "sadness",
      intensity: 0.7,
      image: "/scenes/flashback-declined.png",
      next: "flashback-phone-call",
    },

    "flashback-phone-call": {
      title: "The Call Home",
      text: [
        "She told me the account was flagged. Some kind of federal investigation. I do not remember hanging up. I just remember calling Mom overseas and hearing her voice break.",
        "\"Anak, you have to be strong,\" she said. That means child in Tagalog. She only uses it when things are really bad.",
        "That was the night I realized this was not going to be over anytime soon.",
        "I shake my head to clear the memory. Thinking about the past is not going to help right now.",
      ],
      emotion: "sadness",
      intensity: 0.7,
      image: "/scenes/flashback-declined.png",
      next: "breakfast-math",
    },

    "tell-miko": {
      title: "Telling Miko",
      text: [
        "I find Miko in the living room, already awake and folding his blanket. I hand him the letter without saying anything. Sometimes paper is easier than words.",
        "I see a tear roll down his face as he reads it, but he wipes it away fast. \"It will be okay,\" he says quietly. He never says much at first.",
        "When he looks up at me, his eyes seem older than they should be. He used to say he wanted to grow up fast like his big sister. I do not think he says that anymore.",
      ],
      emotion: "fear",
      intensity: 0.7,
      image: "/scenes/kitchen-neutral.png",
      next: "miko-question",
    },

    "miko-question": {
      title: "The Question",
      text: [
        "He asks if someone is going to take them away.",
        "The question hits me hard. I want to say no, absolutely not, never. But I have learned that promises I cannot keep are worse than saying nothing.",
        "The truth is that I do not know how much control I actually have. The system does not care how much I love them. It only cares about paperwork and assessments and checking boxes.",
        "I have to give him some kind of answer.",
      ],
      emotion: "fear",
      intensity: 0.8,
      image: "/scenes/kitchen-neutral.png",
      choices: [
        {
          id: "reassure-miko",
          text: "Tell him you have a plan, even if you do not",
          leads_to: "reassuring-miko",
          effects: { health: -2 },
        },
        {
          id: "admit-fear",
          text: "Admit you are scared but trying your best",
          leads_to: "honest-with-miko",
          effects: { health: -3 },
        },
      ],
    },

    "reassuring-miko": {
      title: "A Brave Face",
      text: [
        "\"I have a plan,\" I tell him. The lie tastes bad but I do not know what else to say. \"We just need to make sure the apartment is clean and everyone is doing their homework. That is all.\"",
        "Miko nods slowly. I can tell he does not totally believe me, but he wants to. That is enough for now.",
        "\"Can I help?\" he asks.",
        "\"Yeah,\" I say, and my voice almost cracks. \"Yeah, you can help.\"",
        "We stand there for a second, two kids pretending everything is fine. Then I hear Ali calling from the bedroom, and the morning starts whether we are ready or not.",
      ],
      emotion: "anxiety",
      intensity: 0.6,
      image: "/scenes/kitchen-neutral.png",
      next: "flashback-frozen-account",
    },

    "honest-with-miko": {
      title: "The Truth Between Us",
      text: [
        "\"I am scared too,\" I admit. Saying it out loud makes it feel more real.",
        "Miko looks at me for a long moment. Then he reaches out and takes my hand. He has not done that since he was little.",
        "\"We can be scared together,\" he says. \"That is what Ate means, right? Big sister who is always there?\"",
        "I have to look away so he does not see my eyes getting wet. When did he get like this? When did any of us have to grow up this fast?",
        "Ali's voice comes from the bedroom, asking about breakfast. The moment ends, but something between Miko and me feels different now.",
      ],
      emotion: "tenderness",
      intensity: 0.7,
      image: "/scenes/kitchen-neutral.png",
      next: "flashback-frozen-account",
    },

    "tell-both-kids": {
      title: "Telling Both",
      text: [
        "I wake them both and sit them at the table with the letter between us. The words on the page are simple, but how do you explain this to little kids?",
        "Miko goes quiet, which makes me nervous. Ali grabs my sleeve and asks what it means and if we did something wrong. I tell them nothing is their fault and that people just want to check that we are okay.",
        "I am trying to sound calm. I do not think it is working. Ali is only six years old, and Miko is ten. They should not have to deal with this.",
      ],
      emotion: "sadness",
      intensity: 0.8,
      image: "/scenes/family-table-talk.png",
      next: "after-telling-both",
    },

    "after-telling-both": {
      title: "After the Words",
      text: [
        "Ali is crying softly now, and I pull her into my lap even though she is getting too big for it. Miko sits very still, his jaw tight like he is holding something back.",
        "\"When is Mama coming home?\" Ali asks between sniffles.",
        "It is the question I hate the most. The answer is I do not know, and I do not know feels like failing every time I say it.",
        "\"Soon,\" I tell her. Another lie that sounds like hope. \"She is working on it. Dad too.\"",
        "We sit there until Ali's crying turns to hiccups, and then I know we have to keep moving. The day is not going to wait for us.",
      ],
      emotion: "sadness",
      intensity: 0.8,
      image: "/scenes/family-table-talk.png",
      choices: [
        {
          id: "soft-truth",
          text: "Explain gently without telling them everything",
          leads_to: "breakfast-math",
          effects: { health: -2 },
        },
        {
          id: "full-truth",
          text: "Tell them more than they probably need to hear",
          leads_to: "too-much-truth",
          effects: { health: -5 },
        },
      ],
    },

    "too-much-truth": {
      title: "Too Much",
      text: [
        "I tell them about the frozen accounts. About the lawyer fees. About how the immigration system made a mistake but mistakes take forever to fix.",
        "Ali does not understand most of it, but she understands that things are bad. Miko understands too much. I can see his face closing off, like he is building walls inside himself.",
        "Maybe I should not have said so much. But I am so tired of carrying everything by myself.",
        "The silence after I finish is the loudest thing in the apartment. Then Ali asks if we can still have breakfast, and I almost laugh because she is right. Life keeps going even when you want it to stop.",
      ],
      emotion: "sadness",
      intensity: 0.9,
      image: "/scenes/family-table-talk.png",
      next: "breakfast-math",
    },

    // Act Two: Impossible Math 

    "breakfast-math": {
      title: "Breakfast Math",
      text: [
        "By the time the kids are at the table, I have already counted what we have left. Three eggs, some rice, and a piece of fruit that has seen better days.",
        "Ali asks if we are okay today. She asks that every morning now. I tell her yes because what else am I supposed to say?",
        "Miko watches me count the eggs like he is doing the same math in his head. It actually makes me laugh a little. Even at ten, he is already trying to budget like he is the man of the house.",
      ],
      emotion: "anxiety",
      intensity: 0.5,
      image: "/scenes/breakfast-counting.png",
      next: "breakfast-decision",
    },

    "breakfast-decision": {
      title: "Dividing What's Left",
      text: [
        "The eggs stare back at me from the carton. Three eggs, three people. Simple math. Except nothing is simple anymore.",
        "If I eat, that is food they could have had. If I do not eat, I will be dizzy at work again like last Tuesday when I almost dropped a whole tray of stuff.",
        "Mom used to make breakfast look easy. Rice, eggs, maybe some spam if we were lucky. The smell of garlic rice in the morning was like the smell of home.",
        "Now home smells like instant noodles and stress.",
      ],
      emotion: "anxiety",
      intensity: 0.5,
      image: "/scenes/breakfast-counting.png",
      choices: [
        {
          id: "cook-all",
          text: "Cook everything and let everyone eat together",
          leads_to: "eating-together",
          effects: { money: -3, health: 8 },
        },
        {
          id: "skip-own-meal",
          text: "Serve the kids and pretend you are not hungry",
          leads_to: "skipping-breakfast",
          effects: { health: -7 },
        },
        {
          id: "save-food",
          text: "Tell them you will eat later and save some food",
          leads_to: "saving-food",
          effects: { health: -2, money: 1 },
        },
      ],
    },

    "eating-together": {
      title: "A Real Breakfast",
      text: [
        "I cook all three eggs and divide them evenly. The rice stretches further than I expected, and I cut the fruit into careful pieces so everyone gets some.",
        "For a few minutes, we are just a family having breakfast. Ali talks about a girl in her class who has a pet hamster. Miko asks if we can watch a movie this weekend.",
        "I say yes to everything because right now, sitting here with them, I can almost pretend things are normal.",
        "The food is gone fast, but feeling full, both my stomach and something else, stays a little longer.",
      ],
      emotion: "tenderness",
      intensity: 0.5,
      image: "/scenes/breakfast-counting.png",
      next: "phone-messages",
    },

    "skipping-breakfast": {
      title: "Not Hungry",
      text: [
        "\"I already ate,\" I lie, putting extra rice on their plates. \"I had some toast earlier.\"",
        "Ali does not question it. Miko looks at me with those knowing eyes but does not say anything. He is learning when to push and when to let things go.",
        "My stomach growls as I watch them eat, but I turn on the faucet to cover the sound. I can grab something at the bakery later. Maybe.",
        "When they are done, their plates are clean and their faces look less worried. That has to be worth more than breakfast.",
      ],
      emotion: "anxiety",
      intensity: 0.5,
      image: "/scenes/breakfast-counting.png",
      next: "phone-messages",
    },

    "saving-food": {
      title: "Later",
      text: [
        "\"Save me some,\" I tell them, wrapping an egg in plastic wrap. \"I need to get ready first.\"",
        "It is not exactly a lie. I do need to get ready. And I might eat later. Or I might give it to whoever seems hungriest by dinner.",
        "The kids eat while I move around the kitchen, wiping counters that are already clean, checking my phone, trying to look busy instead of worried.",
        "When breakfast is done, I put the saved egg in the fridge where it waits like a small backup plan.",
      ],
      emotion: "neutral",
      intensity: 0.4,
      image: "/scenes/breakfast-counting.png",
      next: "phone-messages",
    },

    "phone-messages": {
      title: "The Impossible Choice",
      text: [
        "While the kids finish eating, my phone buzzes twice.",
        "The first message is from school: \"Katrina, this is your third absence this week. Please contact the attendance office.\"",
        "The second is from my boss Carlos at the bakery: \"Hey can you come in early today? Double shift available if you want it.\"",
        "I stare at the screen and feel both worlds pulling at me at the same time.",
      ],
      emotion: "anxiety",
      intensity: 0.7,
      media: {
        background: { path: "/scenes/kitchen-neutral.png" },
        soundEffect: { path: "/audio/sfx-phone-buzz.mp3" },
      },
      next: "reading-messages",
    },

    "reading-messages": {
      title: "Two Worlds",
      text: [
        "School wants me there. Work wants me there. The kids need me here. The lawyer needs money that only comes from work. My grades need attention that only comes from school.",
        "I think about the home assessment. Would it look better if I was in school like a normal teenager? Or would it look better if I was working, proving I can support the family?",
        "There is no right answer. There never is anymore.",
        "I open both messages and try to decide.",
      ],
      emotion: "anxiety",
      intensity: 0.7,
      image: "/scenes/kitchen-neutral.png",
      next: "school-or-work",
    },

    "school-or-work": {
      title: "School or Work",
      text: [
        "I stare at the screen and feel like the walls are closing in. Being a student, an employee, and the only adult in the apartment do not fit into the same twenty four hours no matter how many times I try to make it work.",
        "Whatever I pick, something else is going to slip. It always does.",
      ],
      emotion: "anxiety",
      intensity: 0.7,
      image: "/scenes/kitchen-neutral.png",
      next: "choice-school-or-work",
    },

    "choice-school-or-work": {
      title: "The Decision",
      text: [
        "I have to pick. There is no way to do both. If I go to school, I can try to keep up with my grades and maybe get some help from the counselor. But the extra shift money would really help.",
        "If I go to work, I can make sure we have money for rent and food, but I will fall even further behind in my classes.",
        "And honestly I am just so tired. I keep thinking about Mom and Dad and when they will be back and I can just worry about normal stuff again, like what movie to watch.",
      ],
      emotion: "anxiety",
      intensity: 0.7,
      image: "/scenes/kitchen-neutral.png",
      choices: [
        {
          id: "choose-school",
          text: "Go to school and try to protect your grades",
          leads_to: "preparing-for-school",
          effects: { health: -2, time: -10 },
        },
        {
          id: "choose-work",
          text: "Go to work and make sure you keep your job",
          leads_to: "preparing-for-work",
          effects: { money: 45, health: -3, time: -8 },
        },
        {
          id: "juggle-both",
          text: "Try to juggle both and rush all day",
          leads_to: "impossible-day",
          effects: { money: 20, health: -8, time: -15 },
        },
        {
          id: "stay-home",
          text: "Keep the kids home and try to catch up on life",
          leads_to: "staying-home",
          effects: { health: -1, time: -5 },
        },
      ],
    },

    // Act Three: Branching Paths

    // Path A: School Route
    "preparing-for-school": {
      title: "Choosing School",
      text: [
        "I text Carlos back: \"Sorry, can not do the extra shift today. Maybe tomorrow?\" My thumb hovers over send for too long before I finally press it.",
        "The money would have helped. A lot. But the school already sent a warning, and if my grades drop too far, it could mess up everything. College. The assessment. My future.",
        "I help the kids get their backpacks ready and try not to think about the shift I just gave up.",
        "\"Are you coming to school too?\" Ali asks hopefully. She likes it when we walk the same direction, even though our schools are different.",
      ],
      emotion: "anxiety",
      intensity: 0.5,
      image: "/scenes/kitchen-neutral.png",
      next: "walking-to-school",
    },

    "walking-to-school": {
      title: "The Walk",
      text: [
        "The morning is gray and cool. Ali holds my hand on one side and Miko walks a little ahead, trying to look independent.",
        "We pass the convenience store where Mom used to buy us snacks after school. We pass the bus stop where Dad waited for the 7:15 every morning. Everything reminds me of how things used to be.",
        "I drop the kids at their school first. Ali hugs me tight. Miko waves from the door.",
        "Then I am alone, walking toward my own school, hoping I made the right choice.",
      ],
      emotion: "melancholy",
      intensity: 0.5,
      image: "/scenes/school-pickup.png",
      next: "school-corridor",
    },

    "school-corridor": {
      title: "The School Corridor",
      text: [
        "The school hallway smells like pencil shavings and whatever they are making in the cafeteria. People look at me as I walk past, like they are trying to remember when I was last here.",
        "A teacher stops me and says I have missed too many days and that I need to meet with the counselor. He asks if everything is okay at home.",
        "I know he is trying to help, but honestly it just makes everything worse. Like I have failed again.",
      ],
      emotion: "anxiety",
      intensity: 0.6,
      image: "/scenes/school-corridor.png",
      next: "teacher-concern",
    },

    "teacher-concern": {
      title: "Mr. Patterson's Concern",
      text: [
        "Mr. Patterson is my history teacher. He has kind eyes and a mustache that makes him look like someone's grandpa. Before everything happened, I was his best student.",
        "\"Katrina,\" he says gently, \"I have noticed you have been struggling. Your last essay was... well, it was not your usual work.\"",
        "I want to tell him that my usual work came from a girl who slept eight hours and had parents who made dinner. That girl feels really far away now.",
        "\"I have been dealing with some family stuff,\" I say instead. Understatement of the century.",
      ],
      emotion: "anxiety",
      intensity: 0.6,
      image: "/scenes/school-corridor.png",
      choices: [
        {
          id: "promise-fix",
          text: "Promise you will catch up and keep walking",
          leads_to: "false-promise",
          effects: { health: -2 },
        },
        {
          id: "soft-truth-teacher",
          text: "Tell him a little bit about what is happening",
          leads_to: "partial-truth-teacher",
          effects: { health: -2 },
        },
        {
          id: "avoid-meeting",
          text: "Nod and slip away before the counselor sees you",
          leads_to: "escaping-school",
          effects: { time: -5 },
        },
      ],
    },

    "false-promise": {
      title: "I'll Do Better",
      text: [
        "\"I will do better,\" I tell him. The words come out automatically. I have said them so many times they do not even mean anything anymore.",
        "Mr. Patterson nods, but I can tell he does not fully believe me. Why would he? I do not fully believe me either.",
        "\"The counselor's office is open if you need it,\" he says. \"Ms. Rodriguez is very understanding.\"",
        "I thank him and keep walking, adding \"meet with counselor\" to the list of things I probably will not have time to do.",
      ],
      emotion: "anxiety",
      intensity: 0.5,
      image: "/scenes/school-corridor.png",
      next: "teacher-meeting",
    },

    "partial-truth-teacher": {
      title: "A Partial Truth",
      text: [
        "\"My parents are... away,\" I say carefully. \"I have been taking care of my younger brother and sister. It has been hard to balance everything.\"",
        "Mr. Patterson's face changes. I can see the moment he realizes this is bigger than a late assignment.",
        "\"Katrina, that is a lot for anyone to handle. Does the school know about your situation?\"",
        "I shake my head. The school knows I have been absent. They do not know why. I have been afraid that telling them would somehow make things worse.",
        "\"You should talk to Ms. Rodriguez,\" he says. \"There are resources. Programs for students in situations like yours.\"",
      ],
      emotion: "anxiety",
      intensity: 0.6,
      image: "/scenes/school-corridor.png",
      next: "teacher-meeting",
    },

    "escaping-school": {
      title: "Slipping Away",
      text: [
        "I nod at Mr. Patterson and mumble something about needing to get to class. Before he can say anything else, I am walking fast down the hallway.",
        "I pass the counselor's office. The door is open and I can see Ms. Rodriguez at her desk. She looks up as I pass, and I pretend not to notice.",
        "Maybe I should have stopped. Maybe there is help behind that door. But right now, I can not handle one more person asking me if I am okay when the answer is so obviously no.",
        "I will go to work instead. At least there I know what is expected of me.",
      ],
      emotion: "anxiety",
      intensity: 0.6,
      image: "/scenes/school-corridor.png",
      next: "bakery-shift",
    },

    "teacher-meeting": {
      title: "The Counselor's Office",
      text: [
        "The counselor's office is small and full of posters about resilience and planning for the future. She asks me how I am doing, and I have to decide how much to tell her.",
        "I sit there looking at the list she made of every missed assignment and every skipped class and every morning I chose work over school. She tells me they are worried about me. She says there are resources.",
        "I am not sure how much she actually knows about my life, but I keep most of it to myself.",
      ],
      emotion: "neutral",
      intensity: 0.5,
      image: "/scenes/empty-classroom.png",
      next: "counselor-options",
    },

    "counselor-options": {
      title: "Ms. Rodriguez's Offer",
      text: [
        "Ms. Rodriguez slides a folder across her desk. \"Extensions,\" she says. \"For all your classes. I already talked to your teachers.\"",
        "I stare at the folder like it might be a trap. \"What is the catch?\"",
        "\"No catch. But I would like you to check in with me once a week. Just to talk. You do not have to tell me everything, Katrina. But you do not have to carry everything alone either.\"",
        "Her words hit something in my chest. I think about the letter in the drawer. The home assessment. All the stuff I have been carrying by myself.",
      ],
      emotion: "hope",
      intensity: 0.5,
      image: "/scenes/empty-classroom.png",
      choices: [
        {
          id: "ask-help",
          text: "Ask for extensions and whatever help they can give",
          leads_to: "accepting-help",
          effects: { time: 5, health: 5 },
        },
        {
          id: "downplay",
          text: "Downplay everything and say you will be fine",
          leads_to: "refusing-help",
          effects: { health: -3 },
        },
        {
          id: "leave-early",
          text: "Cut the meeting short and rush to your next thing",
          leads_to: "rushing-out",
          effects: { health: -2, time: -3 },
        },
      ],
    },

    "accepting-help": {
      title: "Yes",
      text: [
        "\"Okay,\" I say. The word feels weird. I am not used to saying yes to help. \"Okay, I will take the extensions. And I will come back next week.\"",
        "Ms. Rodriguez smiles. It is not pity, I realize. It is something else. Relief, maybe. Like she was hoping I would say yes.",
        "\"Good. And Katrina? Whatever is going on at home, you are doing better than you think. The fact that you are still showing up at all says something.\"",
        "I take the folder and leave her office feeling a little bit lighter. It is not much. But it is something.",
      ],
      emotion: "hope",
      intensity: 0.5,
      image: "/scenes/empty-classroom.png",
      next: "friends-texts",
    },

    "refusing-help": {
      title: "I'm Fine",
      text: [
        "\"I am fine,\" I say. \"Really. I just need to catch up. I do not need special treatment.\"",
        "Ms. Rodriguez looks at me for a long moment. I can tell she does not believe me, but she does not push.",
        "\"The offer stands,\" she says quietly. \"Whenever you are ready.\"",
        "I leave her office fast, before she can see how close I am to losing it. Accepting help means admitting I need it. And admitting I need it means admitting things are as bad as they actually are.",
        "I am not ready for that. Not yet.",
      ],
      emotion: "anxiety",
      intensity: 0.6,
      image: "/scenes/empty-classroom.png",
      next: "friends-texts",
    },

    "rushing-out": {
      title: "No Time",
      text: [
        "I check my phone and stand up. \"I am sorry, I have to go. I have work. Another thing I have to do.\"",
        "Ms. Rodriguez looks disappointed but nods. \"The folder will be here when you are ready.\"",
        "I am already out the door, already thinking about how fast I can get to the bakery if I skip lunch, already switching from student mode to worker mode.",
        "The hallway blurs past me. Somewhere behind me, there is help waiting. Somewhere ahead of me, there is a paycheck I need.",
        "I choose the paycheck. I always choose the paycheck.",
      ],
      emotion: "anxiety",
      intensity: 0.6,
      image: "/scenes/school-corridor.png",
      next: "bakery-shift",
    },

    // Path B: Work Route
    "preparing-for-work": {
      title: "Choosing Work",
      text: [
        "I text Carlos back: \"I will be there in 30.\" Then I send a quick message to the school attendance office with an excuse about a family appointment.",
        "Another absence. Another lie. Another day of falling behind.",
        "But the extra shift means extra money, and extra money means maybe the lawyer can file the next set of forms, and maybe that can help bring my parents back faster.",
        "Maybe.",
      ],
      emotion: "anxiety",
      intensity: 0.5,
      image: "/scenes/kitchen-neutral.png",
      next: "getting-kids-ready",
    },

    "getting-kids-ready": {
      title: "Before I Go",
      text: [
        "\"I have to go to work,\" I tell the kids. \"Mrs. Chen next door will check on you after school, okay?\"",
        "Ali's face falls. \"I thought you were coming to school today.\"",
        "\"Tomorrow,\" I say, knowing I am probably lying. \"I promise we will walk together tomorrow.\"",
        "Miko just nods. He has stopped expecting me to be there. I do not know if that is better or worse than Ali's disappointment.",
        "I hug them both tighter than usual and head for the door.",
      ],
      emotion: "sadness",
      intensity: 0.5,
      image: "/scenes/kitchen-neutral.png",
      next: "walk-to-bakery",
    },

    "walk-to-bakery": {
      title: "The Walk to Work",
      text: [
        "The bakery is twelve blocks from our apartment. I have walked this route so many times I could do it with my eyes closed.",
        "Past the laundromat where we used to do our clothes before the machines broke. Past the check cashing place that charges too much but never asks questions. Past the church where Mom used to light candles every Sunday.",
        "I have not been to church since she left. God and I are not really talking right now.",
        "The bakery sign comes into view, and I put on my customer service face. Time to be someone else for a while.",
      ],
      emotion: "neutral",
      intensity: 0.4,
      image: "/scenes/bakery-office.png",
      next: "bakery-shift",
    },

    "bakery-shift": {
      title: "The Bakery Shift",
      text: [
        "The bakery smells like sugar and warm bread. For a second I almost remember what it feels like to just be a teenager with a part time job and nothing else going wrong.",
        "My boss Carlos watches me when I walk in. He asks if I am okay and if I can really stay the whole shift. I tell him yes because I need the paycheck to keep the lights on and to pay the immigration lawyer.",
        "As I work through the morning, my body goes on autopilot while my brain runs through lists of bills, appointments, and messages I have not answered.",
      ],
      emotion: "neutral",
      intensity: 0.4,
      image: "/scenes/bakery-office.png",
      next: "bakery-rhythm",
    },

    "bakery-rhythm": {
      title: "The Rhythm of Work",
      text: [
        "There is something almost peaceful about the repetition. Take the order. Ring it up. Smile. \"Have a nice day.\" Next customer.",
        "Mrs. Okonkwo comes in for her usual, a cheese danish and black coffee. She always asks about school, and I always say it is going well.",
        "Today she looks at me a little longer. \"You look tired, sweetheart. You taking care of yourself?\"",
        "\"Always,\" I say, and she shakes her head like she does not believe me but is too nice to argue.",
        "The morning drags. My feet hurt. My head hurts more. But the register shows the hours adding up, and that is all that matters.",
      ],
      emotion: "neutral",
      intensity: 0.4,
      image: "/scenes/bakery-office.png",
      choices: [
        {
          id: "work-quietly",
          text: "Keep your head down and finish the shift",
          leads_to: "finishing-shift",
          effects: { money: 45, health: -3, time: -8 },
        },
        {
          id: "ask-more-hours",
          text: "Ask for more hours to cover the new costs",
          leads_to: "asking-more",
          effects: { money: 65, health: -6, time: -12 },
        },
        {
          id: "ask-fewer-hours",
          text: "Ask for fewer hours so you can attend school",
          leads_to: "asking-less",
          effects: { money: 20, health: -1, time: -4 },
        },
      ],
    },

    "finishing-shift": {
      title: "Clocking Out",
      text: [
        "The shift ends and I count my hours in my head before Carlos even prints the timesheet. Every hour is a number. Every number is survival.",
        "\"Good work today,\" Carlos says as I hang up my apron. \"You are reliable, Katrina. I appreciate that.\"",
        "Reliable. Such a small word for such a heavy thing. I am reliable because I do not have a choice. Because if I am not, everything falls apart.",
        "I thank him and head for the door, already thinking about picking up the kids, checking their homework, figuring out dinner with whatever we have left.",
      ],
      emotion: "neutral",
      intensity: 0.4,
      image: "/scenes/bakery-office.png",
      next: "friends-texts",
    },

    "asking-more": {
      title: "More Hours",
      text: [
        "During my break, I find Carlos in the back office. \"Hey, is there any chance I could pick up more shifts? Maybe some weekends?\"",
        "He looks at me over his glasses. \"You are already working close to the maximum for your age. I can not legally give you much more.\"",
        "\"I know, but...\"",
        "\"Katrina.\" His voice is not mean. \"I like you. You are a good worker. But I am not going to be responsible for burning you out before you turn eighteen.\"",
        "I want to tell him I am already burned out. That I have been burning since this started and there is no end in sight.",
      ],
      emotion: "anxiety",
      intensity: 0.6,
      image: "/scenes/bakery-office.png",
      next: "boss-warning",
    },

    "asking-less": {
      title: "Fewer Hours",
      text: [
        "The words feel dangerous, but I say them anyway. \"Carlos, I might need to cut back on some shifts. Just for a little while. School stuff is piling up.\"",
        "His face does not really change, but I can see him thinking. Staff schedules. Customer rushes. The reliability he just praised me for.",
        "\"I can work with you on that,\" he says finally. \"But I need to know ahead of time. I can not have you calling out last minute.\"",
        "\"I will not,\" I promise. Another promise to add to the pile. I hope I can keep this one.",
      ],
      emotion: "anxiety",
      intensity: 0.5,
      image: "/scenes/bakery-office.png",
      next: "boss-warning",
    },

    "boss-warning": {
      title: "The Boss's Warning",
      text: [
        "Before I leave, Carlos pulls me aside again. He says he likes me and that I work hard, but he also says he needs someone he can count on. Someone who shows up on time and stays for full shifts without always changing things.",
        "He tells me he will try to work with me, but there is only so much he can do. I nod and say I understand, even though part of me wants to ask what happens when I can not bend any further.",
      ],
      emotion: "anxiety",
      intensity: 0.6,
      image: "/scenes/bakery-office.png",
      next: "boss-warning-response",
    },

    "boss-warning-response": {
      title: "What to Say",
      text: [
        "Carlos waits for my response. Behind him, I can see the schedule on the wall with my name on it for shifts I am not sure I can keep.",
        "I think about the home assessment. About how it would look if I lost this job. About how we would survive without this paycheck.",
        "The truth is something I can not really afford right now.",
      ],
      emotion: "anxiety",
      intensity: 0.6,
      image: "/scenes/bakery-office.png",
      choices: [
        {
          id: "promise-better",
          text: "Promise you will make it work somehow",
          leads_to: "promising-carlos",
          effects: { health: -2 },
        },
        {
          id: "be-honest-boss",
          text: "Tell him things are falling apart at home",
          leads_to: "honest-with-carlos",
          effects: { health: -2 },
        },
      ],
    },

    "promising-carlos": {
      title: "I'll Make It Work",
      text: [
        "\"I will make it work,\" I say. \"I promise. You can count on me.\"",
        "Carlos nods slowly. \"I believe you, kid. I just want to make sure you are not running yourself into the ground.\"",
        "\"I am fine,\" I say. The lie is so familiar now it barely registers.",
        "He lets me go, and I walk out into the afternoon sun, already running the numbers in my head. Hours, dollars, bills, deadlines. The math never stops.",
      ],
      emotion: "anxiety",
      intensity: 0.5,
      image: "/scenes/bakery-office.png",
      next: "friends-texts",
    },

    "honest-with-carlos": {
      title: "The Truth at Work",
      text: [
        "Something in me just breaks, and the words come out before I can stop them.",
        "\"My parents got deported. I am taking care of my brother and sister by myself. I am trying to keep us all together but some days I do not know if I can.\"",
        "Carlos is quiet for a while. Then he reaches into his pocket and pulls out a business card.",
        "\"My cousin went through something similar,\" he says. \"This is a community organization that helped her family. They might be able to help yours.\"",
        "I take the card with shaky hands. I did not expect that. I do not know what to do with kindness like this.",
      ],
      emotion: "tenderness",
      intensity: 0.6,
      image: "/scenes/bakery-office.png",
      next: "friends-texts",
    },

    // Path C: Juggle Route
    "impossible-day": {
      title: "Trying to Do It All",
      text: [
        "I text everyone: Carlos gets \"running late but I will be there\", the school gets \"will arrive by 3rd period\", and Mrs. Chen gets \"can you watch the kids this morning?\"",
        "My phone buzzes with responses I do not have time to read. I am already moving, already calculating bus schedules and walking distances and the minimum time I need to be in each place.",
        "Mom used to say not to be greedy. Do not try to take more than you can hold.",
        "I never understood that until right now, with everything slipping through my fingers.",
      ],
      emotion: "anxiety",
      intensity: 0.8,
      image: "/scenes/kitchen-neutral.png",
      next: "rushing-morning",
    },

    "rushing-morning": {
      title: "The Rush",
      text: [
        "I get the kids to school in record time. Ali's hair is not properly brushed. Miko forgot his lunch, and I have to run back to grab it.",
        "Then I am on a bus to the high school, standing because all the seats are taken, watching the minutes go by on my phone.",
        "I get to school for third period. My history teacher gives me a look but does not say anything. I take notes I will not remember and watch the clock.",
        "The second the bell rings, I am out the door.",
      ],
      emotion: "anxiety",
      intensity: 0.8,
      image: "/scenes/school-corridor.png",
      next: "rushing-afternoon",
    },

    "rushing-afternoon": {
      title: "The Afternoon",
      text: [
        "I make it to the bakery thirty minutes late. Carlos is not happy, but he puts me to work anyway.",
        "The afternoon is a blur of customers and coffee and trying not to think about the homework I am not doing.",
        "My phone buzzes. The school. Miko's school. A number I do not recognize. I ignore them all because I am working and I can not work and worry at the same time.",
        "By the time my shift ends, the sun is setting and I have missed twelve calls.",
      ],
      emotion: "anxiety",
      intensity: 0.9,
      image: "/scenes/bakery-office.png",
      next: "after-school-dropoff",
    },

    "after-school-dropoff": {
      title: "After the Drop Off",
      text: [
        "The morning air is cool when I walk the kids to school, but my thoughts are loud and crowded. I hug Ali for too long at the gate. Miko tells me he will walk her in and that they will be fine.",
        "When I turn away from the school, it feels like the whole day is crushing me. Work, classes, bills, the letter in the drawer, the kids' faces still in my head.",
        "I try to take a deep breath and it feels like the air got thicker somehow.",
      ],
      emotion: "sadness",
      intensity: 0.6,
      image: "/scenes/school-pickup.png",
      next: "after-dropoff-choice",
    },

    "after-dropoff-choice": {
      title: "What Now",
      text: [
        "The school doors close behind Ali and Miko, and I stand on the sidewalk trying to remember what I am supposed to do next.",
        "Everything feels urgent. Everything feels impossible. My body just wants to sit down on this curb and not move for a really long time.",
        "But sitting is not an option. Moving is the only option. The only question is which direction.",
      ],
      emotion: "anxiety",
      intensity: 0.6,
      image: "/scenes/school-pickup.png",
      choices: [
        {
          id: "go-work-after-drop",
          text: "Head straight to work from the school",
          leads_to: "bakery-shift",
          effects: { money: 45, health: -3, time: -5 },
        },
        {
          id: "go-school-after-drop",
          text: "Go to your own school and hope work understands",
          leads_to: "school-corridor",
          effects: { health: -2, time: -5 },
        },
        {
          id: "go-grocery",
          text: "Stop at the store to get cheap groceries",
          leads_to: "grocery-aisle",
          effects: { money: -15, time: -3 },
        },
      ],
    },

    "grocery-aisle": {
      title: "The Grocery Aisle",
      text: [
        "The store is bright and cold and full of choices that do not feel like choices. I look at prices and try to stretch the numbers in my head.",
        "I pick up instant noodles and the cheapest rice and stare at a small bag of apples that I know the kids will finish in two days. It is hard to decide what to put back when everything already feels like the bare minimum.",
      ],
      emotion: "anxiety",
      intensity: 0.5,
      image: "/scenes/flashback-declined.png",
      next: "grocery-calculating",
    },

    "grocery-calculating": {
      title: "The Math of Survival",
      text: [
        "I stand in the aisle with my phone calculator open, adding up prices, subtracting what I have, trying to make the numbers work.",
        "A woman pushes her cart past me, full of stuff I have not bought in months. Fresh meat. Name brand cereal. A birthday cake.",
        "I look away and focus on my basket. Needs versus wants. Survival versus comfort. The math is always the same.",
        "Ali asked for strawberries last week. Miko wanted the cereal from the commercial. I said maybe next time, and they did not argue because they have learned not to.",
      ],
      emotion: "sadness",
      intensity: 0.6,
      image: "/scenes/flashback-declined.png",
      choices: [
        {
          id: "buy-all",
          text: "Buy everything and hope nothing unexpected happens",
          leads_to: "buying-everything",
          effects: { money: -25, health: 5, time: -2 },
        },
        {
          id: "put-something-back",
          text: "Put something back and save a little money",
          leads_to: "putting-back",
          effects: { money: -12, health: 1, time: -2 },
        },
        {
          id: "leave-empty",
          text: "Leave with nothing and tell yourself you can manage",
          leads_to: "leaving-empty",
          effects: { health: -7 },
        },
      ],
    },

    "buying-everything": {
      title: "Taking the Risk",
      text: [
        "I put everything in my basket and walk to the register before I can change my mind. The total makes me wince, but I hand over the cash anyway.",
        "Maybe nothing will go wrong this week. Maybe the electricity bill will be lower than expected. Maybe I will pick up an extra shift.",
        "Maybe is a dangerous word, but it is all I have right now.",
        "I carry the bags home and feel, just for a second, like I actually did something.",
      ],
      emotion: "hope",
      intensity: 0.4,
      image: "/scenes/flashback-declined.png",
      next: "home-cleaning",
    },

    "putting-back": {
      title: "Hard Choices",
      text: [
        "I put the apples back. Then one of the cans of soup. Then I stand there staring at what is left, trying to convince myself it is enough.",
        "The cashier does not look at me when she rings me up. I am grateful for that. I do not want anyone to see the choices I am making.",
        "Outside, the bags feel lighter than they should. But my wallet is not as empty as it could be, and that has to count for something.",
      ],
      emotion: "sadness",
      intensity: 0.5,
      image: "/scenes/flashback-declined.png",
      next: "home-cleaning",
    },

    "leaving-empty": {
      title: "Walking Away",
      text: [
        "I put the basket down and walk out of the store with nothing. My hands are shaking, but I tell myself it is just the cold.",
        "We still have rice at home. We still have noodles. We can make it another day or two before I have to figure this out.",
        "The walk home feels longer without bags to carry. Every step reminds me of what I could not afford, what I could not get for them.",
        "When did grocery shopping become this hard?",
      ],
      emotion: "sadness",
      intensity: 0.7,
      image: "/scenes/flashback-declined.png",
      next: "home-cleaning",
    },

    // Path D: Stay Home Route
    "staying-home": {
      title: "A Day Inside",
      text: [
        "\"We are staying home today,\" I tell the kids. \"All of us.\"",
        "Ali looks worried. \"Are we sick?\"",
        "\"No, baby. We just need a day to catch up on stuff. A rest day.\"",
        "Miko does not ask questions. He just turns on the TV and settles into the couch like he was hoping for this.",
        "I text the school with another excuse. I text Carlos with an apology. Then I put the phone down and try to breathe.",
      ],
      emotion: "relief",
      intensity: 0.4,
      image: "/scenes/kitchen-neutral.png",
      next: "home-cleaning",
    },

    "home-cleaning": {
      title: "The Apartment in Daylight",
      text: [
        "Being home in the middle of the day makes the apartment feel different. Every small mess looks bigger. Every empty space is more obvious.",
        "I start picking things up and wiping counters and trying to imagine what a stranger will think when they walk in and decide if this is a safe place for kids.",
        "The more I clean, the more I notice everything I can not fix with a sponge and a trash bag.",
      ],
      emotion: "anxiety",
      intensity: 0.7,
      image: "/scenes/kitchen-neutral.png",
      next: "cleaning-thoughts",
    },

    "cleaning-thoughts": {
      title: "Scrubbing Away Fear",
      text: [
        "I find myself scrubbing the same spot on the counter over and over. Not because it is dirty, but because my hands need something to do.",
        "The home assessment is in two weeks. Two weeks to make this apartment look like a home and not just a place where three kids are barely making it.",
        "I think about what they will ask. What they will look for. Whether they will see how hard I am trying or just see the gaps.",
        "My head starts to hurt and my legs feel heavy, but stopping feels dangerous. If I stop, I will have to actually feel how scared I am.",
      ],
      emotion: "anxiety",
      intensity: 0.7,
      image: "/scenes/kitchen-neutral.png",
      choices: [
        {
          id: "keep-cleaning",
          text: "Keep cleaning even though you are exhausted",
          leads_to: "exhausted-cleaning",
          effects: { health: -10, time: -5 },
        },
        {
          id: "rest-a-minute",
          text: "Sit down for a moment and let yourself breathe",
          leads_to: "moment-of-rest",
          effects: { health: 6, time: -2 },
        },
        {
          id: "check-bank",
          text: "Check your bank account before doing anything else",
          leads_to: "checking-bank",
          effects: { health: -3, time: -2 },
        },
      ],
    },

    "exhausted-cleaning": {
      title: "Running on Empty",
      text: [
        "I clean until my arms ache and my vision gets blurry. The apartment looks better. Or maybe I am just too tired to see what is wrong anymore.",
        "When I finally stop, I am sitting on the kitchen floor with the mop still in my hand, staring at the ceiling.",
        "Miko finds me like that. He does not say anything, just sits down next to me and leans his head against my shoulder.",
        "We stay there for a while. Two kids who forgot how to be kids.",
      ],
      emotion: "sadness",
      intensity: 0.7,
      image: "/scenes/kitchen-neutral.png",
      next: "evening-lawyer-call",
    },

    "moment-of-rest": {
      title: "Breathing",
      text: [
        "I sit down on the couch and close my eyes. Just for a minute. The apartment is quiet. The kids are watching something on the tablet, the volume low.",
        "I breathe. In and out. In and out. Like Mom taught me when I was little and scared of thunderstorms.",
        "\"You can not control the storm,\" she used to say. \"But you can control your breath. And that is enough.\"",
        "It does not fix anything. But when I open my eyes, the world feels a little less heavy.",
      ],
      emotion: "relief",
      intensity: 0.5,
      image: "/scenes/home-evening.png",
      next: "evening-lawyer-call",
    },

    "checking-bank": {
      title: "The Numbers",
      text: [
        "I open the banking app on my phone and watch the numbers load. Part of me hopes the balance will somehow be different than I expect.",
        "It is not. It is exactly what I calculated. Just enough for this week, maybe next week if we are really careful.",
        "The lawyer needs payment by the end of the month. The electricity bill is due in ten days. The rent is always there.",
        "I close the app and put the phone face down on the table. Some numbers are better not to look at too often.",
      ],
      emotion: "anxiety",
      intensity: 0.7,
      image: "/scenes/home-evening.png",
      next: "evening-lawyer-call",
    },

    // Act Four: Connections

    "friends-texts": {
      title: "Messages Waiting",
      text: [
        "When I finally check my phone, the group chat is full of messages. People asking if I am okay. Jokes I was not there for. A picture of the lunch table with an empty seat where I used to sit.",
        "One message asks if I am mad at them. Another asks if I am still coming to study group.",
        "I stare at the screen and feel this weird mix of missing them and feeling like my life is too different from theirs now to explain.",
      ],
      emotion: "sadness",
      intensity: 0.5,
      image: "/scenes/home-evening.png",
      next: "friends-distance",
    },

    "friends-distance": {
      title: "The Distance",
      text: [
        "Maya sent three separate messages. \"Kat where are you\" and \"we miss you\" and \"seriously are you ok???\"",
        "Maya has been my best friend since middle school. She knows something is wrong. She just does not know what.",
        "Part of me wants to tell her everything. To have someone besides Miko who knows what I am dealing with.",
        "But another part is scared. Scared she will not get it. Scared she will look at me differently. Scared that my problems will feel too real if I say them out loud to someone who is not stuck in this apartment with me.",
      ],
      emotion: "sadness",
      intensity: 0.5,
      image: "/scenes/home-evening.png",
      choices: [
        {
          id: "vague-reply",
          text: "Send a vague message saying you have been busy",
          leads_to: "vague-response",
          effects: { time: -2 },
        },
        {
          id: "tell-truth-friends",
          text: "Tell them what is actually happening",
          leads_to: "truth-to-friends",
          effects: { time: -5, health: -2 },
        },
        {
          id: "ignore-friends",
          text: "Ignore the messages and put the phone away",
          leads_to: "ignoring-friends",
          effects: { health: -4 },
        },
      ],
    },

    "vague-response": {
      title: "Just Busy",
      text: [
        "\"Hey sorry been super busy. family stuff. will catch up soon\" with a heart emoji.",
        "I hit send and immediately feel guilty. It is not a lie, exactly. But it is not the truth either.",
        "Maya responds with a heart. The others react with sad faces. They accept my non answer because that is what friends do.",
        "I tell myself I will explain eventually. When things are better. When I have something to say besides \"everything is falling apart.\"",
      ],
      emotion: "sadness",
      intensity: 0.4,
      image: "/scenes/home-evening.png",
      next: "evening-lawyer-call",
    },

    "truth-to-friends": {
      title: "The Truth",
      text: [
        "I start typing. And once I start, I can not stop.",
        "\"My parents got deported. It was a mistake but it takes forever to fix. I am taking care of my brother and sister alone. Our accounts got frozen. I am working as much as I can but it is not enough. There is going to be a home assessment and I am scared they will take the kids away.\"",
        "I stare at the message for a long time before I send it. Then I watch the typing bubbles appear and disappear as my friends figure out what to say.",
        "Maya's response comes first: \"I am coming over. Do not argue with me.\"",
      ],
      emotion: "relief",
      intensity: 0.6,
      image: "/scenes/home-evening.png",
      next: "friends-support",
    },

    "friends-support": {
      title: "Not Alone",
      text: [
        "Maya shows up an hour later with a bag of groceries and that look in her eyes I know from years of friendship.",
        "\"You should have told me,\" she says, but she is not mad. She is already putting out containers of food her mom made.",
        "\"I did not know how.\"",
        "\"You just did.\" She pulls me into a hug. \"We are going to figure this out. You are not doing this by yourself anymore.\"",
        "For the first time in weeks, I let myself actually cry. And when I am done, the weight has not gone away, but it feels just a little bit lighter.",
      ],
      emotion: "hope",
      intensity: 0.7,
      image: "/scenes/home-evening.png",
      next: "evening-lawyer-call",
    },

    "ignoring-friends": {
      title: "Silent",
      text: [
        "I put the phone face down without responding. The messages will still be there tomorrow. My friends will still be worried. But I do not have the energy to pretend I am okay right now.",
        "The apartment is quiet except for Ali humming in the other room. Miko is doing homework at the kitchen table, his pencil scratching against paper.",
        "I sit in the silence and feel the gap between my life and everyone else's getting bigger.",
        "Maybe tomorrow I will have the words. Maybe tomorrow I will feel less alone. But tonight, I just survive.",
      ],
      emotion: "sadness",
      intensity: 0.6,
      image: "/scenes/home-evening.png",
      next: "evening-lawyer-call",
    },

    // Act Five: The Reckoning

    "evening-lawyer-call": {
      title: "Evening Call",
      text: [
        "That night, after the kids have finished their homework and the apartment is as quiet as it gets, my phone rings. It is the lawyer.",
        "He tells me about new forms, new deadlines, and a fee that is bigger than what I made this week. He says my parents are doing everything they can from where they are. He says it might take time, but progress is possible.",
      ],
      emotion: "anxiety",
      intensity: 0.8,
      image: "/scenes/home-evening.png",
      next: "lawyer-question",
    },

    "lawyer-question": {
      title: "The Impossible Question",
      text: [
        "I ask the question that has been stuck in my head for months: why can we not just go be with Mom and Dad while this is happening?",
        "He pauses before saying it is complicated. Something about different citizenships and legal stuff. Words I have heard before but still do not totally understand.",
        "The kids were born here. They are American. But our parents were not, and that difference has become a wall I can not climb over.",
        "When the call ends, I sit on the edge of my bed in the dark and feel the weight of everything I did this week pressing down on me.",
      ],
      emotion: "sadness",
      intensity: 0.8,
      image: "/scenes/home-evening.png",
      next: "evening-reflection",
    },

    "evening-reflection": {
      title: "In the Dark",
      text: [
        "The apartment is dark except for the streetlamp outside. I can hear Ali breathing from the bedroom, slow and steady. Miko moved on the couch an hour ago but has been still since.",
        "I think about Mom. About how she used to sit at this same table paying bills, her forehead all scrunched up. About how Dad would come home tired from work but still help Miko with his math.",
        "I am trying to be both of them. I am failing at both.",
        "The night stretches out ahead of me, full of questions I can not answer and stuff I can not name.",
      ],
      emotion: "melancholy",
      intensity: 0.7,
      image: "/scenes/home-evening.png",
      choices: [
        {
          id: "plan-next-week",
          text: "Make a rough plan for next week and keep going",
          leads_to: "making-a-plan",
          effects: { health: 2, time: -3 },
        },
        {
          id: "call-mom",
          text: "Call your mom and tell her everything",
          leads_to: "calling-mom",
          effects: { time: -5, health: 4 },
        },
        {
          id: "sit-in-silence",
          text: "Sit in silence and let yourself feel everything",
          leads_to: "feeling-everything",
          effects: { health: -3, time: -2 },
        },
      ],
    },

    "making-a-plan": {
      title: "Tomorrow",
      text: [
        "I pull out a piece of paper and start writing. Monday: school in the morning, work in the afternoon. Tuesday: call about the electricity bill. Wednesday: check in with the counselor like I said I would.",
        "The list gets longer. Each thing is a small battle. Together they feel like a war I am not sure I can win.",
        "But I fold the paper and put it in my pocket anyway. Because having a plan, even a bad one, is better than nothing.",
        "I check on the kids one more time before I try to sleep. Ali is holding her dolphin. Miko is curled up facing the door, still watching out for us.",
        "We will try again tomorrow. That is all I can promise.",
      ],
      emotion: "hope",
      intensity: 0.5,
      image: "/scenes/kids-sleeping.png",
      next: "ending-quiet-hope",
    },

    "calling-mom": {
      title: "Mama",
      text: [
        "The phone rings three times before she answers. I know it is the middle of the night there, but she always picks up.",
        "\"Anak,\" she says. Her voice is sleepy but alert. \"What is wrong?\"",
        "\"Everything,\" I say, and then I am crying, telling her about the assessment letter and the bills and how tired I am. How scared I am.",
        "She does not interrupt. She just listens, thousands of miles away, making soft sounds that I remember from every time I was sick or scared as a kid.",
      ],
      emotion: "sadness",
      intensity: 0.8,
      image: "/scenes/home-evening.png",
      next: "mom-words",
    },

    "mom-words": {
      title: "What Mom Says",
      text: [
        "\"You are doing so well,\" Mom says when I finally run out of words. \"I know it does not feel like it. But you are.\"",
        "\"I do not feel like I am doing well. I feel like I am drowning.\"",
        "\"Sometimes surviving is the same as doing well. Sometimes getting through the day is enough.\"",
        "She tells me she loves me. She tells me she is proud of me. She tells me this will not last forever, even though we both know neither of us can promise that.",
        "When I hang up, I am still scared. But I also remember I am not doing this completely alone. Even with an ocean between us, I have her voice, telling me to keep going.",
      ],
      emotion: "tenderness",
      intensity: 0.7,
      image: "/scenes/home-evening.png",
      next: "ending-mixed",
    },

    "feeling-everything": {
      title: "The Weight",
      text: [
        "I do not make a plan. I do not call anyone. I just sit in the dark and let everything hit me.",
        "The fear. The exhaustion. The anger I have been pushing down for months. The grief for a life that got taken from us without warning.",
        "I let myself think the thoughts I have been avoiding. What if we can not fix this? What if they take the kids? What if I have already failed?",
        "The thoughts are terrifying. But sitting with them, letting them exist without fighting, feels like something important. Like finally admitting a wound is there instead of pretending it is not.",
      ],
      emotion: "sadness",
      intensity: 0.9,
      image: "/scenes/home-evening.png",
      next: "after-feeling",
    },

    "after-feeling": {
      title: "Still Here",
      text: [
        "I do not know how long I sit there. Long enough for the streetlamp outside to flicker and come back on. Long enough for my legs to fall asleep.",
        "When I finally stand up, nothing has changed. The bills are still there. The assessment is still coming. My parents are still gone.",
        "But I feel different. Emptied out, maybe. Or just... honest with myself for the first time in a while.",
        "I check on the kids. I drink a glass of water. I go to bed without setting an alarm, trusting my body to wake me when it needs to.",
        "Tomorrow will come whether I am ready or not. I will meet it the best I can.",
      ],
      emotion: "melancholy",
      intensity: 0.6,
      image: "/scenes/kids-sleeping.png",
      next: "ending-mixed",
    },

    // Endings

    "ending-quiet-hope": {
      title: "Quiet Hope",
      text: [
        "The week does not end with a miracle. There are still bills to pay and meetings to go to and forms to sign. My parents are still far away. The system is still slow.",
        "But the lights stay on. The kids are still here. The school is worried but listening. My boss has not given up on me yet.",
      ],
      emotion: "hope",
      intensity: 0.6,
      image: "/scenes/ending-hope.png",
      next: "ending-quiet-hope-2",
    },

    "ending-quiet-hope-2": {
      title: "Something Small",
      text: [
        "I sit on the floor with Ali leaning against my shoulder and Miko stretched out beside us. We are watching something on the tablet, something silly that makes Ali laugh.",
        "For the first time in a while, I feel something that is not just fear. It is small and kind of fragile, but it is there.",
        "Hope. Quiet and stubborn.",
        "We are still here. We are still together. And tomorrow, we will try again.",
      ],
      emotion: "hope",
      intensity: 0.7,
      image: "/scenes/ending-hope.png",
      next: "story-end",
    },

    "ending-mixed": {
      title: "Still Standing",
      text: [
        "Nothing is fixed. The lawyer still needs money. The school still wants proof that I can keep up. Work is still somewhere between understanding and frustrated.",
        "But I am still here. The kids are still here. Every day I make choices that do not feel like enough, and somehow we wake up and try again the next morning.",
      ],
      emotion: "neutral",
      intensity: 0.5,
      image: "/scenes/home-evening.png",
      next: "ending-mixed-2",
    },

    "ending-mixed-2": {
      title: "In Between",
      text: [
        "It is not the ending I would pick if I could write our lives differently.",
        "But it is also not an ending where everything gets taken away. It is something in between. A messy middle where just surviving is an act of bravery.",
        "Mom calls in the morning. Dad sends a message full of heart emojis that makes Ali giggle. We are apart but not broken.",
        "The story is not over. We are still writing it, one impossible day at a time.",
      ],
      emotion: "hope",
      intensity: 0.5,
      image: "/scenes/home-evening.png",
      next: "story-end",
    },

    "ending-crisis": {
      title: "Breaking Point",
      text: [
        "The call from the school comes first. Then the one from work. Then the letter reminder about the home assessment.",
        "I sit in the dark apartment after the kids have gone to sleep and feel everything I have been holding together start to slip.",
        "The math does not work anymore. The hours do not stretch far enough. The money is not enough. I am not enough.",
      ],
      emotion: "sadness",
      intensity: 0.9,
      image: "/scenes/kids-sleeping.png",
      next: "ending-crisis-2",
    },

    "ending-crisis-2": {
      title: "The Question",
      text: [
        "For the first time, I let myself think the thing I have been running from: What happens if I can not do this?",
        "I do not have an answer. The dark does not give me one either.",
        "But somewhere in the quiet, I hear Ali breathing from the other room, and Miko shifting on the couch.",
        "They are still here. They need me. And that has to be enough to get through tonight.",
      ],
      emotion: "sadness",
      intensity: 0.9,
      image: "/scenes/kids-sleeping.png",
      next: "ending-crisis-3",
    },

    "ending-crisis-3": {
      title: "Tomorrow",
      text: [
        "I know that tomorrow I will get up and try again. Not because I know how to fix this. Not because I have a plan. But because they are still here, and so am I.",
        "Sometimes that is all you have. Sometimes that is enough.",
        "The night is long, but eventually, the sun will come up. And we will face whatever comes next.",
        "Together.",
      ],
      emotion: "melancholy",
      intensity: 0.7,
      image: "/scenes/kids-sleeping.png",
      next: "story-end",
    },

    // Final passage
    "story-end": {
      title: "The End",
      text: [
        "This was just one week in Katrina's life. The challenges she faces, balancing school, work, and caring for her siblings while dealing with an immigration system that separated her family, continue every day for thousands of young people across the country.",
        "The choices you made shaped her path, but the bigger problems she faces are still there. Thank you for walking in her shoes, even if just for a little while.",
      ],
      emotion: "neutral",
      intensity: 0.5,
      image: "/scenes/home-evening.png",
    },
  },
}

// Build Functions

function buildNodesPathsTransitions(storyId: string, passages: Record<string, Passage>) {
  const nodes: {
    key: string
    title: string
    type: "NARRATIVE" | "DECISION" | "RESOLUTION"
    content: { 
      text: string[]
      choices: Choice[] | null
      next?: string
      emotion?: string
      intensity?: number
    }
    media: { visual: string | null; audio: string | null }
  }[] = []

  const paths: { key: string; label: string }[] = []
  const transitions: { fromKey: string; toKey: string | null; pathKey: string; ordering: number }[] = []
  const pathSet = new Set<string>()

  for (const [key, passage] of Object.entries(passages)) {
    let type: "NARRATIVE" | "DECISION" | "RESOLUTION" = "NARRATIVE"
    if ((!passage.choices || passage.choices.length === 0) && !passage.next) {
      type = "RESOLUTION"
    } else if (passage.choices && passage.choices.length > 1) {
      type = "DECISION"
    }

    const mediaVisual =
      passage.media?.background?.path ??
      passage.image ??
      DEFAULT_IMAGE
    const mediaAudio =
      passage.media?.soundEffect?.path ??
      passage.audio ??
      null

    nodes.push({
      key,
      title: passage.title,
      type,
      content: { 
        text: passage.text, 
        choices: passage.choices ?? null,
        next: passage.next,
        emotion: passage.emotion,
        intensity: passage.intensity,
      },
      media: { visual: mediaVisual, audio: mediaAudio },
    })

    if (passage.choices) {
      passage.choices.forEach((choice, index) => {
        if (!pathSet.has(choice.id)) {
          paths.push({ key: choice.id, label: choice.text })
          pathSet.add(choice.id)
        }
        transitions.push({ fromKey: key, toKey: choice.leads_to, pathKey: choice.id, ordering: index })
      })
    }

    // Handle passages with just 'next' (Continue button)
    if (passage.next && (!passage.choices || passage.choices.length === 0)) {
      const pathKey = `${key}-continue`
      if (!pathSet.has(pathKey)) {
        paths.push({ key: pathKey, label: "Continue" })
        pathSet.add(pathKey)
      }
      transitions.push({ fromKey: key, toKey: passage.next, pathKey, ordering: 0 })
    }
  }

  return { nodes, paths, transitions }
}

// Main Seed Function

async function main() {
  const prisma = new PrismaClient()
  
  try {
    console.log(`Starting seed: ${STORY_DATA.title}`)
    
    // Clean up existing data
    console.log("Cleaning up existing data...")
    await prisma.storyTransition.deleteMany({ where: { story: { slug: STORY_DATA.slug } } })
    await prisma.storyPath.deleteMany({ where: { story: { slug: STORY_DATA.slug } } })
    await prisma.storyNode.deleteMany({ where: { story: { slug: STORY_DATA.slug } } })
    await prisma.avatarProfile.deleteMany({ where: { story: { slug: STORY_DATA.slug } } })
    await prisma.twineStory.deleteMany({ where: { slug: STORY_DATA.slug } })
    await prisma.scenario.deleteMany({ where: { id: STORY_DATA.slug } })

    // Create story
    console.log("Creating story...")
    const story = await prisma.twineStory.create({
      data: {
        slug: STORY_DATA.slug,
        title: STORY_DATA.title,
        summary: STORY_DATA.summary,
        tags: ["immigration", "family", "poverty", "caregiving"],
        visibility: "PUBLIC",
        ownershipStatus: "PLATFORM_OWNED",
      },
    })
    console.log(`   Story created: ${story.title} (${story.id})`)

    // Build and create nodes
    const { nodes, paths, transitions } = buildNodesPathsTransitions(story.id, STORY_DATA.passages)

    console.log("Creating story nodes...")
    const nodeIdMap = new Map<string, string>()
    for (const node of nodes) {
      const created = await prisma.storyNode.create({
        data: {
          storyId: story.id,
          key: node.key,
          title: node.title,
          synopsis: node.title,
          type: node.type,
          content: node.content as any,
          media: node.media as any,
        },
      })
      nodeIdMap.set(node.key, created.id)
      console.log(`   Node: ${node.key} (${node.type})`)
    }

    // Create paths
    console.log("Creating story paths...")
    const pathIdMap = new Map<string, string>()
    for (const path of paths) {
      const created = await prisma.storyPath.create({
        data: { storyId: story.id, key: path.key, label: path.label },
      })
      pathIdMap.set(path.key, created.id)
    }
    console.log(`   Created ${paths.length} paths`)

    // Create transitions
    console.log("Creating transitions...")
    let transitionCount = 0
    for (const t of transitions) {
      const fromNodeId = nodeIdMap.get(t.fromKey)
      const toNodeId = t.toKey ? nodeIdMap.get(t.toKey) : null
      const pathId = pathIdMap.get(t.pathKey)

      if (fromNodeId && pathId) {
        await prisma.storyTransition.create({
          data: {
            storyId: story.id,
            fromNodeId,
            toNodeId: toNodeId ?? null,
            pathId,
            ordering: t.ordering,
          },
        })
        transitionCount++
      }
    }
    console.log(`   Created ${transitionCount} transitions`)

    // Create avatar
    console.log("Creating avatar...")
    const avatar = await prisma.avatarProfile.create({
      data: {
        id: STORY_DATA.slug,
        name: STORY_DATA.avatar.name,
        age: STORY_DATA.avatar.age,
        background: STORY_DATA.avatar.background,
        appearance: STORY_DATA.avatar.appearance as any,
        initialResources: STORY_DATA.avatar.initialResources as any,
        socialContext: STORY_DATA.avatar.socialContext as any,
        isPlayable: STORY_DATA.avatar.isPlayable,
        storyId: story.id,
      },
    })
    console.log(`   Avatar created: ${avatar.name}`)

    // Create scenario entry
    console.log("Creating scenario entry...")
    const issue = STORY_DATA.avatar.socialContext.socialIssues[0]
    await prisma.scenario.create({
      data: {
        id: STORY_DATA.slug,
        title: STORY_DATA.title,
        summary: STORY_DATA.summary,
        issueTag: issue?.type ?? "immigration",
        difficulty: issue?.severity ?? "high",
        estimatedMinutes: 45,
        metadata: {
          source: "system",
          storySlug: STORY_DATA.slug,
          storyId: story.id,
          appearance: STORY_DATA.avatar.appearance,
          socialContext: STORY_DATA.avatar.socialContext,
          minimumResources: STORY_DATA.avatar.initialResources,
          issue: issue ?? {
            id: `${STORY_DATA.slug}-issue`,
            type: "immigration",
            severity: "high",
            description: STORY_DATA.summary,
            impacts: ["emotional", "financial", "time"],
          },
        },
      },
    })
    console.log(`   Scenario entry created`)

    // Summary
    console.log("\n" + "=".repeat(60))
    console.log("Story Creation Complete!")
    console.log("=".repeat(60))
    console.log(`   Story: ${story.slug}`)
    console.log(`   Nodes: ${nodes.length}`)
    console.log(`   Paths: ${paths.length}`)
    console.log(`   Transitions: ${transitionCount}`)
    console.log(`   Avatar: ${avatar.name}`)
    console.log(`\nAccess at: /avatar?story=${STORY_DATA.slug}`)
    console.log("=".repeat(60))

  } catch (error) {
    console.error("Story Creation Failed:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})