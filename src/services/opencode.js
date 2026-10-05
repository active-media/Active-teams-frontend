// Client for the local OpenCode background service.
//
// Requests go to the same-origin `/oc` path, which vite.config.js proxies to
// the OpenCode server and authenticates server-side. Nothing secret is exposed
// to the browser, and there is no CORS negotiation.
//
// Docs: https://opencode.ai/v2/docs/api

const BASE = "/oc";

// Default directory OpenCode scopes sessions to. Not a secret, so it is safe to
// inline into the bundle.
export const projectDirectory = import.meta.env.VITE_OPENCODE_DIRECTORY;

// Merge the location into an existing path, preserving any query it already has.
const withLocation = (path, directory) => {
  if (!directory) return `${BASE}${path}`;

  const [pathname, existingQuery = ""] = path.split("?");
  const query = new URLSearchParams(existingQuery);
  query.set("location[directory]", directory);

  return `${BASE}${pathname}?${query.toString()}`;
};

const request = async (
  path,
  { method = "GET", body, directory, useLocation = true } = {}
) => {
  const response = await fetch(
    useLocation
      ? withLocation(path, directory ?? projectDirectory)
      : `${BASE}${path}`,
    {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }
  );

  if (!response.ok) {
    throw new Error(
      `OpenCode request failed: ${method} ${path} (${response.status})`
    );
  }

  if (response.status === 204) return null;

  // Prompt responses stream. Parsing as JSON would block until the agent
  // finishes, so fall back to text for non-JSON bodies.
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json")
    ? response.json()
    : response.text();
};

export const getInfo = () => request("/api/info");

export const listAgents = (directory) => request("/api/agent", { directory });

export const listModels = (directory) => request("/api/model", { directory });

// Returns { data, cursor }; pass cursor for the next page.
// Note: this endpoint filters on the `directory` query param specifically. The
// generic `location[directory]` form is accepted elsewhere but does NOT filter
// this list, which silently returns every project's sessions.
export const listSessions = (directory, cursor) => {
  const query = new URLSearchParams();
  query.set("directory", directory ?? projectDirectory);
  if (cursor) query.set("cursor", cursor);
  return request(`/api/session?${query.toString()}`, { useLocation: false });
};

export const getSession = (sessionID, directory) =>
  request(`/api/session/${sessionID}`, { directory });

export const getMessages = (sessionID, directory) =>
  request(`/api/session/${sessionID}/message`, { directory });

export const createSession = (directory, title) =>
  request("/api/session", {
    method: "POST",
    directory,
    body: { title },
  });

export const deleteSession = (sessionID, directory) =>
  request(`/api/session/${sessionID}`, { method: "DELETE", directory });

// Send a prompt. The response streams, so read it as text to avoid hanging on
// an unconsumed body. Subscribe to events (below) to render it incrementally.
export const sendPrompt = (sessionID, text, directory) =>
  request(`/api/session/${sessionID}/prompt`, {
    method: "POST",
    directory,
    body: { text },
  });

export const interrupt = (sessionID, directory) =>
  request(`/api/session/${sessionID}/interrupt`, { method: "POST", directory });

// Live-only stream: no replay, no auto-reconnect. Call again after an error.
export const subscribeToEvents = (onEvent, onError) => {
  const source = new EventSource(`${BASE}/api/event`);

  source.onmessage = (message) => {
    try {
      onEvent(JSON.parse(message.data));
    } catch (error) {
      console.error("Failed to parse OpenCode event", error);
    }
  };

  source.onerror = (error) => {
    if (onError) onError(error);
  };

  return () => source.close();
};