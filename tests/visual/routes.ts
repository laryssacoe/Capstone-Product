export type VisualRoute = {
  name: string
  path: string
  expectScrollable?: boolean
  optional?: boolean
}

// Core routes + seeded story routes.
export const visualRoutes: VisualRoute[] = [
  { name: "home", path: "/", expectScrollable: true },
  { name: "about", path: "/about", expectScrollable: true },
  { name: "scenarios", path: "/scenarios", expectScrollable: true },
  { name: "avatar", path: "/avatar", expectScrollable: true },
  { name: "creator", path: "/creator", expectScrollable: true },
  { name: "login", path: "/login", expectScrollable: true },
  { name: "register", path: "/register", expectScrollable: true },
  { name: "profile", path: "/profile", expectScrollable: true, optional: true },
  { name: "progress", path: "/progress", expectScrollable: true, optional: true },

  // Story routes (require local DB + seeds)
  { name: "simulation-amber", path: "/simulation?story=amber-thirty-days", expectScrollable: true, optional: true },
  { name: "simulation-caleb", path: "/simulation?story=caleb-forty-miles", expectScrollable: true, optional: true },
  { name: "simulation-dorothy", path: "/simulation?story=dorothy-silence-between-calls", expectScrollable: true, optional: true },
  { name: "simulation-marcus", path: "/simulation?story=marcus-waiting-room", expectScrollable: true, optional: true },
  { name: "simulation-daniel", path: "/simulation?story=daniel-water-and-land", expectScrollable: true, optional: true },

  // Creator preview routes (require story existing)
  { name: "preview-amber", path: "/creator/preview/amber-thirty-days", expectScrollable: true, optional: true },
  { name: "preview-caleb", path: "/creator/preview/caleb-forty-miles", expectScrollable: true, optional: true },
  { name: "preview-dorothy", path: "/creator/preview/dorothy-silence-between-calls", expectScrollable: true, optional: true },
]

