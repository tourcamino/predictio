import { useEffect } from 'react';
import { apiRequest } from '~/lib/predictioApi';

const SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'CODE',
  'PRE',
  'TEXTAREA',
  'INPUT',
  'SELECT',
  'OPTION',
  'SVG',
  'CANVAS',
]);

type TranslationRecord = {
  original: string;
  translated: string | null;
};

const translatedNodes = new WeakMap<Text, TranslationRecord>();
const translatedAttributes = new WeakMap<Element, Map<string, TranslationRecord>>();
const memoryCache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

function getBrowserTargetLanguage(): string {
  if (typeof navigator === 'undefined') return 'en';
  const languages =
    navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];
  const raw = languages.find((language) => language?.trim()) ?? 'en';
  return raw.toLowerCase().split('-')[0] || 'en';
}

function shouldTranslatePage(targetLanguage: string) {
  return targetLanguage !== 'en';
}

function shouldSkipElement(element: Element | null) {
  if (!element) return true;
  if (SKIP_TAGS.has(element.tagName)) return true;
  return Boolean(element.closest('[data-no-translate="true"], [translate="no"]'));
}

function shouldTranslateText(text: string) {
  const trimmed = text.trim();
  if (trimmed.length < 2 || trimmed.length > 220) return false;
  if (!/[A-Za-z]/.test(trimmed)) return false;
  if (/^[A-Z0-9\s$€£.,:%/+·-]+$/.test(trimmed) && trimmed.length <= 8) return false;
  return true;
}

function withOriginalSpacing(original: string, translated: string) {
  const leading = original.match(/^\s*/)?.[0] ?? '';
  const trailing = original.match(/\s*$/)?.[0] ?? '';
  return `${leading}${translated.trim()}${trailing}`;
}

function cacheKey(text: string, targetLanguage: string) {
  return `${targetLanguage}:${text}`;
}

async function translateText(text: string, targetLanguage: string) {
  const key = cacheKey(text, targetLanguage);
  let stored: string | null = null;
  try {
    stored = sessionStorage.getItem(`predictio:translation:${key}`);
  } catch {
    stored = null;
  }
  if (stored) return stored;

  const cached = memoryCache.get(key);
  if (cached) return cached;

  const active = pending.get(key);
  if (active) return active;

  const request = apiRequest<{ translatedText?: string }>('/api/translate', {
    method: 'POST',
    body: { text, targetLang: targetLanguage },
    timeoutMs: 12_000,
  })
    .then((result) => {
      if (!result.ok) return text;
      const translated = result.data.translatedText?.trim() || text;
      memoryCache.set(key, translated);
      try {
        sessionStorage.setItem(`predictio:translation:${key}`, translated);
      } catch {
        // Storage can be unavailable in private browsing; in-memory cache still helps this session.
      }
      return translated;
    })
    .catch(() => text)
    .finally(() => {
      pending.delete(key);
    });

  pending.set(key, request);
  return request;
}

function translateTextNode(node: Text, targetLanguage: string) {
  const currentValue = node.nodeValue ?? '';
  const existing = translatedNodes.get(node);
  const original =
    existing && currentValue === existing.translated ? existing.original : currentValue;
  if (!shouldTranslateText(original)) return;

  translatedNodes.set(node, {
    original,
    translated: existing?.original === original ? existing.translated : null,
  });
  void translateText(original.trim(), targetLanguage).then((translated) => {
    const nextValue = withOriginalSpacing(original, translated);
    translatedNodes.set(node, { original, translated: nextValue });
    if (node.nodeValue !== nextValue) {
      node.nodeValue = nextValue;
    }
  });
}

function translateElementAttribute(
  element: Element,
  attribute: string,
  targetLanguage: string,
) {
  const current = element.getAttribute(attribute);
  if (!current || !shouldTranslateText(current)) return;

  let originals = translatedAttributes.get(element);
  if (!originals) {
    originals = new Map<string, TranslationRecord>();
    translatedAttributes.set(element, originals);
  }

  const existing = originals.get(attribute);
  const original =
    existing && current === existing.translated ? existing.original : current;
  originals.set(attribute, {
    original,
    translated: existing?.original === original ? existing.translated : null,
  });

  void translateText(original.trim(), targetLanguage).then((translated) => {
    const nextValue = withOriginalSpacing(original, translated);
    originals.set(attribute, { original, translated: nextValue });
    if (element.getAttribute(attribute) !== nextValue) {
      element.setAttribute(attribute, nextValue);
    }
  });
}

function translateTree(root: ParentNode, targetLanguage: string) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const textNode = node as Text;
      return shouldSkipElement(textNode.parentElement)
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT;
    },
  });

  let current = walker.nextNode();
  while (current) {
    translateTextNode(current as Text, targetLanguage);
    current = walker.nextNode();
  }

  const elements =
    root instanceof Element ? [root, ...Array.from(root.querySelectorAll('*'))] : [];
  for (const element of elements) {
    if (shouldSkipElement(element)) continue;
    translateElementAttribute(element, 'placeholder', targetLanguage);
    translateElementAttribute(element, 'aria-label', targetLanguage);
    translateElementAttribute(element, 'title', targetLanguage);
  }
}

export function BrowserLanguageTranslator() {
  useEffect(() => {
    const targetLanguage = getBrowserTargetLanguage();
    document.documentElement.lang = targetLanguage;

    if (!shouldTranslatePage(targetLanguage)) return;

    translateTree(document.body, targetLanguage);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData' && mutation.target instanceof Text) {
          translateTextNode(mutation.target, targetLanguage);
          continue;
        }

        for (const node of mutation.addedNodes) {
          if (node instanceof Text) {
            translateTextNode(node, targetLanguage);
          } else if (node instanceof Element) {
            translateTree(node, targetLanguage);
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
