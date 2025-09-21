"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Resources } from "@/types/simulation"
import {
  DollarSign,
  Clock,
  Zap,
  Users,
  Brain,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  Target,
  BarChart3,
} from "lucide-react"

interface ResourceDashboardProps {
  currentResources: Resources
  initialResources: Resources
  resourceHistory?: Resources[]
  onResourceOptimize?: (strategy: string) => void
}

interface ResourceInfo {
  key: keyof Resources
  name: string
  icon: React.ReactNode
  description: string
  criticalThreshold: number
  lowThreshold: number
  dependencies: (keyof Resources)[]
  tips: string[]
}

const resourceInfo: ResourceInfo[] = [
  {
    key: "money",
    name: "Financial Resources",
    icon: <DollarSign className="w-4 h-4" />,
    description: "Available funds for expenses, emergencies, and opportunities",
    criticalThreshold: 15,
    lowThreshold: 35,
    dependencies: ["time", "energy"],
    tips: [
      "Look for community assistance programs",
      "Consider part-time work if energy allows",
      "Budget carefully for essential needs",
      "Seek financial counseling resources",
    ],
  },
  {
    key: "time",
    name: "Available Time",
    icon: <Clock className="w-4 h-4" />,
    description: "Free time for activities, self-care, and pursuing opportunities",
    criticalThreshold: 20,
    lowThreshold: 40,
    dependencies: ["energy", "physicalHealth"],
    tips: [
      "Prioritize high-impact activities",
      "Delegate tasks when possible",
      "Use time-blocking techniques",
      "Say no to non-essential commitments",
    ],
  },
  {
    key: "energy",
    name: "Energy Level",
    icon: <Zap className="w-4 h-4" />,
    description: "Physical and mental energy for daily activities and challenges",
    criticalThreshold: 15,
    lowThreshold: 35,
    dependencies: ["physicalHealth", "mentalHealth"],
    tips: [
      "Prioritize sleep and rest",
      "Eat nutritious meals regularly",
      "Take breaks between demanding tasks",
      "Practice stress management techniques",
    ],
  },
  {
    key: "socialSupport",
    name: "Social Support",
    icon: <Users className="w-4 h-4" />,
    description: "Network of family, friends, and community connections",
    criticalThreshold: 20,
    lowThreshold: 40,
    dependencies: ["time", "energy"],
    tips: [
      "Reach out to trusted friends and family",
      "Join community groups or support networks",
      "Volunteer to build connections",
      "Use social media mindfully to stay connected",
    ],
  },
  {
    key: "mentalHealth",
    name: "Mental Health",
    icon: <Brain className="w-4 h-4" />,
    description: "Emotional wellbeing, stress levels, and psychological resilience",
    criticalThreshold: 15,
    lowThreshold: 35,
    dependencies: ["socialSupport", "physicalHealth"],
    tips: [
      "Practice mindfulness or meditation",
      "Seek professional counseling if needed",
      "Maintain regular routines",
      "Engage in activities you enjoy",
    ],
  },
  {
    key: "physicalHealth",
    name: "Physical Health",
    icon: <Activity className="w-4 h-4" />,
    description: "Physical wellbeing, fitness, and absence of health issues",
    criticalThreshold: 20,
    lowThreshold: 40,
    dependencies: ["money", "time"],
    tips: [
      "Get regular exercise, even light walking",
      "Maintain preventive healthcare",
      "Eat balanced meals when possible",
      "Get adequate sleep each night",
    ],
  },
]

