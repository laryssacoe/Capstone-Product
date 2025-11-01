"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AvatarDisplay } from "@/components/avatar-display"
import { DecisionTree } from "@/components/decision-tree"
import { MoralCompass } from "@/components/moral-compass"
import { SimulationEngine } from "@/lib/simulation-engine"
import type { Avatar, Scenario, Decision, Consequence } from "@/types/simulation"
import { AlertTriangle, CheckCircle, Clock, ArrowRight, RotateCcw, Scale } from "lucide-react"

interface SimulationInterfaceProps {
  avatar: Avatar
  scenario: Scenario
  onScenarioComplete: (empathyScore: number) => void
}

export function SimulationInterface({ avatar, scenario, onScenarioComplete }: SimulationInterfaceProps) {
  const [engine] = useState(() => new SimulationEngine(avatar))
  const [currentState, setCurrentState] = useState(engine.getState())
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null)
  const [consequences, setConsequences] = useState<Consequence[]>([])
  const [criticalEvents, setCriticalEvents] = useState<string[]>([])
  const [showConsequences, setShowConsequences] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showMoralAnalysis, setShowMoralAnalysis] = useState(false)

  useEffect(() => {
    engine.setScenario(scenario)
    setCurrentState(engine.getState())
  }, [engine, scenario])

  const handleDecisionSelect = (decision: Decision) => {
    setSelectedDecision(decision)
    setShowConsequences(false)
    setConsequences([])
    setCriticalEvents([])
    setShowMoralAnalysis(false)
  }

  const handleDecisionConfirm = async () => {
    if (!selectedDecision) return

    setIsProcessing(true)

    // Simulate processing time for dramatic effect
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const result = engine.makeDecision(selectedDecision)
    setCurrentState(engine.getState())
    setConsequences(result.consequences)
    setCriticalEvents(result.criticalEvents)
    setShowConsequences(true)
    setShowMoralAnalysis(true)
    setIsProcessing(false)
  }

  const handleContinue = () => {
    if (selectedDecision?.nextScenarioId) {
      // In a real app, this would load the next scenario
      engine.completeScenario()
      const progress = engine.getProgressSummary()
      onScenarioComplete(progress.averageEmpathyScore)
    } else {
      // Reset for another decision in the same scenario
      setSelectedDecision(null)
      setShowConsequences(false)
      setConsequences([])
      setCriticalEvents([])
      setShowMoralAnalysis(false)
    }
  }

  const canMakeDecision = (decision: Decision) => engine.canMakeDecision(decision)
  const resourceStatus = engine.getResourceStatus()

  // Determine if this is a moral dilemma
  const isMoralDilemma = scenario.decisions.some((decision) =>
    decision.consequences.some((consequence) =>
      Object.values(consequence.socialImpact).some((impact) => Math.abs(impact) > 15),
    ),
  )

  // Add time pressure for certain scenarios
  const hasTimePressure = scenario.socialIssue.severity === "severe"
  const timeLimit = hasTimePressure ? 120 : undefined // 2 minutes for severe scenarios

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Avatar Status */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <AvatarDisplay avatar={avatar} currentResources={currentState.currentResources} />

          {/* Resource Alerts */}
          {resourceStatus.critical.length > 0 && (
            <Alert className="border-destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Critical resources: {resourceStatus.critical.join(", ")}</AlertDescription>
            </Alert>
          )}

          {resourceStatus.low.length > 0 && (
            <Alert className="border-yellow-500">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Low resources: {resourceStatus.low.join(", ")}</AlertDescription>
            </Alert>
          )}

          {/* Moral Compass */}
          {selectedDecision && !showConsequences && <MoralCompass decision={selectedDecision} showAnalysis={false} />}
        </div>

        {/* Scenario Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Scenario Description */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{scenario.title}</CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">
                    <Clock className="w-3 h-3 mr-1" />
                    {scenario.estimatedDuration} min
                  </Badge>
                  {isMoralDilemma && (
                    <Badge variant="secondary">
                      <Scale className="w-3 h-3 mr-1" />
                      Moral Dilemma
                    </Badge>
                  )}
                </div>
              </div>
              <CardDescription className="text-base leading-relaxed">{scenario.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm leading-relaxed">{scenario.context}</p>
              </div>
            </CardContent>
          </Card>

          {/* Decision Tree */}
          {!showConsequences && (
            <Card>
              <CardHeader>
                <CardTitle>What do you choose to do?</CardTitle>
                <CardDescription>
                  Consider your available resources and the potential impact of each decision.
                  {isMoralDilemma && " This situation involves complex moral considerations."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DecisionTree
                  decisions={scenario.decisions}
                  currentResources={currentState.currentResources}
                  onDecisionSelect={handleDecisionSelect}
                  selectedDecision={selectedDecision}
                  canMakeDecision={canMakeDecision}
                  timeLimit={timeLimit}
                  moralDilemma={isMoralDilemma}
                />

                {selectedDecision && canMakeDecision(selectedDecision).canMake && (
                  <div className="flex justify-center pt-6">
                    <Button onClick={handleDecisionConfirm} disabled={isProcessing} size="lg" className="min-w-32">
                      {isProcessing ? (
                        <>
                          <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Confirm Decision
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Consequences Display */}
          {showConsequences && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                    Decision Results
                  </CardTitle>
                  <CardDescription>
                    Here’s what happened as a result of your choice: “{selectedDecision?.text}”
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Critical Events */}
                  {criticalEvents.length > 0 && (
                    <Alert className="border-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          {criticalEvents.map((event, index) => (
                            <div key={index}>{event}</div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Consequences */}
                  <div className="space-y-3">
                    {consequences.map((consequence, index) => (
                      <div key={consequence.id} className="p-4 bg-muted rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant={consequence.type === "immediate" ? "default" : "secondary"}>
                            {consequence.type}
                          </Badge>
                        </div>
                        <p className="text-sm leading-relaxed">{consequence.description}</p>

                        {/* Resource Changes */}
                        {Object.entries(consequence.resourceChanges).some(([_, change]) => change !== undefined) && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {Object.entries(consequence.resourceChanges).map(([resource, change]) => {
                              if (change === undefined) return null
                              return (
                                <Badge
                                  key={resource}
                                  variant={change > 0 ? "default" : "destructive"}
                                  className="text-xs"
                                >
                                  {change > 0 ? "+" : ""}
                                  {change} {resource}
                                </Badge>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-center pt-4">
                    <Button onClick={handleContinue} size="lg">
                      {selectedDecision?.nextScenarioId ? "Continue to Next Scenario" : "Make Another Decision"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Moral Analysis */}
              {showMoralAnalysis && selectedDecision && (
                <MoralCompass decision={selectedDecision} showAnalysis={true} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
