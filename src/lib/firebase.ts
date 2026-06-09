// ─── Firestore REST API Helper ─────────────────────────────────────
// 零依賴，完全相容 Cloudflare Workers 環境
// Firebase 降級為輔助角色：只存放非結構化資料（如 AI 對話記錄、學習筆記等）

type FirestoreEnv = {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_DATABASE_ID: string;
  FIREBASE_WEB_API_KEY: string;
};

type FirestoreValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  timestampValue?: string;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields: Record<string, FirestoreValue> };
  nullValue?: string;
};

type FirestoreDocument = {
  name: string;
  fields?: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
};

// ─── Config ────────────────────────────────────────────────────────

function getFirebaseConfig(env: FirestoreEnv) {
  const projectId = env.FIREBASE_PROJECT_ID?.trim();
  const apiKey = env.FIREBASE_WEB_API_KEY?.trim();
  const databaseId = env.FIREBASE_DATABASE_ID?.trim() || "(default)";

  if (!projectId || !apiKey) {
    return null;
  }

  return {
    apiKey,
    baseUrl: `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${encodeURIComponent(databaseId)}/documents`,
  };
}

// ─── Encoding Helpers ──────────────────────────────────────────────

export function encodeString(value: string): FirestoreValue {
  return { stringValue: value };
}

export function encodeInteger(value: number): FirestoreValue {
  return { integerValue: String(value) };
}

export function encodeBoolean(value: boolean): FirestoreValue {
  return { booleanValue: value };
}

export function encodeTimestamp(date?: Date): FirestoreValue {
  return { timestampValue: (date || new Date()).toISOString() };
}

export function encodeArray(values: FirestoreValue[]): FirestoreValue {
  return { arrayValue: { values } };
}

export function encodeMap(
  fields: Record<string, FirestoreValue>
): FirestoreValue {
  return { mapValue: { fields } };
}

// ─── Decoding Helpers ──────────────────────────────────────────────

export function decodeValue(val: FirestoreValue): unknown {
  if (val.stringValue !== undefined) return val.stringValue;
  if (val.integerValue !== undefined) return parseInt(val.integerValue, 10);
  if (val.doubleValue !== undefined) return val.doubleValue;
  if (val.booleanValue !== undefined) return val.booleanValue;
  if (val.timestampValue !== undefined) return val.timestampValue;
  if (val.nullValue !== undefined) return null;
  if (val.arrayValue?.values) return val.arrayValue.values.map(decodeValue);
  if (val.mapValue?.fields) {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val.mapValue.fields)) {
      result[k] = decodeValue(v);
    }
    return result;
  }
  return null;
}

export function documentId(name: string): string {
  return name.split("/").pop() || name;
}

// ─── CRUD Operations ──────────────────────────────────────────────

/**
 * 建立文件
 */
export async function createDocument(
  env: FirestoreEnv,
  collection: string,
  docId: string,
  fields: Record<string, FirestoreValue>
): Promise<FirestoreDocument | null> {
  const config = getFirebaseConfig(env);
  if (!config) return null;

  const url = `${config.baseUrl}/${collection}?documentId=${encodeURIComponent(docId)}&key=${encodeURIComponent(config.apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    console.error(`Firestore create failed: ${res.status}`);
    return null;
  }

  return (await res.json()) as FirestoreDocument;
}

/**
 * 取得單一文件
 */
export async function getDocument(
  env: FirestoreEnv,
  collection: string,
  docId: string
): Promise<FirestoreDocument | null> {
  const config = getFirebaseConfig(env);
  if (!config) return null;

  const url = `${config.baseUrl}/${collection}/${encodeURIComponent(docId)}?key=${encodeURIComponent(config.apiKey)}`;
  const res = await fetch(url);

  if (!res.ok) {
    if (res.status === 404) return null;
    console.error(`Firestore get failed: ${res.status}`);
    return null;
  }

  return (await res.json()) as FirestoreDocument;
}

/**
 * 更新（PATCH）文件
 */
export async function updateDocument(
  env: FirestoreEnv,
  collection: string,
  docId: string,
  fields: Record<string, FirestoreValue>
): Promise<boolean> {
  const config = getFirebaseConfig(env);
  if (!config) return false;

  const url = `${config.baseUrl}/${collection}/${encodeURIComponent(docId)}?key=${encodeURIComponent(config.apiKey)}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });

  return res.ok;
}

/**
 * 刪除文件
 */
export async function deleteDocument(
  env: FirestoreEnv,
  collection: string,
  docId: string
): Promise<boolean> {
  const config = getFirebaseConfig(env);
  if (!config) return false;

  const url = `${config.baseUrl}/${collection}/${encodeURIComponent(docId)}?key=${encodeURIComponent(config.apiKey)}`;
  const res = await fetch(url, { method: "DELETE" });

  return res.ok;
}

/**
 * 查詢文件（structuredQuery）
 */
export async function queryDocuments(
  env: FirestoreEnv,
  collection: string,
  where?: {
    field: string;
    op: string;
    value: FirestoreValue;
  },
  limit?: number
): Promise<FirestoreDocument[]> {
  const config = getFirebaseConfig(env);
  if (!config) return [];

  const query: any = {
    structuredQuery: {
      from: [{ collectionId: collection }],
      ...(limit ? { limit } : {}),
    },
  };

  if (where) {
    query.structuredQuery.where = {
      fieldFilter: {
        field: { fieldPath: where.field },
        op: where.op,
        value: where.value,
      },
    };
  }

  const url = `${config.baseUrl}:runQuery?key=${encodeURIComponent(config.apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
  });

  if (!res.ok) {
    console.error(`Firestore query failed: ${res.status}`);
    return [];
  }

  const rows = (await res.json()) as Array<{ document?: FirestoreDocument }>;
  return rows.filter((row) => row.document).map((row) => row.document!);
}