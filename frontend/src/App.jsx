import { useEffect, useRef, useState } from 'react';

async function fetchJson(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch (_error) {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }

  return data;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function App() {
  const mountedRef = useRef(true);
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [apiStatus, setApiStatus] = useState('Checking backend...');

  function commit(callback) {
    if (mountedRef.current) {
      callback();
    }
  }

  async function loadNotes() {
    commit(() => setLoading(true));
    commit(() => setError(''));

    try {
      const data = await fetchJson('/api/notes');
      commit(() => setNotes(Array.isArray(data.notes) ? data.notes : []));
    } catch (requestError) {
      commit(() => setError(requestError.message));
    } finally {
      commit(() => setLoading(false));
    }
  }

  useEffect(() => {
    mountedRef.current = true;

    async function bootstrap() {
      try {
        const health = await fetchJson('/api/health');
        commit(() =>
          setApiStatus(health.status === 'ok' ? 'Backend online' : 'Backend responded')
        );
      } catch (_error) {
        commit(() => setApiStatus('Backend unavailable'));
      }

      await loadNotes();
    }

    bootstrap();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    commit(() => setSaving(true));
    commit(() => setError(''));

    try {
      const data = await fetchJson('/api/notes', {
        method: 'POST',
        body: JSON.stringify({
          title,
          content,
        }),
      });

      if (data.note) {
        commit(() => setNotes((current) => [data.note, ...current]));
      }

      commit(() => {
        setTitle('');
        setContent('');
      });
    } catch (requestError) {
      commit(() => setError(requestError.message));
    } finally {
      commit(() => setSaving(false));
    }
  }

  async function handleDelete(id) {
    commit(() => setDeletingId(id));
    commit(() => setError(''));

    try {
      await fetchJson(`/api/notes/${id}`, {
        method: 'DELETE',
      });

      commit(() => setNotes((current) => current.filter((note) => note.id !== id)));
    } catch (requestError) {
      commit(() => setError(requestError.message));
    } finally {
      commit(() => setDeletingId(null));
    }
  }

  const noteCount = notes.length;

  return (
    <div className="app-shell">
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <main className="layout">
        <section className="hero panel">
          <div className="eyebrow">Phase 1 local stack</div>
          <h1>React frontend, Node backend, PostgreSQL.</h1>
          <p>
            A small microservice-style notes app that runs locally in Docker and
            can be deployed with the same API shape inside Kubernetes.
          </p>

          <div className="stats">
            <article className="stat-card">
              <span className="stat-label">Notes</span>
              <strong className="stat-value">{noteCount}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-label">API</span>
              <strong className="stat-value">{apiStatus}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-label">Database</span>
              <strong className="stat-value">PostgreSQL</strong>
            </article>
          </div>
        </section>

        <section className="grid">
          <form className="panel editor" onSubmit={handleSubmit}>
            <div className="section-head">
              <div>
                <div className="section-kicker">New note</div>
                <h2>Capture something useful</h2>
              </div>
              <button className="ghost-button" type="button" onClick={loadNotes} disabled={loading}>
                Refresh
              </button>
            </div>

            <label className="field">
              <span>Title</span>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Product idea"
                maxLength={120}
                required
              />
            </label>

            <label className="field">
              <span>Content</span>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Write the important detail here..."
                rows={7}
                maxLength={1500}
                required
              />
            </label>

            <div className="form-footer">
              <p className="helper-text">Stored in PostgreSQL through the backend API.</p>
              <button className="primary-button" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Create note'}
              </button>
            </div>
          </form>

          <section className="panel notes">
            <div className="section-head">
              <div>
                <div className="section-kicker">Saved notes</div>
                <h2>Latest entries</h2>
              </div>
            </div>

            {loading ? (
              <div className="empty-state">Loading notes from the backend...</div>
            ) : notes.length === 0 ? (
              <div className="empty-state">
                No notes yet. Add the first one on the left and it will show up here.
              </div>
            ) : (
              <div className="note-list">
                {notes.map((note) => (
                  <article className="note-card" key={note.id}>
                    <div className="note-topline">
                      <h3>{note.title}</h3>
                      <button
                        className="danger-button"
                        type="button"
                        onClick={() => handleDelete(note.id)}
                        disabled={deletingId === note.id}
                      >
                        {deletingId === note.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>

                    <p>{note.content}</p>

                    <div className="note-meta">
                      <span>Created {formatDate(note.created_at)}</span>
                      <span>Updated {formatDate(note.updated_at)}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>

        {error ? <aside className="error-banner">{error}</aside> : null}
      </main>
    </div>
  );
}

export default App;
