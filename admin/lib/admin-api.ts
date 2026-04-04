/**
 * 管理后台请求封装：浏览器访问同源 `/api/*`，由 Next rewrites 转到 FastAPI。
 * 所有写操作需带管理员 JWT（`Authorization: Bearer`）。
 */

/** GET，401 时抛错，页面应退回登录 */
export async function apiGET<T>(path: string, token: string): Promise<T> {
  const res = await fetch(path, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

/** PATCH JSON */
export async function apiPATCH<B extends object>(
  path: string,
  token: string,
  body: B,
): Promise<unknown> {
  const res = await fetch(path, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

/** POST JSON */
export async function apiPOST<B extends object>(
  path: string,
  token: string,
  body: B,
): Promise<unknown> {
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

/** PUT JSON（如保存 admin_settings 整块） */
export async function apiPUT<B extends object>(
  path: string,
  token: string,
  body: B,
): Promise<unknown> {
  const res = await fetch(path, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

/** DELETE */
export async function apiDELETE(path: string, token: string): Promise<unknown> {
  const res = await fetch(path, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}
