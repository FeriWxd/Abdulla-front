const API_ORIGIN = (import.meta?.env?.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

const getToken = () => localStorage.getItem("token");
const setToken = (t) => (t ? localStorage.setItem("token", t) : localStorage.removeItem("token"));

function withBase(path) {
  if (!path) return API_ORIGIN;
  if (/^https?:\/\//i.test(path)) return path;
  if (!path.startsWith("/")) path = "/" + path;
  return API_ORIGIN + path;
}
function buildURL(path, params) {
  const url = new URL(withBase(path));
  if (params && typeof params === "object") {
    Object.entries(params).forEach(([k, v]) => {
      if (v == null) return;
      if (Array.isArray(v)) v.forEach((vv) => url.searchParams.append(k, vv));
      else url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}
function safeJson(t) { try { return JSON.parse(t); } catch { return {}; } }
async function parseResponse(res) {
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();
  const data = contentType.includes("application/json") ? (text ? safeJson(text) : {}) : (text || {});
  return { ok: res.ok, status: res.status, data, headers: res.headers };
}

const AUTH_FREE_REGEX = /\/api\/(login|register|auth\/refresh|refresh-token)\b/i;
let refreshPromise = null;

async function callRefresh() {
  const url = withBase("/api/auth/refresh");
  const res = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" } });
  const parsed = await parseResponse(res);
  if (!parsed.ok) throw new Error(parsed.data?.message || `HTTP ${parsed.status}`);
  const newTok = parsed.data?.token || parsed.data?.accessToken || null;
  if (newTok) setToken(newTok); else setToken(null);
  return newTok;
}

/** 401 VEYA 403 geldiğinde refresh dener */
async function withRefreshRetry(doRequest, originalOptions = {}) {
  const first = await doRequest();
  if (first.ok) return first;
  const code = first.status;
  const blocked = AUTH_FREE_REGEX.test(originalOptions?.path || "");
  if (blocked || (code !== 401 && code !== 403)) return first;

  if (!refreshPromise) refreshPromise = callRefresh().finally(() => (refreshPromise = null));
  try { await refreshPromise; } catch { return first; }
  return doRequest(true);
}

/**
 * noCache: GET isteklerinde cache’i atlamak için (default: true)
 * params  : query param’lar
 */
async function request(method, path, { params, headers, body, rawBody, signal, auth = true, noCache = true } = {}) {
  let url = buildURL(path, params);
  const h = { ...(headers || {}) };

  // İstek gövdesi & JSON
  if (!rawBody && body !== undefined && !(body instanceof FormData)) h["Content-Type"] = "application/json";

  // Token ekle (yoksa önce refresh dene)
  const shouldAttachAuth = auth && !AUTH_FREE_REGEX.test(path);
  let token = getToken();
  if (shouldAttachAuth && !token) {
    try { await (refreshPromise || callRefresh()); token = getToken(); } catch {}
  }
  if (shouldAttachAuth && token) h.Authorization = `Bearer ${token}`;

  const init = { method: (method || "GET").toUpperCase(), headers: h, signal, credentials: "include" };

  // 🔒 Cache bypass: GET ise no-store + timestamp
  if (init.method === "GET" && noCache) {
    const sep = url.includes("?") ? "&" : "?";
    url = `${url}${sep}_ts=${Date.now()}`;
    init.cache = "no-store";
    h["Cache-Control"] = "no-cache";
    h.Pragma = "no-cache";
  }

  if (body !== undefined) init.body = body instanceof FormData ? body : (rawBody ? body : JSON.stringify(body));

  const doRequest = async (afterRefresh = false) => {
    if (afterRefresh) {
      const newTok = getToken();
      if (shouldAttachAuth && newTok) init.headers = { ...init.headers, Authorization: `Bearer ${newTok}` };
      else init.headers = { ...init.headers };
    }
    const res = await fetch(url, init);
    return parseResponse(res);
  };

  const resp = await withRefreshRetry(doRequest, { path });
  if (!resp.ok) {
    const err = new Error(resp.data?.message || `HTTP ${resp.status}`);
    err.status = resp.status; err.data = resp.data;
    throw err;
  }
  return resp.data;
}

async function apiFn(path, options = {}) { const method = options.method || "GET"; return request(method, path, options); }
apiFn.request  = request;
apiFn.get      = (path, opts = {}) => request("GET", path, opts);
apiFn.post     = (path, data, opts = {}) => request("POST", path, { ...opts, body: data });
apiFn.put      = (path, data, opts = {}) => request("PUT",  path, { ...opts, body: data });
apiFn.patch    = (path, data, opts = {}) => request("PATCH", path, { ...opts, body: data });
apiFn.delete   = (path, opts = {}) => request("DELETE", path, opts);
apiFn.postForm = (path, formData, opts = {}) => request("POST", path, { ...opts, body: formData });

export const api = apiFn;
export const apiGet = apiFn.get;
export const apiPost = apiFn.post;
export const apiPut = apiFn.put;
export const apiPatch = apiFn.patch;
export const apiDelete = apiFn.delete;
export const apiPostForm = apiFn.postForm;
export const getAccessToken = getToken;
export const setAccessToken = setToken;
export default apiFn;
