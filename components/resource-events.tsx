"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { Resources } from "@/types/simulation"
import { Calendar, AlertTriangle, Gift, Clock, TrendingDown } from "lucide-react"

interface ResourceEvent {
  id: string
  title: string
  description: string
  type: "positive" | "negative" | "neutral"
  resourceChanges: Partial<Resources>
  duration: number // in turns/days
  probability: number // 0-1
  triggers: string[]
  canPrevent?: boolean
  preventionCost?: Partial<Resources>
}

interface ResourceEventsProps {
  currentResources: Resources
  onEventOccur: (event: ResourceEvent, prevented: boolean) => void
  turnNumber: number
}

const possibleEvents: ResourceEvent[] = [
  {
    id: "unexpected-expense",
    title: "Unexpected Medical Bill",
    description: "A sudden health issue requires immediate medical attention, creating an unexpected expense.",
    type: "negative",
    resourceChanges: {
      money: -25,
      mentalHealth: -10,
    },
    duration: 1,
    probability: 0.15,
    triggers: ["low-physicalHealth"],
    canPrevent: true,
    preventionCost: {
      money: 10,
      time: 5,
    },
  },
  {
    id: "community-support",
    title: "Community Assistance",
    description: "Local community organization offers help with groceries and utilities.",
    type: "positive",
    resourceChanges: {
      money: 15,
      socialSupport: 10,
      mentalHealth: 5,
    },
    duration: 1,
    probability: 0.2,
    triggers: ["high-socialSupport"],
  },
  {
    id: "job-opportunity",
    title: "Part-time Work Opportunity",
    description: "A flexible part-time job becomes available that fits your schedule.",
    type: "positive",
    resourceChanges: {
      money: 20,
      time: -15,
      energy: -10,
    },
    duration: 3,
    probability: 0.1,
    triggers: ["stable-energy", "available-time"],
  },
  {
    id: "burnout-warning",
    title: "Signs of Burnout",
    description: "You're showing signs of burnout from managing multiple stressors.",
    type: "negative",
    resourceChanges: {
      energy: -20,
      mentalHealth: -15,
      physicalHealth: -10,
    },
    duration: 2,
    probability: 0.25,
    triggers: ["low-energy", "low-mentalHealth"],
    canPrevent: true,
    preventionCost: {
      time: 20,
      socialSupport: 10,
    },
  },
  {
    id: "skill-workshop",
    title: "Free Skills Workshop",
    description: "A local organization offers free workshops to build job skills and confidence.",
    type: "positive",
    resourceChanges: {
      time: -10,
      energy: -5,
      socialSupport: 15,
      mentalHealth: 10,
    },
    duration: 1,
    probability: 0.15,
    triggers: ["available-time"],
  },
  {
    id: "housing-issue",
    title: "Housing Maintenance Problem",
    description: "Your housing situation requires immediate attention and resources.",
    type: "negative",
    resourceChanges: {
      money: -30,
      time: -15,
      energy: -15,
      mentalHealth: -10,
    },
    duration: 1,
    probability: 0.12,
    triggers: ["low-money"],
    canPrevent: true,
    preventionCost: {
      money: 15,
      time: 10,
    },
  },
]

