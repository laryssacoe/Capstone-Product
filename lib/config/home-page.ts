export type HomeGlobePin = {
  slug: string;
  topic: string;
  storyTitle: string;
  color: string;
  lat: number;
  lng: number;
};

export const HomePageConfig = {
  storage: {
    quickStartDismissedKey: "loop-home-quickstart-dismissed",
    quickStartHiddenSessionKey: "loop-home-quickstart-hidden-session",
  },
  routes: {
    allStories: "/scenarios",
    avatarEntry: "/avatar",
    storyPlayBase: "/simulation",
  },
  hero: {
    badge: "Free • Immersive • Transformative",
    titleLines: [
      "Step into different worlds.",
      "Experience the lives of different people through new eyes.",
    ],
    ctaLabel: "Start a Story",
    stageCaption: "Click a topic pin to open a story. Drag/zoom the center globe only.",
    scrollHintLabel: "Checkout Loop's features",
    quickStart: {
      title: "How to Start",
      steps: [
        "Start a Story.",
        "Choose any experience in All Stories.",
        "Play, reflect, and view real-world data.",
      ],
      tip: "Tip: The topic pins on the globe open specific stories directly.",
    },
  },
  globe: {
    radius: 2,
    topoUrl:
      process.env.NEXT_PUBLIC_GLOBE_TOPO_URL?.trim() ||
      "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json",
    camera: {
      position: [0, 0, 7.2] as [number, number, number],
      fov: 72,
    },
    lights: {
      ambient: 0.18,
      points: [
        { position: [8, 5, 10] as [number, number, number], intensity: 0.58, color: "#a78bfa" },
        { position: [-7, -4, 8] as [number, number, number], intensity: 0.22, color: "#60a5fa" },
        { position: [5, 7, -6] as [number, number, number], intensity: 0.32, color: "#f59e0b" },
      ],
      directional: { position: [5, 5, 5] as [number, number, number], intensity: 0.2, color: "#e0e7ff" },
    },
    orbit: {
      minDistance: 3,
      maxDistance: 7,
      autoRotate: false,
      autoRotateSpeed: 0.35,
      dampingFactor: 0.06,
      rotateSpeed: 0.5,
      zoomSpeed: 0.9,
    },
    pins: [
      {
        slug: "amber-thirty-days",
        topic: "Housing Crisis",
        storyTitle: "Thirty Days",
        color: "#f472b6",
        lat: 40.7,
        lng: -74.0,
      },
      {
        slug: "marcus-waiting-room",
        topic: "Workplace Bias",
        storyTitle: "The Waiting Room",
        color: "#a78bfa",
        lat: 51.5,
        lng: -0.1,
      },
      {
        slug: "daniel-water-and-land",
        topic: "Land Rights",
        storyTitle: "The Water and the Land",
        color: "#facc15",
        lat: 35.5,
        lng: -97.5,
      },
      {
        slug: "dorothy-silence-between-calls",
        topic: "Social Isolation",
        storyTitle: "The Silence Between Calls",
        color: "#34d399",
        lat: 43.7,
        lng: -79.4,
      },
      {
        slug: "katrina-guardian-week",
        topic: "Immigration",
        storyTitle: "Days Without Mom",
        color: "#38bdf8",
        lat: 29.4,
        lng: -98.5,
      },
      {
        slug: "caleb-forty-miles",
        topic: "Access to Education",
        storyTitle: "Forty Miles Away",
        color: "#ef4444",
        lat: 37.3,
        lng: -83.2,
      },
    ] satisfies HomeGlobePin[],
  },
} as const;

export function buildHomeStoryHref(slug: string) {
  return `${HomePageConfig.routes.avatarEntry}?story=${encodeURIComponent(slug)}`;
}
