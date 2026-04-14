

/* ── Draggable floating button ── */

function FloatingButton({ side, buttonY, isDragging, onDragStart, onClick, BUTTON_SIZE }) {
  const isRight = side === 'right';
  const x = isRight ? window.innerWidth - BUTTON_SIZE - 20 : 20;

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: 1,
        x,
        y: buttonY,
      }}
      exit={{ scale: 0, opacity: 0 }}
      transition={isDragging ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 25 }}
      onMouseDown={onDragStart}
      onTouchStart={onDragStart}
      onClick={onClick}
      className="fixed left-0 top-0 z-50 flex items-center justify-center rounded-full bg-stone-950 shadow-[0_4px_24px_rgba(0,0,0,0.20)] touch-none select-none"
      style={{ width: BUTTON_SIZE, height: BUTTON_SIZE, cursor: isDragging ? 'grabbing' : 'grab' }}
      aria-label="Abrir David"
    >
      <Sparkles className="h-6 w-6 text-white pointer-events-none" />
    </motion.button>
  );
}

/* ── Main component ── */

export default function HispalAI({ onRequestClose } = {}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    messages,
    isLoading,
    aiProfile,
    alerts,
    sendMessage,
    clearChat,
  } = useHispalAI();
  const [input, setInput] = useState('');
  const inputRef = useRef(null);
  const isManaged = typeof onRequestClose === 'function';
  if (!isManaged) return null;

  // Panel de chat (solo si es gestionado por el manager)
  return (
    <>
      <div>
        <FocusTrap focusTrapOptions={{ escapeDeactivates: false, allowOutsideClick: true, returnFocusOnDeactivate: true }}>
          <AnimatePresence>
            {panelView ? (
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="david-dialog-title"
              >
                {/* Aquí va el contenido del panel, asegurando un solo elemento padre */}
                {/* ...todo el contenido del motion.div, agrupado en un fragmento... */}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </FocusTrap>
      </div>
      {/* El resto del contenido, que antes estaba en un fragmento aparte, ahora está aquí */}
      {messages.length === 0 && (
        <div className="flex flex-col items-center pt-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
            <Sparkles className="h-8 w-8 text-stone-950" />
          </div>
          {/* ...existing code... */}
        </div>
      )}
      <h3 className="mt-4 text-lg font-semibold text-stone-950">{t('david.greeting', 'Hola, soy David')}</h3>
      <p className="mt-1 text-center text-sm text-stone-500">
        Estoy aquí para ayudarte a encontrar lo que necesitas
      </p>

      {/* Quick Suggestions */}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {suggestions.map((label) => (
          <button
            key={label}
            onClick={() => sendMessage(label)}
            className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 transition-all hover:bg-stone-50 hover:shadow-sm active:scale-95"
          >
            <Sparkles size={14} className="text-stone-500" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </>
  );
// ...existing code...
                      <div className="flex-1 overflow-y-auto px-4 py-3">
                        {panelLoading && (
                          <div className="flex h-full items-center justify-center">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-200 border-t-stone-950" />
                          </div>
                        )}

                        {!panelLoading && panelError && (
                          <div className="flex h-full flex-col items-center justify-center text-center">
                            <RotateCw className="h-6 w-6 text-stone-300" />
                            <p className="mt-3 text-[13px] text-stone-500">{panelError}</p>
                            <button
                              onClick={() => openPanel(panelView)}
                              className="mt-3 flex items-center gap-1.5 rounded-full bg-stone-950 px-3 py-1.5 text-[12px] font-medium text-white"
                            >
                              <RotateCw className="h-3 w-3" /> Reintentar
                            </button>
                          </div>
                        )}

                        {/* Alerts panel */}
                        {!panelLoading && !panelError && panelView === 'alerts' && (
                          <>
                            {!alerts || alerts.length === 0 ? (
                              <div className="flex h-full flex-col items-center justify-center text-center">
                                <Bell className="h-8 w-8 text-stone-300" />
                                <p className="mt-3 text-[13px] text-stone-500">{t('david.no_alerts', 'Sin alertas ahora mismo.')}</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {alerts.map((alert, i) => (
                                  <button
                                    key={`${alert.type}-${alert.severity}-${i}`}
                                    onClick={() => {
                                      closePanel();
                                      sendMessage(`${alert.message}. ${alert.action}.`);
                                    }}
                                    aria-label={`Alerta: ${alert.message}`}
                                    className="flex w-full items-start gap-2.5 rounded-xl border border-stone-200 bg-white px-3 py-3 text-left hover:border-stone-300 transition-all"
                                  >
                                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                                      alert.severity === 'high' ? 'bg-stone-950'
                                      : alert.severity === 'medium' ? 'bg-stone-600' : 'bg-stone-400'
                                    }`} />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[13px] font-medium text-stone-950">{alert.message}</p>
                                      <p className="mt-0.5 text-[12px] text-stone-500">→ {alert.action}</p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        )}

                        {/* Wellness panel */}
                        {!panelLoading && !panelError && panelView === 'wellness' && (
                          <>
                            {!wellness ? (
                              <div className="flex h-full flex-col items-center justify-center text-center">
                                <Activity className="h-8 w-8 text-stone-300" />
                                <p className="mt-3 text-[13px] text-stone-500">{t('david.no_data', 'Sin datos suficientes aún.')}</p>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <div className="flex flex-col items-center rounded-xl border border-stone-200 bg-white p-4">
                                  <div className="relative flex h-20 w-20 items-center justify-center">
                                    <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36">
                                      <circle cx="18" cy="18" r="16" fill="none" stroke="#e7e5e4" strokeWidth="3" />
                                      <circle
                                        cx="18" cy="18" r="16" fill="none" stroke="#0c0a09" strokeWidth="3"
                                        strokeDasharray={`${(wellness.overall_score / 100) * 100.53} 100.53`}
                                        strokeLinecap="round"
                                      />
                                    </svg>
                                    <span className="text-[20px] font-bold text-stone-950">{wellness.overall_score}</span>
                                  </div>
                                  <p className="mt-2 text-[11px] uppercase tracking-wide text-stone-500">Bienestar</p>
                                </div>
                                <div className="space-y-2">
                                  {Object.entries(wellness.dimensions || {}).map(([key, dim]) => (
                                    <div key={key} className="rounded-xl border border-stone-200 bg-white p-3">
                                      <div className="flex items-center justify-between">
                                        <p className="text-[13px] font-medium text-stone-950">{dim.label}</p>
                                        <span className={`text-[12px] font-bold ${dim.score >= 70 ? 'text-stone-950' : 'text-stone-500'}`}>
                                          {dim.score}
                                        </span>
                                      </div>
                                      <p className="mt-0.5 text-[11px] text-stone-500">{dim.detail}</p>
                                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-stone-100">
                                        <div className="h-full rounded-full bg-stone-950" style={{ width: `${dim.score}%` }} />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {wellness.insights && wellness.insights.length > 0 && (
                                  <div>
                                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                                      Insights
                                    </p>
                                    <div className="space-y-2">
                                      {wellness.insights.map((insight, i) => (
                                        <button
                                          key={`${insight.dimension}-${i}`}
                                          onClick={() => { closePanel(); sendMessage(insight.message); }}
                                          className="flex w-full items-start gap-2 rounded-xl border border-stone-200 bg-white p-3 text-left hover:border-stone-300 transition-all"
                                        >
                                          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                                            insight.severity === 'high' ? 'bg-stone-950' :
                                            insight.severity === 'medium' ? 'bg-stone-600' : 'bg-stone-400'
                                          }`} />
                                          <p className="text-[12px] text-stone-700 flex-1">{insight.message}</p>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}

                        {/* Purchases panel */}
                        {!panelLoading && !panelError && panelView === 'purchases' && (
                          <>
                            {!purchases || purchases.total_orders === 0 ? (
                              <div className="flex h-full flex-col items-center justify-center text-center">
                                <BarChart3 className="h-8 w-8 text-stone-300" />
                                <p className="mt-3 text-[13px] text-stone-500">
                                  {purchases?.message || 'No tienes compras registradas.'}
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="rounded-xl border border-stone-200 bg-white p-3">
                                    <p className="text-[10px] uppercase tracking-wide text-stone-500">Gasto total</p>
                                    <p className="mt-1 text-[18px] font-bold text-stone-950">{purchases.total_spend?.toFixed(0)}€</p>
                                    <p className="mt-0.5 text-[11px] text-stone-500">{purchases.period_days}d</p>
                                  </div>
                                  <div className="rounded-xl border border-stone-200 bg-white p-3">
                                    <p className="text-[10px] uppercase tracking-wide text-stone-500">Pedidos</p>
                                    <p className="mt-1 text-[18px] font-bold text-stone-950">{purchases.total_orders}</p>
                                    <p className="mt-0.5 text-[11px] text-stone-500">{purchases.avg_order?.toFixed(0)}€ medio</p>
                                  </div>
                                </div>
                                {purchases.categories?.length > 0 && (
                                  <div>
                                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                                      Por categoría
                                    </p>
                                    <div className="space-y-1.5">
                                      {purchases.categories.slice(0, 6).map((cat, i) => (
                                        <div key={`${cat.name}-${i}`} className="rounded-xl border border-stone-200 bg-white p-2.5">
                                          <div className="flex items-center justify-between">
                                            <p className="text-[12px] font-medium text-stone-950 capitalize">{cat.name}</p>
                                            <p className="text-[12px] font-bold text-stone-950">{cat.spend?.toFixed(0)}€</p>
                                          </div>
                                          <div className="mt-1 h-1 overflow-hidden rounded-full bg-stone-100">
                                            <div className="h-full rounded-full bg-stone-950" style={{ width: `${cat.pct}%` }} />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                  {/* Todo lo que sigue debe estar en un solo fragmento */}
                  <>
                    {messages.length === 0 && (
                      <div className="flex flex-col items-center pt-8">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
                          <Sparkles className="h-8 w-8 text-stone-950" />
                        </div>
                        {/* ...existing code... */}
                      </div>
                    )}
                    <h3 className="mt-4 text-lg font-semibold text-stone-950">{t('david.greeting', 'Hola, soy David')}</h3>
                    <p className="mt-1 text-center text-sm text-stone-500">
                      Estoy aquí para ayudarte a encontrar lo que necesitas
                    </p>

                    {/* Quick Suggestions */}
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                      {suggestions.map((label) => (
                        <button
                          key={label}
                          onClick={() => sendMessage(label)}
                          className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 transition-all hover:bg-stone-50 hover:shadow-sm active:scale-95"
                        >
                          <Sparkles size={14} className="text-stone-500" />
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                        <h3 className="mt-4 text-lg font-semibold text-stone-950">{t('david.greeting', 'Hola, soy David')}</h3>
                        <p className="mt-1 text-center text-sm text-stone-500">
                          Estoy aquí para ayudarte a encontrar lo que necesitas
                        </p>

                        {/* Quick Suggestions */}
                        <div className="mt-6 flex flex-wrap justify-center gap-2">
                          {suggestions.map((label) => (
                            <button
                              key={label}
                              onClick={() => sendMessage(label)}
                              className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 transition-all hover:bg-stone-50 hover:shadow-sm active:scale-95"
                          >
                            <Sparkles size={14} className="text-stone-500" />
                            <span>{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((msg, i) => {
                    const isUser = msg.role === 'user';
                    const productResults = (msg.toolCalls || [])
                      .filter((tc) => tc.tool === 'search_products' && Array.isArray(tc.result))
                      .flatMap((tc) => tc.result);

                    const msgKey = `${msg.timestamp || 'nt'}-${msg.role}-${i}`;
                    return (
                      <React.Fragment key={msgKey}>
                        <div className={`mb-3 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                          {!isUser && (
                            <div className="mr-2 mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-stone-950">
                              <Sparkles className="h-3 w-3 text-white" />
                            </div>
                          )}
                          <div
                            className={`${isUser ? 'max-w-[75%]' : 'max-w-[85%]'} ${
                              isUser
                                ? 'rounded-2xl rounded-br-[4px] bg-stone-950 px-4 py-3 text-white'
                                : 'rounded-2xl rounded-bl-[4px] bg-stone-100 px-4 py-3 text-stone-950'
                            }`}
                          >
                            {isUser ? (
                              <p className="text-[15px] leading-relaxed">{msg.content}</p>
                            ) : (
                              <div
                                className="text-[15px] leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: parseMarkdownSafe(msg.content || '') }}
                              />
                            )}
                            {msg.failed && msg.originalText && (
                              <button
                                onClick={() => retryMessage(msg)}
                                disabled={isLoading}
                                aria-label="Reintentar envío"
                                className="mt-2 flex items-center gap-1.5 rounded-full bg-stone-950 px-3 py-1 text-[12px] font-medium text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                              >
                                <RotateCw className="h-3 w-3" />
                                <span>Reintentar</span>
                              </button>
                            )}
                            {msg.timestamp && !Number.isNaN(new Date(msg.timestamp).getTime()) && (
                              <p className="mt-1 text-[11px] text-stone-400">
                                {new Date(msg.timestamp).toLocaleTimeString('es-ES', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            )}
                          </div>
                        </div>

                        {productResults.length > 0 && (
                          <div className="mb-3 ml-8">
                            {productResults.map((product) => (
                              <ProductCardInChat
                                key={product.id}
                                product={product}
                                onAddToCart={handleAddToCart}
                                onViewProduct={(slugOrId) => window.open(`/products/${slugOrId}`, '_blank')}
                              />
                            ))}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {isLoading && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-stone-100 p-4">
                  <div className="flex items-center gap-2 rounded-full bg-stone-100 px-4 py-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={t('hispal_a_i.preguntaleADavid', 'Pregúntale a David...')}
                      maxLength={2000}
                      aria-label="Mensaje para David"
                      className="flex-1 border-none bg-transparent text-[15px] text-stone-950 placeholder-stone-400 outline-none"
                    />
                    <button
                      className="p-1 text-stone-400 transition-colors"
                      aria-label={t('hispal_a_i.microfono', 'Micrófono')}
                      disabled
                    >
                      <Mic className="h-5 w-5" />
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                        input.trim()
                          ? 'bg-stone-950 text-white hover:scale-105'
                          : 'bg-stone-200 text-stone-400'
                      }`}
                      aria-label="Enviar"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </FocusTrap>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
