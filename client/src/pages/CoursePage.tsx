import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  BookOpen,
  ClipboardList,
  Edit,
  FileText,
  GraduationCap,
  Layers,
  Loader2,
  MoreVertical,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader, PageMain, SectionCard } from "@/components/layout";
import { GuidePanel } from "@/components/course/GuidePanel";
import { MaterialList } from "@/components/course/MaterialList";
import { UploadZone } from "@/components/course/UploadZone";
import { useCourse, useDeleteCourseMutation, useUpdateCourseMutation } from "@/hooks/queries/useCourseQueries";
import { useGenerateProjectGuideMutation, useGenerateStudyGuideMutation } from "@/hooks/queries/useAiMutations";
import {
  useAddYouTubeMaterialMutation,
  useAddYouTubeRubricMutation,
  useDeleteMaterialMutation,
  useDeleteRubricMutation,
  useUploadMaterialMutation,
  useUploadRubricMutation,
} from "@/hooks/queries/useUploadMutations";
import { useSettings } from "@/hooks/queries/useSettingsQueries";

const SEMESTERS = ["Fall", "Spring", "Summer", "Winter"] as const;

const editSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  semester: z.enum(SEMESTERS),
  year: z.coerce.number().int().min(2020).max(2040),
  description: z.string().optional(),
  instructor: z.string().optional(),
});

type EditFormData = z.infer<typeof editSchema>;

