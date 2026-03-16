"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FolderPlus, Upload, Folder, FileText, Video, Presentation, Trash2, ChevronRight, ChevronDown, Link2, X, Users, Lock, ListOrdered, FileSpreadsheet } from "lucide-react"
import { FileViewer } from "@/components/viewers/file-viewer"
import { FolderPermissionsDialog } from "@/components/folders/folder-permissions-dialog"
import { FileOrderManager } from "@/components/folders/file-order-manager"
import type { Folder as FolderType, FileItem } from "@/lib/types"

interface FolderWithChildren extends FolderType {
  children: FolderWithChildren[]
  files: FileItem[]
}

export default function TeacherContentPage() {
  const { user } = useAuth()
  const [folders, setFolders] = useState<FolderWithChildren[]>([])
  const [allFolders, setAllFolders] = useState<FolderType[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Dialog states
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [externalLinkDialogOpen, setExternalLinkDialogOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [parentFolderId, setParentFolderId] = useState<string | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadFolderId, setUploadFolderId] = useState<string>("")
  const [uploading, setUploading] = useState(false)
  
  // External link states
  const [externalLinkName, setExternalLinkName] = useState("")
  const [externalLinkUrl, setExternalLinkUrl] = useState("")
  const [externalLinkFolderId, setExternalLinkFolderId] = useState<string>("")
  const [savingExternalLink, setSavingExternalLink] = useState(false)
  
  // Document link states (Google Drive PDFs/PPTs)
  const [documentLinkDialogOpen, setDocumentLinkDialogOpen] = useState(false)
  const [documentLinkName, setDocumentLinkName] = useState("")
  const [documentLinkUrl, setDocumentLinkUrl] = useState("")
  const [documentLinkFolderId, setDocumentLinkFolderId] = useState<string>("")
  const [savingDocumentLink, setSavingDocumentLink] = useState(false)
  
  // Permissions dialog state
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false)
  const [permissionsFolderId, setPermissionsFolderId] = useState<string | null>(null)
  
  // File order dialog state
  const [fileOrderDialogOpen, setFileOrderDialogOpen] = useState(false)
  const [fileOrderFolderId, setFileOrderFolderId] = useState<string | null>(null)

  const loadFolders = useCallback(async () => {
    const supabase = createClient()

    // Load all folders
    const { data: foldersData } = await supabase
      .from("folders")
      .select("*")
      .order("name")

    // Load all files
    const { data: filesData } = await supabase
      .from("files")
      .select("*")
      .order("position, name")

    if (foldersData) {
      setAllFolders(foldersData)
      // Build tree structure
      const tree = buildFolderTree(foldersData, filesData || [])
      setFolders(tree)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    loadFolders()
  }, [loadFolders])

  function buildFolderTree(folders: FolderType[], files: FileItem[]): FolderWithChildren[] {
    const folderMap = new Map<string, FolderWithChildren>()

    // Initialize all folders with empty children and files
    folders.forEach((folder) => {
      folderMap.set(folder.id, {
        ...folder,
        children: [],
        files: files.filter((f) => f.folder_id === folder.id),
      })
    })

    // Build hierarchy
    const rootFolders: FolderWithChildren[] = []
    folders.forEach((folder) => {
      const folderWithChildren = folderMap.get(folder.id)!
      if (folder.parent_id) {
        const parent = folderMap.get(folder.parent_id)
        if (parent) {
          parent.children.push(folderWithChildren)
        }
      } else {
        rootFolders.push(folderWithChildren)
      }
    })

    return rootFolders
  }

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
    }
    setExpandedFolders(newExpanded)
    setSelectedFolder(folderId)
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return

    const supabase = createClient()
    const { error } = await supabase.from("folders").insert({
      name: newFolderName,
      parent_id: parentFolderId,
      created_by: user!.id,
    })

    if (!error) {
      setNewFolderName("")
      setParentFolderId(null)
      setFolderDialogOpen(false)
      loadFolders()
    }
  }

  const handleUploadFile = async () => {
    if (!uploadFile || !uploadFolderId) return

    setUploading(true)
    const supabase = createClient()

    // Determine file type
    const ext = uploadFile.name.split(".").pop()?.toLowerCase()
    let fileType: "video" | "pdf" | "powerpoint" = "pdf"
    if (["mp4", "webm", "mov", "avi"].includes(ext || "")) {
      fileType = "video"
    } else if (["ppt", "pptx"].includes(ext || "")) {
      fileType = "powerpoint"
    }

    // Upload to storage - sanitize filename
    const fileName = `${Date.now()}-${uploadFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("course-materials")
      .upload(fileName, uploadFile, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error("Upload error:", uploadError)
      alert("Failed to upload file: " + uploadError.message)
      setUploading(false)
      return
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("course-materials")
      .getPublicUrl(uploadData.path)

    // Create file record
    const { error } = await supabase.from("files").insert({
      name: uploadFile.name,
      type: fileType,
      file_url: urlData.publicUrl,
      folder_id: uploadFolderId,
      uploaded_by: user!.id,
      file_size: uploadFile.size,
    })

    if (!error) {
      setUploadFile(null)
      setUploadFolderId("")
      setUploadDialogOpen(false)
      loadFolders()
    }

    setUploading(false)
  }

  const handleAddExternalLink = async () => {
    if (!externalLinkName.trim() || !externalLinkUrl.trim() || !externalLinkFolderId) return

    // Validate URL is from Google Drive or OneDrive
    const isGoogleDrive = externalLinkUrl.includes("drive.google.com")
    const isOneDrive = externalLinkUrl.includes("onedrive.live.com") || 
                       externalLinkUrl.includes("1drv.ms") || 
                       externalLinkUrl.includes("sharepoint.com")

    if (!isGoogleDrive && !isOneDrive) {
      alert("Please enter a valid Google Drive or OneDrive link")
      return
    }

    setSavingExternalLink(true)
    const supabase = createClient()

    // Create file record for external video
    const { error } = await supabase.from("files").insert({
      name: externalLinkName,
      type: "external_video",
      file_url: "", // No file URL for external links
      external_url: externalLinkUrl,
      is_external: true,
      folder_id: externalLinkFolderId,
      uploaded_by: user!.id,
      file_size: 0,
    })

    if (!error) {
      setExternalLinkName("")
      setExternalLinkUrl("")
      setExternalLinkFolderId("")
      setExternalLinkDialogOpen(false)
      loadFolders()
    } else {
      alert("Failed to add external link: " + error.message)
    }

    setSavingExternalLink(false)
  }

  const handleAddDocumentLink = async () => {
    if (!documentLinkName.trim() || !documentLinkUrl.trim() || !documentLinkFolderId) return

    // Validate URL is from Google Drive
    const isGoogleDrive = documentLinkUrl.includes("drive.google.com") || 
                          documentLinkUrl.includes("docs.google.com")

    if (!isGoogleDrive) {
      alert("Please enter a valid Google Drive link")
      return
    }

    setSavingDocumentLink(true)
    const supabase = createClient()

    // Create file record for Google Drive document
    const { error } = await supabase.from("files").insert({
      name: documentLinkName,
      type: "google_drive_document",
      file_url: "",
      external_url: documentLinkUrl,
      is_external: true,
      folder_id: documentLinkFolderId,
      uploaded_by: user!.id,
      file_size: 0,
    })

    if (!error) {
      setDocumentLinkName("")
      setDocumentLinkUrl("")
      setDocumentLinkFolderId("")
      setDocumentLinkDialogOpen(false)
      loadFolders()
    } else {
      alert("Failed to add document link: " + error.message)
    }

    setSavingDocumentLink(false)
  }

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm("Are you sure you want to delete this folder and all its contents?")) return

    const supabase = createClient()
    await supabase.from("folders").delete().eq("id", folderId)
    loadFolders()
  }

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return

    const supabase = createClient()
    await supabase.from("files").delete().eq("id", fileId)
    loadFolders()
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4 text-blue-500" />
      case "external_video":
        return <Link2 className="h-4 w-4 text-purple-500" />
      case "pdf":
        return <FileText className="h-4 w-4 text-red-500" />
      case "powerpoint":
        return <Presentation className="h-4 w-4 text-orange-500" />
      case "google_drive_document":
        return <FileSpreadsheet className="h-4 w-4 text-green-500" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const renderFolder = (folder: FolderWithChildren, depth: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id)
    const isSelected = selectedFolder === folder.id

    return (
      <div key={folder.id}>
        <div
          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-muted transition-colors group ${
            isSelected ? "bg-muted" : ""
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => toggleFolder(folder.id)}
        >
          {folder.children.length > 0 || folder.files.length > 0 ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <span className="w-4" />
          )}
          <Folder className="h-4 w-4 text-yellow-500" />
          <span className="flex-1 text-sm font-medium">{folder.name}</span>
          {folder.is_restricted && (
            <Lock className="h-3 w-3 text-amber-500" />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100"
            title="Manage Access"
            onClick={(e) => {
              e.stopPropagation()
              setPermissionsFolderId(folder.id)
              setPermissionsDialogOpen(true)
            }}
          >
            <Users className="h-3 w-3 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100"
            title="File Order"
            onClick={(e) => {
              e.stopPropagation()
              setFileOrderFolderId(folder.id)
              setFileOrderDialogOpen(true)
            }}
          >
            <ListOrdered className="h-3 w-3 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteFolder(folder.id)
            }}
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>

        {isExpanded && (
          <>
            {folder.files.map((file) => (
              <div
                key={file.id}
                className={`flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors group cursor-pointer ${
                  selectedFile?.id === file.id ? "bg-primary/10 border border-primary/30" : ""
                }`}
                style={{ paddingLeft: `${(depth + 1) * 16 + 24}px` }}
                onClick={() => setSelectedFile(file)}
              >
                {getFileIcon(file.type)}
                <span className="flex-1 text-sm">{file.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteFile(file.id)
                  }}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
            {folder.children.map((child) => renderFolder(child, depth + 1))}
          </>
        )}
      </div>
    )
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
          <h1 className="text-3xl font-bold tracking-tight">Course Content</h1>
          <p className="text-muted-foreground">Manage your folders and learning materials</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FolderPlus className="mr-2 h-4 w-4" />
                New Folder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
                <DialogDescription>Add a new folder to organize your content</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Field>
                  <FieldLabel>Folder Name</FieldLabel>
                  <Input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Enter folder name"
                  />
                </Field>
                <Field>
                  <FieldLabel>Parent Folder (Optional)</FieldLabel>
                  <Select
                    value={parentFolderId || "root"}
                    onValueChange={(v) => setParentFolderId(v === "root" ? null : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent folder" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="root">Root (No Parent)</SelectItem>
                      {allFolders.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateFolder}>Create Folder</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={documentLinkDialogOpen} onOpenChange={setDocumentLinkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Add Document Link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Google Drive Document</DialogTitle>
                <DialogDescription>
                  Add a PDF or PowerPoint from Google Drive. Students can view but not download.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Field>
                  <FieldLabel>Document Name</FieldLabel>
                  <Input
                    value={documentLinkName}
                    onChange={(e) => setDocumentLinkName(e.target.value)}
                    placeholder="Enter a name for this document"
                  />
                </Field>
                <Field>
                  <FieldLabel>Google Drive Link</FieldLabel>
                  <Input
                    value={documentLinkUrl}
                    onChange={(e) => setDocumentLinkUrl(e.target.value)}
                    placeholder="Paste Google Drive sharing link"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports: PDFs, PowerPoints, Google Docs, Google Slides
                  </p>
                </Field>
                <Field>
                  <FieldLabel>Select Folder</FieldLabel>
                  <Select value={documentLinkFolderId} onValueChange={setDocumentLinkFolderId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select folder" />
                    </SelectTrigger>
                    <SelectContent>
                      {allFolders.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm font-medium mb-2">How to get the link:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>1. Open your file in Google Drive</li>
                    <li>2. Click Share button (top right)</li>
                    <li>3. Set access to "Anyone with the link can view"</li>
                    <li>4. Click "Copy link" and paste it here</li>
                  </ul>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDocumentLinkDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddDocumentLink} 
                  disabled={savingDocumentLink || !documentLinkName || !documentLinkUrl || !documentLinkFolderId}
                >
                  {savingDocumentLink ? "Adding..." : "Add Document"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={externalLinkDialogOpen} onOpenChange={setExternalLinkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Link2 className="mr-2 h-4 w-4" />
                Add Video Link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add External Video Link</DialogTitle>
                <DialogDescription>
                  Add a video from Google Drive or OneDrive. The link will be hidden from students.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Field>
                  <FieldLabel>Video Name</FieldLabel>
                  <Input
                    value={externalLinkName}
                    onChange={(e) => setExternalLinkName(e.target.value)}
                    placeholder="Enter a name for this video"
                  />
                </Field>
                <Field>
                  <FieldLabel>Video Link</FieldLabel>
                  <Input
                    value={externalLinkUrl}
                    onChange={(e) => setExternalLinkUrl(e.target.value)}
                    placeholder="Paste Google Drive or OneDrive link"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Supported: Google Drive sharing links, OneDrive/SharePoint links
                  </p>
                </Field>
                <Field>
                  <FieldLabel>Select Folder</FieldLabel>
                  <Select value={externalLinkFolderId} onValueChange={setExternalLinkFolderId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select folder" />
                    </SelectTrigger>
                    <SelectContent>
                      {allFolders.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm font-medium mb-2">How to get the link:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li><strong>Google Drive:</strong> Right-click the video → Share → Copy link (make sure "Anyone with the link can view")</li>
                    <li><strong>OneDrive:</strong> Right-click the video → Share → Copy link (set to "Anyone with the link")</li>
                  </ul>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setExternalLinkDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddExternalLink} 
                  disabled={savingExternalLink || !externalLinkName || !externalLinkUrl || !externalLinkFolderId}
                >
                  {savingExternalLink ? "Adding..." : "Add Video Link"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload File
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload File</DialogTitle>
                <DialogDescription>Upload a video, PDF, or PowerPoint file</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Field>
                  <FieldLabel>Select Folder</FieldLabel>
                  <Select value={uploadFolderId} onValueChange={setUploadFolderId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select folder" />
                    </SelectTrigger>
                    <SelectContent>
                      {allFolders.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>File</FieldLabel>
                  <Input
                    type="file"
                    accept=".pdf,.ppt,.pptx,.mp4,.webm,.mov"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Supported: PDF, PowerPoint, Video (MP4, WebM, MOV)
                  </p>
                </Field>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUploadFile} disabled={uploading || !uploadFile || !uploadFolderId}>
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Folder Structure</CardTitle>
            <CardDescription>Click on folders to expand and view contents</CardDescription>
          </CardHeader>
          <CardContent>
            {folders.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No folders yet. Create your first folder to get started.
              </p>
            ) : (
              <div className="space-y-1">{folders.map((folder) => renderFolder(folder))}</div>
            )}
          </CardContent>
        </Card>

        {/* File Preview Panel */}
        <Card className="lg:sticky lg:top-6 h-fit">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>File Preview</CardTitle>
              <CardDescription>
                {selectedFile ? selectedFile.name : "Select a file to preview"}
              </CardDescription>
            </div>
            {selectedFile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {selectedFile ? (
              <div className="h-[500px] border rounded-lg overflow-hidden">
                <FileViewer file={selectedFile} canDownload={true} />
              </div>
            ) : (
              <div className="h-[500px] flex items-center justify-center border rounded-lg bg-muted/50">
                <p className="text-muted-foreground text-center">
                  Click on a file from the folder tree to preview it here
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Folder Permissions Dialog */}
      {permissionsFolderId && (
        <FolderPermissionsDialog
          open={permissionsDialogOpen}
          onOpenChange={setPermissionsDialogOpen}
          folderId={permissionsFolderId}
          folderName={allFolders.find(f => f.id === permissionsFolderId)?.name || ""}
          isRestricted={allFolders.find(f => f.id === permissionsFolderId)?.is_restricted || false}
          onSave={loadFolders}
        />
      )}

      {/* File Order Manager Dialog */}
      {fileOrderFolderId && (() => {
        const folder = allFolders.find(f => f.id === fileOrderFolderId);
        const folderFiles = folders.flatMap(function findFiles(f: FolderWithChildren): FileItem[] {
          if (f.id === fileOrderFolderId) return f.files;
          return f.children.flatMap(findFiles);
        });
        return (
          <FileOrderManager
            open={fileOrderDialogOpen}
            onOpenChange={setFileOrderDialogOpen}
            folderId={fileOrderFolderId}
            folderName={folder?.name || ""}
            files={folderFiles}
            sequentialOrder={folder?.sequential_order || false}
            onSave={loadFolders}
          />
        );
      })()}
    </div>
  )
}
