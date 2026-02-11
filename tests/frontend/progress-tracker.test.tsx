import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import { describe, it, expect, afterEach, vi } from "vitest"
import { ProgressTracker } from "@/components/progress-tracker"

const baseProgress = {
  userId: "user-123",
  totalEmpathyScore: 320,
  scenariosCompleted: 2,
  totalScenarios: 3,
  completionPercentage: 67,
  issuesExplored: ["housing-discrimination"],
  achievements: [
    {
      id: "first_scenario",
      title: "First Steps",
      description: "Completed your first scenario",
      icon: "target",
      unlockedAt: "2024-01-01T00:00:00.000Z",
      category: "milestone",
      points: 100,
    },
  ],
  learningMetrics: {
    empathyGrowth: 80,
    decisionQuality: 70,
    issueAwareness: 85,
    resourceManagement: 65,
    moralReasoning: 75,
  },
  streakDays: 2,
  lastActive: "2024-01-01T00:00:00.000Z",
  timeSpent: 45,
  scenarios: [
    {
      id: "housing-search",
      title: "Housing Search",
      issueTag: "housing-discrimination",
      difficulty: "moderate",
      estimatedMinutes: 15,
      completed: true,
      metadata: {},
    },
    {
      id: "job-interview",
      title: "Job Interview",
      issueTag: "workplace-disability",
      difficulty: "moderate",
      estimatedMinutes: 20,
      completed: false,
      metadata: { hasStarted: true, storySlug: "job-interview" },  // Added progress metadata
    },
  ],
}

function createJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function mockFetch(...responses: Response[]) {
  const fetchMock = vi.fn()
  responses.forEach((response) => fetchMock.mockResolvedValueOnce(response))
  vi.stubGlobal("fetch", fetchMock as typeof fetch)
  return fetchMock
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("ProgressTracker", () => {
  it("renders live progress data from the API", async () => {
    mockFetch(createJsonResponse(baseProgress))

    render(<ProgressTracker />)

    expect(screen.getByText(/Loading your journey/i)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/Empathy Building Progress/i)).toBeInTheDocument())
    expect(screen.getByText("Housing Search")).toBeInTheDocument()
    expect(screen.getByText("Job Interview")).toBeInTheDocument()
  })

  it("prompts the visitor to sign in when the API responds with 401", async () => {
    mockFetch(createJsonResponse({ error: "Unauthorized" }, 401))

    render(<ProgressTracker />)

    await waitFor(() => expect(screen.getByText("In order to start and see your journey, sign in.")).toBeInTheDocument())
    expect(screen.getByRole("link", { name: /Sign In/i })).toHaveAttribute("href", "/login")
  })

  it("displays completed and in-progress stories separately", async () => {
    mockFetch(createJsonResponse(baseProgress))

    render(<ProgressTracker />)

    await waitFor(() => expect(screen.getByText(/Completed Stories/i)).toBeInTheDocument())
    expect(screen.getByText(/Continue Your Journey/i)).toBeInTheDocument()
    expect(screen.getByText("Housing Search")).toBeInTheDocument()
    expect(screen.getByText("Job Interview")).toBeInTheDocument()
  })

  it("does not show Continue Your Journey for new users with no started stories", async () => {
    const newUserProgress = {
      ...baseProgress,
      scenariosCompleted: 0,
      timeSpent: 0,
      scenarios: [
        {
          id: "job-interview",
          title: "Job Interview",
          issueTag: "workplace-disability",
          difficulty: "moderate",
          estimatedMinutes: 20,
          completed: false,
          metadata: {},  // No hasStarted - user hasn't begun this story
        },
      ],
      achievements: [],
    }
    mockFetch(createJsonResponse(newUserProgress))

    render(<ProgressTracker />)

    await waitFor(() => expect(screen.getByText(/Start Your First Story/i)).toBeInTheDocument())
    expect(screen.queryByText(/Continue Your Journey/i)).not.toBeInTheDocument()
  })

  it("shows server error messages for non-401 failures", async () => {
    mockFetch(createJsonResponse({ error: "Backend unavailable" }, 500))

    render(<ProgressTracker />)

    await waitFor(() => expect(screen.getByText("Backend unavailable")).toBeInTheDocument())
    expect(screen.getByRole("link", { name: /Sign In/i })).toHaveAttribute("href", "/login")
  })

  it("uses the fallback error text when fetch rejects", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce("network failed")
    vi.stubGlobal("fetch", fetchMock as typeof fetch)

    render(<ProgressTracker />)

    await waitFor(() => expect(screen.getByText("Unable to load progress.")).toBeInTheDocument())
  })

  it("formats total time over 60 minutes as hours and minutes", async () => {
    const longSessionProgress = {
      ...baseProgress,
      timeSpent: 125,
    }
    mockFetch(createJsonResponse(longSessionProgress))

    render(<ProgressTracker />)

    await waitFor(() => expect(screen.getByText("2h 5m")).toBeInTheDocument())
  })
})
