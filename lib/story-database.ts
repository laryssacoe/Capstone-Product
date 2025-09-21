interface StoryPassage {
  id: string
  duration: string
  visual: string
  audio: string
  text: string[]
  choices?: { id: string; text: string; leads_to: string }[]
  next?: string
}

interface PersonaStory {
  avatarId: string
  title: string
  theme: string
  passages: Record<string, StoryPassage>
}

export const storyDatabase: Record<string, PersonaStory> = {
  "maria-rodriguez": {
    avatarId: "maria-rodriguez",
    title: "Finding Home",
    theme: "Housing discrimination and single motherhood",
    passages: {
      start: {
        id: "start",
        duration: "7s",
        visual: "Apartment building exterior, 'For Rent' sign, Maria with two children",
        audio: "City sounds, children's voices, footsteps on pavement",
        text: [
          "The rent notice came yesterday. Thirty days to find a new place.",
          "I hold my children's hands tighter as we walk past another 'For Rent' sign.",
        ],
        next: "apartment_viewing",
      },
      apartment_viewing: {
        id: "apartment_viewing",
        duration: "10s",
        visual: "Inside cramped apartment, landlord looking skeptical, children waiting",
        audio: "Muffled conversation, creaking floors, distant traffic",
        text: [
          "The landlord's smile fades when he sees us. 'Oh, I thought you were... different.'",
          "He mentions the application fee has suddenly doubled.",
          "My children don't understand why we keep leaving empty apartments.",
        ],
        next: "first_choice",
      },
      first_choice: {
        id: "first_choice",
        duration: "until choice",
        visual: "Maria at kitchen table with bills, phone, and laptop",
        audio: "Quiet evening sounds, children playing in background",
        text: [
          "Another rejection. Another excuse. The pattern is clear.",
          "How do I protect my children from this reality while still finding us a home?",
        ],
        choices: [
          { id: "legal_help", text: "Seek legal assistance for discrimination", leads_to: "legal_path" },
          { id: "compromise", text: "Accept a substandard apartment", leads_to: "compromise_path" },
          { id: "family_help", text: "Ask family for temporary help", leads_to: "family_path" },
        ],
      },
      legal_path: {
        id: "legal_path",
        duration: "12s",
        visual: "Legal aid office, paperwork, Maria speaking with lawyer",
        audio: "Office ambiance, papers shuffling, serious conversation",
        text: [
          "The lawyer explains my rights, but warns the process takes months.",
          "Meanwhile, the eviction notice doesn't wait for justice.",
        ],
        next: "resolution",
      },
      compromise_path: {
        id: "compromise_path",
        duration: "12s",
        visual: "Run-down apartment, Maria unpacking boxes, children looking uncertain",
        audio: "Sirens in distance, thin walls, neighbors arguing",
        text: [
          "The apartment has problems, but it's ours for now.",
          "I tell my children this is temporary, hoping I'm right.",
        ],
        next: "resolution",
      },
      family_path: {
        id: "family_path",
        duration: "12s",
        visual: "Extended family gathering, crowded living room, multiple generations",
        audio: "Family conversations, children playing, cooking sounds",
        text: [
          "My sister opens her door, but I see the strain in her eyes.",
          "Three families in one small space. Love makes it work, barely.",
        ],
        next: "resolution",
      },
      resolution: {
        id: "resolution",
        duration: "8s",
        visual: "Maria with children, looking toward future, sunrise",
        audio: "Hopeful music, children laughing, new day sounds",
        text: [
          "Every door that closes teaches us resilience.",
          "My children will know their worth isn't determined by others' prejudice.",
        ],
      },
    },
  },
  "sam-thompson": {
    avatarId: "sam-thompson",
    title: "Echoes After Midnight",
    theme: "Car accident survivor rebuilding life and identity",
    passages: {
      start: {
        id: "start",
        duration: "7s",
        visual: "Deep black screen, tiny pulsating dot (heartbeat)",
        audio: "Very soft heartbeat, distant drip, faint hum",
        text: [
          "They say time slows down when everything changes.",
          "I had promised Jamie I would go to this one last group hangout before flying to college. Everything feels so surreal, last day without those people, and off to a new life. Night was cold, but I planned to meet Steve half way and walk to the park. Well, I better get going if I want to walk there, I am already late.",
        ],
        next: "crash_scene",
      },
      crash_scene: {
        id: "crash_scene",
        duration: "10s",
        visual: "Rain pelting windshield, dashboard clock 11:57 PM, breath fogs glass",
        audio: "Rain on roof, tires over wet road, low radio static",
        text: [
          "Thirty seconds later, I feel every bone in my body. The pain is beyond anything imaginable and I can't tell where my body ends and the crash begins. I think I imagined this car coming at me in full speed, but I am not sure what happened after, I am still numb from pain.",
        ],
        next: "hospital_wake",
      },
      hospital_wake: {
        id: "hospital_wake",
        duration: "12s",
        visual: "Hospital ceiling blur, tubes, lights stuttering",
        audio: "Distant voices, monitor beeps, regulated breathing",
        text: [
          "Next thing I know, I see those white hospital ceiling blurs, some tubes and lights stuttering bother my eyes.",
          "They tell me I was hit head-on. A drunk driver in the wrong way. I don't remember the moment, but I don't feel pain anymore. Doctors are saying something and my mother comes into the room. I can only hear the word 'paralyzed'. From the neck down, I can't feel anything.",
        ],
        next: "before_after",
      },
      before_after: {
        id: "before_after",
        duration: "until choice",
        visual: "Split montage: sunlit trails, dancing, teaching vs dim room, bed, visitors",
        audio: "Laughter/music fading to hush/echo",
        text: [
          "I can't believe this is happening. I was always the active one, the one who led the hikes, the dances, the games. Now I can't even feel my legs. I don't have time to process before the other shoe drops. Now I have to make a choice? What future will I have?",
          "Either I face a rehab that might kill me, or decide to proceed with other treatements, but there is no guarantee I will ever walk again. I was supposed to go to college tomorrow on a football scholarship! What am I gonna do if I can't walk?",
        ],
        choices: [
          {
            id: "recovery",
            text: "Recovery — 'I will push my body until it remembers how to walk.'",
            leads_to: "recovery_path",
          },
          {
            id: "independence",
            text: "Independence — 'I will focus on controlling what I can, tools, medication, and safer treatments.'",
            leads_to: "independence_path",
          },
          { id: "meaning", text: "Meaning — 'Everything can be done later; I need to understand who I am now.'", leads_to: "meaning_path" },
        ],
      },
      recovery_path: {
        id: "recovery_path",
        duration: "12s",
        visual: "PT room, therapist guides to stand with walker, legs tremble",
        audio: "Strained breaths, floor creak, soft dissonant strings",
        text: [
          "A month has passed since I choose this innovative treatment. Each movement is agony. But when my foot twitches just an inch, I taste hope again.",
          "The problem is, the bills have already arrived for the first month. My insurance has denied the request to fund the treatement. I have no more job or savings and my mom is already drowning in debt.",
        ],
        next: "priorities_choice",
      },
      independence_path: {
        id: "independence_path",
        duration: "12s",
        visual: "Wheelchair fitting, ramp, first roll into fresh air",
        audio: "Wheels on ramp, door creak, distant birds",
        text: [
          "A month has passed since I choose to recover safely. I've gotten accostumed to the wheelchair now. I just can't roll over the threshold otherwise I will fall, I've learned. I can feel pieces of the 'old me' return in small details when I smell the air but it will never be the same.",
          "I feel guilt for living like this, but I also feel angry with the driver that stoled my future. Shouldn't he be the one deadline with the consequences? ",
        ],
        next: "priorities_choice",
      },
      meaning_path: {
        id: "meaning_path",
        duration: "12s",
        visual: "Journaling by lamplight, video call with survivor, blog open",
        audio: "Soft typing, phone ping, room tone",
        text: [
          "Without any treatement, I was able to heal well, but I still can't move anything, I am not yet able to move a wheelchair and more modern inventions cost money we don't have. In the hardships, however, I found myself in words, I share the silence of the accident in a writers group I just joined. They help me focus on the good things, I am still alive and I can eat all the food I want now without worrying about football season.",
          "Yet in that room, I feel the slight whisper of frustration. ",
        ],
        next: "priorities_choice",
      },
      priorities_choice: {
        id: "priorities_choice",
        duration: "until choice",
        visual: "Table of medical bills, letter 'co-pay denied', mirror reflection warps",
        audio: "Paper rustle, clock tick, low piano chord",
        text: [
          "Insurance won't cover the costs of the home modifications and medicine I need. The driver seems to be an asshole and my mom doesn't have the capacity to deal with a lawsuit right now. I know my father is rich now, my mom told me, but I haven't talked to him in years. I don't even know if he would help me.",
          "I don't know what to do. I am sure we will figure out the money part, but how will I deal with problems from now on? I used to see strength in every mirror. Now I see fear, frustration, guilt.",
          "What should I anchor my hope on?",
        ],
        choices: [
          { id: "physical", text: "I will keep pushing physically, focusing on therapy and health and talk to my father, I am a minor, he will have to help", leads_to: "physical_path" },
          { id: "environment", text: "I will try to build the necessary equipment myself. Maybe this way I will be able to get the strength I need.", leads_to: "environment_path" },
          { id: "community", text: "I will find a community, share my story and find a safe place to advocate about my situation.", leads_to: "community_path" },
        ],
      },
      physical_path: {
        id: "physical_path",
        duration: "12s",
        visual: "Standing with walker, falls, rises, tears on cheeks",
        audio: "Strained effort, equipment sounds, determined breathing",
        text: [
          "One step. I fall. One more step. I rise. y body remembers more than I gave it credit for.",
          "I call my father. He agrees to help with the medical bills, no questions asked. I am shocked but grateful. I keep pushing.",
        ],
        next: "resolution",
      },
      environment_path: {
        id: "environment_path",
        duration: "12s",
        visual: "Front-door ramp, automatic opener, adapted bath, sun on floor",
        audio: "Construction sounds, door mechanisms, peaceful home ambiance",
        text: [
          "I am becoming stronger that I would have imagined I could have. With this technique I learned online, I am able to glue every part of the equipments with my mouth.", 
          "Home becomes something I shape, bit by bit."],
        next: "resolution",
      },
      community_path: {
        id: "community_path",
        duration: "12s",
        visual: "Peer group on video, recording a short podcast, comments 'your story matters'",
        audio: "Group conversation, recording equipment, supportive voices",
        text: [
          "My voice finds others who understand the language of survival. In sharing my story, I discover I'm not alone in this new identity.",
          "I am making friends that advocate for me and with me. I feel stronger already.",
        ],
        next: "resolution",
      },
      resolution: {
        id: "resolution",
        duration: "8s",
        visual: "Sunrise through window, person in wheelchair or with mobility aid, looking forward",
        audio: "Hopeful music, morning sounds, new day beginning",
        text: [
          "They say time slows down when everything changes I'm learning that sometimes the slowness is where we find our strength.",
          "This is not the life I planned, but it is the life I'm choosing to live.",
        ],
      },
    },
  },
  "aisha-johnson": {
    avatarId: "aisha-johnson",
    title: "Rising Above",
    theme: "Corporate racism and microaggressions",
    passages: {
      start: {
        id: "start",
        duration: "7s",
        visual: "Corporate boardroom, Aisha presenting, subtle dismissive looks from colleagues",
        audio: "Professional presentation, muted responses, air conditioning hum",
        text: [
          "I present the quarterly results that exceeded all projections.",
          "The room is polite but cold. My ideas need a white colleague to repeat them before they're heard.",
        ],
        next: "promotion_meeting",
      },
      promotion_meeting: {
        id: "promotion_meeting",
        duration: "10s",
        visual: "Manager's office, Aisha sitting across from supervisor, corporate awards on wall",
        audio: "Quiet office conversation, papers shuffling, distant keyboard sounds",
        text: [
          "'You're doing great work, Aisha, but leadership requires a certain... presence.'",
          "The feedback is vague, the criteria shifting like sand beneath my achievements.",
          "I've been 'almost ready' for promotion for three years running.",
        ],
        next: "microaggression_moment",
      },
      microaggression_moment: {
        id: "microaggression_moment",
        duration: "until choice",
        visual: "Office kitchen, colleagues chatting, Aisha entering, conversation stopping",
        audio: "Casual office chatter that suddenly quiets, coffee machine sounds",
        text: [
          "'Oh Aisha, you're so articulate!' The compliment stings with its surprise.",
          "Another colleague touches my hair without asking, commenting on its 'texture.'",
          "These moments accumulate like paper cuts - small but constant.",
        ],
        choices: [
          { id: "confront", text: "Address the microaggressions directly", leads_to: "confrontation_path" },
          { id: "document", text: "Document incidents for HR", leads_to: "documentation_path" },
          { id: "mentor", text: "Seek mentorship and allies", leads_to: "mentorship_path" },
        ],
      },
      confrontation_path: {
        id: "confrontation_path",
        duration: "12s",
        visual: "Aisha speaking calmly but firmly to colleague, others watching uncomfortably",
        audio: "Tense conversation, uncomfortable silence, office background noise",
        text: [
          "'When you touch my hair without permission, it's inappropriate and unprofessional.'",
          "The room grows uncomfortable. I'm labeled 'difficult' for setting boundaries.",
        ],
        next: "resolution",
      },
      documentation_path: {
        id: "documentation_path",
        duration: "12s",
        visual: "Aisha writing detailed notes, HR office, formal meeting",
        audio: "Pen on paper, formal office discussion, filing cabinet sounds",
        text: [
          "I document every incident with dates and witnesses.",
          "HR listens politely but suggests 'cultural sensitivity training' for everyone.",
        ],
        next: "resolution",
      },
      mentorship_path: {
        id: "mentorship_path",
        duration: "12s",
        visual: "Coffee meeting with senior executive, supportive conversation, networking event",
        audio: "Café ambiance, supportive conversation, networking chatter",
        text: [
          "A senior executive becomes my advocate, helping navigate the unwritten rules.",
          "With allies, my voice grows stronger and my path clearer.",
        ],
        next: "resolution",
      },
      resolution: {
        id: "resolution",
        duration: "8s",
        visual: "Aisha in new leadership role, diverse team meeting, confident presentation",
        audio: "Collaborative discussion, confident presentation, positive team energy",
        text: [
          "Change comes slowly, but it comes.",
          "I create the inclusive environment I wished I'd found when I started.",
        ],
      },
    },
  },
}

export function getStoryForAvatar(avatarId: string): PersonaStory | null {
  return storyDatabase[avatarId] || null
}
