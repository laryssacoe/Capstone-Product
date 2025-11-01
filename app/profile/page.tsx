"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import AppHeader from "@/components/app-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { User, Mail, Globe, MapPin, Clock, Tag, LinkIcon, X, LogOut, Camera, Sparkles } from "lucide-react"

type ProfileFormState = {
	displayName: string
	pronouns: string
	location: string
	publicEmail: string
	websiteUrl: string
	linkedinUrl: string
	twitterHandle: string
	instagramHandle: string
	tiktokHandle: string
	expertiseTags: string
	avatarUrl: string
	bio: string
	timezone: string
	customLinks: Array<{ label: string; url: string }>
	acceptConsent: boolean
}

const emptyForm: ProfileFormState = {
	displayName: "",
	pronouns: "",
	location: "",
	publicEmail: "",
	websiteUrl: "",
	linkedinUrl: "",
	twitterHandle: "",
	instagramHandle: "",
	tiktokHandle: "",
	expertiseTags: "",
	avatarUrl: "",
	bio: "",
	timezone: "",
	customLinks: [],
	acceptConsent: false,
}

type CreatorStatus = "DRAFT" | "REVIEW" | "ACTIVE" | "SUSPENDED"

type CreatorFormState = {
	penName: string
	headline: string
	biography: string
	focusAreas: string
	languages: string
	expertiseTags: string
	portfolioUrl: string
	tagline: string
	consentStatement: string
	acceptGuidelines: boolean
	acceptTerms: boolean
	acceptConsent: boolean
}

const emptyCreatorForm: CreatorFormState = {
	penName: "",
	headline: "",
	biography: "",
	focusAreas: "",
	languages: "",
	expertiseTags: "",
	portfolioUrl: "",
	tagline: "",
	consentStatement: "",
	acceptGuidelines: false,
	acceptTerms: false,
	acceptConsent: false,
}

const statusColorMap: Record<CreatorStatus, string> = {
	DRAFT: "bg-slate-800 text-slate-200 border-slate-700",
	REVIEW: "bg-amber-500/20 text-amber-200 border-amber-400/40",
	ACTIVE: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
	SUSPENDED: "bg-red-500/20 text-red-200 border-red-400/40",
}

const normalizeOptionalString = (value: string) => {
	const trimmed = value.trim()
	return trimmed.length > 0 ? trimmed : undefined
}

function formatList(value: string) {
	return value
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean)
}

