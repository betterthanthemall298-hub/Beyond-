// In-memory fake of the Firestore / Auth surface used by api/index.ts (tests only)
const INC = Symbol('inc');
export const increment = (n: number) => ({ [INC]: n });
const isInc = (v: any) => v && typeof v === 'object' && INC in v;

function clone<T>(v: T): T { return v === undefined ? v : JSON.parse(JSON.stringify(v)); }

function applyPatch(target: any, patch: any, merge: boolean) {
  for (const [k, v] of Object.entries(patch)) {
    if (isInc(v)) target[k] = (Number(target[k]) || 0) + (v as any)[INC];
    else if (v && typeof v === 'object' && !Array.isArray(v) && merge) {
      if (!target[k] || typeof target[k] !== 'object') target[k] = {};
      applyPatch(target[k], v, true);
    } else target[k] = clone(v);
  }
}

export class FakeDb {
  data = new Map<string, Map<string, any>>();
  txCount = 0;
  failNextTx = 0;
  col(name: string) { if (!this.data.has(name)) this.data.set(name, new Map()); return this.data.get(name)!; }
  collection(name: string) { return new FakeCol(this, name); }
  seed(name: string, id: string, doc: any) { this.col(name).set(id, clone(doc)); }
  get(name: string, id: string) { return this.col(name).get(id); }
  async runTransaction(fn: (t: any) => Promise<any>) {
    this.txCount++;
    const writes: Array<() => void> = [];
    const t = {
      get: async (ref: FakeDoc) => {
        if (ref.col === 'orders' && this.failNextTx > 0) { this.failNextTx--; const e: any = new Error('ABORTED: contention'); e.code = 10; throw e; }
        return ref.get();
      },
      set: (ref: FakeDoc, d: any, o?: any) => writes.push(() => ref.setSync(d, o)),
      update: (ref: FakeDoc, d: any) => writes.push(() => ref.updateSync(d)),
      delete: (ref: FakeDoc) => writes.push(() => ref.deleteSync())
    };
    const r = await fn(t);
    writes.forEach((w) => w());
    return r;
  }
}

class FakeSnap {
  constructor(public ref: FakeDoc, private d: any) {}
  get id() { return this.ref.id; }
  get exists() { return this.d !== undefined; }
  data() { return clone(this.d); }
}

class FakeDoc {
  constructor(private db: FakeDb, public col: string, public id: string) {}
  async get() { return new FakeSnap(this, this.db.col(this.col).get(this.id)); }
  setSync(d: any, o?: any) {
    const c = this.db.col(this.col);
    if (o?.merge) { const cur = c.get(this.id) || {}; applyPatch(cur, d, true); c.set(this.id, cur); }
    else { const n: any = {}; applyPatch(n, d, false); c.set(this.id, n); }
  }
  updateSync(d: any) {
    const c = this.db.col(this.col);
    const cur = c.get(this.id);
    if (!cur) throw new Error('NOT_FOUND update on missing doc ' + this.col + '/' + this.id);
    applyPatch(cur, d, false);
  }
  deleteSync() { this.db.col(this.col).delete(this.id); }
  async set(d: any, o?: any) { this.setSync(d, o); }
  async update(d: any) { this.updateSync(d); }
  async delete() { this.deleteSync(); }
}

class FakeQuery {
  constructor(protected db: FakeDb, protected name: string, protected filters: Array<[string, string, any]> = [], protected lim = Infinity) {}
  where(f: string, op: string, v: any) { return new FakeQuery(this.db, this.name, [...this.filters, [f, op, v]], this.lim); }
  limit(n: number) { return new FakeQuery(this.db, this.name, this.filters, n); }
  async get() {
    let entries = Array.from(this.db.col(this.name).entries());
    entries = entries.filter(([, d]) => this.filters.every(([f, op, v]) => op === '==' ? d[f] === v : op === '>=' ? d[f] >= v : false));
    entries = entries.slice(0, this.lim);
    const docs = entries.map(([id, d]) => { const s: any = new FakeSnap(new FakeDoc(this.db, this.name, id), d); s.ref = new FakeDoc(this.db, this.name, id); return s; });
    return { docs, size: docs.length, empty: docs.length === 0, forEach: (fn: any) => docs.forEach(fn) };
  }
}

class FakeCol extends FakeQuery {
  constructor(db: FakeDb, name: string) { super(db, name); }
  doc(id: string) { return new FakeDoc(this.db, this.name, id); }
}

export class FakeAuth {
  users: any[] = [
    { uid: 'u-owner', email: 'vdbbdv1234567889@gmail.com', displayName: 'Owner', metadata: { creationTime: 'x' } },
    { uid: 'u-rand', email: 'random@example.com', displayName: 'Random', metadata: {} }
  ];
  tokens: Record<string, any> = {
    'owner-token': { email: 'vdbbdv1234567889@gmail.com' },
    'claim-token': { email: 'staff@example.com', admin: true },
    'user-token': { email: 'random@example.com' }
  };
  async verifyIdToken(t: string) { if (!this.tokens[t]) throw new Error('bad token'); return this.tokens[t]; }
  async listUsers() { return { users: this.users }; }
  async createUser(o: any) {
    if (this.users.find((u) => u.email === o.email)) { const e: any = new Error('exists'); e.code = 'auth/email-already-exists'; throw e; }
    const u = { uid: 'u-' + this.users.length, email: o.email, displayName: o.displayName, metadata: {} }; this.users.push(u); return u;
  }
  async setCustomUserClaims(uid: string, c: any) { const u = this.users.find((x) => x.uid === uid); if (u) u.customClaims = c; }
  async getUser(uid: string) { const u = this.users.find((x) => x.uid === uid); if (!u) throw new Error('nf'); return u; }
  async deleteUser(uid: string) { this.users = this.users.filter((u) => u.uid !== uid); }
}
