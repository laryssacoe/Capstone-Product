/**
 * Creator Dashboard Story Templates
 * 
 * Contains example story structures, avatar templates, and Twine format examples
 * for the creator dashboard.
 */

// Avatar Template
export const avatarTemplate = {
  name: "Character Name",
  age: 25,
  background: "A brief description of who this character is, their situation, and the challenges they face.",
  appearance: {
    skinTone: "medium",
    hairColor: "dark brown",
    hairStyle: "short",
    clothing: "casual",
    accessories: [],
    // Add your character image URL here after uploading to Cloudinary
    // Example: "https://res.cloudinary.com/<cloud>/image/upload/.../my-character.png"
    image: "",
  },
  initialResources: {
    // Note: These are overridden by storyGraph.initialResources in the creator UI.
    money: 100,
    time: 100,
    health: 100,
    socialSupport: 50,
    mentalHealth: 70,
    physicalHealth: 80,
  },
  socialContext: {
    socioeconomicStatus: "working class",
    location: "Urban area",
    familyStructure: "Single adult",
    educationLevel: "High school",
    employmentStatus: "Part-time",
  },
  isPlayable: true,
}

export const avatarTemplateJson = JSON.stringify(avatarTemplate, null, 2)

// Story Graph Template

export const storyGraphTemplate = {
  initialResources: {
    money: 500,
    time: 100,
    health: 100,
  },
  nodes: [
    {
      key: "start",
      title: "Opening Scene",
      type: "NARRATIVE",
      content: {
        text: [
          "Your opening paragraph sets the scene. Describe where the character is, what they're feeling, and what's happening around them.",
          "Use multiple paragraphs to build atmosphere and draw the reader into the character's world.",
          "End with a moment that naturally leads to the first decision.",
        ],
        emotion: "neutral",
        intensity: 0.5,
        choices: [
          {
            id: "choice-a",
            text: "Take the cautious approach",
            leads_to: "path-a",
            effects: { time: -5, health: 2 },
          },
          {
            id: "choice-b",
            text: "Take a risk for potential reward",
            leads_to: "path-b",
            effects: { money: -20, time: -10 },
          },
        ],
      },
      // Add scene images after uploading to Cloudinary
      // media: { image: "https://res.cloudinary.com/<cloud>/image/upload/.../opening-scene.png" },
    },
    {
      key: "path-a",
      title: "The Cautious Path",
      type: "NARRATIVE",
      content: {
        text: [
          "Describe what happens when they choose the cautious option.",
          "Show both positive and negative consequences of playing it safe.",
        ],
        emotion: "relief",
        intensity: 0.4,
        next: "ending",
      },
    },
    {
      key: "path-b",
      title: "Taking the Risk",
      type: "NARRATIVE",
      content: {
        text: [
          "Describe the tension and stakes of taking a risk.",
          "Show what the character gains or loses from this bold choice.",
        ],
        emotion: "anxiety",
        intensity: 0.7,
        next: "ending",
      },
    },
    {
      key: "ending",
      title: "Resolution",
      type: "RESOLUTION",
      content: {
        text: [
          "Describe the outcome of the journey.",
          "Help players reflect on what they experienced.",
        ],
        emotion: "hope",
        intensity: 0.6,
      },
    },
  ],
  paths: [
    { key: "choice-a", label: "Take the cautious approach" },
    { key: "choice-b", label: "Take a risk for potential reward" },
    { key: "continue", label: "Continue" },
  ],
  transitions: [
    { from: "start", to: "path-a", path: "choice-a", ordering: 0 },
    { from: "start", to: "path-b", path: "choice-b", ordering: 1 },
    { from: "path-a", to: "ending", path: "continue", ordering: 0 },
    { from: "path-b", to: "ending", path: "continue", ordering: 0 },
  ],
}

export const storyGraphTemplateJson = JSON.stringify(storyGraphTemplate, null, 2)

// Twine/Twison format example

export const twineJsonExample = `{
  "name": "Coffee Shop Dilemma",
  "ifid": "12F8E3B6-9C4A-4F4C-8A72-VALID12345",
  "startnode": 1,
  "tags": ["training", "ethics"],
  "passages": [
    {
      "pid": 1,
      "name": "Opening Scene",
      "tags": ["intro"],
      "text": "You arrive for your first shift at the community coffee shop. [[Greet the team->Meet The Team]] [[Head straight to the counter->Jump In]]",
      "metadata": {
        "initialResources": {
          "money": 500,
          "time": 100,
          "health": 100
        }
      }
    },
    {
      "pid": 2,
      "name": "Meet The Team",
      "tags": ["decision"],
      "text": "The manager introduces you to Sam, a mentor barista. [[Shadow the mentor->Shadow Mentor]] [[Ask to lead your own order->Jump In]]"
    },
    {
      "pid": 3,
      "name": "Jump In",
      "text": "You step behind the counter and the first rush begins. [[Handle the rush->Handle Rush]]"
    },
    {
      "pid": 4,
      "name": "Shadow Mentor", 
      "text": "You observe Sam guiding customers kindly. [[Handle the rush->Handle Rush]]"
    },
    {
      "pid": 5,
      "name": "Handle Rush",
      "text": "Orders fly in, but you work together and keep the line moving."
    }
  ]
}`

