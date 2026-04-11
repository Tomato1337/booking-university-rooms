import type * as React from "react"
import {
  IconAccessPoint,
  IconBox,
  IconBroadcast,
  IconChalkboard,
  IconDeviceDesktop,
  IconMicrophone,
  IconPresentation,
  IconTerminal2,
  IconVideo,
  IconVolume,
  IconWifi,
} from "@tabler/icons-react"

export type TablerIcon = React.ComponentType<{ className?: string; size?: number }>

type BackendEquipmentIconName =
  | "IconVideo"
  | "IconPresentation"
  | "IconBroadcast"
  | "IconDeviceDesktop"
  | "IconMicrophone"
  | "IconWifi"
  | "IconVolume"
  | "IconTerminal2"
  | "IconChalkboard"
  | "IconAccessPoint"

const ICON_MAP: Record<BackendEquipmentIconName, TablerIcon> = {
  IconVideo: IconVideo,
  IconPresentation: IconPresentation,
  IconBroadcast: IconBroadcast,
  IconDeviceDesktop: IconDeviceDesktop,
  IconMicrophone: IconMicrophone,
  IconWifi: IconWifi,
  IconVolume: IconVolume,
  IconTerminal2: IconTerminal2,
  IconChalkboard: IconChalkboard,
  IconAccessPoint: IconAccessPoint,
}

export function getEquipmentIcon(iconName: string): TablerIcon {
  return ICON_MAP[iconName as BackendEquipmentIconName] ?? IconBox
}
