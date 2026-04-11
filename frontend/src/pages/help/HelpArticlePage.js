import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api/client';
import { ArrowLeft, Loader2, MessageCircle } from 'lucide-react';

// Tiny markdown renderer — handles **bold**, headings, paragraphs, lists.
// We keep it dependency-free to avoid pulling react-markdown.
function renderMd(md = '') {
  const lines = md.split('\n');
  const out = [];
  let listBuf = [];
  const flushList = () => {
    if (listBuf.length) {
      out.push(<ul key={`ul${out.length}`} className="list-disc pl-6 my-3 space-y-1 text-stone-700">{listBuf}</ul>);
      listBuf = [];
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (!ln.trim()) { flushList(); continue; }
    if (ln.startsWith('## ')) {
      flushList();
      out.push(<h2 key={i} className="text-xl font-semibold text-stone-950 mt-6 mb-2">{ln.slice(3)}</h2>);
      continue;
    }
    if (/^[-*]\s/.test(ln)) {
      const text = ln.replace(/^[-*]\s/, '');
      listBuf.push(<li key={`li${i}`} dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />);
      continue;
    }
    if (/^\d+\.\s/.test(ln)) {
      flushList();
      out.push(<p key={i} className="text-stone-700 my-2" dangerouslySetInnerHTML={{ __html: ln.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />);
      continue;
    }
    flushList();
    out.push(<p key={i} className="text-stone-700 my-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: ln.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />);
  }
  flushList();
  return out;
}

export default function HelpArticlePage() {
  const { t, i18n } = useTranslation();
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiClient.get(`/help/articles/${slug}`)
      .then((data) => setArticle(data))
      .catch(() => setArticle(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const lang = i18n.language || 'es';
  const titleOf = (a) => (lang === 'en' ? a.title_en : lang === 'ko' ? a.title_ko : a.title) || a.title;
  const bodyOf = (a) => (lang === 'en' ? a.body_en : lang === 'ko' ? a.body_ko : a.body) || a.body;

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-stone-50"><Loader2 className="w-6 h-6 text-stone-400 animate-spin" /></div>;
  if (!article) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-stone-500 mb-3">{t('helpCenter.notFound', 'Artículo no encontrado')}</p>
        <Link to="/help" className="text-stone-950 underline">{t('helpCenter.back', 'Volver al centro de ayuda')}</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link to="/help" className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-950 mb-6">
          <ArrowLeft className="w-4 h-4" /> {t('helpCenter.back', 'Volver al centro de ayuda')}
        </Link>

        <article className="bg-white rounded-2xl border border-stone-200 p-8">
          <p className="text-xs text-stone-400 uppercase tracking-wider mb-2">{t(`support.cat.${article.category}`, article.category)}</p>
          <h1 className="text-3xl font-semibold text-stone-950 mb-6">{titleOf(article)}</h1>
          <div className="prose prose-stone max-w-none">{renderMd(bodyOf(article))}</div>
        </article>

        <div className="mt-6 bg-white rounded-2xl border border-stone-200 p-5 text-center">
          <MessageCircle className="w-6 h-6 text-stone-400 mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-sm text-stone-700">{t('helpCenter.stillNeedHelp', '¿Aún tienes dudas?')}</p>
          <Link to={`/support/new?category=${article.category}`} className="inline-block mt-2 text-sm text-stone-950 underline">
            {t('helpCenter.openTicket', 'Crear un ticket')}
          </Link>
        </div>
      </div>
    </div>
  );
}
