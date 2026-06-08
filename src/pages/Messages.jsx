import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createMessage, deleteMessage, getInboxMessages, getSentMessages, markMessageAsRead, toggleMessageStar } from '../services/api';
import './Messages.css';

const folders = [
  { key: 'inbox', label: 'Recibidos' },
  { key: 'starred', label: 'Destacados' },
  { key: 'sent', label: 'Enviados' },
  { key: 'trash', label: 'Papelera' }
];

const emptyForm = { recipientEmail: '', subject: '', body: '', threadId: null, replyToId: null };

export default function Messages() {
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [messages, setMessages] = useState([]);
  const [trashIds, setTrashIds] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [search, setSearch] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [composerMode, setComposerMode] = useState('new');
  const [form, setForm] = useState(emptyForm);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');

  const fetchMessages = useCallback(async () => {
    setLoading(true);

    try {
      const [inboxResponse, sentResponse] = await Promise.all([
        getInboxMessages(),
        getSentMessages()
      ]);

      const inboxMessages = Array.isArray(inboxResponse.data) ? inboxResponse.data : [];
      const sentMessages = Array.isArray(sentResponse.data) ? sentResponse.data : [];

      setMessages([...inboxMessages, ...sentMessages]);
      setStatusMessage({ type: '', text: '' });
    } catch (error) {
      console.error('Error cargando mensajes:', error.response?.data || error.message);
      setStatusMessage({ type: 'error', text: error.response?.data?.mensaje || 'No se pudieron cargar los mensajes.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const visibleMessages = useMemo(() => {
    if (!currentUser) return [];

    return messages.filter((message) => {
      const isOwned = message.senderId === currentUser.id || message.recipientId === currentUser.id;
      if (!isOwned) return false;

      if (trashIds.includes(message.id) || message.folder === 'trash') {
        return activeFolder === 'trash';
      }

      if (activeFolder === 'inbox') {
        return message.recipientId === currentUser.id;
      }

      if (activeFolder === 'sent') {
        return message.senderId === currentUser.id;
      }

      if (activeFolder === 'starred') {
        return Boolean(message.isStarred);
      }

      return true;
    });
  }, [messages, activeFolder, currentUser, trashIds]);

  const threadGroups = useMemo(() => {
    const grouped = new Map();

    visibleMessages.forEach((message) => {
      const key = message.threadId || message.id;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(message);
    });

    return Array.from(grouped.values())
      .map((threadMessages) => {
        const sortedMessages = [...threadMessages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const latest = sortedMessages[sortedMessages.length - 1];
        const unreadCount = sortedMessages.filter((entry) => !entry.isRead && entry.recipientId === currentUser?.id).length;

        return {
          id: latest.threadId || latest.id,
          messages: sortedMessages,
          latest,
          unreadCount,
          participantName: latest.senderId === currentUser?.id ? (latest.recipientName || latest.recipientEmail || 'Destinatario') : (latest.senderName || latest.senderEmail || 'Remitente'),
          participantEmail: latest.senderId === currentUser?.id ? (latest.recipientEmail || '') : (latest.senderEmail || ''),
          subject: latest.subject || '(Sin asunto)',
          preview: latest.snippet || latest.body || ''
        };
      })
      .sort((a, b) => new Date(b.latest.createdAt) - new Date(a.latest.createdAt));
  }, [currentUser, visibleMessages]);

  const filteredThreads = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) return threadGroups;

    return threadGroups.filter((thread) => {
      const haystack = [
        thread.subject,
        thread.preview,
        thread.participantName,
        thread.participantEmail,
        thread.messages.map((message) => message.body).join(' ')
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [search, threadGroups]);

  const selectedThread = filteredThreads.find((thread) => thread.id === selectedThreadId) || filteredThreads[0] || null;

  useEffect(() => {
    if (filteredThreads.length === 0) {
      setSelectedThreadId(null);
      return;
    }

    if (!filteredThreads.some((thread) => thread.id === selectedThreadId)) {
      setSelectedThreadId(filteredThreads[0].id);
    }
  }, [filteredThreads, selectedThreadId]);

  const openThread = async (thread) => {
    setSelectedThreadId(thread.id);

    const unreadMessages = thread.messages.filter((message) => !message.isRead && message.recipientId === currentUser?.id);
    if (unreadMessages.length > 0) {
      try {
        await Promise.all(unreadMessages.map((message) => markMessageAsRead(message.id)));
        setMessages((currentMessages) =>
          currentMessages.map((message) =>
            unreadMessages.some((entry) => entry.id === message.id)
              ? { ...message, isRead: true }
              : message
          )
        );
      } catch (error) {
        console.error('Error marcando mensaje como leído:', error.response?.data || error.message);
      }
    }
  };

  const handleToggleThreadStar = async (thread) => {
    const nextValue = !thread.latest.isStarred;

    try {
      await Promise.all(thread.messages.map((message) => toggleMessageStar(message.id, nextValue)));
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          thread.messages.some((entry) => entry.id === message.id)
            ? { ...message, isStarred: nextValue }
            : message
        )
      );
    } catch (error) {
      console.error('Error actualizando destacado:', error.response?.data || error.message);
      setStatusMessage({ type: 'error', text: 'No se pudo actualizar el destacado del hilo.' });
    }
  };

  const handleDeleteThread = async (thread) => {
    try {
      await Promise.all(thread.messages.map((message) => deleteMessage(message.id)));
      setTrashIds((currentTrashIds) => [...new Set([...currentTrashIds, ...thread.messages.map((message) => message.id)])]);
      setMessages((currentMessages) => currentMessages.filter((message) => !thread.messages.some((entry) => entry.id === message.id)));
      setStatusMessage({ type: 'success', text: 'Hilo movido a papelera.' });
    } catch (error) {
      console.error('Error enviando a papelera:', error.response?.data || error.message);
      setStatusMessage({ type: 'error', text: 'No se pudo mover el hilo a papelera.' });
    }
  };

  const toggleThreadReadState = (thread) => {
    const nextValue = thread.messages.some((message) => !message.isRead);

    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        thread.messages.some((entry) => entry.id === message.id)
          ? { ...message, isRead: nextValue }
          : message
      )
    );
  };

  const toggleSelection = (messageId) => {
    setSelectedIds((currentIds) =>
      currentIds.includes(messageId)
        ? currentIds.filter((id) => id !== messageId)
        : [...currentIds, messageId]
    );
  };

  const startComposer = (mode = 'new', thread = null) => {
    if (mode === 'reply' && thread) {
      const latest = thread.latest;
      const replyTo = latest.senderEmail === currentUser?.email ? latest.recipientEmail : latest.senderEmail;
      const subject = latest.subject.startsWith('Re:') ? latest.subject : `Re: ${latest.subject}`;
      const body = `\n\n---\n${latest.senderName || latest.senderEmail} escribió:\n${latest.body}`;

      setForm({
        recipientEmail: replyTo,
        subject,
        body,
        threadId: thread.id,
        replyToId: latest.id
      });
    } else {
      setForm(emptyForm);
    }

    setComposerMode(mode);
    setShowComposer(true);
  };

  const handleSend = async (e) => {
    e.preventDefault();

    if (!form.recipientEmail || !form.subject || !form.body) {
      setStatusMessage({ type: 'error', text: 'Completa destinatario, asunto y mensaje.' });
      return;
    }

    try {
      const created = await createMessage({
        recipientEmail: form.recipientEmail,
        subject: form.subject,
        body: form.body,
        isStarred: false,
        threadId: form.threadId || undefined,
        replyToId: form.replyToId || undefined
      });

      setMessages((currentMessages) => [created.data, ...currentMessages]);
      setForm(emptyForm);
      setShowComposer(false);
      setActiveFolder('sent');
      setStatusMessage({ type: 'success', text: 'Mensaje enviado correctamente.' });
    } catch (error) {
      console.error('Error enviando mensaje:', error.response?.data || error.message);
      setStatusMessage({ type: 'error', text: error.response?.data?.mensaje || 'No se pudo enviar el mensaje.' });
    }
  };

  return (
    <div className="messages-page">
      <div className="messages-header">
        <div>
          <p className="messages-eyebrow">Centro de comunicaciones</p>
          <h2>Mensajería</h2>
          <p className="messages-subtitle">Un buzón con hilos, carpetas y acciones de correo realistas.</p>
        </div>

        <div className="messages-search-wrap">
          <input
            className="messages-search"
            type="text"
            placeholder="Buscar por remitente, asunto o contenido"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn-primary" onClick={() => startComposer('new')}>+ Redactar</button>
        </div>
      </div>

      {statusMessage.text && <div className={`status-message ${statusMessage.type}`}>{statusMessage.text}</div>}

      <div className="messages-layout">
        <aside className="messages-sidebar">
          <div className="sidebar-card">
            <button className="compose-button" onClick={() => startComposer('new')}>Redactar</button>

            <div className="folder-list">
              {folders.map((folder) => (
                <button
                  key={folder.key}
                  className={`folder-item ${activeFolder === folder.key ? 'active' : ''}`}
                  onClick={() => setActiveFolder(folder.key)}
                >
                  <span>{folder.label}</span>
                  <span className="folder-count">{folder.key === 'starred' ? threadGroups.filter((thread) => thread.latest.isStarred).length : folder.key === 'trash' ? trashIds.length : folder.key === 'sent' ? threadGroups.filter((thread) => thread.latest.senderId === currentUser?.id).length : threadGroups.filter((thread) => thread.latest.recipientId === currentUser?.id).length}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="messages-list-panel">
          <div className="list-header">
            <div>
              <h3>{folders.find((folder) => folder.key === activeFolder)?.label}</h3>
              <p>{filteredThreads.length} hilos</p>
            </div>
            <span className="selection-pill">{selectedIds.length} seleccionados</span>
          </div>

          {loading ? (
            <div className="empty-state">Cargando mensajes...</div>
          ) : filteredThreads.length === 0 ? (
            <div className="empty-state">No hay hilos para mostrar.</div>
          ) : (
            <div className="message-list">
              {filteredThreads.map((thread) => (
                <article
                  key={thread.id}
                  className={`message-row ${thread.unreadCount > 0 ? 'unread' : ''} ${selectedThread?.id === thread.id ? 'selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(thread.latest.id)}
                    onChange={() => toggleSelection(thread.latest.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    className={`star-button ${thread.latest.isStarred ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleThreadStar(thread);
                    }}
                  >
                    ?
                  </button>

                  <div className="message-column sender" onClick={() => openThread(thread)}>
                    <strong>{thread.participantName}</strong>
                    <small>{thread.messages.length} mensajes</small>
                  </div>

                  <div className="message-column content" onClick={() => openThread(thread)}>
                    <div className="message-subject">{thread.subject}</div>
                    <div className="message-snippet">{thread.preview}</div>
                  </div>

                  <div className="message-column meta" onClick={() => openThread(thread)}>
                    <span className="thread-time">{new Date(thread.latest.createdAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
                    {thread.unreadCount > 0 && <span className="unread-dot">?</span>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="messages-detail-panel">
          {selectedThread ? (
            <article className="detail-card">
              <div className="detail-top">
                <div>
                  <p className="detail-label">{activeFolder === 'sent' ? 'Para' : 'De'}</p>
                  <h3>{selectedThread.participantName}</h3>
                  <p className="detail-meta">{selectedThread.participantEmail}</p>
                </div>

                <div className="detail-actions">
                  <button className="action-chip" onClick={() => startComposer('reply', selectedThread)}>Responder</button>
                  <button className="action-chip danger" onClick={() => handleDeleteThread(selectedThread)}>Papelera</button>
                </div>
              </div>

              <div className="detail-subject-row">
                <div>
                  <p className="detail-subject">{selectedThread.subject}</p>
                  <p className="detail-time">{selectedThread.messages.length} mensajes en esta conversación · {new Date(selectedThread.latest.createdAt).toLocaleString('es-CL')}</p>
                </div>

                <div className="detail-toolbar">
                  <button className="toolbar-button" onClick={() => handleToggleThreadStar(selectedThread)}>{selectedThread.latest.isStarred ? 'Quitar estrella' : 'Destacar'}</button>
                  <button className="toolbar-button" onClick={() => toggleThreadReadState(selectedThread)}>{selectedThread.unreadCount > 0 ? 'Marcar como leído' : 'Marcar como no leído'}</button>
                </div>
              </div>

              <div className="thread-history">
                {selectedThread.messages.map((message) => (
                  <div className={`thread-message ${message.isRead ? 'read' : 'unread'} ${message.id === selectedThread.latest.id ? 'latest' : ''}`} key={message.id}>
                    <div className="thread-message-header">
                      <div>
                        <strong>{message.senderId === currentUser?.id ? 'Tú' : message.senderName || message.senderEmail}</strong>
                        <span className="thread-message-time">{new Date(message.createdAt).toLocaleString('es-CL')}</span>
                      </div>
                      <div className="thread-message-badges">
                        {message.isStarred && <span className="mini-badge">?</span>}
                        {!message.isRead && <span className="mini-badge unread">Nuevo</span>}
                      </div>
                    </div>
                    <p className="thread-message-body">{message.body}</p>
                  </div>
                ))}
              </div>
            </article>
          ) : (
            <div className="empty-state">Selecciona un hilo para ver su detalle.</div>
          )}
        </section>
      </div>

      {showComposer && (
        <div className="composer-overlay" onClick={() => setShowComposer(false)}>
          <div className="composer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="composer-header">
              <div>
                <h3>{composerMode === 'reply' ? 'Responder mensaje' : 'Nuevo mensaje'}</h3>
                <p>Escribe tu respuesta o inicia una conversación nueva.</p>
              </div>
              <button className="close-button" onClick={() => setShowComposer(false)}>×</button>
            </div>

            <form className="composer-form" onSubmit={handleSend}>
              <label>
                Destinatario
                <input
                  type="email"
                  value={form.recipientEmail}
                  onChange={(e) => setForm((current) => ({ ...current, recipientEmail: e.target.value }))}
                  placeholder="correo@empresa.cl"
                  required
                />
              </label>

              <label>
                Asunto
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm((current) => ({ ...current, subject: e.target.value }))}
                  placeholder="Asunto del mensaje"
                  required
                />
              </label>

              <label>
                Mensaje
                <textarea
                  rows="10"
                  value={form.body}
                  onChange={(e) => setForm((current) => ({ ...current, body: e.target.value }))}
                  placeholder="Escribe tu mensaje..."
                  required
                />
              </label>

              <div className="composer-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowComposer(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Enviar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