// Twine import checklist for creators

export const twineChecklistSections = [
  {
    title: "Twine Story Structure",
    items: [
      "Start passage is named 'start' or set as the starting passage in Twine",
      "Each passage has a unique name (becomes node.key)",
      "Links use [[Choice Text->target-passage]] or [[target-passage]] syntax",
      "No broken links. Ensure all targets exist as passages",
    ],
  },
  {
    title: "Loop-Specific Tags (Optional)",
    items: [
      "Add [image:/scenes/filename.png] for background images",
      "Add [audio:/audio/filename.mp3] for ambient sound",
      "Add [emotion:anxiety] [intensity:0.7] for mood",
      "Add [effect:money:-50] [effect:time:-10] for choice consequences",
    ],
  },
  {
    title: "Avatar & Resources",
    items: [
      "Prepare avatar JSON with name and background description",
      "Set initial resources: money, time, socialSupport, mentalHealth, physicalHealth",
      "Add appearance.image pointing to /scenes/ directory",
      "Include socialContext for character depth",
    ],
  },
  {
    title: "Before Import",
    items: [
      "Export from Twine as Twison JSON or HTML format",
      "Test all paths in Twine to ensure no dead ends",
      "Prepare media files (images in /scenes/, audio in /audio/)",
      "Have a unique story code (slug) ready",
    ],
  },
] as const

// Example Story (Created on Creator Upgrade)

export const exampleStoryData = {
  slug: "my-first-story",
  title: "My First Story (Example)",
  summary: "A simple example showing how Loop stories work. Edit or delete this anytime!",
  tags: ["example"],
  visibility: "PRIVATE" as const,
}

export const exampleStoryNodes = [
  {
    key: "start",
    title: "The Beginning",
    type: "NARRATIVE" as const,
    content: {
      text: [
        "This is your first passage. It introduces the situation and sets the scene.",
        "Edit this text to tell your own story!",
      ],
      emotion: "neutral",
      intensity: 0.5,
      choices: [
        {
          id: "choice-a",
          text: "Choose Option A",
          leads_to: "option-a-explanation",
          effects: { time: -10 },
        },
        {
          id: "choice-b",
          text: "Choose Option B",
          leads_to: "option-b-explanation",
          effects: { money: -5 },
        },
      ],
    },
  },
  {
    key: "option-a-explanation",
    title: "You Chose Option A",
    type: "NARRATIVE" as const,
    content: {
      text: [
        "This passage explains what happens right after choosing Option A.",
        "Use passages like this to show immediate consequences or reactions.",
      ],
      emotion: "anticipation",
      intensity: 0.5,
      next: "option-a-result",
    },
  },
  {
    key: "option-b-explanation",
    title: "You Chose Option B",
    type: "NARRATIVE" as const,
    content: {
      text: [
        "This passage explains what happens right after choosing Option B.",
        "The Continue button lets readers absorb information at their own pace.",
      ],
      emotion: "anticipation",
      intensity: 0.5,
      next: "option-b-result",
    },
  },
  {
    key: "option-a-result",
    title: "Option A Result",
    type: "NARRATIVE" as const,
    content: {
      text: [
        "Now we see the outcome of Option A.",
        "In a real story, describe the full consequences of this choice.",
      ],
      emotion: "hope",
      intensity: 0.6,
      next: "reflection",
    },
  },
  {
    key: "option-b-result",
    title: "Option B Result",
    type: "NARRATIVE" as const,
    content: {
      text: [
        "Now we see the outcome of Option B.",
        "Each choice can lead to unique consequences and story branches.",
      ],
      emotion: "tension",
      intensity: 0.5,
      next: "reflection",
    },
  },
  {
    key: "reflection",
    title: "A Moment to Reflect",
    type: "RESOLUTION" as const,
    content: {
      text: [
        "This is the final passage where the story concludes.",
        "Use RESOLUTION type passages for endings and reflection moments.",
        "This is the end of the example. Now go create your own story!",
      ],
      emotion: "reflection",
      intensity: 0.4,
    },
  },
]

export const exampleStoryPaths = [
  { key: "choice-a", label: "Choose Option A" },
  { key: "choice-b", label: "Choose Option B" },
  { key: "continue", label: "Continue" },
]

export const exampleStoryTransitions = [
  { from: "start", to: "option-a-explanation", path: "choice-a", ordering: 0 },
  { from: "start", to: "option-b-explanation", path: "choice-b", ordering: 1 },
  { from: "option-a-explanation", to: "option-a-result", path: "continue", ordering: 0 },
  { from: "option-b-explanation", to: "option-b-result", path: "continue", ordering: 0 },
  { from: "option-a-result", to: "reflection", path: "continue", ordering: 0 },
  { from: "option-b-result", to: "reflection", path: "continue", ordering: 0 },
]

export const exampleStoryAvatar = {
  name: "Protagonist",
  background: "The main character of your story. Edit this to describe who they are.",
  appearance: {},
  initialResources: {
    money: 100,
    time: 100,
    socialSupport: 50,
    mentalHealth: 70,
    physicalHealth: 80,
  },
  isPlayable: true,
}