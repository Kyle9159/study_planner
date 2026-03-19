import { useMemo, useRef } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { CSSTransition, SwitchTransition } from "react-transition-group";
import { DashboardPage } from "@/pages/DashboardPage";
import { NewCoursePage } from "@/pages/NewCoursePage";
import { CoursePage } from "@/pages/CoursePage";
import { SettingsPage } from "@/pages/SettingsPage";

export const App: React.FC = () => {
  const location = useLocation();
  const nodeRef = useRef<HTMLDivElement>(null);

  const pageKey = useMemo(() => {
    const segments = location.pathname.split("/").filter(Boolean);
    const first = segments[0] ?? "dashboard";
    // Group all course detail pages under same transition key
    if (first === "courses" && segments[1] && segments[1] !== "new") return "course-detail";
    return first || "dashboard";
  }, [location.pathname]);

  return (
    <SwitchTransition mode="out-in">
      <CSSTransition
        key={pageKey}
        nodeRef={nodeRef}
        timeout={100}
        classNames="page"
        unmountOnExit
      >
        <div ref={nodeRef}>
          <Routes location={location}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/courses/new" element={<NewCoursePage />} />
            <Route path="/courses/:id" element={<CoursePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </CSSTransition>
    </SwitchTransition>
  );
};