export function ResourceEvents({ currentResources, onEventOccur, turnNumber }: ResourceEventsProps) {
  const [activeEvents, setActiveEvents] = useState<ResourceEvent[]>([])
  const [pendingEvent, setPendingEvent] = useState<ResourceEvent | null>(null)
  const [showEventModal, setShowEventModal] = useState(false)

  useEffect(() => {
    // Check for new events each turn
    const checkForEvents = () => {
      const eligibleEvents = possibleEvents.filter((event) => {
        // Check if event triggers match current resource state
        return event.triggers.every((trigger) => {
          const [condition, resource] = trigger.split("-")
          const resourceValue = currentResources[resource as keyof Resources]

          switch (condition) {
            case "low":
              return resourceValue < 30
            case "high":
              return resourceValue > 70
            case "stable":
              return resourceValue >= 40 && resourceValue <= 80
            case "available":
              return resourceValue > 50
            default:
              return true
          }
        })
      })

      // Randomly select an event based on probability
      const eventToTrigger = eligibleEvents.find((event) => Math.random() < event.probability)

      if (eventToTrigger && !activeEvents.some((e) => e.id === eventToTrigger.id)) {
        setPendingEvent(eventToTrigger)
        setShowEventModal(true)
      }
    }

    // Check for events every few turns
    if (turnNumber > 0 && turnNumber % 3 === 0) {
      checkForEvents()
    }
  }, [turnNumber, currentResources, activeEvents])

  const handleEventResponse = (event: ResourceEvent, prevent = false) => {
    if (prevent && event.canPrevent && event.preventionCost) {
      // Check if user can afford prevention
      const canAfford = Object.entries(event.preventionCost).every(([resource, cost]) => {
        return currentResources[resource as keyof Resources] >= (cost || 0)
      })

      if (canAfford) {
        onEventOccur(
          {
            ...event,
            resourceChanges: event.preventionCost,
            title: `Prevented: ${event.title}`,
            description: `You successfully prevented this event by taking proactive action.`,
            type: "neutral" as const,
          },
          true,
        )
      } else {
        // Can't afford prevention, event occurs
        onEventOccur(event, false)
      }
    } else {
      onEventOccur(event, false)
    }

    if (event.duration > 1) {
      setActiveEvents((prev) => [...prev, event])
    }

    setShowEventModal(false)
    setPendingEvent(null)
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case "positive":
        return <Gift className="w-5 h-5 text-green-600" />
      case "negative":
        return <AlertTriangle className="w-5 h-5 text-red-600" />
      default:
        return <Calendar className="w-5 h-5 text-blue-600" />
    }
  }

  const getEventBadgeVariant = (type: string) => {
    switch (type) {
      case "positive":
        return "default"
      case "negative":
        return "destructive"
      default:
        return "secondary"
    }
  }

  return (
    <div className="space-y-4">
      {/* Active Events */}
      {activeEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Ongoing Events
            </CardTitle>
            <CardDescription>Events currently affecting your resources</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeEvents.map((event) => (
                <div key={event.id} className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getEventIcon(event.type)}
                      <span className="font-medium">{event.title}</span>
                    </div>
                    <Badge variant={getEventBadgeVariant(event.type)}>{event.duration} turns remaining</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event Modal */}
      {showEventModal && pendingEvent && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center">
              {getEventIcon(pendingEvent.type)}
              <span className="ml-2">New Event: {pendingEvent.title}</span>
            </CardTitle>
            <CardDescription>{pendingEvent.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Resource Impact Preview */}
            <div>
              <h4 className="font-medium mb-2">Resource Impact:</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(pendingEvent.resourceChanges).map(([resource, change]) => {
                  if (!change) return null
                  return (
                    <Badge key={resource} variant={change > 0 ? "default" : "destructive"} className="text-xs">
                      {change > 0 ? "+" : ""}
                      {change} {resource}
                    </Badge>
                  )
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => handleEventResponse(pendingEvent)} className="flex-1">
                Accept Event
              </Button>

              {pendingEvent.canPrevent && pendingEvent.preventionCost && (
                <Button variant="outline" onClick={() => handleEventResponse(pendingEvent, true)} className="flex-1">
                  <div className="text-center">
                    <div>Prevent Event</div>
                    <div className="text-xs text-muted-foreground">
                      Cost:{" "}
                      {Object.entries(pendingEvent.preventionCost)
                        .map(([resource, cost]) => `${cost} ${resource}`)
                        .join(", ")}
                    </div>
                  </div>
                </Button>
              )}
            </div>

            {/* Prevention Affordability Check */}
            {pendingEvent.canPrevent && pendingEvent.preventionCost && (
              <div className="text-xs text-muted-foreground">
                {Object.entries(pendingEvent.preventionCost).some(([resource, cost]) => {
                  return currentResources[resource as keyof Resources] < (cost || 0)
                }) && (
                  <Alert className="border-yellow-500">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      You don't have enough resources to prevent this event. It will occur automatically.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Event History/Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingDown className="w-5 h-5 mr-2" />
            Event Risk Assessment
          </CardTitle>
          <CardDescription>Potential events based on your current resource levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {possibleEvents
              .filter((event) => {
                return event.triggers.some((trigger) => {
                  const [condition, resource] = trigger.split("-")
                  const resourceValue = currentResources[resource as keyof Resources]

                  switch (condition) {
                    case "low":
                      return resourceValue < 30
                    case "high":
                      return resourceValue > 70
                    default:
                      return false
                  }
                })
              })
              .slice(0, 3)
              .map((event) => (
                <div key={event.id} className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{event.title}</span>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(event.probability * 100)}% chance
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{event.description}</p>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
