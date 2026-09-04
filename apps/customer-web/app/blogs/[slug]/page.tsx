import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { blogArticles, getArticleBySlug, getRelatedArticles } from "@/src/features/marketing/blog-data";
import { ArticleReadingView } from "@/src/features/marketing/article-reading-view";

type ArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return blogArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    return {
      title: "Article Not Found | The Darji Journal",
      description: "The requested tailoring essay could not be found."
    };
  }

  const articleUrl = `https://darji.in/blogs/${article.slug}`;

  return {
    title: `${article.title} | The Darji Journal`,
    description: article.excerpt,
    keywords: [
      "Darji",
      "Tailoring",
      "Bespoke Alterations",
      article.category,
      ...article.tags
    ],
    alternates: {
      canonical: articleUrl
    },
    openGraph: {
      type: "article",
      locale: "en_US",
      url: articleUrl,
      title: article.title,
      description: article.excerpt,
      siteName: "The Darji Journal",
      publishedTime: article.date,
      authors: [article.author.name],
      tags: article.tags,
      images: [
        {
          url: article.image,
          width: 1200,
          height: 630,
          alt: article.title
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt,
      images: [article.image]
    }
  };
}

export default async function BlogArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) notFound();

  const relatedArticles = getRelatedArticles(slug, 3);

  // JSON-LD Structured Data Schema for Rich Google Snippets
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.excerpt,
    image: [article.image],
    datePublished: article.date,
    dateModified: article.date,
    author: {
      "@type": "Person",
      name: article.author.name,
      jobTitle: article.author.role
    },
    publisher: {
      "@type": "Organization",
      name: "Darji",
      logo: {
        "@type": "ImageObject",
        url: "https://darji.in/darji-logo-cropped.png"
      }
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://darji.in/blogs/${article.slug}`
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ArticleReadingView article={article} relatedArticles={relatedArticles} />
    </>
  );
}
