import type { Avatar, Resources, Scenario, Decision, Consequence, SimulationState } from "@/types/simulation"

export class SimulationEngine {
  private state: SimulationState

  constructor(avatar: Avatar) {
    this.state = {
      currentAvatar: avatar,
      currentScenario: null,
      currentResources: { ...avatar.initialResources },
      decisionHistory: [],
      progressTracking: {
        scenariosCompleted: 0,
        totalEmpathyScore: 0,
        issuesExplored: avatar.socialContext.socialIssues,
      },
    }
  }

  getState(): SimulationState {
    return { ...this.state }
  }

  setScenario(scenario: Scenario): void {
    this.state.currentScenario = scenario
  }

  makeDecision(decision: Decision): {
    consequences: Consequence[]
    newResources: Resources
    criticalEvents: string[]
  } {
    if (!this.state.currentScenario) {
      throw new Error("No active scenario")
    }

    // Add decision to history
    this.state.decisionHistory.push(decision)

    // Apply resource costs
    const newResources = this.applyResourceChanges(this.state.currentResources, decision.resourceCosts)

    // Process consequences
    const consequences = decision.consequences
    const criticalEvents: string[] = []

    // Apply consequence effects
    consequences.forEach((consequence) => {
      Object.entries(consequence.resourceChanges).forEach(([resource, change]) => {
        if (change !== undefined) {
          newResources[resource as keyof Resources] = Math.max(
            0,
            Math.min(100, newResources[resource as keyof Resources] + change),
          )
        }
      })

      // Check for critical resource levels
      Object.entries(newResources).forEach(([resource, value]) => {
        if (value <= 10) {
          criticalEvents.push(`Critical ${resource} level reached!`)
        }
      })
    })

    this.state.currentResources = newResources

    // Calculate empathy score based on decision impact
    const empathyScore = this.calculateEmpathyScore(decision, consequences)
    this.state.progressTracking.totalEmpathyScore += empathyScore

    return {
      consequences,
      newResources,
      criticalEvents,
    }
  }

  private applyResourceChanges(current: Resources, changes: Partial<Resources>): Resources {
    const newResources = { ...current }

    Object.entries(changes).forEach(([resource, change]) => {
      if (change !== undefined) {
        newResources[resource as keyof Resources] = Math.max(
          0,
          Math.min(100, current[resource as keyof Resources] - Math.abs(change)),
        )
      }
    })

    return newResources
  }

  private calculateEmpathyScore(decision: Decision, consequences: Consequence[]): number {
    // Base score for making a decision
    let score = 10

    // Bonus for considering long-term consequences
    const hasLongTermConsequence = consequences.some((c) => c.type === "long-term")
    if (hasLongTermConsequence) score += 15

    // Bonus for decisions that help others despite personal cost
    const helpfulDecision =
      decision.text.toLowerCase().includes("help") || decision.text.toLowerCase().includes("support")
    const personalCost = Object.values(decision.resourceCosts).some((cost) => cost && cost > 20)
    if (helpfulDecision && personalCost) score += 25

    // Penalty for decisions that ignore social impact
    const ignoreSocialImpact = consequences.every((c) => Object.values(c.socialImpact).every((impact) => impact >= 0))
    if (!ignoreSocialImpact) score -= 10

    return Math.max(0, score)
  }

  canMakeDecision(decision: Decision): { canMake: boolean; reasons: string[] } {
    const reasons: string[] = []
    let canMake = true

    // Check if user has enough resources
    Object.entries(decision.resourceCosts).forEach(([resource, cost]) => {
      if (cost && this.state.currentResources[resource as keyof Resources] < cost) {
        canMake = false
        reasons.push(
          `Not enough ${resource} (need ${cost}, have ${this.state.currentResources[resource as keyof Resources]})`,
        )
      }
    })

    return { canMake, reasons }
  }

