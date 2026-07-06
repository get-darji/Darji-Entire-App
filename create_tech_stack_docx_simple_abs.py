from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from xml.sax.saxutils import escape


root = Path(__file__).resolve().parent
output_path = root / "Darzi-Tech-Stack-Summary-Simple.docx"

entries = [
    ("title", "Darzi Tech Stack Summary"),
    ("subtitle", "Overview of the monorepo stack, grouped by app and by purpose."),
    ("heading", "Tech Stack By App"),
    ("body", "Backend - Node.js, Express 5, MongoDB, Mongoose, JWT, bcrypt, Socket.IO, Cloudinary, Firebase Admin, Multer, Zod, TypeScript"),
    ("body", "Customer App - Expo, React Native, React 19, NativeWind, Tailwind CSS, React Hook Form, Zod, Zustand, AsyncStorage, Expo Location, Expo Notifications, Expo Image Picker, Reanimated, Socket.IO client"),
    ("body", "Tailor App - Expo, React Native, React 19, NativeWind, Tailwind CSS, React Hook Form, Zod, Zustand, AsyncStorage, Expo Camera, Expo Location, Expo Notifications, ML Kit Face Detection, ML Kit Text Recognition, Reanimated, Socket.IO client"),
    ("body", "Delivery App - Expo, React Native, React 19, NativeWind, Tailwind CSS, React Hook Form, Zod, Zustand, AsyncStorage, Expo Location, Expo Notifications, Expo Image Picker, ML Kit Face Detection, ML Kit Text Recognition, Reanimated, WebView, Socket.IO client"),
    ("body", "Customer Web - Next.js 16, React 19, Tailwind CSS 4, React Query, Axios, React Hook Form, Zod, Zustand, Socket.IO client, Framer Motion, GSAP, Lenis, Three.js, React Three Fiber, Drei"),
    ("body", "Admin Panel - Next.js 16, React 19, Tailwind CSS 4, React Query, Axios, TanStack Table, Radix UI, Recharts, Sonner, CVA, clsx, tailwind-merge, Lucide, Zod, Zustand, Socket.IO client"),
    ("body", "Darji Web - Next.js 16, React 19, Tailwind CSS 4, GSAP, @gsap/react, Lenis, ESLint"),
    ("heading", "Tech Stack By Purpose"),
    ("body", "Backend/API - Express, Mongoose, MongoDB, JWT, bcrypt, Multer, Cloudinary, Firebase Admin"),
    ("body", "Web Frontend - Next.js, React, Tailwind CSS, Axios, React Query"),
    ("body", "Mobile Frontend - Expo, React Native, NativeWind, Expo SDK modules"),
    ("body", "Animations - Framer Motion, GSAP, Lenis, Reanimated, Three.js"),
    ("body", "3D / Interactive Visuals - Three.js, @react-three/fiber, @react-three/drei"),
    ("body", "Forms / Validation - React Hook Form, Zod, @hookform/resolvers"),
    ("body", "State Management - Zustand"),
    ("body", "Realtime - Socket.IO, Socket.IO client"),
    ("body", "UI Components / Charts - Radix UI, Recharts, Sonner, Lucide"),
    ("body", "Build / Deploy - npm workspaces, TypeScript, EAS CLI, Railway, Nixpacks"),
    ("heading", "Notes"),
    ("body", "The repo clearly contains 3 mobile apps: customer-app, tailor-app, and delivery-app."),
    ("body", "The two main web apps inside apps are customer-web and admin-panel."),
    ("body", "There is also an additional standalone web project named darji-web at the repo root."),
]


def paragraph(kind: str, text: str) -> str:
    if kind == "title":
        rpr = "<w:rPr><w:b/><w:sz w:val=\"34\"/></w:rPr>"
    elif kind == "subtitle":
        rpr = "<w:rPr><w:i/><w:color w:val=\"666666\"/><w:sz w:val=\"22\"/></w:rPr>"
    elif kind == "heading":
        rpr = "<w:rPr><w:b/><w:sz w:val=\"28\"/></w:rPr>"
    else:
        rpr = "<w:rPr><w:sz w:val=\"22\"/></w:rPr>"

    return f"<w:p><w:r>{rpr}<w:t xml:space=\"preserve\">{escape(text)}</w:t></w:r></w:p>"


document_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    %s
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>
""" % "".join(paragraph(kind, text) for kind, text in entries)

content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>
"""

rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>
"""

core = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:title>Darzi Tech Stack Summary</dc:title>
  <dc:creator>OpenAI Codex</dc:creator>
</cp:coreProperties>
"""

app = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>Microsoft Office Word</Application>
</Properties>
"""

with ZipFile(output_path, "w", compression=ZIP_DEFLATED) as zf:
    zf.writestr("[Content_Types].xml", content_types)
    zf.writestr("_rels/.rels", rels)
    zf.writestr("word/document.xml", document_xml)
    zf.writestr("docProps/core.xml", core)
    zf.writestr("docProps/app.xml", app)

print(f"Created {output_path}")
