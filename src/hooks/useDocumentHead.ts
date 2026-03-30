import { useEffect } from "react";

interface DocumentHeadOptions {
  title?: string;
  description?: string;
}

export const useDocumentHead = ({ title, description }: DocumentHeadOptions) => {
  useEffect(() => {
    if (title) {
      document.title = `${title} | Shippabel`;
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

    return () => {
      document.title = "Shippabel — From Vibe Code to App Store in One Click";
    };
  }, [title, description]);
};