export function ResourceDashboard({
  currentResources,
  initialResources,
  resourceHistory = [],
  onResourceOptimize,
}: ResourceDashboardProps) {
  const [selectedResource, setSelectedResource] = useState<keyof Resources>("money")
  const [showOptimization, setShowOptimization] = useState(false)

  const getResourceStatus = (value: number, info: ResourceInfo) => {
    if (value <= info.criticalThreshold) return "critical"
    if (value <= info.lowThreshold) return "low"
    return "stable"
  }

  const getResourceTrend = (key: keyof Resources) => {
    const current = currentResources[key]
    const initial = initialResources[key]
    const change = current - initial

    if (Math.abs(change) < 5) return "stable"
    return change > 0 ? "improving" : "declining"
  }

  const getResourceColor = (status: string) => {
    switch (status) {
      case "critical":
        return "text-red-600"
      case "low":
        return "text-yellow-600"
      default:
        return "text-green-600"
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="w-4 h-4 text-green-600" />
      case "declining":
        return <TrendingDown className="w-4 h-4 text-red-600" />
      default:
        return <BarChart3 className="w-4 h-4 text-gray-600" />
    }
  }

  const calculateResourceScore = () => {
    const weights = {
      money: 0.2,
      time: 0.15,
      energy: 0.2,
      socialSupport: 0.15,
      mentalHealth: 0.15,
      physicalHealth: 0.15,
    }

    return Object.entries(currentResources).reduce((score, [key, value]) => {
      return score + value * weights[key as keyof Resources]
    }, 0)
  }

  const getResourceDependencyImpact = (resource: keyof Resources) => {
    const info = resourceInfo.find((r) => r.key === resource)
    if (!info) return []

    return info.dependencies.map((dep) => ({
      resource: dep,
      impact: currentResources[dep] < 30 ? "negative" : "neutral",
      value: currentResources[dep],
    }))
  }

  const selectedResourceInfo = resourceInfo.find((r) => r.key === selectedResource)!
  const resourceScore = calculateResourceScore()

  return (
    <div className="space-y-6">
      {/* Resource Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Resource Overview
            </CardTitle>
            <Badge variant={resourceScore > 60 ? "default" : resourceScore > 40 ? "secondary" : "destructive"}>
              Overall Score: {Math.round(resourceScore)}%
            </Badge>
          </div>
          <CardDescription>Monitor and manage your available resources strategically</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {resourceInfo.map((info) => {
              const value = currentResources[info.key]
              const status = getResourceStatus(value, info)
              const trend = getResourceTrend(info.key)

              return (
                <Card
                  key={info.key}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedResource === info.key ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedResource(info.key)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {info.icon}
                        <span className="font-medium text-sm">{info.name}</span>
                      </div>
                      {getTrendIcon(trend)}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span>Current</span>
                        <span className={getResourceColor(status)}>{value}%</span>
                      </div>
                      <Progress value={value} className="h-2" />
                      {status !== "stable" && (
                        <Badge variant={status === "critical" ? "destructive" : "secondary"} className="text-xs">
                          {status}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Resource Analysis */}
      <Tabs value={selectedResource} onValueChange={(value) => setSelectedResource(value as keyof Resources)}>
        <TabsList className="grid w-full grid-cols-6">
          {resourceInfo.map((info) => (
            <TabsTrigger key={info.key} value={info.key} className="text-xs">
              {info.icon}
            </TabsTrigger>
          ))}
        </TabsList>

        {resourceInfo.map((info) => (
          <TabsContent key={info.key} value={info.key}>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Resource Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    {info.icon}
                    <span className="ml-2">{info.name}</span>
                  </CardTitle>
                  <CardDescription>{info.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span>Current Level</span>
                      <span className={getResourceColor(getResourceStatus(currentResources[info.key], info))}>
                        {currentResources[info.key]}%
                      </span>
                    </div>
                    <Progress value={currentResources[info.key]} className="h-3" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Initial:</span>
                      <span className="ml-2 font-medium">{initialResources[info.key]}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Change:</span>
                      <span
                        className={`ml-2 font-medium ${
                          currentResources[info.key] - initialResources[info.key] >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {currentResources[info.key] - initialResources[info.key] > 0 ? "+" : ""}
                        {currentResources[info.key] - initialResources[info.key]}%
                      </span>
                    </div>
                  </div>

                  {/* Status Alert */}
                  {getResourceStatus(currentResources[info.key], info) !== "stable" && (
                    <Alert
                      className={
                        getResourceStatus(currentResources[info.key], info) === "critical"
                          ? "border-destructive"
                          : "border-yellow-500"
                      }
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        This resource is at a{" "}
                        {getResourceStatus(currentResources[info.key], info) === "critical" ? "critical" : "low"} level
                        and needs immediate attention.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Dependencies & Tips */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resource Dependencies</CardTitle>
                  <CardDescription>How other resources affect {info.name.toLowerCase()}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {info.dependencies.length > 0 ? (
                    <div className="space-y-3">
                      {getResourceDependencyImpact(info.key).map((dep) => {
                        const depInfo = resourceInfo.find((r) => r.key === dep.resource)!
                        return (
                          <div key={dep.resource} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center space-x-2">
                              {depInfo.icon}
                              <span className="text-sm font-medium">{depInfo.name}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`text-sm ${getResourceColor(getResourceStatus(dep.value, depInfo))}`}>
                                {dep.value}%
                              </span>
                              {dep.impact === "negative" && <AlertTriangle className="w-4 h-4 text-yellow-600" />}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">This resource is independent of others.</p>
                  )}

                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Improvement Tips</h4>
                    <div className="space-y-2">
                      {info.tips.map((tip, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Resource Optimization */}
      {onResourceOptimize && (
        <Card>
          <CardHeader>
            <CardTitle>Resource Optimization</CardTitle>
            <CardDescription>Get strategic advice for managing your resources more effectively</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  onClick={() => onResourceOptimize("emergency")}
                  className="h-auto p-4 text-left"
                >
                  <div>
                    <div className="font-medium">Emergency Mode</div>
                    <div className="text-sm text-muted-foreground">Focus on critical resources only</div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onResourceOptimize("balanced")}
                  className="h-auto p-4 text-left"
                >
                  <div>
                    <div className="font-medium">Balanced Approach</div>
                    <div className="text-sm text-muted-foreground">Maintain all resources steadily</div>
                  </div>
                </Button>
                <Button variant="outline" onClick={() => onResourceOptimize("growth")} className="h-auto p-4 text-left">
                  <div>
                    <div className="font-medium">Growth Strategy</div>
                    <div className="text-sm text-muted-foreground">Invest in long-term improvements</div>
                  </div>
                </Button>
              </div>

              {/* Critical Resource Alert */}
              {Object.entries(currentResources).some(([key, value]) => {
                const info = resourceInfo.find((r) => r.key === key)
                return info && value <= info.criticalThreshold
              }) && (
                <Alert className="border-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">Critical Resource Alert!</p>
                      <p>
                        You have resources at critical levels. Consider focusing on emergency mode to stabilize your
                        situation.
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
