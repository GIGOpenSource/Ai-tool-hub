import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterCard?: "summary" | "summary_large_image";
  canonical?: string;
}

const DEFAULT_SEO = {
  title: "AI Tools Hub - Discover the Best AI Tools for Creators & Developers",
  description: "Explore our curated directory of cutting-edge AI tools for video editing, copywriting, image generation, code assistance, and more. Find, compare, and discover the perfect AI solution for your needs.",
  keywords: "AI tools, artificial intelligence, AI directory, ChatGPT, Midjourney, AI copywriting, AI video editing, code assistant, image generation",
  ogImage: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=630&fit=crop",
};

export function SEO({
  title,
  description = DEFAULT_SEO.description,
  keywords = DEFAULT_SEO.keywords,
  ogTitle,
  ogDescription,
  ogImage = DEFAULT_SEO.ogImage,
  ogUrl,
  twitterCard = "summary_large_image",
  canonical,
}: SEOProps) {
  const fullTitle = title ? `${title} | AI Tools Hub` : DEFAULT_SEO.title;
  const finalOgTitle = ogTitle || title || DEFAULT_SEO.title;
  const finalOgDescription = ogDescription || description;
  const finalCanonical = canonical || (typeof window !== "undefined" ? window.location.href : "");

  useEffect(() => {
    // Set document title
    document.title = fullTitle;

    // Update or create meta tags
    const metaTags = [
      { name: "description", content: description },
      { name: "keywords", content: keywords },
      
      // Open Graph
      { property: "og:title", content: finalOgTitle },
      { property: "og:description", content: finalOgDescription },
      { property: "og:image", content: ogImage },
      { property: "og:type", content: "website" },
      
      // Twitter Card
      { name: "twitter:card", content: twitterCard },
      { name: "twitter:title", content: finalOgTitle },
      { name: "twitter:description", content: finalOgDescription },
      { name: "twitter:image", content: ogImage },
    ];

    // Add og:url if provided
    if (ogUrl) {
      metaTags.push({ property: "og:url", content: ogUrl });
    }

    metaTags.forEach(({ name, property, content }) => {
      const attr = name ? "name" : "property";
      const value = name || property;
      
      let element = document.querySelector(`meta[${attr}="${value}"]`);
      
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attr, value!);
        document.head.appendChild(element);
      }
      
      element.setAttribute("content", content);
    });

    // Canonical URL
    if (finalCanonical) {
      let linkElement = document.querySelector('link[rel="canonical"]');
      
      if (!linkElement) {
        linkElement = document.createElement("link");
        linkElement.setAttribute("rel", "canonical");
        document.head.appendChild(linkElement);
      }
      
      linkElement.setAttribute("href", finalCanonical);
    }

    // Cleanup function
    return () => {
      // Reset to default title when component unmounts
      document.title = DEFAULT_SEO.title;
    };
  }, [
    fullTitle,
    description,
    keywords,
    finalOgTitle,
    finalOgDescription,
    ogImage,
    ogUrl,
    twitterCard,
    finalCanonical,
  ]);

  return null; // This component doesn't render anything
}
