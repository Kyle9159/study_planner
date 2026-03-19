import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  PlusCircle,
  Settings,
} from "lucide-react";

export const NAV_LINKS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/courses/new", label: "New Course", icon: PlusCircle },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export const APP_NAME = "Study Planner";
export const APP_ICON = GraduationCap;
export const COURSE_ICON = BookOpen;

export function isNavActive(pathname: string, to: string): boolean {
  if (to === "/" && pathname === "/") return true;
  if (to !== "/" && (pathname === to || pathname.startsWith(`${to}/`))) return true;
  return false;
}
