import { NextResponse } from "next/server";

// This is a simplified PPT viewer that creates placeholder slides
// In production, you would use a service like CloudConvert or LibreOffice
export async function POST(request: Request) {
  try {
    const { url, fileName } = await request.json();

    // For now, we'll create a simple viewer that shows the download option
    // In a production environment, you would:
    // 1. Use a library like pptx2json to parse the PPTX
    // 2. Or use a conversion service to convert slides to images
    
    // Create placeholder slides based on common presentation lengths
    // This allows the UI to work while showing users they need to download
    const slides = [
      {
        imageUrl: `data:image/svg+xml,${encodeURIComponent(`
          <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f8fafc"/>
            <text x="50%" y="45%" text-anchor="middle" font-family="system-ui" font-size="32" fill="#334155">
              ${fileName}
            </text>
            <text x="50%" y="55%" text-anchor="middle" font-family="system-ui" font-size="18" fill="#64748b">
              PowerPoint Presentation
            </text>
          </svg>
        `)}`,
        index: 0,
      },
    ];

    return NextResponse.json({ slides });
  } catch (error) {
    console.error("Error converting PPT:", error);
    return NextResponse.json(
      { error: "Failed to convert presentation" },
      { status: 500 }
    );
  }
}
