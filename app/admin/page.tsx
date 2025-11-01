"use client"

import { useAuth } from "@/hooks/use-auth"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  EyeOff,
  Trash2,
  User,
  Calendar,
  Tag,
  GitBranch,
  ArrowUpDown,
  Hash,
} from "lucide-react"
import Link from "next/link"

interface ApiStory {
  id: string
  slug: string
  title: string
  summary: string
  tags: string[]
  visibility: "PUBLIC" | "PRIVATE"
  reviewStatus?: "PENDING" | "APPROVED" | "REJECTED"
  createdAt: string
  updatedAt: string
  nodes: any[]
  transitions: any[]
  author?: {
    id: string
    displayName: string
    email: string
  }
}

type Story = Omit<ApiStory, "slug"> & { storyCode: string }

export default function AdminDashboard() {
  const { user, loading } = useAuth()
  const [stories, setStories] = useState<Story[]>([])
  const [filteredStories, setFilteredStories] = useState<Story[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL")
  const [sortBy, setSortBy] = useState<"date" | "title">("date")
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (user?.isAdmin) {
      fetchStories()
    }
  }, [user])

  useEffect(() => {
    let filtered = [...stories]

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (story) =>
          story.storyCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          story.author?.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          story.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())),
      )
    }

    // Apply status filter
    if (filterStatus !== "ALL") {
      filtered = filtered.filter((story) => story.reviewStatus === filterStatus)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      } else {
        return a.title.localeCompare(b.title)
      }
    })

    setFilteredStories(filtered)
  }, [stories, searchQuery, filterStatus, sortBy])

  const fetchStories = async () => {
    try {
      const res = await fetch("/api/creator/stories")
      const data = await res.json()
      const normalizedStories =
        (data.stories as ApiStory[] | undefined)?.map(({ slug, ...rest }) => ({
          ...rest,
          storyCode: slug,
        })) ?? []
      setStories(normalizedStories)
    } catch (error) {
      toast({
        title: "Error fetching stories",
        variant: "destructive",
      })
    }
  }

  const handleApprove = async (storyCode: string) => {
    setRefreshing(true)
    try {
      const res = await fetch("/api/admin/stories/approve", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: storyCode }),
      })

      if (res.ok) {
        toast({ title: "Story approved successfully" })
        setStories(
          stories.map((s) =>
            s.storyCode === storyCode ? { ...s, reviewStatus: "APPROVED" as const, visibility: "PUBLIC" as const } : s,
          ),
        )
      } else {
        throw new Error(await res.text())
      }
    } catch (error) {
      toast({
        title: "Error approving story",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    }
    setRefreshing(false)
  }

  const handleReject = async (storyCode: string) => {
    setRefreshing(true)
    try {
      const res = await fetch("/api/admin/stories/reject", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: storyCode }),
      })

      if (res.ok) {
        toast({ title: "Story rejected" })
        setStories(stories.map((s) => (s.storyCode === storyCode ? { ...s, reviewStatus: "REJECTED" as const } : s)))
      } else {
        throw new Error(await res.text())
      }
    } catch (error) {
      toast({
        title: "Error rejecting story",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    }
    setRefreshing(false)
  }

  const handleDelete = async (storyCode: string) => {
    if (!confirm(`Are you sure you want to delete story ${storyCode}? This action cannot be undone.`)) {
      return
    }

    setRefreshing(true)
    try {
      const res = await fetch("/api/creator/stories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: storyCode }),
      })

      if (res.ok) {
        toast({ title: "Story deleted successfully" })
        setStories(stories.filter((s) => s.storyCode !== storyCode))
      } else {
        throw new Error(await res.text())
      }
    } catch (error) {
      toast({
        title: "Error deleting story",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    }
    setRefreshing(false)
  }

  const handleMakePrivate = async (storyCode: string) => {
    setRefreshing(true)
    try {
      const res = await fetch("/api/admin/stories/private", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: storyCode }),
      })

      if (res.ok) {
        toast({ title: "Story set to private" })
        setStories(stories.map((s) => (s.storyCode === storyCode ? { ...s, visibility: "PRIVATE" as const } : s)))
      } else {
        throw new Error(await res.text())
      }
    } catch (error) {
      toast({
        title: "Error updating story",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    }
    setRefreshing(false)
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Pending Review
          </Badge>
        )
      case "APPROVED":
        return (
          <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        )
      case "REJECTED":
        return (
          <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        )
      default:
        return <Badge className="bg-slate-500/20 text-slate-300 border-slate-500/30">Draft</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <Card className="bg-slate-800/50 border-slate-700 p-8">
          <div className="text-slate-300 text-center">
            <XCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-slate-400">You don’t have permission to access this page.</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Admin Dashboard</h1>
              <p className="text-sm text-slate-400 mt-1">Manage story submissions and reviews</p>
            </div>
            <Link href="/">
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800/50 bg-slate-900/30"
              >
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-800/50 border-slate-700 p-6">
            <div className="text-slate-400 text-sm mb-1">Total Stories</div>
            <div className="text-3xl font-bold text-slate-100">{stories.length}</div>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700 p-6">
            <div className="text-slate-400 text-sm mb-1">Pending Review</div>
            <div className="text-3xl font-bold text-yellow-400">
              {stories.filter((s) => s.reviewStatus === "PENDING").length}
            </div>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700 p-6">
            <div className="text-slate-400 text-sm mb-1">Approved</div>
            <div className="text-3xl font-bold text-green-400">
              {stories.filter((s) => s.reviewStatus === "APPROVED").length}
            </div>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700 p-6">
            <div className="text-slate-400 text-sm mb-1">Rejected</div>
            <div className="text-3xl font-bold text-red-400">
              {stories.filter((s) => s.reviewStatus === "REJECTED").length}
            </div>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="bg-slate-800/50 border-slate-700 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by story code, title, author, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === "ALL" ? "default" : "outline"}
                onClick={() => setFilterStatus("ALL")}
                className={
                  filterStatus === "ALL"
                    ? "bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30"
                    : "border-slate-600 text-slate-300 hover:bg-slate-800/50 bg-slate-900/30"
                }
              >
                All
              </Button>
              <Button
                variant={filterStatus === "PENDING" ? "default" : "outline"}
                onClick={() => setFilterStatus("PENDING")}
                className={
                  filterStatus === "PENDING"
                    ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/30"
                    : "border-slate-600 text-slate-300 hover:bg-slate-800/50 bg-slate-900/30"
                }
              >
                Pending
              </Button>
              <Button
                variant={filterStatus === "APPROVED" ? "default" : "outline"}
                onClick={() => setFilterStatus("APPROVED")}
                className={
                  filterStatus === "APPROVED"
                    ? "bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30"
                    : "border-slate-600 text-slate-300 hover:bg-slate-800/50 bg-slate-900/30"
                }
              >
                Approved
              </Button>
              <Button
                variant={filterStatus === "REJECTED" ? "default" : "outline"}
                onClick={() => setFilterStatus("REJECTED")}
                className={
                  filterStatus === "REJECTED"
                    ? "bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30"
                    : "border-slate-600 text-slate-300 hover:bg-slate-800/50 bg-slate-900/30"
                }
              >
                Rejected
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={() => setSortBy(sortBy === "date" ? "title" : "date")}
              className="border-slate-600 text-slate-300 hover:bg-slate-800/50 bg-slate-900/30"
            >
              <ArrowUpDown className="w-4 h-4 mr-2" />
              Sort by {sortBy === "date" ? "Date" : "Title"}
            </Button>
          </div>
        </Card>

        {/* Stories List */}
        <div className="space-y-4">
          {filteredStories.length === 0 && (
            <Card className="bg-slate-800/50 border-slate-700 p-12 text-center">
              <Filter className="w-12 h-12 mx-auto mb-4 text-slate-600" />
              <p className="text-slate-400">No stories found matching your filters.</p>
            </Card>
          )}

          {filteredStories.map((story) => (
            <Card key={story.id} className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-all">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-slate-100">{story.title}</h3>
                      {getStatusBadge(story.reviewStatus)}
                      <Badge
                        variant="outline"
                        className={
                          story.visibility === "PUBLIC"
                            ? "border-blue-500/30 text-blue-300"
                            : "border-slate-500/30 text-slate-400"
                        }
                      >
                        {story.visibility === "PUBLIC" ? (
                          <Eye className="w-3 h-3 mr-1" />
                        ) : (
                          <EyeOff className="w-3 h-3 mr-1" />
                        )}
                        {story.visibility}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-violet-500/30 text-violet-200 font-mono text-xs tracking-wide"
                      >
                        <Hash className="w-3 h-3 mr-1" />
                        {story.storyCode}
                      </Badge>
                    </div>
                    <p className="text-slate-400 text-sm mb-4">{story.summary}</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-300">{story.author?.displayName || "System"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-400">{new Date(story.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <GitBranch className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-400">
                          {story.nodes?.length || 0} nodes, {story.transitions?.length || 0} transitions
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Tag className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-400">{story.tags?.length || 0} tags</span>
                      </div>
                    </div>

                    {story.tags && story.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {story.tags.map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="border-blue-500/30 text-blue-300 text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-700">
                  <Link href={`/creator/preview/${story.storyCode}`}>
                    <Button
                      variant="outline"
                      className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10 bg-slate-900/30"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                  </Link>

                  {story.reviewStatus === "PENDING" && (
                    <>
                      <Button
                        onClick={() => handleApprove(story.storyCode)}
                        disabled={refreshing}
                        className="bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleReject(story.storyCode)}
                        disabled={refreshing}
                        variant="outline"
                        className="border-red-500/30 text-red-300 hover:bg-red-500/10 bg-slate-900/30"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </>
                  )}

                  {story.visibility === "PUBLIC" && (
                    <Button
                      onClick={() => handleMakePrivate(story.storyCode)}
                      disabled={refreshing}
                      variant="outline"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700/50 bg-slate-900/30"
                    >
                      <EyeOff className="w-4 h-4 mr-2" />
                      Make Private
                    </Button>
                  )}

                  <Button
                    onClick={() => handleDelete(story.storyCode)}
                    disabled={refreshing}
                    variant="outline"
                    className="border-red-500/30 text-red-300 hover:bg-red-500/10 bg-slate-900/30 ml-auto"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
