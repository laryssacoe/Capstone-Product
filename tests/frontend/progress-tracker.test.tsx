import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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
    },
    {
      id: "job-interview",
      title: "Job Interview",
      issueTag: "workplace-disability",
      difficulty: "moderate",
      estimatedMinutes: 20,
      completed: false,
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

    expect(screen.getByText(/Loading/)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText("Empathy Level")).toBeInTheDocument())
    expect(screen.getByText("Housing Search")).toBeInTheDocument()
    expect(screen.getByText("Mark complete")).toBeInTheDocument()
  })

  it("prompts the visitor to sign in when the API responds with 401", async () => {
    mockFetch(createJsonResponse({ error: "Unauthorized" }, 401))

    render(<ProgressTracker />)

    await waitFor(() => expect(screen.getByText("In order to start and see your journey, sign in.")).toBeInTheDocument())
    expect(screen.getByRole("link", { name: /Go to sign in/i })).toHaveAttribute("href", "/login")
  })

  it("allows a scenario to be marked complete and surfaces confirmation", async () => {
    const updated = {
      ...baseProgress,
      scenarios: baseProgress.scenarios.map((scenario) =>
        scenario.id === "job-interview" ? { ...scenario, completed: true } : scenario,
      ),
    }

    const fetchMock = mockFetch(createJsonResponse(baseProgress), createJsonResponse(updated))

    render(<ProgressTracker />)

    const completeButton = await screen.findByRole("button", { name: /Mark complete/i })
    await userEvent.click(completeButton)

    await screen.findByText(/Mark scenario as complete/i)

    const confirmButton = screen.getByRole("button", { name: /Yes, mark complete/i })
    await userEvent.click(confirmButton)

    await waitFor(() => expect(screen.getByText(/Scenario recorded/i)).toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
