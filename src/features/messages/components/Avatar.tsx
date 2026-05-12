
"use client";

import { Users } from "lucide-react";
import { avatarColor } from "./helpers";


type Props = {
  name: string;
  size?: number;
  isGroup?: boolean;
};

export function Avatar({ name, size = 40, isGroup = false }: Props) {
  const bg = isGroup ? "#7c3aed" : avatarColor(name);
  const fontSize = Math.round(size * 0.4);
  const iconSize = Math.round(size * 0.48);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        color: "#fff",
        fontWeight: 700,
        fontSize,
        userSelect: "none",
        boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
      }}
    >
      {isGroup ? (
        <Users size={iconSize} color="#fff" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </div>
  );
}