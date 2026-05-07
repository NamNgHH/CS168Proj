"use strict";

/**
 * Miner mempool priority queue (max fee wins).
 *
 * A simple binary max-heap.
 * - O(log n) insert
 * - O(log n) removeMax
 * - O(1) peek
 *
 * Optionally accepts:
 * - keyFn: map item -> numeric key (larger is higher priority)
 * - compareFn: compare(a, b) > 0 if a has higher priority than b
 *
 * If compareFn is omitted, keyFn is used; ties are broken deterministically by id.
 */
module.exports = class MaxHeap {
  constructor({ keyFn, compareFn } = {}) {
    this._keyFn = keyFn || ((x) => x);
    this._compareFn = compareFn;
    this._a = [null]; // 1-indexed
    this._indexById = new Map(); // id -> heap index
  }

  size() {
    return this._a.length - 1;
  }

  hasId(id) {
    return this._indexById.has(id);
  }

  peek() {
    return this.size() > 0 ? this._a[1] : undefined;
  }

  insert(item, id) {
    if (id === undefined) throw new Error("MaxHeap.insert requires id");
    if (this._indexById.has(id)) return false;
    this._a.push({ item, id });
    let i = this._a.length - 1;
    this._indexById.set(id, i);
    this._bubbleUp(i);
    return true;
  }

  removeMax() {
    if (this.size() === 0) return undefined;
    const max = this._a[1];
    const last = this._a.pop();
    this._indexById.delete(max.id);
    if (this.size() > 0) {
      this._a[1] = last;
      this._indexById.set(last.id, 1);
      this._bubbleDown(1);
    }
    return max.item;
  }

  _k(i) {
    return this._keyFn(this._a[i].item);
  }

  _cmp(i, j) {
    const ai = this._a[i];
    const aj = this._a[j];
    if (this._compareFn) return this._compareFn(ai.item, aj.item);
    const ki = this._k(i);
    const kj = this._k(j);
    if (ki !== kj) return ki - kj;
    // deterministic tie-breaker on id
    if (ai.id === aj.id) return 0;
    return ai.id > aj.id ? 1 : -1;
  }

  _swap(i, j) {
    const tmp = this._a[i];
    this._a[i] = this._a[j];
    this._a[j] = tmp;
    this._indexById.set(this._a[i].id, i);
    this._indexById.set(this._a[j].id, j);
  }

  _bubbleUp(i) {
    while (i > 1) {
      const p = Math.floor(i / 2);
      if (this._cmp(p, i) >= 0) break;
      this._swap(p, i);
      i = p;
    }
  }

  _bubbleDown(i) {
    while (true) {
      const l = i * 2;
      const r = l + 1;
      let best = i;
      if (l < this._a.length && this._cmp(l, best) > 0) best = l;
      if (r < this._a.length && this._cmp(r, best) > 0) best = r;
      if (best === i) break;
      this._swap(i, best);
      i = best;
    }
  }
};