export default function ProfilePage() {
	const { toast } = useToast()
	const router = useRouter()
	const { user } = useAuth()
	const [form, setForm] = useState<ProfileFormState>(emptyForm)
	const [savedProfile, setSavedProfile] = useState<ProfileFormState>(emptyForm)
	const [linksDraft, setLinksDraft] = useState<{ label: string; url: string }>({ label: "", url: "" })
	const [initialConsent, setInitialConsent] = useState(false)
	const [saving, setSaving] = useState(false)
	const [fetchError, setFetchError] = useState<string | null>(null)
	const initialRole = user?.isAdmin ? "ADMIN" : user?.role ?? "USER"
	const [userRole, setUserRole] = useState<string>(initialRole)
	const [userEmail, setUserEmail] = useState<string>(user?.email ?? "")
	const [creatorForm, setCreatorForm] = useState<CreatorFormState>(emptyCreatorForm)
	const [creatorFetchError, setCreatorFetchError] = useState<string | null>(null)
	const [creatorSaving, setCreatorSaving] = useState(false)
	const [creatorStatus, setCreatorStatus] = useState<CreatorStatus>("DRAFT")
	const [creatorReady, setCreatorReady] = useState(false)
	const creatorErrorRef = useRef<HTMLDivElement | null>(null)

	const expertiseArray = useMemo(
		() =>
			form.expertiseTags
				.split(",")
				.map((tag) => tag.trim())
				.filter(Boolean),
		[form.expertiseTags],
	)

	const hasUnsavedProfileChanges = useMemo(() => JSON.stringify(form) !== JSON.stringify(savedProfile), [form, savedProfile])
	const avatarHasUnsavedChange = savedProfile.avatarUrl !== form.avatarUrl

	const creatorExpertiseList = useMemo(() => formatList(creatorForm.expertiseTags), [creatorForm.expertiseTags])
	const creatorFocusAreasList = useMemo(() => formatList(creatorForm.focusAreas), [creatorForm.focusAreas])
	const creatorLanguagesList = useMemo(() => formatList(creatorForm.languages), [creatorForm.languages])

	useEffect(() => {
		const nextRole = user?.isAdmin ? "ADMIN" : user?.role ?? "USER"
		setUserRole(nextRole)
		setUserEmail(user?.email ?? "")
	}, [user?.isAdmin, user?.role, user?.email])

	useEffect(() => {
		if (!user?.creatorProfile) {
			setCreatorStatus("DRAFT")
			setCreatorReady(false)
			return
		}
		setCreatorStatus(user.creatorProfile.status)
		setCreatorReady(Boolean(user.creatorProfile.completedAt))
	}, [user?.creatorProfile])

	useEffect(() => {
		let active = true
		;(async () => {
			try {
				const response = await fetch("/api/profile", { cache: "no-store" })
				if (!response.ok) {
					throw new Error("Unable to load profile.")
				}
				const data = await response.json()
				if (!active) return
				const profile = data.profile
				if (profile) {
					const nextProfile: ProfileFormState = {
						displayName: profile.displayName ?? "",
						pronouns: profile.pronouns ?? "",
						location: profile.location ?? "",
						publicEmail: profile.publicEmail ?? "",
						websiteUrl: profile.websiteUrl ?? "",
						linkedinUrl: profile.linkedinUrl ?? "",
						twitterHandle: profile.twitterHandle ?? "",
						instagramHandle: profile.instagramHandle ?? "",
						tiktokHandle: profile.tiktokHandle ?? "",
						expertiseTags: Array.isArray(profile.expertiseTags) ? profile.expertiseTags.join(", ") : "",
						avatarUrl: profile.avatarUrl ?? "",
						bio: profile.bio ?? "",
						timezone: profile.timezone ?? "",
						customLinks: Array.isArray(profile.customLinks) ? profile.customLinks : [],
						acceptConsent: Boolean(profile.consentAcceptedAt),
					}
					setForm(nextProfile)
					setSavedProfile(nextProfile)
					setInitialConsent(Boolean(profile.consentAcceptedAt))
				} else {
					setForm(emptyForm)
					setSavedProfile(emptyForm)
					setInitialConsent(false)
				}
			} catch (error) {
				if (active) {
					setFetchError(error instanceof Error ? error.message : "Unable to load profile.")
				}
			}
		})()

		return () => {
			active = false
		}
	}, [user?.id])

	useEffect(() => {
		const shouldLoadCreator = userRole === "CREATOR" || userRole === "ADMIN"
		if (!shouldLoadCreator) {
			setCreatorForm(emptyCreatorForm)
			setCreatorFetchError(null)
			return
		}

		let active = true
		;(async () => {
			try {
				const response = await fetch("/api/creator/profile", { cache: "no-store" })
				if (!response.ok) {
					if (response.status === 404) {
						if (active) {
							setCreatorForm(emptyCreatorForm)
							setCreatorStatus("DRAFT")
							setCreatorReady(false)
						}
						return
					}
					throw new Error("Unable to load creator profile.")
				}
				const data = await response.json()
				if (!active) return
				const profile = data.profile
				if (profile) {
					setCreatorForm({
						penName: profile.penName ?? "",
						headline: profile.headline ?? "",
						biography: profile.biography ?? "",
						focusAreas: Array.isArray(profile.focusAreas) ? profile.focusAreas.join(", ") : "",
						languages: Array.isArray(profile.languages) ? profile.languages.join(", ") : "",
						expertiseTags: Array.isArray(profile.expertiseTags) ? profile.expertiseTags.join(", ") : "",
						portfolioUrl: profile.portfolioUrl ?? "",
						tagline: profile.tagline ?? "",
						consentStatement: profile.consentStatement ?? "",
						acceptGuidelines: Boolean(profile.guidelinesAcceptedAt),
						acceptTerms: Boolean(profile.termsAcceptedAt),
						acceptConsent: Boolean(profile.consentAcceptedAt),
					})
					setCreatorStatus(profile.status ?? "DRAFT")
					setCreatorReady(Boolean(profile.completedAt))
				} else {
					setCreatorForm(emptyCreatorForm)
					setCreatorStatus("DRAFT")
					setCreatorReady(false)
				}
				setCreatorFetchError(null)
			} catch (error) {
				if (active) {
					setCreatorFetchError(error instanceof Error ? error.message : "Unable to load creator profile.")
				}
			}
		})()

		return () => {
			active = false
		}
	}, [userRole])

	const handleChange =
		(field: keyof ProfileFormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
			const value = event.target.value
			setForm((prev) => ({
				...prev,
				[field]: value,
			}))
		}

	const handleConsentToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
		const next = event.target.checked
		setForm((prev) => ({ ...prev, acceptConsent: next }))
	}

	const handleCreatorChange =
		(field: keyof CreatorFormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
			const value = event.target.value
			setCreatorForm((prev) => ({
				...prev,
				[field]: value,
			}))
		}

	const handleCreatorToggle = (field: keyof CreatorFormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
		const next = event.target.checked
		setCreatorForm((prev) => ({ ...prev, [field]: next }))
	}

	const handleAddCustomLink = () => {
		if (!linksDraft.label.trim() || !linksDraft.url.trim()) return
		setForm((prev) => ({
			...prev,
			customLinks: [...prev.customLinks, { label: linksDraft.label.trim(), url: linksDraft.url.trim() }],
		}))
		setLinksDraft({ label: "", url: "" })
	}

	const handleRemoveLink = (index: number) => {
		setForm((prev) => ({
			...prev,
			customLinks: prev.customLinks.filter((_, idx) => idx !== index),
		}))
	}

	const handleSignOut = async () => {
		try {
			const response = await fetch("/api/auth/logout", { method: "POST" })
			if (!response.ok) {
				throw new Error("Unable to sign out.")
			}
			toast({
				title: "Signed out",
				description: "You have been signed out successfully.",
			})
			router.push("/")
		} catch (error) {
			toast({
				title: "Sign out failed",
				description: error instanceof Error ? error.message : "Unable to sign out. Please try again.",
				variant: "destructive",
			})
		}
	}

	const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file) return

		const reader = new FileReader()
		reader.onload = async (ev) => {
			const result = ev.target?.result
			if (typeof result !== "string") return

			try {
				const moderationRes = await fetch("/api/image-moderation", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({ image: result }),
				})

				const raw = await moderationRes.text()
				let moderation: any = null
				if (raw) {
					try {
						moderation = JSON.parse(raw)
					} catch (parseError) {
						console.warn("[profile] Unable to parse moderation response", parseError)
					}
				}

				if (!moderationRes.ok || !moderation?.acceptable) {
					const description = moderation?.reason || moderation?.error || "Image not allowed."
					toast({
						title: "Image rejected",
						description,
						variant: "destructive",
					})
					return
				}

				const persistedUrl = typeof moderation?.avatarUrl === "string" && moderation.avatarUrl.length > 0 ? moderation.avatarUrl : result
				setForm((prev) => ({ ...prev, avatarUrl: persistedUrl }))
				toast({
					title: "Image uploaded",
					description: moderation?.persisted
						? "Your profile image has been saved."
						: "Your profile image has been updated.",
				})
			} catch (error) {
				toast({
					title: "Upload failed",
					description: error instanceof Error ? error.message : "Unable to upload image. Please try again.",
					variant: "destructive",
				})
			}
		}
		reader.readAsDataURL(file)
	}

	const getInitials = () => {
		if (savedProfile.displayName) {
			return savedProfile.displayName
				.split(" ")
				.map((part) => part[0])
				.join("")
				.toUpperCase()
				.slice(0, 2)
		}
		if (userEmail) {
			return userEmail[0]?.toUpperCase() ?? "U"
		}
		return "U"
	}

	const roleBadge = userRole === "ADMIN" ? "Admin" : userRole === "CREATOR" ? "Creator" : "User"
	const disableAddLink = !linksDraft.label.trim() || !linksDraft.url.trim()
	const isCreatorAccount = userRole === "CREATOR" || userRole === "ADMIN"
	const creatorStatusBadgeClass = statusColorMap[creatorStatus] ?? statusColorMap.DRAFT
	const creatorSubmissionDisabled =
		creatorStatus === "SUSPENDED" ||
		!creatorForm.acceptGuidelines ||
		!creatorForm.acceptTerms ||
		!creatorForm.acceptConsent ||
		creatorFocusAreasList.length === 0 ||
		creatorLanguagesList.length === 0 ||
		creatorForm.biography.trim().length < 80 ||
		!creatorForm.penName.trim() ||
		!creatorForm.headline.trim()

	const handleProfileSubmit = async (event: React.FormEvent) => {
		event.preventDefault()
		setSaving(true)
		setFetchError(null)
		try {
			const trimmedLinks = form.customLinks
				.map((link) => ({
					label: link.label.trim(),
					url: link.url.trim(),
				}))
				.filter((link) => link.label.length > 0 && link.url.length > 0)
			const payload = {
				displayName: normalizeOptionalString(form.displayName),
				avatarUrl:
					typeof form.avatarUrl === "string" && form.avatarUrl.trim().length > 0
						? form.avatarUrl.trim()
						: undefined,
				bio: normalizeOptionalString(form.bio),
				timezone: normalizeOptionalString(form.timezone),
				pronouns: normalizeOptionalString(form.pronouns),
				location: normalizeOptionalString(form.location),
				publicEmail: normalizeOptionalString(form.publicEmail ?? ""),
				websiteUrl: normalizeOptionalString(form.websiteUrl ?? ""),
				linkedinUrl: normalizeOptionalString(form.linkedinUrl ?? ""),
				twitterHandle: normalizeOptionalString(form.twitterHandle ?? ""),
				instagramHandle: normalizeOptionalString(form.instagramHandle ?? ""),
				tiktokHandle: normalizeOptionalString(form.tiktokHandle ?? ""),
				expertiseTags: expertiseArray.length > 0 ? expertiseArray : undefined,
				customLinks: trimmedLinks.length > 0 ? trimmedLinks : undefined,
				acceptConsent: form.acceptConsent && !initialConsent,
			}

			const response = await fetch("/api/profile", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			})

			if (!response.ok) {
				const data = await response.json().catch(() => null)
				throw new Error(data?.error ?? "Unable to update profile.")
			}

			const sanitizedForm: ProfileFormState = {
				displayName: form.displayName.trim(),
				pronouns: form.pronouns.trim(),
				location: form.location.trim(),
				publicEmail: (form.publicEmail ?? "").trim(),
				websiteUrl: (form.websiteUrl ?? "").trim(),
				linkedinUrl: (form.linkedinUrl ?? "").trim(),
				twitterHandle: (form.twitterHandle ?? "").trim(),
				instagramHandle: (form.instagramHandle ?? "").trim(),
				tiktokHandle: (form.tiktokHandle ?? "").trim(),
				expertiseTags: expertiseArray.join(", "),
				avatarUrl: typeof form.avatarUrl === "string" ? form.avatarUrl.trim() : "",
				bio: form.bio.trim(),
				timezone: form.timezone.trim(),
				customLinks: trimmedLinks,
				acceptConsent: initialConsent || form.acceptConsent,
			}

			setForm(sanitizedForm)
			setSavedProfile(sanitizedForm)
			setInitialConsent(sanitizedForm.acceptConsent)
			toast({
				title: "Profile saved",
				className: "px-3 py-2 text-sm",
				duration: 1800,
			})
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unable to update profile."
			setFetchError(message)
			toast({
				title: "Update failed",
				description: message,
				variant: "destructive",
			})
		} finally {
			setSaving(false)
		}
	}

	const saveCreatorProfile = async () => {
		setCreatorSaving(true)
		setCreatorFetchError(null)
		try {
			const response = await fetch("/api/creator/profile", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					...creatorForm,
					expertiseTags: creatorExpertiseList,
					focusAreas: creatorFocusAreasList,
					languages: creatorLanguagesList,
				}),
			})

			const data = await response.json().catch(() => null)
			if (!response.ok) {
				throw new Error(data?.error ?? "Unable to update creator profile.")
			}

			if (data?.profile) {
				setCreatorStatus(data.profile.status ?? "DRAFT")
				setCreatorReady(Boolean(data.profile.completedAt))
			}
			if (typeof data?.readyForSubmission === "boolean") {
				setCreatorReady(data.readyForSubmission)
			}
			router.refresh()
			toast({
				title: "Creator profile saved",
				description: "Your creator details were updated successfully.",
			})
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unable to update creator profile."
			setCreatorFetchError(message)
			toast({
				title: "Creator update failed",
				description: message,
				variant: "destructive",
			})
			setTimeout(() => {
				if (creatorErrorRef.current) {
					creatorErrorRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
				}
			}, 120)
		} finally {
			setCreatorSaving(false)
		}
	}

	return (
		<div className="min-h-screen bg-slate-950 text-slate-100">
			<AppHeader />

			<main className="mx-auto max-w-5xl px-6 py-12 space-y-10">
				<div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
					<div className="flex items-center gap-4">
						<div className="relative">
							<div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-blue-500 bg-gradient-to-br from-blue-900 via-slate-900 to-purple-900 shadow-lg shadow-blue-500/20">
								{savedProfile.avatarUrl ? (
									<Image src={savedProfile.avatarUrl} alt="Profile" fill sizes="128px" className="object-cover" />
								) : (
									<span className="text-4xl font-semibold text-white">{getInitials()}</span>
								)}
							</div>
							<label
								htmlFor="avatar-upload"
								className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/60 opacity-0 transition-opacity hover:opacity-100"
							>
								<Camera className="h-7 w-7 text-white" />
							</label>
							<input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
							{avatarHasUnsavedChange && (
								<span className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-amber-400/60 bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-200 shadow-sm">
									Pending save
								</span>
							)}
						</div>
						<div>
							<Badge
								className={
									userRole === "ADMIN"
										? "border-blue-400/40 bg-blue-500/20 text-blue-200"
										: userRole === "CREATOR"
										? "border-purple-400/40 bg-purple-500/20 text-purple-200"
										: "border-slate-400/40 bg-slate-500/20 text-slate-200"
								}
							>
								{roleBadge}
							</Badge>
							<h1 className="mt-3 text-4xl font-bold text-white">Your Loop Profile</h1>
							<p className="mt-2 text-slate-400">
								Manage how the community sees you across journeys, credits, and collaboration spaces.
							</p>
							<p className="mt-1 text-xs text-slate-500">
								Only appropriate images are allowed and will be moderated.
							</p>
						</div>
					</div>
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
						{userRole === "ADMIN" && (
							<Link href="/admin">
								<Button className="w-full bg-blue-600/20 text-blue-200 hover:bg-blue-600/30 sm:w-auto" variant="outline">
									Admin Dashboard
								</Button>
							</Link>
						)}
						<Button
							onClick={handleSignOut}
							variant="outline"
							className="w-full border-slate-700 bg-slate-800/60 text-slate-200 hover:border-slate-600 hover:bg-slate-700/60 sm:w-auto"
						>
							<LogOut className="mr-2 h-4 w-4" />
							Sign Out
						</Button>
					</div>
				</div>

				<Card className="mt-10 border-slate-800 bg-slate-900/60 backdrop-blur-sm">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-white">
							<User className="h-5 w-5 text-blue-400" />
							Public details
						</CardTitle>
						<CardDescription className="text-slate-400">
							These fields display across experiences, leaderboards, and credits. Leave any field blank to hide it.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form className="space-y-8" onSubmit={handleProfileSubmit}>
							{fetchError && (
								<div className="rounded-lg border border-red-500/50 bg-red-900/20 p-4 text-sm text-red-200">{fetchError}</div>
							)}

							<div className="grid gap-6 md:grid-cols-2">
								<div className="space-y-2">
									<label className="flex items-center gap-2 text-sm font-medium text-slate-200" htmlFor="displayName">
										<User className="h-4 w-4 text-slate-400" />
										Display name
									</label>
									<Input
										id="displayName"
										value={form.displayName}
										onChange={handleChange("displayName")}
										placeholder="Sam Thompson"
										className="border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500"
										required
									/>
								</div>
								<div className="space-y-2">
									<label className="text-sm font-medium text-slate-200" htmlFor="pronouns">
										Pronouns
									</label>
									<Input
										id="pronouns"
										value={form.pronouns}
										onChange={handleChange("pronouns")}
										placeholder="they/them"
										className="border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500"
									/>
								</div>
							</div>

							<div className="grid gap-6 md:grid-cols-2">
								<div className="space-y-2">
									<label className="flex items-center gap-2 text-sm font-medium text-slate-200" htmlFor="location">
										<MapPin className="h-4 w-4 text-slate-400" />
										Location
									</label>
									<Input
										id="location"
										value={form.location}
										onChange={handleChange("location")}
										placeholder="Chicago, IL"
										className="border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500"
									/>
								</div>
								<div className="space-y-2">
									<label className="flex items-center gap-2 text-sm font-medium text-slate-200" htmlFor="timezone">
										<Clock className="h-4 w-4 text-slate-400" />
										Preferred timezone
									</label>
									<Input
										id="timezone"
										value={form.timezone}
										onChange={handleChange("timezone")}
										placeholder="America/Chicago"
										className="border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500"
									/>
								</div>
							</div>

							<div className="space-y-2">
								<label className="text-sm font-medium text-slate-200" htmlFor="bio">
									Bio
								</label>
								<Textarea
									id="bio"
									value={form.bio}
									onChange={handleChange("bio")}
									rows={4}
									placeholder="Tell the community about your lived experience and the work you do."
									className="border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500"
								/>
							</div>

							<div className="grid gap-6 md:grid-cols-2">
								<div className="space-y-2">
									<label className="flex items-center gap-2 text-sm font-medium text-slate-200" htmlFor="publicEmail">
										<Mail className="h-4 w-4 text-slate-400" />
										Public email
									</label>
									<Input
										id="publicEmail"
										value={form.publicEmail}
										onChange={handleChange("publicEmail")}
										placeholder="loop@community.org"
										className="border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500"
									/>
								</div>
								<div className="space-y-2">
									<label className="flex items-center gap-2 text-sm font-medium text-slate-200" htmlFor="websiteUrl">
										<Globe className="h-4 w-4 text-slate-400" />
										Website
									</label>
									<Input
										id="websiteUrl"
										value={form.websiteUrl}
										onChange={handleChange("websiteUrl")}
										placeholder="https://"
										className="border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500"
									/>
								</div>
							</div>

							<div className="grid gap-6 md:grid-cols-3">
								<div className="space-y-2">
									<label className="text-sm font-medium text-slate-200" htmlFor="linkedinUrl">
										LinkedIn
									</label>
									<Input
										id="linkedinUrl"
										value={form.linkedinUrl}
										onChange={handleChange("linkedinUrl")}
										placeholder="https://linkedin.com/in/"
										className="border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500"
									/>
								</div>
								<div className="space-y-2">
									<label className="text-sm font-medium text-slate-200" htmlFor="twitterHandle">
										X / Twitter
									</label>
									<Input
										id="twitterHandle"
										value={form.twitterHandle}
										onChange={handleChange("twitterHandle")}
										placeholder="@loopstories"
										className="border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500"
									/>
								</div>
								<div className="space-y-2">
									<label className="text-sm font-medium text-slate-200" htmlFor="instagramHandle">
										Instagram
									</label>
									<Input
										id="instagramHandle"
										value={form.instagramHandle}
										onChange={handleChange("instagramHandle")}
										placeholder="@loop.community"
										className="border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500"
									/>
								</div>
							</div>

							<div className="grid gap-6 md:grid-cols-2">
								<div className="space-y-2">
									<label className="text-sm font-medium text-slate-200" htmlFor="tiktokHandle">
										TikTok
									</label>
									<Input
										id="tiktokHandle"
										value={form.tiktokHandle}
										onChange={handleChange("tiktokHandle")}
										placeholder="@loop-community"
										className="border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500"
									/>
								</div>
							</div>

							<div className="space-y-2">
								<label className="flex items-center gap-2 text-sm font-medium text-slate-200" htmlFor="expertiseTags">
									<Tag className="h-4 w-4 text-slate-400" />
									Expertise tags
								</label>
								<Input
									id="expertiseTags"
									value={form.expertiseTags}
									onChange={handleChange("expertiseTags")}
									placeholder="education justice, housing advocacy, community design"
									className="border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500"
								/>
								<p className="text-xs text-slate-500">Separate tags with commas to surface your work in search.</p>
								{expertiseArray.length > 0 && (
									<div className="flex flex-wrap gap-2 pt-1">
										{expertiseArray.map((tag) => (
											<Badge key={tag} variant="outline" className="border-blue-500/40 bg-blue-500/10 text-blue-200">
												{tag}
											</Badge>
										))}
									</div>
								)}
							</div>

							<div className="space-y-4">
								<div className="space-y-2">
									<label className="flex items-center gap-2 text-sm font-medium text-slate-200">
										<LinkIcon className="h-4 w-4 text-slate-400" />
										Custom links
									</label>
									<div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
										<Input
											placeholder="Link label"
											value={linksDraft.label}
											onChange={(event) => setLinksDraft((prev) => ({ ...prev, label: event.target.value }))}
											className="border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500"
										/>
										<Input
											placeholder="https://your-link.com"
											value={linksDraft.url}
											onChange={(event) => setLinksDraft((prev) => ({ ...prev, url: event.target.value }))}
											className="border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500"
										/>
										<Button
											type="button"
											onClick={handleAddCustomLink}
											disabled={disableAddLink}
											className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
										>
											Add
										</Button>
									</div>
								</div>
								{form.customLinks.length > 0 && (
									<div className="space-y-2">
										{form.customLinks.map((link, index) => (
											<div
												key={`${link.label}-${index}`}
												className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-3 transition-colors hover:border-slate-600"
											>
												<div className="text-sm text-slate-200">
													<span className="font-medium">{link.label}</span>
													<span className="ml-2 text-slate-500">{link.url}</span>
												</div>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleRemoveLink(index)}
													className="text-slate-400 hover:text-red-400 hover:bg-red-900/20"
												>
													<X className="h-4 w-4" />
												</Button>
											</div>
										))}
									</div>
								)}
							</div>

							<div className="rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-4">
								<label className="flex items-start gap-3 text-sm text-slate-200">
									<input
										type="checkbox"
										className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
										checked={form.acceptConsent}
										onChange={handleConsentToggle}
									/>
									<span>
										I agree that Loop can display this information on community pages, scenarios, and public credits.{" "}
										<span className="text-slate-500">You can update or remove public details at any time.</span>
									</span>
								</label>
							</div>

							<div className="flex flex-col gap-3 border-t border-slate-800 pt-6 sm:flex-row sm:items-center sm:justify-between">
								<div className="flex flex-col gap-1 text-sm text-slate-500">
									<p>Creator submissions unlock once the section below is complete and approved by the Loop team.</p>
									{hasUnsavedProfileChanges && (
										<span className="flex items-center gap-1 text-xs text-amber-300">
											<Sparkles className="h-3.5 w-3.5" />
											Unsaved changes — remember to save.
										</span>
									)}
								</div>
								<Button
									type="submit"
									disabled={saving}
									className="flex items-center justify-center bg-gradient-to-r from-blue-600 to-purple-600 px-8 text-white transition hover:from-blue-500 hover:to-purple-500 disabled:opacity-70"
								>
									{saving ? "Saving…" : "Save profile"}
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>

				{isCreatorAccount ? (
					<Card id="creator" className="border-slate-800 bg-slate-900/70 backdrop-blur-sm">
						<CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
							<div className="space-y-2">
								<div className="flex items-center gap-2 text-blue-300">
									<span className="uppercase text-xs font-semibold tracking-wide">Creator workspace</span>
								</div>
								<CardTitle className="text-white">Creator identity & approvals</CardTitle>
								<CardDescription className="text-slate-400">
									Complete these fields to unlock story submissions and help reviewers understand your lived experience.
								</CardDescription>
							</div>
							<Badge className={`flex items-center gap-2 border ${creatorStatusBadgeClass}`}>
								<span>Status</span>
								<span className="font-semibold">{creatorStatus}</span>
							</Badge>
						</CardHeader>
						<CardContent>
							<form
								className="space-y-8"
								onSubmit={(event) => {
									event.preventDefault()
									saveCreatorProfile()
								}}
							>
								{creatorFetchError && (
									<div
										ref={creatorErrorRef}
										className="rounded-lg border border-red-500/50 bg-red-900/20 p-4 text-sm text-red-200"
									>
										{creatorFetchError}
									</div>
								)}

								<div className="grid gap-6 md:grid-cols-2">
									<div className="space-y-2">
										<label className="text-sm font-medium text-slate-200" htmlFor="penName">
											Preferred public credit name *
										</label>
										<Input
											id="penName"
											value={creatorForm.penName}
											onChange={handleCreatorChange("penName")}
											placeholder="Sam Thompson"
											className="border-purple-500/40 bg-slate-950 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500"
										/>
									</div>
									<div className="space-y-2">
										<label className="text-sm font-medium text-slate-200" htmlFor="headline">
											Headline *
										</label>
										<Input
											id="headline"
											value={creatorForm.headline}
											onChange={handleCreatorChange("headline")}
											placeholder="Community health advocate & mobility strategist"
											className="border-purple-500/40 bg-slate-950 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500"
										/>
									</div>
								</div>

								<div className="space-y-2">
									<label className="text-sm font-medium text-slate-200" htmlFor="biography">
										Biography (minimum 80 characters) *
									</label>
									<Textarea
										id="biography"
										value={creatorForm.biography}
										onChange={handleCreatorChange("biography")}
										rows={6}
										placeholder="Tell the review team about your lived experience and the work you do."
										className="border-purple-500/40 bg-slate-950 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500"
									/>
									<p className="text-xs text-slate-500">
										This stays private—reviewers read it while assessing journeys and approvals.
									</p>
								</div>

								<div className="grid gap-6 md:grid-cols-2">
									<div className="space-y-2">
										<label className="text-sm font-medium text-slate-200" htmlFor="focusAreas">
											Focus areas (comma separated) *
										</label>
										<Input
											id="focusAreas"
											value={creatorForm.focusAreas}
											onChange={handleCreatorChange("focusAreas")}
											placeholder="rural health equity, immigrant justice, trauma-informed care"
											className="border-purple-500/40 bg-slate-950 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500"
										/>
									</div>
									<div className="space-y-2">
										<label className="text-sm font-medium text-slate-200" htmlFor="languages">
											Languages *
										</label>
										<Input
											id="languages"
											value={creatorForm.languages}
											onChange={handleCreatorChange("languages")}
											placeholder="English, Spanish"
											className="border-purple-500/40 bg-slate-950 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500"
										/>
									</div>
								</div>

								<div className="grid gap-6 md:grid-cols-2">
									<div className="space-y-2">
										<label className="text-sm font-medium text-slate-200" htmlFor="expertiseTags">
											Expertise tags
										</label>
										<Input
											id="expertiseTags"
											value={creatorForm.expertiseTags}
											onChange={handleCreatorChange("expertiseTags")}
											placeholder="youth leadership, harm reduction, restorative justice"
											className="border-purple-500/40 bg-slate-950 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500"
										/>
										<p className="text-xs text-slate-500">Tags improve discoverability inside Loop creator tools.</p>
										{creatorExpertiseList.length > 0 && (
											<div className="flex flex-wrap gap-2 pt-1">
												{creatorExpertiseList.map((tag) => (
													<Badge key={tag} variant="outline" className="border-purple-400/40 bg-purple-500/10 text-purple-200">
														{tag}
													</Badge>
												))}
											</div>
										)}
									</div>
									<div className="space-y-2">
										<label className="text-sm font-medium text-slate-200" htmlFor="portfolioUrl">
											Portfolio or doc link
										</label>
										<Input
											id="portfolioUrl"
											value={creatorForm.portfolioUrl}
											onChange={handleCreatorChange("portfolioUrl")}
											placeholder="https://docs.google.com/..."
											className="border-purple-500/40 bg-slate-950 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500"
										/>
									</div>
								</div>

								<div className="space-y-2">
									<label className="text-sm font-medium text-slate-200" htmlFor="tagline">
										Optional tagline
									</label>
									<Input
										id="tagline"
										value={creatorForm.tagline}
										onChange={handleCreatorChange("tagline")}
										placeholder="Short hook that appears next to your journeys"
										className="border-purple-500/40 bg-slate-950 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500"
									/>
								</div>

								<div className="space-y-4 rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-900/10 to-blue-900/10 px-6 py-5">
									<h3 className="text-sm font-semibold text-purple-300 uppercase tracking-wide">Review checklist</h3>
									<p className="text-sm text-slate-300">
										Make sure you’ve reviewed the guidelines before submitting. These acknowledgements are required for approval.
									</p>
									<label className="flex items-start gap-3 text-sm text-slate-200">
										<input
											type="checkbox"
											className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
											checked={creatorForm.acceptGuidelines}
											onChange={handleCreatorToggle("acceptGuidelines")}
										/>
										<span>
											I acknowledge Loop’s story guidelines and community standards.
										</span>
									</label>
									<label className="flex items-start gap-3 text-sm text-slate-200">
										<input
											type="checkbox"
											className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
											checked={creatorForm.acceptTerms}
											onChange={handleCreatorToggle("acceptTerms")}
										/>
										<span>
											I agree to Loop’s
											{" "}
											<Link href="/terms" className="text-purple-300 underline-offset-2 hover:text-purple-200 hover:underline">
												Terms of Service
											</Link>
											{" "}and
											{" "}
											<Link href="/privacy" className="text-purple-300 underline-offset-2 hover:text-purple-200 hover:underline">
												Privacy Policy
											</Link>
											.
										</span>
									</label>
									<label className="flex items-start gap-3 text-sm text-slate-200">
										<input
											type="checkbox"
											className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
											checked={creatorForm.acceptConsent}
											onChange={handleCreatorToggle("acceptConsent")}
										/>
										<span>
											I consent to Loop transferring approved stories to the platform catalogue. Removal after approval starts via the
											{" "}
											<Link href="/contact" className="text-purple-300 underline-offset-2 hover:text-purple-200 hover:underline">
												Contact Us
											</Link>
											{" "}channel.
										</span>
									</label>
									<div className="space-y-2 pt-2">
										<label className="text-sm font-medium text-slate-200" htmlFor="consentStatement">
											Optional note to reviewers
										</label>
										<Textarea
											id="consentStatement"
											value={creatorForm.consentStatement}
											onChange={handleCreatorChange("consentStatement")}
											rows={3}
											placeholder="Share sensitive content notices, review deadlines, or anything else the team should know."
											className="border-purple-500/40 bg-slate-950 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500"
										/>
									</div>
								</div>

								<div className="flex flex-col gap-3 border-t border-slate-800 pt-6 sm:flex-row sm:items-center sm:justify-between">
									<div className="text-sm text-slate-400">
										{creatorReady ? (
											<span className="text-emerald-300">Profile is ready. Keep it updated as your work evolves.</span>
										) : (
											<span>Complete required fields and acknowledgements to request story approvals.</span>
										)}
									</div>
									<div className="flex flex-wrap gap-3">
										<Button
											type="submit"
											disabled={creatorSaving || creatorSubmissionDisabled}
											className="bg-gradient-to-r from-purple-600 to-blue-600 px-8 text-white transition hover:from-purple-500 hover:to-blue-500 disabled:opacity-70"
										>
											{creatorSaving ? "Saving…" : "Save creator profile"}
										</Button>
										<Button
											type="button"
											variant="outline"
											className="border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800"
											onClick={() => router.push("/creator")}
										>
											Go to creator dashboard
										</Button>
									</div>
								</div>
							</form>
						</CardContent>
					</Card>
				) : (
					<Card id="creator" className="border-dashed border-slate-700 bg-slate-900/50">
						<CardHeader>
							<CardTitle className="text-white">Want to become a creator?</CardTitle>
							<CardDescription className="text-slate-400">
								Upgrade your account from the creator dashboard to unlock submissions and the creator section on this page.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<p className="text-sm text-slate-400">Use the creator dashboard to request access, then return here to complete your profile.</p>
							<Button onClick={() => router.push("/creator")} className="bg-blue-600 text-white hover:bg-blue-700">
								Open creator dashboard
							</Button>
						</CardContent>
					</Card>
				)}
			</main>
		</div>
	)
}
