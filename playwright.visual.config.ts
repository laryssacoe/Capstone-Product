import { defineConfig, devices } from "@playwright/test"

const baseURL = process.env.VISUAL_BASE_URL || "http://127.0.0.1:3000" // local testing
const useWebServer = !process.env.VISUAL_BASE_URL
const profileSet = (process.env.VISUAL_PROFILE_SET || "all").toLowerCase()

type PWProject = {
  name: string
  use: Record<string, unknown>
}

function mobileProject(
  name: string,
  width: number,
  height: number,
  deviceScaleFactor = 2,
): PWProject {
  return {
    name,
    use: {
      viewport: { width, height },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor,
    },
  }
}

const dellProjects: PWProject[] = [
  // Dell laptops / monitors commonly seen in labs and classrooms
  { name: "dell-latitude-12-1280x720", use: { viewport: { width: 1280, height: 720 } } },
  { name: "dell-latitude-13-1366x768", use: { viewport: { width: 1366, height: 768 } } },
  { name: "dell-latitude-14-1536x864", use: { viewport: { width: 1536, height: 864 } } },
  { name: "dell-inspiron-15-1600x900", use: { viewport: { width: 1600, height: 900 } } },
  { name: "dell-inspiron-15-fhd", use: { viewport: { width: 1920, height: 1080 } } },
  { name: "dell-latitude-16-wuxga", use: { viewport: { width: 1920, height: 1200 } } },
  { name: "dell-xps-13-fhdplus", use: { viewport: { width: 1920, height: 1200 } } },
  { name: "dell-xps-15-qhdplus", use: { viewport: { width: 2560, height: 1600 } } },
  { name: "dell-precision-16-wqxga", use: { viewport: { width: 2560, height: 1600 } } },
  { name: "dell-monitor-24-fhd", use: { viewport: { width: 1920, height: 1080 } } },
  { name: "dell-monitor-27-qhd", use: { viewport: { width: 2560, height: 1440 } } },
]

const tabletProjects: PWProject[] = [
  { name: "ipad-mini", use: { ...devices["iPad Mini"] } },
  { name: "ipad-air", use: { ...devices["iPad Air"] } },
]

const phoneProjects: PWProject[] = [
  // Real device profiles (Playwright built-ins)
  { name: "iphone-se", use: { ...devices["iPhone SE"] } },
  { name: "iphone-12", use: { ...devices["iPhone 12"] } },
  { name: "iphone-14-pro", use: { ...devices["iPhone 14 Pro"] } },
  { name: "iphone-14-pro-max", use: { ...devices["iPhone 14 Pro Max"] } },
  { name: "iphone-15-pro", use: { ...devices["iPhone 15 Pro"] } },
  { name: "pixel-5", use: { ...devices["Pixel 5"] } },
  { name: "pixel-7", use: { ...devices["Pixel 7"] } },
  { name: "galaxy-s9-plus", use: { ...devices["Galaxy S9+"] } },

  // Extra generic phone form factors for layout edge cases
  mobileProject("phone-iphone-se-320x568", 320, 568, 2),
  mobileProject("phone-iphone-8plus-414x736", 414, 736, 3),
  mobileProject("phone-small-android-360x640", 360, 640, 3),
  mobileProject("phone-android-360x780", 360, 780, 2.75),
  mobileProject("phone-android-360x800", 360, 800, 3),
  mobileProject("phone-android-360x880", 360, 880, 3),
  mobileProject("phone-iphone-12-390x844", 390, 844, 3),
  mobileProject("phone-pixel-7-412x915", 412, 915, 2.625),
  mobileProject("phone-large-430x932", 430, 932, 3),
]

const allProjects = [...dellProjects, ...tabletProjects, ...phoneProjects]
const projectsByProfile: Record<string, PWProject[]> = {
  all: allProjects,
  dell: dellProjects,
  phones: phoneProjects,
  tablets: tabletProjects,
  mobile: [...tabletProjects, ...phoneProjects],
}
const selectedProjects = projectsByProfile[profileSet] || allProjects

export default defineConfig({
  testDir: "./tests/visual",
  timeout: 90_000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-visual" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: useWebServer
    ? {
        command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
        url: baseURL,
        timeout: 180_000,
        reuseExistingServer: true,
      }
    : undefined,
  projects: selectedProjects,
})
