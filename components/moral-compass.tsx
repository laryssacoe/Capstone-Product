"use client"

import type React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { Decision } from "@/types/simulation"
import { Heart, Users, Scale, Lightbulb, Shield, Zap } from "lucide-react"

interface MoralCompassProps {
  decision: Decision
  showAnalysis?: boolean
}

interface MoralValue {
  name: string
  description: string
  icon: React.ReactNode
  score: number
  color: string
}

export function MoralCompass({ decision, showAnalysis = true }: MoralCompassProps) {
  const calculateMoralValues = (decision: Decision): MoralValue[] => {
    const consequences = decision.consequences
    let compassion = 0
    let justice = 0
    let selfCare = 0
    let community = 0
    let integrity = 0
    let courage = 0

    consequences.forEach((consequence) => {
      // Compassion: helping others, reducing suffering
      if (consequence.socialImpact.communitySupport > 0 || consequence.emotionalImpact.isolation < 0) {
        compassion += 15
      }
      if (
        consequence.description.toLowerCase().includes("help") ||
        consequence.description.toLowerCase().includes("support")
      ) {
        compassion += 10
      }

      // Justice: fighting discrimination, standing up for rights
      if (
        consequence.description.toLowerCase().includes("discrimination") ||
        consequence.description.toLowerCase().includes("rights")
      ) {
        justice += 20
      }
      if (consequence.socialImpact.publicPerception > 0) {
        justice += 10
      }

      // Self-care: protecting own wellbeing
      if (consequence.resourceChanges.mentalHealth && consequence.resourceChanges.mentalHealth > 0) {
        selfCare += 15
      }
      if (consequence.resourceChanges.physicalHealth && consequence.resourceChanges.physicalHealth > 0) {
        selfCare += 15
      }

      // Community: building connections, collective action
      if (consequence.socialImpact.communitySupport > 10) {
        community += 20
      }
      if (
        consequence.description.toLowerCase().includes("community") ||
        consequence.description.toLowerCase().includes("together")
      ) {
        community += 15
      }

      // Integrity: doing what's right despite cost
      const personalCost = Object.values(decision.resourceCosts).reduce((sum, cost) => sum + (cost || 0), 0)
      if (personalCost > 30 && consequence.socialImpact.communitySupport > 0) {
        integrity += 25
      }

      // Courage: taking risks for important causes
      if (consequence.type === "long-term" && personalCost > 20) {
        courage += 20
      }
      if (
        consequence.description.toLowerCase().includes("risk") ||
        consequence.description.toLowerCase().includes("stand")
      ) {
        courage += 15
      }
    })

    return [
      {
        name: "Compassion",
        description: "Caring for others' wellbeing and reducing suffering",
        icon: <Heart className="w-4 h-4" />,
        score: Math.min(100, compassion),
        color: "text-pink-600",
      },
      {
        name: "Justice",
        description: "Fighting for fairness and equal treatment",
        icon: <Scale className="w-4 h-4" />,
        score: Math.min(100, justice),
        color: "text-blue-600",
      },
      {
        name: "Self-Care",
        description: "Protecting your own physical and mental health",
        icon: <Shield className="w-4 h-4" />,
        score: Math.min(100, selfCare),
        color: "text-green-600",
      },
      {
        name: "Community",
        description: "Building connections and collective strength",
        icon: <Users className="w-4 h-4" />,
        score: Math.min(100, community),
        color: "text-purple-600",
      },
      {
        name: "Integrity",
        description: "Doing what's right despite personal cost",
        icon: <Lightbulb className="w-4 h-4" />,
        score: Math.min(100, integrity),
        color: "text-yellow-600",
      },
      {
        name: "Courage",
        description: "Taking brave action for important causes",
        icon: <Zap className="w-4 h-4" />,
        score: Math.min(100, courage),
        color: "text-red-600",
      },
    ]
  }

  const moralValues = calculateMoralValues(decision)
  const primaryValues = moralValues.filter((value) => value.score > 20).sort((a, b) => b.score - a.score)

  if (!showAnalysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Scale className="w-5 h-5 mr-2" />
            Moral Compass
          </CardTitle>
          <CardDescription>This decision reflects your values and principles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {primaryValues.slice(0, 3).map((value) => (
              <Badge key={value.name} variant="secondary" className="text-xs">
                {value.icon}
                <span className="ml-1">{value.name}</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Scale className="w-5 h-5 mr-2" />
          Moral Analysis
        </CardTitle>
        <CardDescription>How this decision aligns with different moral values</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {moralValues.map((value) => (
          <div key={value.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className={value.color}>{value.icon}</span>
                <span className="font-medium text-sm">{value.name}</span>
              </div>
              <span className={`text-sm font-medium ${value.color}`}>{value.score}%</span>
            </div>
            <Progress value={value.score} className="h-2" />
            <p className="text-xs text-muted-foreground">{value.description}</p>
          </div>
        ))}

        {primaryValues.length > 0 && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium text-sm mb-2">Primary Values in This Decision:</h4>
            <div className="space-y-2">
              {primaryValues.slice(0, 2).map((value) => (
                <div key={value.name} className="flex items-center space-x-2">
                  <span className={value.color}>{value.icon}</span>
                  <span className="text-sm">
                    <strong>{value.name}</strong> - {value.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
