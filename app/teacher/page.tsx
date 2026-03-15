"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { FolderOpen, FileText, Users, Award, Plus, TrendingUp } from "lucide-react"

export default function TeacherDashboard() {
  const { user, profile } = useAuth()
  const [stats, setStats] = useState({
    folders: 0,
    files: 0,
    students: 0,
    exams: 0,
  })
  const [recentFiles, setRecentFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadStats()
    }
  }, [user])

  async function loadStats() {
    const supabase = createClient()

    // Load folder count (teacher's folders)
    const { count: folderCount } = await supabase
      .from("folders")
      .select("*", { count: "exact", head: true })
      .eq("created_by", user!.id)

    // Load file count (teacher's files)
    const { count: fileCount } = await supabase
      .from("files")
      .select("*", { count: "exact", head: true })
      .eq("uploaded_by", user!.id)

    // Load student count
    const { count: studentCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "student")

    // Load exam count (teacher's exams)
    const { count: examCount } = await supabase
      .from("exams")
      .select("*", { count: "exact", head: true })
      .eq("created_by", user!.id)

    // Load recent files
    const { data: files } = await supabase
      .from("files")
      .select(`
        *,
        folder:folders(name)
      `)
      .eq("uploaded_by", user!.id)
      .order("created_at", { ascending: false })
      .limit(5)

    setStats({
      folders: folderCount || 0,
      files: fileCount || 0,
      students: studentCount || 0,
      exams: examCount || 0,
    })
    setRecentFiles(files || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {profile?.full_name || "Teacher"}
          </h1>
          <p className="text-muted-foreground">
            Manage your courses and track student progress
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/teacher/content">
              <Plus className="mr-2 h-4 w-4" />
              Add Content
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Folders</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.folders}</div>
            <p className="text-xs text-muted-foreground">Course folders created</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Files</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.files}</div>
            <p className="text-xs text-muted-foreground">Learning materials uploaded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.students}</div>
            <p className="text-xs text-muted-foreground">Enrolled students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Exams</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.exams}</div>
            <p className="text-xs text-muted-foreground">Exams created</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your course content</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/teacher/content">
                <FolderOpen className="mr-2 h-4 w-4" />
                Manage Folders & Files
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/teacher/exams">
                <Award className="mr-2 h-4 w-4" />
                Create & Manage Exams
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/teacher/reports">
                <TrendingUp className="mr-2 h-4 w-4" />
                View Student Progress
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Uploads</CardTitle>
            <CardDescription>Your latest content</CardDescription>
          </CardHeader>
          <CardContent>
            {recentFiles.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No files uploaded yet
              </p>
            ) : (
              <div className="space-y-2">
                {recentFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2 border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.folder?.name || "Root"}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(file.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
