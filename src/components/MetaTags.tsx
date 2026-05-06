import { useEffect } from 'react';

interface MetaTagsProps {
  title: string;
  description: string;
  imageUrl?: string;
  url?: string;
}

export function MetaTags({ title, description, imageUrl, url }: MetaTagsProps) {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Update or create meta tags
    const updateMetaTag = (property: string, content: string) => {
      let element = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!element) {
        element = document.querySelector(`meta[name="${property}"]`) as HTMLMetaElement;
      }
      if (!element) {
        element = document.createElement('meta');
        if (property.startsWith('og:') || property.startsWith('twitter:')) {
          element.setAttribute('property', property);
        } else {
          element.setAttribute('name', property);
        }
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Basic meta tags
    updateMetaTag('description', description);

    // Open Graph tags
    updateMetaTag('og:title', title);
    updateMetaTag('og:description', description);
    updateMetaTag('og:type', 'website');
    if (url) updateMetaTag('og:url', url);
    if (imageUrl) updateMetaTag('og:image', imageUrl);
    updateMetaTag('og:site_name', 'Predictio.live');

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    if (imageUrl) updateMetaTag('twitter:image', imageUrl);
    updateMetaTag('twitter:site', '@predictio_live');
  }, [title, description, imageUrl, url]);

  return null;
}
