import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, BookOpen, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, PageMain, SectionCard } from "@/components/layout";
import { useCreateCourseMutation } from "@/hooks/queries/useCourseQueries";

const SEMESTERS = ["Fall", "Spring", "Summer", "Winter"] as const;

const courseSchema = z.object({
  name: z.string().min(1, "Course name is required"),
  code: z.string().min(1, "Course code is required"),
  semester: z.enum(SEMESTERS),
  year: z.coerce.number().int().min(2020).max(2040),
  description: z.string().optional(),
  instructor: z.string().optional(),
});

type CourseFormData = z.infer<typeof courseSchema>;

export const NewCoursePage: React.FC = () => {
  const navigate = useNavigate();
  const createMutation = useCreateCourseMutation();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      semester: "Fall",
      year: new Date().getFullYear(),
    },
  });

  const semester = watch("semester");

  const onSubmit = (data: CourseFormData) => {
    createMutation.mutate(data);
  };

  return (
    <>
      <PageHeader
        icon={BookOpen}
        title="New Course"
        subtitle="Add a course to your study plan"
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        }
      />
      <PageMain className="max-w-2xl">
        <SectionCard>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Course Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. Advanced Machine Learning"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="code">Course Code *</Label>
                <Input id="code" placeholder="e.g. CS-601" {...register("code")} />
                {errors.code && (
                  <p className="text-xs text-destructive">{errors.code.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Semester *</Label>
                <Select
                  value={semester}
                  onValueChange={(v) => setValue("semester", v as typeof semester)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEMESTERS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="year">Year *</Label>
                <Input
                  id="year"
                  type="number"
                  min={2020}
                  max={2040}
                  {...register("year")}
                />
                {errors.year && (
                  <p className="text-xs text-destructive">{errors.year.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="instructor">Instructor</Label>
              <Input
                id="instructor"
                placeholder="e.g. Dr. Smith"
                {...register("instructor")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the course..."
                rows={3}
                {...register("description")}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Course"
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/")}>
                Cancel
              </Button>
            </div>
          </form>
        </SectionCard>
      </PageMain>
    </>
  );
};
