// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Globe, TrendingUp, ArrowRight, Lock, FileText,
  BarChart3, Users, Sparkles, ChevronRight,
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { useAuth } from '../../context/AuthContext';
import { useProducerPlan } from '../../context/ProducerPlanContext';
import apiClient from '../../services/api/client';
import { useNavigate } from 'react-router-dom';

/* ───────── constants ───────── */

const S = {
  font: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
  black: '#0c0a09',
  white: '#ffffff',
  bg: '#fafaf9',
  surface: '#ffffff',
  surface2: '#fafaf9',
  text1: '#0c0a09',
  text2: '#78716c',
  text3: '#a8a29e',
  border: 'rgba(0,0,0,0.08)',
  borderMed: 'rgba(0,0,0,0.12)',
  purple: '#44403c',
  purpleBg: '#f5f5f4',
  green: '#0c0a09',
  greenBg: '#f5f5f4',
  orange: '#78716c',
  orangeBg: '#fafaf9',
  shadowSm: '0 2px 10px rgba(0,0,0,0.07)',
  shadowMd: '0 4px 20px rgba(0,0,0,0.09)',
  rLg: '16px',
  rXl: '22px',
  rFull: '9999px',
  ease: 'var(cubic-bezier(0.4,0,0.2,1), cubic-bezier(0.4,0,0.2,1))',
};

const SUGGESTIONS = [
  { icon: '🇩🇪', text: 'Analiza Alemania para aceite' },
  { icon: '📊', text: '¿Qué mercados me recomiendas?' },
  { icon: '📝', text: 'Genera un contrato B2B' },
  { icon: '🇫🇷', text: 'Regulaciones Francia' },
  { icon: '📈', text: 'Predice demanda 6 meses' },
];

const OPPORTUNITIES = [
  { flag: '🇩🇪', country: 'Alemania', product: 'Aceite de oliva ecológico', trend: '+34%', period: 'Q2 2026' },
  { flag: '🇫🇷', country: 'Francia', product: 'Jamón ibérico', trend: '+22%', period: 'Q1 2026' },
  { flag: '🇬🇧', country: 'Reino Unido', product: 'Vino tinto D.O.', trend: '+18%', period: 'Q3 2026' },
  { flag: '🇯🇵', country: 'Japón', product: 'Aceite AOVE premium', trend: '+15%', period: 'Q4 2026' },
];

const TOOL_LABELS = {
  search_importers: { icon: Users, label: 'Importadores', color: '#57534e' },
  analyze_market: { icon: BarChart3, label: 'Mercado', color: '#44403c' },
  predict_demand: { icon: TrendingUp, label: 'Predicción', color: '#0c0a09' },
  generate_contract: { icon: FileText, label: 'Contrato', color: '#78716c' },
  check_producer_plan: { icon: Sparkles, label: 'Plan', color: '#6E6E73' },
};

/* ───────── helpers ───────── */

function parseMarkdownSafe(text) {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/\n/g, '<br/>');
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: ['strong', 'em', 'br'] });
}

/* ───────── UpgradeBanner ───────── */

function UpgradeBanner() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '70vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '48px 24px', textAlign: 'center',
      fontFamily: S.font,
    }}>
      <div style={{
        width: 80, height: 80,
        borderRadius: '50%',
        background: S.surface2,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 28,
      }}>
        <Lock size={36} color={S.text3} strokeWidth={1.5} />
      </div>

      <h2 style={{
        fontSize: 28, fontWeight: 700,
        color: S.text1, letterSpacing: '-0.02em',
        marginBottom: 12,
      }}>
        Agente Comercial IA
      </h2>

      <p style={{
        fontSize: 16, color: S.text2,
        lineHeight: 1.6, maxWidth: 420,
        marginBottom: 36,
      }}>
        Accede a tu representante de ventas internacional con análisis de mercados,
        matching con importadores y generación de contratos.
      </p>

      <button
        onClick={() => navigate('/productor')}
        style={{
          padding: '14px 32px',
          borderRadius: S.rFull,
          background: '#44403c', color: '#FFFFFF',
          border: 'none', fontSize: 15, fontWeight: 600,
          cursor: 'pointer',
          fontFamily: S.font,
          transition: `all 250ms ${S.ease}`,
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        Actualizar a ELITE
      </button>
    </div>
  );
}

/* ───────── ToolCallCard ───────── */

