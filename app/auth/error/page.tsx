import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md shadow-2xl border-slate-700 bg-slate-800/90 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-600/20 rounded-2xl flex items-center justify-center">
            <AlertTriangle className="w-9 h-9 text-red-500" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-white">Authentication Error</CardTitle>
            <CardDescription className="text-slate-400 mt-2">
              There was a problem signing you in. Please try again.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link href="/auth/login">Back to Login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
