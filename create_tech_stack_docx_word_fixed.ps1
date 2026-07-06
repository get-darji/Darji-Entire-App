$outputPath = Join-Path $PSScriptRoot "Darzi-Tech-Stack-Summary-Fixed.docx"

$sections = @(
  @{
    Title = "Tech Stack By App"
    Items = @(
      "Backend - Node.js, Express 5, MongoDB, Mongoose, JWT, bcrypt, Socket.IO, Cloudinary, Firebase Admin, Multer, Zod, TypeScript",
      "Customer App - Expo, React Native, React 19, NativeWind, Tailwind CSS, React Hook Form, Zod, Zustand, AsyncStorage, Expo Location, Expo Notifications, Expo Image Picker, Reanimated, Socket.IO client",
      "Tailor App - Expo, React Native, React 19, NativeWind, Tailwind CSS, React Hook Form, Zod, Zustand, AsyncStorage, Expo Camera, Expo Location, Expo Notifications, ML Kit Face Detection, ML Kit Text Recognition, Reanimated, Socket.IO client",
      "Delivery App - Expo, React Native, React 19, NativeWind, Tailwind CSS, React Hook Form, Zod, Zustand, AsyncStorage, Expo Location, Expo Notifications, Expo Image Picker, ML Kit Face Detection, ML Kit Text Recognition, Reanimated, WebView, Socket.IO client",
      "Customer Web - Next.js 16, React 19, Tailwind CSS 4, React Query, Axios, React Hook Form, Zod, Zustand, Socket.IO client, Framer Motion, GSAP, Lenis, Three.js, React Three Fiber, Drei",
      "Admin Panel - Next.js 16, React 19, Tailwind CSS 4, React Query, Axios, TanStack Table, Radix UI, Recharts, Sonner, CVA, clsx, tailwind-merge, Lucide, Zod, Zustand, Socket.IO client",
      "Darji Web - Next.js 16, React 19, Tailwind CSS 4, GSAP, @gsap/react, Lenis, ESLint"
    )
  },
  @{
    Title = "Tech Stack By Purpose"
    Items = @(
      "Backend/API - Express, Mongoose, MongoDB, JWT, bcrypt, Multer, Cloudinary, Firebase Admin",
      "Web Frontend - Next.js, React, Tailwind CSS, Axios, React Query",
      "Mobile Frontend - Expo, React Native, NativeWind, Expo SDK modules",
      "Animations - Framer Motion, GSAP, Lenis, Reanimated, Three.js",
      "3D / Interactive Visuals - Three.js, @react-three/fiber, @react-three/drei",
      "Forms / Validation - React Hook Form, Zod, @hookform/resolvers",
      "State Management - Zustand",
      "Realtime - Socket.IO, Socket.IO client",
      "UI Components / Charts - Radix UI, Recharts, Sonner, Lucide",
      "Build / Deploy - npm workspaces, TypeScript, EAS CLI, Railway, Nixpacks"
    )
  },
  @{
    Title = "Notes"
    Items = @(
      "The repo clearly contains 3 mobile apps: customer-app, tailor-app, and delivery-app.",
      "The two main web apps inside apps are customer-web and admin-panel.",
      "There is also an additional standalone web project named darji-web at the repo root."
    )
  }
)

$word = $null
$document = $null

try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $document = $word.Documents.Add()

  $selection = $word.Selection

  $selection.Style = "Title"
  $selection.TypeText("Darzi Tech Stack Summary")
  $selection.TypeParagraph()

  $selection.Style = "Subtitle"
  $selection.TypeText("Overview of the monorepo stack, grouped by app and by purpose.")
  $selection.TypeParagraph()
  $selection.TypeParagraph()

  foreach ($section in $sections) {
    $selection.Style = "Heading 1"
    $selection.TypeText($section.Title)
    $selection.TypeParagraph()

    foreach ($item in $section.Items) {
      $selection.Range.ListFormat.ApplyBulletDefault()
      $selection.TypeText($item)
      $selection.TypeParagraph()
    }

    $selection.Range.ListFormat.RemoveNumbers()
    $selection.TypeParagraph()
  }

  $wdFormatDocumentDefault = 16
  $document.SaveAs([ref]$outputPath, [ref]$wdFormatDocumentDefault)
  Write-Output "Created $outputPath"
}
finally {
  if ($document) {
    $document.Close([ref]$false)
  }
  if ($word) {
    $word.Quit()
  }
}
