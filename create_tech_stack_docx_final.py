from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from xml.sax.saxutils import escape


OUTPUT_PATH = Path("Darzi-Tech-Stack-Summary.docx")


TITLE = "Darzi Tech Stack Summary"
SUBTITLE = "Overview of the monorepo stack, grouped by app and by purpose."

BY_APP = [
    ("Backend", "Node.js, Express 5, MongoDB, Mongoose, JWT, bcrypt, Socket.IO, Cloudinary, Firebase Admin, Multer, Zod, TypeScript"),
    ("Customer App", "Expo, React Native, React 19, NativeWind, Tailwind CSS, React Hook Form, Zod, Zustand, AsyncStorage, Expo Location, Expo Notifications, Expo Image Picker, Reanimated, Socket.IO client"),
    ("Tailor App", "Expo, React Native, React 19, NativeWind, Tailwind CSS, React Hook Form, Zod, Zustand, AsyncStorage, Expo Camera, Expo Location, Expo Notifications, ML Kit Face Detection, ML Kit Text Recognition, Reanimated, Socket.IO client"),
    ("Delivery App", "Expo, React Native, React 19, NativeWind, Tailwind CSS, React Hook Form, Zod, Zustand, AsyncStorage, Expo Location, Expo Notifications, Expo Image Picker, ML Kit Face Detection, ML Kit Text Recognition, Reanimated, WebView, Socket.IO client"),
    ("Customer Web", "Next.js 16, React 19, Tailwind CSS 4, React Query, Axios, React Hook Form, Zod, Zustand, Socket.IO client, Framer Motion, GSAP, Lenis, Three.js, React Three Fiber, Drei"),
    ("Admin Panel", "Next.js 16, React 19, Tailwind CSS 4, React Query, Axios, TanStack Table, Radix UI, Recharts, Sonner, CVA, clsx, tailwind-merge, Lucide, Zod, Zustand, Socket.IO client"),
    ("Darji Web", "Next.js 16, React 19, Tailwind CSS 4, GSAP, @gsap/react, Lenis, ESLint"),
]

BY_PURPOSE = [
    ("Backend/API", "Express, Mongoose, MongoDB, JWT, bcrypt, Multer, Cloudinary, Firebase Admin"),
    ("Web Frontend", "Next.js, React, Tailwind CSS, Axios, React Query"),
    ("Mobile Frontend", "Expo, React Native, NativeWind, Expo SDK modules"),
    ("Animations", "Framer Motion, GSAP, Lenis, Reanimated, Three.js"),
    ("3D / Interactive Visuals", "Three.js, @react-three/fiber, @react-three/drei"),
    ("Forms / Validation", "React Hook Form, Zod, @hookform/resolvers"),
    ("State Management", "Zustand"),
    ("Realtime", "Socket.IO, Socket.IO client"),
    ("UI Components / Charts", "Radix UI, Recharts, Sonner, Lucide"),
    ("Build / Deploy", "npm workspaces, TypeScript, EAS CLI, Railway, Nixpacks"),
]

NOTES = [
    "The repo clearly contains 3 mobile apps: customer-app, tailor-app, and delivery-app.",
    "The two main web apps inside apps are customer-web and admin-panel.",
    "There is also an additional standalone web project named darji-web at the repo root.",
]


def p(text: str, style: str | None = None) -> str:
    style_xml = f'<w:pPr><w:pStyle w:val="{style}"/></w:pPr>' if style else ""
    return (
        "<w:p>"
        f"{style_xml}"
        "<w:r><w:t xml:space=\"preserve\">"
        f"{escape(text)}"
        "</w:t></w:r>"
        "</w:p>"
    )


def bullet(text: str) -> str:
    return (
        "<w:p>"
        "<w:pPr>"
        "<w:pStyle w:val=\"ListParagraph\"/>"
        "<w:numPr><w:ilvl w:val=\"0\"/><w:numId w:val=\"1\"/></w:numPr>"
        "</w:pPr>"
        "<w:r><w:t xml:space=\"preserve\">"
        f"{escape(text)}"
        "</w:t></w:r>"
        "</w:p>"
    )


def document_xml() -> str:
    body_parts = [
        p(TITLE, "Title"),
        p(SUBTITLE, "Subtitle"),
        p("Tech Stack By App", "Heading1"),
    ]

    for name, stack in BY_APP:
        body_parts.append(p(name, "Heading2"))
        body_parts.append(bullet(stack))

    body_parts.append(p("Tech Stack By Purpose", "Heading1"))
    for name, stack in BY_PURPOSE:
        body_parts.append(bullet(f"{name}: {stack}"))

    body_parts.append(p("Notes", "Heading1"))
    for note in NOTES:
        body_parts.append(bullet(note))

    body_xml = "".join(body_parts)
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 wp14">
  <w:body>
    {body_xml}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>
"""


CONTENT_TYPES_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>
"""

ROOT_RELS_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>
"""

DOCUMENT_RELS_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>
"""

STYLES_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:rPr><w:b/><w:sz w:val="36"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle">
    <w:name w:val="Subtitle"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:rPr><w:i/><w:color w:val="666666"/><w:sz w:val="22"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:rPr><w:b/><w:sz w:val="28"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:rPr><w:b/><w:sz w:val="24"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="ListParagraph">
    <w:name w:val="List Paragraph"/>
    <w:basedOn w:val="Normal"/>
  </w:style>
</w:styles>
"""

NUMBERING_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0">
    <w:multiLevelType w:val="hybridMultilevel"/>
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val="•"/>
      <w:lvlJc w:val="left"/>
      <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1">
    <w:abstractNumId w:val="0"/>
  </w:num>
</w:numbering>
"""

CORE_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Darzi Tech Stack Summary</dc:title>
  <dc:subject>Repository tech stack overview</dc:subject>
  <dc:creator>OpenAI Codex</dc:creator>
  <cp:keywords>Darzi, tech stack, backend, frontend, mobile, web</cp:keywords>
  <dc:description>Clean summary of the repository stack by app and by purpose.</dc:description>
</cp:coreProperties>
"""

APP_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Microsoft Office Word</Application>
</Properties>
"""


def main() -> None:
    with ZipFile(OUTPUT_PATH, "w", compression=ZIP_DEFLATED) as docx:
        docx.writestr("[Content_Types].xml", CONTENT_TYPES_XML)
        docx.writestr("_rels/.rels", ROOT_RELS_XML)
        docx.writestr("word/document.xml", document_xml())
        docx.writestr("word/styles.xml", STYLES_XML)
        docx.writestr("word/numbering.xml", NUMBERING_XML)
        docx.writestr("word/_rels/document.xml.rels", DOCUMENT_RELS_XML)
        docx.writestr("docProps/core.xml", CORE_XML)
        docx.writestr("docProps/app.xml", APP_XML)
    print(f"Created {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
