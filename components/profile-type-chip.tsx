import React from "react";
import { Badge } from "./ui/badge";

export type ProfileType = "User" | "Creator" | "Admin";

interface ProfileTypeChipProps {
  type: ProfileType;
  since?: string; // Optional: for "Creator since ..."
  className?: string;
}

export const ProfileTypeChip: React.FC<ProfileTypeChipProps> = ({ type, since, className }) => {
  let label: string = type;
  if (type === "Creator" && since) {
    label = `Creator since ${since}`;
  }
  return <Badge className={className}>{label}</Badge>;
};
