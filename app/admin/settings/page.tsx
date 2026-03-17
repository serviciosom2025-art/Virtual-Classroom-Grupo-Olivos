"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Upload, Save, X, GraduationCap } from "lucide-react";
import type { PlatformSettings } from "@/lib/types";

export default function SettingsPage() {
  const { settings: currentSettings, refreshSettings } = useAuth();
  const [settings, setSettings] = useState<Partial<PlatformSettings>>({});
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [deleteLogo, setDeleteLogo] = useState(false);
  const [deleteBackground, setDeleteBackground] = useState(false);

  useEffect(() => {
    if (currentSettings) {
      setSettings(currentSettings);
    }
  }, [currentSettings]);

  const supabase = createClient();

  const handleSave = async () => {
    setLoading(true);

    try {
      let logoUrl = settings.logo_url;
      let backgroundUrl = settings.background_image_url;

      // Handle logo deletion
      if (deleteLogo) {
        logoUrl = null;
      }
      // Upload logo if changed
      else if (logoFile) {
        const fileExt = logoFile.name.split(".").pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;
        const { data, error } = await supabase.storage
          .from("platform-assets")
          .upload(fileName, logoFile);

        if (!error && data) {
          const { data: urlData } = supabase.storage
            .from("platform-assets")
            .getPublicUrl(data.path);
          logoUrl = urlData.publicUrl;
        }
      }

      // Handle background deletion
      if (deleteBackground) {
        backgroundUrl = null;
      }
      // Upload background if changed
      else if (backgroundFile) {
        const fileExt = backgroundFile.name.split(".").pop();
        const fileName = `background-${Date.now()}.${fileExt}`;
        const { data, error } = await supabase.storage
          .from("platform-assets")
          .upload(fileName, backgroundFile);

        if (!error && data) {
          const { data: urlData } = supabase.storage
            .from("platform-assets")
            .getPublicUrl(data.path);
          backgroundUrl = urlData.publicUrl;
        }
      }

      // Update settings in database
      const { error } = await supabase
        .from("platform_settings")
        .update({
          platform_name: settings.platform_name,
          login_title: settings.login_title,
          logo_url: logoUrl,
          sidebar_color: settings.sidebar_color,
          primary_color: settings.primary_color,
          background_color: settings.background_color,
          background_image_url: backgroundUrl,
          use_background_image: settings.use_background_image,
          updated_at: new Date().toISOString(),
        })
        .eq("id", settings.id);

      if (error) {
        throw error;
      }

      await refreshSettings();
      setLogoFile(null);
      setBackgroundFile(null);
      setDeleteLogo(false);
      setDeleteBackground(false);
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Platform Settings</h1>
        <p className="text-slate-600">Customize the appearance of your learning platform</p>
      </div>

      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>Set your platform name and logo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Field>
            <FieldLabel>Platform Name</FieldLabel>
            <Input
              value={settings.platform_name || ""}
              onChange={(e) => setSettings({ ...settings, platform_name: e.target.value })}
              placeholder="Virtual Classroom"
            />
            <p className="text-xs text-muted-foreground mt-1">Shown in the sidebar</p>
          </Field>

          <Field>
            <FieldLabel>Login Page Title</FieldLabel>
            <Input
              value={settings.login_title || ""}
              onChange={(e) => setSettings({ ...settings, login_title: e.target.value })}
              placeholder="Virtual Classroom LMS"
            />
            <p className="text-xs text-muted-foreground mt-1">Shown on the login page</p>
          </Field>

          <Field>
            <FieldLabel>Logo</FieldLabel>
            <div className="flex items-center gap-4">
              {/* Show current logo, new file, or default icon */}
              <div className="relative">
                <div className="w-16 h-16 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50">
                  {(settings.logo_url || logoFile) && !deleteLogo ? (
                    <img
                      src={logoFile ? URL.createObjectURL(logoFile) : settings.logo_url || ""}
                      alt="Logo preview"
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <GraduationCap className="w-8 h-8 text-blue-600" />
                  )}
                </div>
                {/* Show X button to delete logo when there's a logo */}
                {(settings.logo_url || logoFile) && !deleteLogo && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteLogo(true);
                      setLogoFile(null);
                    }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors"
                    title="Remove logo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <label className="cursor-pointer">
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    setLogoFile(e.target.files?.[0] || null);
                    setDeleteLogo(false);
                  }}
                />
                <div className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Upload Logo</span>
                </div>
              </label>
            </div>
          </Field>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Colors</CardTitle>
          <CardDescription>Customize the color scheme</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Field>
              <FieldLabel>Sidebar Color</FieldLabel>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={settings.sidebar_color || "#1e293b"}
                  onChange={(e) => setSettings({ ...settings, sidebar_color: e.target.value })}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={settings.sidebar_color || "#1e293b"}
                  onChange={(e) => setSettings({ ...settings, sidebar_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </Field>

            <Field>
              <FieldLabel>Primary Color</FieldLabel>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={settings.primary_color || "#3b82f6"}
                  onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={settings.primary_color || "#3b82f6"}
                  onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </Field>

            <Field>
              <FieldLabel>Background Color</FieldLabel>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={settings.background_color || "#f8fafc"}
                  onChange={(e) => setSettings({ ...settings, background_color: e.target.value })}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={settings.background_color || "#f8fafc"}
                  onChange={(e) => setSettings({ ...settings, background_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Background</CardTitle>
          <CardDescription>Set a custom background image</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-3">
            <Switch
              checked={settings.use_background_image || false}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, use_background_image: checked })
              }
              id="use-bg-image"
            />
            <Label htmlFor="use-bg-image">Use background image</Label>
          </div>

          {settings.use_background_image && (
            <Field>
              <FieldLabel>Background Image</FieldLabel>
              <div className="space-y-4">
                {(settings.background_image_url || backgroundFile) && !deleteBackground && (
                  <div className="relative">
                    <div className="w-full h-40 rounded-lg border border-slate-200 overflow-hidden">
                      <img
                        src={
                          backgroundFile
                            ? URL.createObjectURL(backgroundFile)
                            : settings.background_image_url || ""
                        }
                        alt="Background preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* X button to delete background */}
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteBackground(true);
                        setBackgroundFile(null);
                      }}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors shadow-md"
                      title="Remove background image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <label className="cursor-pointer inline-block">
                  <Input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      setBackgroundFile(e.target.files?.[0] || null);
                      setDeleteBackground(false);
                    }}
                  />
                  <div className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>Upload Background</span>
                  </div>
                </label>
              </div>
            </Field>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? <Spinner className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