  getResourceStatus(): {
    critical: string[]
    low: string[]
    stable: string[]
  } {
    const critical: string[] = []
    const low: string[] = []
    const stable: string[] = []

    Object.entries(this.state.currentResources).forEach(([resource, value]) => {
      if (value <= 15) {
        critical.push(resource)
      } else if (value <= 35) {
        low.push(resource)
      } else {
        stable.push(resource)
      }
    })

    return { critical, low, stable }
  }

  completeScenario(): void {
    if (this.state.currentScenario) {
      this.state.progressTracking.scenariosCompleted += 1
      this.state.currentScenario = null
    }
  }

  getProgressSummary(): {
    scenariosCompleted: number
    averageEmpathyScore: number
    resourceTrends: Record<keyof Resources, "improving" | "declining" | "stable">
    challengesFaced: string[]
  } {
    const averageEmpathyScore =
      this.state.progressTracking.scenariosCompleted > 0
        ? this.state.progressTracking.totalEmpathyScore / this.state.progressTracking.scenariosCompleted
        : 0

    const resourceTrends: Record<keyof Resources, "improving" | "declining" | "stable"> = {
      money:
        this.state.currentResources.money > this.state.currentAvatar!.initialResources.money
          ? "improving"
          : this.state.currentResources.money < this.state.currentAvatar!.initialResources.money
            ? "declining"
            : "stable",
      time:
        this.state.currentResources.time > this.state.currentAvatar!.initialResources.time
          ? "improving"
          : this.state.currentResources.time < this.state.currentAvatar!.initialResources.time
            ? "declining"
            : "stable",
      energy:
        this.state.currentResources.energy > this.state.currentAvatar!.initialResources.energy
          ? "improving"
          : this.state.currentResources.energy < this.state.currentAvatar!.initialResources.energy
            ? "declining"
            : "stable",
      socialSupport:
        this.state.currentResources.socialSupport > this.state.currentAvatar!.initialResources.socialSupport
          ? "improving"
          : this.state.currentResources.socialSupport < this.state.currentAvatar!.initialResources.socialSupport
            ? "declining"
            : "stable",
      mentalHealth:
        this.state.currentResources.mentalHealth > this.state.currentAvatar!.initialResources.mentalHealth
          ? "improving"
          : this.state.currentResources.mentalHealth < this.state.currentAvatar!.initialResources.mentalHealth
            ? "declining"
            : "stable",
      physicalHealth:
        this.state.currentResources.physicalHealth > this.state.currentAvatar!.initialResources.physicalHealth
          ? "improving"
          : this.state.currentResources.physicalHealth < this.state.currentAvatar!.initialResources.physicalHealth
            ? "declining"
            : "stable",
    }

    const challengesFaced = this.state.progressTracking.issuesExplored.map((issue) => issue.description)

    return {
      scenariosCompleted: this.state.progressTracking.scenariosCompleted,
      averageEmpathyScore,
      resourceTrends,
      challengesFaced,
    }
  }

  // Save/load functionality for persistence
  saveState(): string {
    return JSON.stringify(this.state)
  }

  loadState(savedState: string): void {
    this.state = JSON.parse(savedState)
  }
}

// Utility functions for simulation management
export function createSimulationEngine(avatar: Avatar): SimulationEngine {
  return new SimulationEngine(avatar)
}

export function calculateResourceImpact(
  current: Resources,
  changes: Partial<Resources>,
): { impact: "positive" | "negative" | "neutral"; severity: "low" | "medium" | "high" } {
  let totalChange = 0
  let changeCount = 0

  Object.entries(changes).forEach(([_, change]) => {
    if (change !== undefined) {
      totalChange += change
      changeCount++
    }
  })

  const averageChange = changeCount > 0 ? totalChange / changeCount : 0

  const impact = averageChange > 0 ? "positive" : averageChange < 0 ? "negative" : "neutral"
  const severity = Math.abs(averageChange) > 20 ? "high" : Math.abs(averageChange) > 10 ? "medium" : "low"

  return { impact, severity }
}
