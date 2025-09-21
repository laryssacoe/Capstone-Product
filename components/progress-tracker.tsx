"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Target, Heart, Brain, Users, Star, TrendingUp, Award } from "lucide-react"
import type { UserProgress } from "@/types/simulation"

interface ProgressTrackerProps {
  userId?: string
  className?: string
}

export function ProgressTracker({ userId = "demo-user", className }: ProgressTrackerProps) {
  const [progress, setProgress] = useState<UserProgress>({
    userId,
    totalEmpathyScore: 750,
    scenariosCompleted: 12,
    totalScenarios: 25,
    issuesExplored: ["housing-discrimination", "workplace-disability", "corporate-racism"],
    achievements: [
      {
        id: "first-scenario",
        title: "First Steps",
        description: "Completed your first scenario",
        icon: "target",
        unlockedAt: new Date("2024-01-15"),
        category: "milestone",
      },
      {
        id: "empathy-builder",
        title: "Empathy Builder",
        description: "Reached 500 empathy points",
        icon: "heart",
        unlockedAt: new Date("2024-01-20"),
        category: "empathy",
      },
      {
        id: "difficult-choices",
        title: "Difficult Choices",
        description: "Made 10 high-stakes decisions",
        icon: "brain",
        unlockedAt: new Date("2024-01-25"),
        category: "decision",
      },
    ],
    learningMetrics: {
      empathyGrowth: 85,
      decisionQuality: 78,
      issueAwareness: 92,
      resourceManagement: 71,
      moralReasoning: 88,
    },
    streakDays: 7,
    lastActive: new Date(),
    timeSpent: 180, // minutes
  })

  const getIconComponent = (iconName: string) => {
    const icons = {
      target: Target,
      heart: Heart,
      brain: Brain,
      users: Users,
      star: Star,
      trophy: Trophy,
      award: Award,
    }
    const IconComponent = icons[iconName as keyof typeof icons] || Target
    return <IconComponent className="h-5 w-5" />
  }

  const getAchievementColor = (category: string) => {
    const colors = {
      milestone: "bg-slate-800 text-blue-300 border-slate-700",
      empathy: "bg-slate-800 text-purple-300 border-slate-700",
      decision: "bg-slate-800 text-indigo-300 border-slate-700",
      exploration: "bg-slate-800 text-cyan-300 border-slate-700",
    }
    return colors[category as keyof typeof colors] || colors.milestone
  }

  const completionPercentage = Math.round((progress.scenariosCompleted / progress.totalScenarios) * 100)
  const empathyLevel = Math.floor(progress.totalEmpathyScore / 100) + 1

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 justify-items-center">
        <Card className="bg-slate-800/50 border-slate-700 w-full max-w-sm">
          <CardContent className="p-4">
            <div className="flex flex-col items-center justify-center space-y-2">
              <Trophy className="h-6 w-6 text-blue-400" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-300">Empathy Level</p>
                <p className="text-2xl font-bold text-blue-400">{empathyLevel}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 w-full max-w-sm">
          <CardContent className="p-4">
            <div className="flex flex-col items-center justify-center space-y-2">
              <Target className="h-6 w-6 text-purple-400" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-300">Scenarios</p>
                <p className="text-2xl font-bold text-purple-400">
                  {progress.scenariosCompleted}/{progress.totalScenarios}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 w-full max-w-sm">
          <CardContent className="p-4">
            <div className="flex flex-col items-center justify-center space-y-2">
              <TrendingUp className="h-6 w-6 text-indigo-400" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-300">Streak</p>
                <p className="text-2xl font-bold text-indigo-400">{progress.streakDays} days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 w-full max-w-sm">
          <CardContent className="p-4">
            <div className="flex flex-col items-center justify-center space-y-2">
              <Users className="h-6 w-6 text-cyan-400" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-300">Issues Explored</p>
                <p className="text-2xl font-bold text-cyan-400">{progress.issuesExplored.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="progress" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border-slate-700">
          <TabsTrigger value="progress" className="data-[state=active]:bg-slate-700 data-[state=active]:text-blue-400">
            Progress
          </TabsTrigger>
          <TabsTrigger
            value="achievements"
            className="data-[state=active]:bg-slate-700 data-[state=active]:text-blue-400"
          >
            Achievements
          </TabsTrigger>
          <TabsTrigger value="insights" className="data-[state=active]:bg-slate-700 data-[state=active]:text-blue-400">
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-gray-100">Learning Journey</CardTitle>
              <CardDescription className="text-gray-400">
                Your progress through different social awareness areas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2 text-gray-300">
                  <span>Overall Completion</span>
                  <span>{completionPercentage}%</span>
                </div>
                <Progress value={completionPercentage} className="h-2 [&>div]:bg-pink-500" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-200">Learning Metrics</h4>
                  {Object.entries(progress.learningMetrics).map(([key, value]) => (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1 text-gray-300">
                        <span className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                        <span>{value}%</span>
                      </div>
                      <Progress value={value} className="h-1.5 [&>div]:bg-pink-400" />
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-gray-200">Issues Explored</h4>
                  <div className="space-y-2">
                    {progress.issuesExplored.map((issue) => (
                      <Badge
                        key={issue}
                        variant="secondary"
                        className="mr-2 bg-slate-700 text-gray-300 border-slate-600"
                      >
                        {issue.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-gray-400">
                    Time spent learning: {Math.floor(progress.timeSpent / 60)}h {progress.timeSpent % 60}m
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-gray-100">Achievements Unlocked</CardTitle>
              <CardDescription className="text-gray-400">
                Recognition for your empathy journey milestones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {progress.achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="flex items-start space-x-3 p-3 rounded-lg border border-slate-700 bg-slate-800/30"
                  >
                    <div className={`p-2 rounded-full ${getAchievementColor(achievement.category)}`}>
                      {getIconComponent(achievement.icon)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-200">{achievement.title}</h4>
                      <p className="text-sm text-gray-400">{achievement.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Unlocked {achievement.unlockedAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-gray-100">Learning Insights</CardTitle>
              <CardDescription className="text-gray-400">
                Personalized feedback on your empathy development
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-800/30">
                <h4 className="font-medium text-blue-300 mb-2">Strength: Issue Awareness</h4>
                <p className="text-sm text-blue-200/80">
                  You excel at understanding the complexity of social issues. Your awareness score of 92% shows deep
                  comprehension of systemic challenges.
                </p>
              </div>

              <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-800/30">
                <h4 className="font-medium text-purple-300 mb-2">Growth Area: Resource Management</h4>
                <p className="text-sm text-purple-200/80">
                  Consider focusing on strategic resource allocation. Practice scenarios that challenge your ability to
                  balance competing priorities with limited resources.
                </p>
              </div>

              <div className="p-4 bg-indigo-900/20 rounded-lg border border-indigo-800/30">
                <h4 className="font-medium text-indigo-300 mb-2">Recent Progress</h4>
                <p className="text-sm text-indigo-200/80">
                  Your empathy score has grown by 15% this week! You're developing stronger emotional intelligence and
                  perspective-taking abilities.
                </p>
              </div>

              <div className="p-4 bg-cyan-900/20 rounded-lg border border-cyan-800/30">
                <h4 className="font-medium text-cyan-300 mb-2">Next Milestone</h4>
                <p className="text-sm text-cyan-200/80">
                  Complete 3 more scenarios to unlock the "Social Justice Advocate" achievement and reach Empathy Level{" "}
                  {empathyLevel + 1}.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
