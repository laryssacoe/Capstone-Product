"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { Decision, Resources } from "@/types/simulation"
import { AlertTriangle, Heart, Brain, Scale, Timer } from "lucide-react"

interface DecisionTreeProps {
  decisions: Decision[]
  currentResources: Resources
  onDecisionSelect: (decision: Decision) => void
  selectedDecision: Decision | null
  canMakeDecision: (decision: Decision) => { canMake: boolean; reasons: string[] }
  timeLimit?: number // seconds
  moralDilemma?: boolean
}

export function DecisionTree({
  decisions,
  currentResources,
  onDecisionSelect,
  selectedDecision,
  canMakeDecision,
  timeLimit,
  moralDilemma = false,
}: DecisionTreeProps) {
  const [timeRemaining, setTimeRemaining] = useState(timeLimit || 0)
  const [isTimerActive, setIsTimerActive] = useState(!!timeLimit)

  useEffect(() => {
    if (!isTimerActive || timeRemaining <= 0) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsTimerActive(false)
          // Auto-select first available decision when time runs out
          const availableDecision = decisions.find((d) => canMakeDecision(d).canMake)
          if (availableDecision && !selectedDecision) {
            onDecisionSelect(availableDecision)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isTimerActive, timeRemaining, decisions, canMakeDecision, selectedDecision, onDecisionSelect])

  const getDecisionComplexity = (decision: Decision): "simple" | "moderate" | "complex" => {
    const resourceCostCount = Object.values(decision.resourceCosts).filter((cost) => cost && cost > 0).length
    const consequenceCount = decision.consequences.length

    if (resourceCostCount <= 1 && consequenceCount <= 1) return "simple"
    if (resourceCostCount <= 2 && consequenceCount <= 2) return "moderate"
    return "complex"
  }

  const getDecisionMoralWeight = (decision: Decision): "low" | "medium" | "high" => {
    const hasLongTermConsequences = decision.consequences.some((c) => c.type === "long-term")
    const affectsOthers = decision.consequences.some((c) =>
      Object.values(c.socialImpact).some((impact) => Math.abs(impact) > 10),
    )
    const highResourceCost = Object.values(decision.resourceCosts).some((cost) => cost && cost > 30)

    if (hasLongTermConsequences && affectsOthers) return "high"
    if (hasLongTermConsequences || affectsOthers || highResourceCost) return "medium"
    return "low"
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="space-y-6">
      {timeLimit && (
        <Card className={`${timeRemaining <= 30 ? "border-destructive" : ""}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Timer className={`w-5 h-5 ${timeRemaining <= 30 ? "text-destructive" : "text-muted-foreground"}`} />
                <span className="font-medium">Time to Decide</span>
              </div>
              <div className={`text-lg font-mono ${timeRemaining <= 30 ? "text-destructive" : ""}`}>
                {formatTime(timeRemaining)}
              </div>
            </div>
            <Progress value={(timeRemaining / (timeLimit || 1)) * 100} className="mt-2" />
            {timeRemaining <= 30 && (
              <Alert className="mt-3 border-destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>Time is running out! Make your decision quickly.</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {moralDilemma && (
        <Alert>
          <Scale className="h-4 w-4" />
          <AlertDescription>
            This is a moral dilemma. There may not be a "right" answer - consider the values and principles that matter
            most to you.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {decisions.map((decision, index) => {
          const decisionCheck = canMakeDecision(decision)
          const isSelected = selectedDecision?.id === decision.id
          const complexity = getDecisionComplexity(decision)
          const moralWeight = getDecisionMoralWeight(decision)

          return (
            <Card
              key={decision.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected ? "ring-2 ring-primary" : ""
              } ${!decisionCheck.canMake ? "opacity-60" : ""} ${
                timeRemaining <= 30 && timeRemaining > 0 ? "animate-pulse" : ""
              }`}
              onClick={() => decisionCheck.canMake && onDecisionSelect(decision)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <CardTitle className="text-lg">
                        Option {index + 1}: {decision.text}
                      </CardTitle>
                      {!decisionCheck.canMake && (
                        <Badge variant="destructive" className="text-xs">
                          Unavailable
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          complexity === "complex"
                            ? "border-red-500 text-red-700"
                            : complexity === "moderate"
                              ? "border-yellow-500 text-yellow-700"
                              : "border-green-500 text-green-700"
                        }`}
                      >
                        <Brain className="w-3 h-3 mr-1" />
                        {complexity} decision
                      </Badge>
                      {moralDilemma && (
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            moralWeight === "high"
                              ? "border-purple-500 text-purple-700"
                              : moralWeight === "medium"
                                ? "border-blue-500 text-blue-700"
                                : "border-gray-500 text-gray-700"
                          }`}
                        >
                          <Heart className="w-3 h-3 mr-1" />
                          {moralWeight} moral impact
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <CardDescription className="text-base leading-relaxed">{decision.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <h5 className="font-medium text-sm mb-2">Resource Requirements:</h5>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(decision.resourceCosts).map(([resource, cost]) => {
                      if (!cost) return null
                      const hasEnough = currentResources[resource as keyof Resources] >= cost
                      const currentValue = currentResources[resource as keyof Resources]

                      return (
                        <div key={resource} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="capitalize">{resource.replace(/([A-Z])/g, " $1").trim()}</span>
                            <span className={hasEnough ? "text-green-600" : "text-red-600"}>
                              -{cost} ({currentValue} available)
                            </span>
                          </div>
                          <Progress
                            value={(currentValue / 100) * 100}
                            className={`h-1 ${!hasEnough ? "bg-red-100" : ""}`}
                          />
                          <div className="h-1 bg-red-200 rounded-full relative">
                            <div
                              className="h-full bg-red-500 rounded-full absolute"
                              style={{ width: `${(cost / 100) * 100}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-sm mb-2">Potential Outcomes:</h5>
                  <div className="space-y-2">
                    {decision.consequences.slice(0, 2).map((consequence, idx) => (
                      <div key={idx} className="p-2 bg-muted rounded text-xs">
                        <Badge variant="secondary" className="text-xs mb-1">
                          {consequence.type}
                        </Badge>
                        <p className="text-muted-foreground">{consequence.description.substring(0, 100)}...</p>
                      </div>
                    ))}
                    {decision.consequences.length > 2 && (
                      <p className="text-xs text-muted-foreground">
                        +{decision.consequences.length - 2} more consequences...
                      </p>
                    )}
                  </div>
                </div>

                {!decisionCheck.canMake && (
                  <Alert className="border-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        <p className="font-medium">Cannot make this decision:</p>
                        {decisionCheck.reasons.map((reason, idx) => (
                          <p key={idx} className="text-sm">
                            • {reason}
                          </p>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {isSelected && (
                  <div className="flex items-center justify-center p-2 bg-primary/10 rounded">
                    <span className="text-sm font-medium text-primary">Selected - Ready to proceed</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {selectedDecision && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-lg">Decision Summary</CardTitle>
            <CardDescription>Review your choice before confirming</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <span className="font-medium">You chose:</span> {selectedDecision.text}
              </div>
              <div>
                <span className="font-medium">This will cost:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {Object.entries(selectedDecision.resourceCosts).map(([resource, cost]) => {
                    if (!cost) return null
                    return (
                      <Badge key={resource} variant="secondary" className="text-xs">
                        -{cost} {resource}
                      </Badge>
                    )
                  })}
                </div>
              </div>
              <div>
                <span className="font-medium">Expected consequences:</span> {selectedDecision.consequences.length}{" "}
                outcomes will unfold
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
