"use client"

import type React from "react"
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar"

interface ProfileBubbleChipProps {
  avatarUrl?: string | null
  displayName?: string | null
  className?: string
  onClick?: () => void
}

export const ProfileBubbleChip: React.FC<ProfileBubbleChipProps> = ({ avatarUrl, displayName, className, onClick }) => {
  const initial = displayName ? displayName[0].toUpperCase() : "?"

  return (
    <button
      type="button"
      className={`flex items-center gap-2 px-3 py-1 rounded-full bg-purple-600 hover:bg-purple-700 border border-purple-500 hover:border-purple-400 text-white transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/20 ${className ?? ""}`}
      onClick={onClick}
      style={{ minWidth: 0 }}
    >
      <Avatar className="size-7 border-2 border-purple-300">
        {avatarUrl ? (
          <AvatarImage src={avatarUrl || "/placeholder.svg"} alt={displayName ?? "Profile"} />
        ) : (
          <AvatarFallback className="bg-purple-900 text-white font-bold text-sm">{initial}</AvatarFallback>
        )}
      </Avatar>
      <span className="font-medium text-sm truncate max-w-[8rem]">{displayName ?? "Profile"}</span>
    </button>
  )
}
