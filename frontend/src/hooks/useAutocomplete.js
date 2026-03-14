import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../services/api/client';

function parseTrigger(text, cursorPos) {
  const slice = text.slice(0, cursorPos);
  const hashMatch = slice.match(/(^|[\s\n])#(\w*)$/);
  const atMatch = slice.match(/(^|[\s\n])@(\w*)$/);

  if (hashMatch) {
    return { trigger: '#', query: hashMatch[2], triggerIndex: slice.lastIndexOf('#') };
  }
  if (atMatch) {
    return { trigger: '@', query: atMatch[2], triggerIndex: slice.lastIndexOf('@') };
  }
  return null;
}

export function useAutocomplete(value, onChange, textareaRef) {
  const [cursorPos, setCursorPos] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const trigger = dismissed ? null : parseTrigger(value, cursorPos);

  const prevTriggerIndex = useRef(null);
  useEffect(() => {
    if (trigger?.triggerIndex !== prevTriggerIndex.current) {
      setDismissed(false);
      setActiveIndex(0);
      prevTriggerIndex.current = trigger?.triggerIndex ?? null;
    }
  }, [trigger?.triggerIndex]);

  const { data: hashtags = [] } = useQuery({
    queryKey: ['hashtags-search', trigger?.query],
    queryFn: () => apiClient.get(`/hashtags/search?q=${encodeURIComponent(trigger.query)}&limit=6`),
    enabled: trigger?.trigger === '#' && (trigger?.query?.length ?? 0) >= 1,
    staleTime: 30000,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-search', trigger?.query],
    queryFn: () => apiClient.get(`/users/search?q=${encodeURIComponent(trigger.query)}&limit=6`),
    enabled: trigger?.trigger === '@' && (trigger?.query?.length ?? 0) >= 1,
    staleTime: 30000,
  });

  const suggestions = trigger?.trigger === '#' ? hashtags : users;
  const isOpen = Boolean(trigger) && Array.isArray(suggestions) && suggestions.length > 0;

  const selectSuggestion = useCallback(
    (item) => {
      if (!trigger) return;
      const word = trigger.trigger === '#' ? item.name : item.username;
      const before = value.slice(0, trigger.triggerIndex);
      const after = value.slice(cursorPos);
      const insert = `${trigger.trigger}${word} `;
      const newVal = `${before}${insert}${after}`;
      const newPos = trigger.triggerIndex + insert.length;

      onChange(newVal);
      setDismissed(true);

      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newPos, newPos);
        }
      });
    },
    [trigger, value, cursorPos, onChange, textareaRef],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectSuggestion(suggestions[activeIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setDismissed(true);
      }
    },
    [isOpen, suggestions, activeIndex, selectSuggestion],
  );

  const handleSelect = useCallback((e) => {
    setCursorPos(e.target.selectionStart ?? 0);
  }, []);

  const handleChange = useCallback(
    (e) => {
      setCursorPos(e.target.selectionStart ?? 0);
      onChange(e.target.value);
    },
    [onChange],
  );

  return {
    isOpen,
    trigger,
    suggestions,
    activeIndex,
    handleKeyDown,
    handleSelect,
    handleChange,
    selectSuggestion,
  };
}