function ToolCallCard({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const meta = TOOL_LABELS[toolCall.tool] || { icon: Globe, label: toolCall.tool, color: '#6E6E73' };
  const Icon = meta.icon;

  return (
    <div style={{
      borderRadius: 14,
      border: `1px solid ${S.border}`,
      background: S.surface,
      overflow: 'hidden',
      marginBottom: 8,
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: S.font, fontSize: 13,
          color: S.text1,
        }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: `${meta.color}14`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={14} color={meta.color} />
        </div>
        <span style={{ fontWeight: 600, flex: 1, textAlign: 'left' }}>
          {meta.label}
        </span>
        <ChevronRight
          size={14}
          color={S.text3}
          style={{
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 200ms ease',
          }}
        />
      </button>
      {expanded && (
        <div style={{
          padding: '0 14px 12px',
          fontSize: 12, color: S.text2,
          fontFamily: 'monospace',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          maxHeight: 200,
          overflowY: 'auto',
        }}>
          {JSON.stringify(toolCall.result, null, 2)}
        </div>
      )}
    </div>
  );
}

/* ───────── Main Page ───────── */

export default function CommercialAIPage() {
  const { user } = useAuth();
  const { plan } = useProducerPlan();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toolCalls, setToolCalls] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const isElite = plan?.toLowerCase() === 'elite';

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  if (!isElite) {
    return <UpgradeBanner />;
  }

  const handleSend = async (text) => {
    const content = text || input.trim();
    if (!content || isLoading) return;

    const userMsg = { role: 'user', content, timestamp: new Date().toISOString() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    try {
      const data = await apiClient.post('/v1/commercial-ai/chat', {
        messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
      });

      if (data.tool_calls?.length) {
        setToolCalls(prev => [...prev, ...data.tool_calls]);
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.response,
          toolCalls: data.tool_calls || [],
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Error al contactar al agente comercial. Inténtalo de nuevo.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div style={{
      maxWidth: 920,
      margin: '0 auto',
      padding: '32px 20px 120px',
      fontFamily: S.font,
    }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <h1 style={{
            fontSize: 32, fontWeight: 700,
            color: S.text1, letterSpacing: '-0.025em',
            margin: 0,
          }}>
            Agente Comercial
          </h1>
          <span style={{
            padding: '4px 12px',
            borderRadius: S.rFull,
            background: S.purpleBg,
            color: '#44403c',
            fontSize: 11, fontWeight: 700,
            letterSpacing: '0.06em',
          }}>
            ELITE
          </span>
        </div>
        <p style={{ fontSize: 15, color: S.text2, margin: 0 }}>
          Tu representante de ventas internacional con IA
        </p>
      </div>

      {/* ── Opportunity Cards ── */}
      {!hasMessages && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          style={{ marginBottom: 32 }}
        >
          <h2 style={{
            fontSize: 17, fontWeight: 600,
            color: S.text1, marginBottom: 16,
          }}>
            Oportunidades detectadas
          </h2>
          <div style={{
            display: 'flex', gap: 12,
            overflowX: 'auto',
            paddingBottom: 8,
            scrollSnapType: 'x mandatory',
          }}>
            {OPPORTUNITIES.map((opp, i) => (
              <motion.div
                key={opp.country}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                style={{
                  minWidth: 220, flexShrink: 0,
                  scrollSnapAlign: 'start',
                  borderRadius: 16,
                  border: `0.5px solid ${S.border}`,
                  background: S.surface,
                  padding: '20px 18px',
                  boxShadow: S.shadowSm,
                  cursor: 'pointer',
                  transition: `all 250ms ${S.ease}`,
                }}
                onClick={() => handleSend(`Analiza el mercado de ${opp.product} en ${opp.country}`)}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.09)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = S.shadowSm;
                }}
              >
                <span style={{ fontSize: 28 }}>{opp.flag}</span>
                <p style={{
                  fontSize: 15, fontWeight: 600,
                  color: S.text1, marginTop: 10, marginBottom: 4,
                }}>
                  {opp.country}
                </p>
                <p style={{ fontSize: 13, color: S.text2, margin: 0, marginBottom: 10 }}>
                  {opp.product}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TrendingUp size={13} color="#0c0a09" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0c0a09' }}>
                    {opp.trend}
                  </span>
                  <span style={{ fontSize: 11, color: S.text3 }}>{opp.period}</span>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  marginTop: 10,
                  fontSize: 13, fontWeight: 500, color: S.text1,
                }}>
                  Ver análisis <ArrowRight size={13} />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Chat Container ── */}
      <div style={{
        borderRadius: 18,
        border: `0.5px solid ${S.border}`,
        background: S.surface,
        boxShadow: S.shadowMd,
        overflow: 'hidden',
      }}>
        {/* Chat Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 20px',
          borderBottom: `0.5px solid ${S.border}`,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, #44403c, #57534e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Globe size={20} color="#FFFFFF" />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: S.text1, margin: 0 }}>
              Chat con el Agente
            </p>
            <p style={{ fontSize: 12, color: S.text2, margin: 0 }}>
              Claude Sonnet — análisis avanzado
            </p>
          </div>
          <div style={{
            marginLeft: 'auto',
            width: 8, height: 8, borderRadius: '50%',
            background: '#0c0a09',
          }} />
        </div>

        {/* Messages Area */}
        <div style={{
          height: hasMessages ? 420 : 320,
          overflowY: 'auto',
          padding: '20px 20px 12px',
          transition: 'height 300ms ease',
        }}>
          {/* Empty state */}
          {!hasMessages && !isLoading && (
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              height: '100%', textAlign: 'center',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: S.surface2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16,
              }}>
                <Globe size={28} color={S.text3} strokeWidth={1.5} />
              </div>
              <p style={{
                fontSize: 15, color: S.text2, margin: '0 0 20px',
                maxWidth: 320,
              }}>
                Pregunta sobre mercados, regulaciones o importadores
              </p>
              <div style={{
                display: 'flex', flexWrap: 'wrap',
                justifyContent: 'center', gap: 8,
                maxWidth: 480,
              }}>
                {SUGGESTIONS.map(s => (
                  <button
                    key={s.text}
                    onClick={() => handleSend(s.text)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 14px',
                      borderRadius: S.rFull,
                      border: `1px solid ${S.border}`,
                      background: S.surface,
                      fontFamily: S.font,
                      fontSize: 13, color: S.text1,
                      cursor: 'pointer',
                      transition: `all 200ms ${S.ease}`,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = S.surface2; }}
                    onMouseLeave={e => { e.currentTarget.style.background = S.surface; }}
                  >
                    <span>{s.icon}</span> {s.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message bubbles */}
          <AnimatePresence>
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    display: 'flex',
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                    marginBottom: 12,
                  }}
                >
                  <div style={{ maxWidth: '80%' }}>
                    {/* Tool call cards before assistant message */}
                    {!isUser && msg.toolCalls?.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        {msg.toolCalls.map((tc, j) => (
                          <ToolCallCard key={j} toolCall={tc} />
                        ))}
                      </div>
                    )}
                    <div style={{
                      borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      padding: '12px 16px',
                      background: isUser ? '#0A0A0A' : S.surface2,
                      color: isUser ? '#FFFFFF' : S.text1,
                    }}>
                      {isUser ? (
                        <p style={{ fontSize: 15, lineHeight: 1.55, margin: 0 }}>
                          {msg.content}
                        </p>
                      ) : (
                        <div
                          style={{ fontSize: 15, lineHeight: 1.55 }}
                          dangerouslySetInnerHTML={{ __html: parseMarkdownSafe(msg.content) }}
                        />
                      )}
                    </div>
                    <p style={{
                      fontSize: 11, color: S.text3,
                      margin: '4px 4px 0',
                      textAlign: isUser ? 'right' : 'left',
                    }}>
                      {new Date(msg.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Loading dots */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                display: 'flex', gap: 5,
                padding: '12px 16px',
                borderRadius: '18px 18px 18px 4px',
                background: S.surface2,
                width: 'fit-content',
              }}
            >
              {[0, 1, 2].map(i => (
                <motion.span
                  key={i}
                  style={{
                    display: 'block', width: 7, height: 7,
                    borderRadius: '50%', background: S.text3,
                  }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{
          padding: '12px 16px',
          borderTop: `0.5px solid ${S.border}`,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '6px 6px 6px 18px',
            borderRadius: S.rFull,
            background: S.surface2,
            border: `1px solid ${S.border}`,
            transition: `all 200ms ${S.ease}`,
          }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pregunta al Agente Comercial..."
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                fontSize: 15, color: S.text1,
                fontFamily: S.font,
                outline: 'none',
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              style={{
                width: 36, height: 36,
                borderRadius: '50%',
                border: 'none',
                background: input.trim() ? '#0A0A0A' : S.surface2,
                color: input.trim() ? '#FFFFFF' : S.text3,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: input.trim() ? 'pointer' : 'default',
                transition: `all 200ms ${S.ease}`,
                flexShrink: 0,
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats strip ── */}
      {!hasMessages && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
            marginTop: 24,
          }}
        >
          {[
            { label: 'Mercados', value: '9', sub: 'países analizados' },
            { label: 'Importadores', value: '150+', sub: 'verificados' },
            { label: 'Contratos', value: 'PDF', sub: 'generación automática' },
            { label: 'Datos', value: '2026', sub: 'actualizados' },
          ].map((stat, i) => (
            <div key={stat.label} style={{
              borderRadius: 14,
              background: S.surface,
              border: `0.5px solid ${S.border}`,
              padding: '18px 16px',
              textAlign: 'center',
            }}>
              <p style={{
                fontSize: 24, fontWeight: 700,
                color: S.text1, letterSpacing: '-0.02em',
                margin: '0 0 2px',
              }}>
                {stat.value}
              </p>
              <p style={{ fontSize: 13, fontWeight: 600, color: S.text1, margin: '0 0 2px' }}>
                {stat.label}
              </p>
              <p style={{ fontSize: 12, color: S.text3, margin: 0 }}>
                {stat.sub}
              </p>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