export const CoursePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: course, isLoading } = useCourse(id!);
  const { data: settings } = useSettings();
  const updateMutation = useUpdateCourseMutation(id!);
  const deleteMutation = useDeleteCourseMutation();
  const uploadMaterial = useUploadMaterialMutation(id!);
  const addYoutubeMaterial = useAddYouTubeMaterialMutation(id!);
  const deleteMaterial = useDeleteMaterialMutation(id!);
  const uploadRubric = useUploadRubricMutation(id!);
  const addYoutubeRubric = useAddYouTubeRubricMutation(id!);
  const deleteRubric = useDeleteRubricMutation(id!);
  const generateStudy = useGenerateStudyGuideMutation(id!);
  const generateProject = useGenerateProjectGuideMutation(id!);

  const editForm = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
  });

  const openEdit = () => {
    if (!course) return;
    editForm.reset({
      name: course.name,
      code: course.code,
      semester: course.semester as (typeof SEMESTERS)[number],
      year: course.year,
      description: course.description ?? undefined,
      instructor: course.instructor ?? undefined,
    });
    setEditOpen(true);
  };

  const onEditSubmit = (data: EditFormData) => {
    updateMutation.mutate(data, { onSuccess: () => setEditOpen(false) });
  };

  if (isLoading || !course) {
    return (
      <>
        <PageHeader
          icon={BookOpen}
          title="Loading..."
          subtitle=""
          actions={
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          }
        />
        <PageMain>
          <div className="animate-pulse space-y-4">
            <div className="h-10 w-48 rounded-lg bg-muted/40" />
            <div className="h-64 rounded-xl border border-border/60 bg-card/40" />
          </div>
        </PageMain>
      </>
    );
  }

  return (
    <>
      <PageHeader
        icon={BookOpen}
        title={course.name}
        subtitle={course.code}
        badge={`${course.semester} ${course.year}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={openEdit}>
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
        }
      />

      <PageMain>
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">
              <GraduationCap className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="materials">
              <FileText className="h-4 w-4" />
              Materials
              {course.materials.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                  {course.materials.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="rubric">
              <Layers className="h-4 w-4" />
              Rubric
              {course.rubrics.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                  {course.rubrics.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="study-guide">
              <Sparkles className="h-4 w-4" />
              Study Guide
            </TabsTrigger>
            <TabsTrigger value="project-guide">
              <ClipboardList className="h-4 w-4" />
              Project Guide
            </TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="mt-4">
            <SectionCard>
              <dl className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <dt className="w-28 shrink-0 text-muted-foreground">Course Name</dt>
                  <dd className="font-medium">{course.name}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-28 shrink-0 text-muted-foreground">Code</dt>
                  <dd className="font-mono">{course.code}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-28 shrink-0 text-muted-foreground">Semester</dt>
                  <dd>
                    {course.semester} {course.year}
                  </dd>
                </div>
                {course.instructor && (
                  <div className="flex gap-3">
                    <dt className="w-28 shrink-0 text-muted-foreground">Instructor</dt>
                    <dd>{course.instructor}</dd>
                  </div>
                )}
                {course.description && (
                  <div className="flex gap-3">
                    <dt className="w-28 shrink-0 text-muted-foreground">Description</dt>
                    <dd className="text-muted-foreground">{course.description}</dd>
                  </div>
                )}
                <div className="flex gap-3">
                  <dt className="w-28 shrink-0 text-muted-foreground">Materials</dt>
                  <dd>{course.materials.length} file{course.materials.length !== 1 ? "s" : ""}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-28 shrink-0 text-muted-foreground">Rubric</dt>
                  <dd>{course.rubrics.length} file{course.rubrics.length !== 1 ? "s" : ""}</dd>
                </div>
              </dl>
            </SectionCard>
          </TabsContent>

          {/* Materials */}
          <TabsContent value="materials" className="mt-4 space-y-4">
            <SectionCard
              title="Study Materials"
              description="Upload course guides, lecture notes, textbooks, and video links"
            >
              <div className="space-y-4">
                <UploadZone
                  onFile={async (fd) => {
                    await uploadMaterial.mutateAsync(fd);
                  }}
                  onYouTube={async (url) => {
                    await addYoutubeMaterial.mutateAsync(url);
                  }}
                  isUploading={uploadMaterial.isPending || addYoutubeMaterial.isPending}
                  label="Upload study materials"
                />
                <MaterialList
                  items={course.materials}
                  onDelete={(materialId) => deleteMaterial.mutate(materialId)}
                  deletingId={deleteMaterial.isPending ? undefined : undefined}
                  emptyText="No study materials yet — upload files or add a YouTube link above"
                />
              </div>
            </SectionCard>
          </TabsContent>

          {/* Rubric */}
          <TabsContent value="rubric" className="mt-4 space-y-4">
            <SectionCard
              title="Project Rubric & Instructions"
              description="Upload your final project rubric, instructions, and grading criteria"
            >
              <div className="space-y-4">
                <UploadZone
                  onFile={async (fd) => {
                    await uploadRubric.mutateAsync(fd);
                  }}
                  onYouTube={async (url) => {
                    await addYoutubeRubric.mutateAsync(url);
                  }}
                  isUploading={uploadRubric.isPending || addYoutubeRubric.isPending}
                  label="Upload rubric / instructions"
                />
                <MaterialList
                  items={course.rubrics}
                  onDelete={(rubricId) => deleteRubric.mutate(rubricId)}
                  emptyText="No rubric uploaded yet — upload your project instructions above"
                />
              </div>
            </SectionCard>
          </TabsContent>

          {/* Study Guide */}
          <TabsContent value="study-guide" className="mt-4">
            <SectionCard
              title="AI Study Guide"
              description="Generated based on your materials and rubric — focused on what you need to know"
            >
              <GuidePanel
                guide={course.studyGuide}
                isGenerating={generateStudy.isPending}
                onGenerate={(model) => generateStudy.mutate({ model })}
                guideType="study"
                defaultModel={settings?.defaultModel ?? undefined}
              />
            </SectionCard>
          </TabsContent>

          {/* Project Guide */}
          <TabsContent value="project-guide" className="mt-4">
            <SectionCard
              title="AI Project Completion Guide"
              description="Step-by-step guidance for completing your final project based on the rubric"
            >
              <GuidePanel
                guide={course.projectGuide}
                isGenerating={generateProject.isPending}
                onGenerate={(model) => generateProject.mutate({ model })}
                guideType="project"
                defaultModel={settings?.defaultModel ?? undefined}
              />
            </SectionCard>
          </TabsContent>
        </Tabs>
      </PageMain>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
            <DialogDescription>Update your course details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Course Name</Label>
                <Input {...editForm.register("name")} />
              </div>
              <div className="space-y-1">
                <Label>Code</Label>
                <Input {...editForm.register("code")} />
              </div>
              <div className="space-y-1">
                <Label>Semester</Label>
                <Select
                  value={editForm.watch("semester")}
                  onValueChange={(v) =>
                    editForm.setValue("semester", v as (typeof SEMESTERS)[number])
                  }
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
              <div className="space-y-1">
                <Label>Year</Label>
                <Input type="number" {...editForm.register("year")} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Instructor</Label>
              <Input {...editForm.register("instructor")} />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea rows={2} {...editForm.register("description")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{course.name}</strong> along with all
              uploaded materials, rubrics, and generated guides. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(id!)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
