import { useEffect, useRef } from 'react';

type MetaMap = Record<string, string | number | boolean | undefined | null>;

export interface UseSEOOptions {
  title?: string;
  description?: string;
  canonical?: string;
  robots?: string; // e.g. "index,follow" or "noindex,nofollow"
  openGraph?: MetaMap; // e.g. { 'og:title': '...', 'og:image': '...' }
  twitter?: MetaMap;   // e.g. { 'twitter:card': 'summary_large_image' }
  jsonLd?: object | object[]; // JSON-LD schema.org
}

export function useSEO(options: UseSEOOptions) {
  const createdNodesRef = useRef<Array<HTMLElement>>([]);

  useEffect(() => {
    const createdNodes: Array<HTMLElement> = [];
    const head = document.head;

    const createOrUpdateMetaByName = (name: string, content?: string) => {
      if (!content) return;
      let el = head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('name', name);
        head.appendChild(el);
        createdNodes.push(el);
      }
      el.setAttribute('content', String(content));
    };

    const createOrUpdateMetaByProperty = (property: string, content?: string) => {
      if (!content) return;
      let el = head.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        head.appendChild(el);
        createdNodes.push(el);
      }
      el.setAttribute('content', String(content));
    };

    const setTitle = (value?: string) => {
      if (!value) return;
      document.title = value;
    };

    const setCanonical = (href?: string) => {
      if (!href) return;
      let link = head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        head.appendChild(link);
        createdNodes.push(link);
      }
      link.setAttribute('href', href);
    };

    // Title
    setTitle(options.title);

    // Basic meta
    if (options.description) createOrUpdateMetaByName('description', options.description);
    if (options.robots) createOrUpdateMetaByName('robots', options.robots);

    // Canonical
    if (options.canonical) setCanonical(options.canonical);

    // Open Graph
    if (options.openGraph) {
      Object.entries(options.openGraph).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        createOrUpdateMetaByProperty(k, String(v));
      });
    }

    // Twitter
    if (options.twitter) {
      Object.entries(options.twitter).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        createOrUpdateMetaByName(k, String(v));
      });
    }

    // JSON-LD
    if (options.jsonLd) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.text = JSON.stringify(options.jsonLd);
      head.appendChild(script);
      createdNodes.push(script);
    }

    createdNodesRef.current = createdNodes;

    return () => {
      // remove only nodes we created in this effect run
      for (const node of createdNodesRef.current) {
        if (node && node.parentNode) node.parentNode.removeChild(node);
      }
      createdNodesRef.current = [];
    };
  }, [
    options.title,
    options.description,
    options.canonical,
    options.robots,
    JSON.stringify(options.openGraph || {}),
    JSON.stringify(options.twitter || {}),
    JSON.stringify(options.jsonLd || null),
  ]);
}

export default useSEO;


