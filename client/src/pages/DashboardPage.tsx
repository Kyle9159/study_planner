import { BookOpen, GraduationCap, PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, PageMain } from "@/components/layout";
import { CourseCard } from "@/components/course/CourseCard";
import { useCourses } from "@/hooks/queries/useCourseQueries";

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: courses, isLoading } = useCourses();

  return (
    <>
      <PageHeader
        icon={GraduationCap}
        title="Study Planner"
        subtitle="Your Masters Degree courses"
        actions={
          <Button size="sm" onClick={() => navigate("/courses/new")}>
            <PlusCircle className="h-4 w-4" />
            New Course
          </Button>
        }
      />
      <PageMain>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-36 rounded-xl border border-border/60 bg-card/40 animate-pulse"
              />
            ))}
          </div>
        ) : !courses || courses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No courses yet"
            description="Add your first course to get started building your study plan."
            action={
              <Button onClick={() => navigate("/courses/new")}>
                <PlusCircle className="h-4 w-4" />
                Add Course
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </PageMain>
    </>
  );
};
