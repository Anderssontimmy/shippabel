import { useEffect } from "react";
import { withBrand } from "@/lib/seo";

interface DocumentHeadOptions {
  title?: string;
  description?: string;
  noindex?: boolean;
}

export const useDocumentHead = ({ title, description, noindex }: DocumentHeadOptions) => {
  useEffect(() => {
    if (title) {
      document.title = withBrand(title);
      const ogTitle = document.querySelector('meta[property="og:title"]');
      const twTitle = document.querySelector('meta[name="twitter:title"]');
      if (ogTitle) ogTitle.setAttribute("content", title);
      if (twTitle) twTitle.setAttribute("content", title);
    }

    if (description) {
      const metaDesc = document.querySelector('meta[name="description"]');
      const ogDesc = document.querySelector('meta[property="og:description"]');
      const twDesc = document.querySelector('meta[name="twitter:description"]');
      if (metaDesc) metaDesc.setAttribute("content", description);
      if (ogDesc) ogDesc.setAttribute("content", description);
      if (twDesc) twDesc.setAttribute("content", description);
    }

    let robots: HTMLMetaElement | null = null;
    if (noindex) {
      robots = document.querySelector('meta[name="robots"]');
      if (!robots) {
        robots = document.createElement("meta");
        robots.setAttribute("name", "robots");
        document.head.appendChild(robots);
      }
      robots.setAttribute("content", "noindex");
    }

    return () => {
      robots?.setAttribute("content", "index, follow");
      document.title = "Shippabel - Publish Your AI-Built App to Google Play";
    };
  }, [title, description, noindex]);
};
