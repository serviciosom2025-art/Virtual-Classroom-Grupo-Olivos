"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { FolderTree } from "@/components/folders/folder-tree";
import { FileViewer } from "@/components/viewers/file-viewer";
import {
  FolderPlus,
  Upload,
  Trash2,
  Edit2,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Folder, FileItem } from "@/lib/types";

export default function FoldersPage() {
  const { user } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Dialog states
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [uploadFileOpen, setUploadFileOpen] = useState(false);
  const [editFolderOpen, setEditFolderOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Form states
  const [newFolderName, setNewFolderName] = useState("");
  const [editFolderName, setEditFolderName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFileType, setUploadFileType] = useState<string>("video");

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      const [foldersRes, filesRes] = await Promise.all([
        supabase.from("folders").select("*").order("name"),
        supabase.from("files").select("*").order("name"),
      ]);

      setFolders(foldersRes.data || []);
      setFiles(filesRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setFormLoading(true);

    const { error } = await supabase.from("folders").insert({
      name: newFolderName,
      parent_id: selectedFolderId,
      created_by: user.id,
    });

    if (!error) {
      setNewFolderName("");
      setCreateFolderOpen(false);
      fetchData();
    }
    setFormLoading(false);
  };

  const handleEditFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFolderId) return;
    setFormLoading(true);

    const { error } = await supabase
      .from("folders")
      .update({ name: editFolderName })
      .eq("id", selectedFolderId);

    if (!error) {
      setEditFolderName("");
      setEditFolderOpen(false);
      fetchData();
    }
    setFormLoading(false);
  };

  const handleDeleteFolder = async () => {
    if (!selectedFolderId) return;
    if (!confirm("Are you sure? This will delete all contents inside this folder.")) return;

    const { error } = await supabase
      .from("folders")
      .delete()
      .eq("id", selectedFolderId);

    if (!error) {
      setSelectedFolderId(null);
      fetchData();
    }
  };

  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !selectedFolderId || !user) return;
    setFormLoading(true);

    try {
      // Generate unique filename
      const fileName = `${Date.now()}-${uploadFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      // Upload to Supabase Storage with upsert option
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("course-materials")
        .upload(fileName, uploadFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw new Error(uploadError.message || "Failed to upload to storage");
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("course-materials")
        .getPublicUrl(uploadData.path);

      // Save file record to database
      const { error: fileError } = await supabase.from("files").insert({
        name: uploadFile.name,
        type: uploadFileType,
        file_url: urlData.publicUrl,
        folder_id: selectedFolderId,
        uploaded_by: user.id,
        file_size: uploadFile.size,
      });

      if (fileError) {
        console.error("Database insert error:", fileError);
        throw new Error(fileError.message || "Failed to save file record");
      }

      setUploadFile(null);
      setUploadFileOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Upload error:", error);
      alert("Failed to upload file: " + (error.message || "Unknown error"));
    }
    setFormLoading(false);
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    const { error } = await supabase.from("files").delete().eq("id", fileId);

    if (!error) {
      setSelectedFile(null);
      fetchData();
    }
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const selectedFolderData = folders.find((f) => f.id === selectedFolderId);

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      {/* Sidebar - Folder Tree */}
      <Card className="w-80 flex-shrink-0 bg-white shadow-sm flex flex-col">
        <CardHeader className="pb-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Course Materials</CardTitle>
            <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost">
                  <FolderPlus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Folder</DialogTitle>
                  <DialogDescription>
                    {selectedFolderId
                      ? `Creating inside: ${selectedFolderData?.name}`
                      : "Creating at root level"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateFolder} className="space-y-4 mt-4">
                  <Field>
                    <FieldLabel>Folder Name</FieldLabel>
                    <Input
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="e.g., Week 1"
                      required
                    />
                  </Field>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setCreateFolderOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={formLoading} className="bg-blue-600 hover:bg-blue-700">
                      {formLoading && <Spinner className="w-4 h-4 mr-2" />}
                      Create
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner className="w-6 h-6 text-blue-600" />
            </div>
          ) : (
            <FolderTree
              folders={folders}
              files={files}
              selectedFolderId={selectedFolderId}
              selectedFileId={selectedFile?.id || null}
              onSelectFolder={setSelectedFolderId}
              onSelectFile={setSelectedFile}
              expandedFolders={expandedFolders}
              onToggleFolder={toggleFolder}
            />
          )}
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <Card className="bg-white shadow-sm mb-4">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedFolderId && (
                  <>
                    <Dialog open={uploadFileOpen} onOpenChange={setUploadFileOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          <Upload className="w-4 h-4 mr-2" />
                          Upload File
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Upload File</DialogTitle>
                          <DialogDescription>
                            Upload to: {selectedFolderData?.name}
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleUploadFile} className="space-y-4 mt-4">
                          <Field>
                            <FieldLabel>File Type</FieldLabel>
                            <Select value={uploadFileType} onValueChange={setUploadFileType}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="video">Video</SelectItem>
                                <SelectItem value="pdf">PDF</SelectItem>
                                <SelectItem value="powerpoint">PowerPoint</SelectItem>
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field>
                            <FieldLabel>File</FieldLabel>
                            <Input
                              type="file"
                              accept={
                                uploadFileType === "video"
                                  ? "video/*"
                                  : uploadFileType === "pdf"
                                  ? ".pdf"
                                  : ".ppt,.pptx"
                              }
                              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                              required
                            />
                          </Field>
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setUploadFileOpen(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={formLoading} className="bg-blue-600 hover:bg-blue-700">
                              {formLoading && <Spinner className="w-4 h-4 mr-2" />}
                              Upload
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditFolderName(selectedFolderData?.name || "");
                            setEditFolderOpen(true);
                          }}
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Rename Folder
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDeleteFolder} className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Folder
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
              {selectedFile && (
                <Button size="sm" variant="destructive" onClick={() => handleDeleteFile(selectedFile.id)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete File
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit Folder Dialog */}
        <Dialog open={editFolderOpen} onOpenChange={setEditFolderOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Folder</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditFolder} className="space-y-4 mt-4">
              <Field>
                <FieldLabel>Folder Name</FieldLabel>
                <Input
                  value={editFolderName}
                  onChange={(e) => setEditFolderName(e.target.value)}
                  required
                />
              </Field>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditFolderOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={formLoading} className="bg-blue-600 hover:bg-blue-700">
                  {formLoading && <Spinner className="w-4 h-4 mr-2" />}
                  Save
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* File Viewer */}
        <Card className="flex-1 bg-white shadow-sm overflow-hidden">
          <CardContent className="h-full p-0">
            {selectedFile ? (
              <FileViewer file={selectedFile} />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <p className="text-lg font-medium">No file selected</p>
                  <p className="text-sm">Select a file from the folder tree to view it</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
