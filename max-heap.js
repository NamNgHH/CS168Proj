"use strict";

module.exports = class MaxHeap {
  constructor(compareFn = (a, b) => a.fee - b.fee) {
    this.heap = [];
    this.compare = compareFn;
  }

  has(x) {
    return this.heap.includes(x);
  }

  size() {
    return this.heap.length;
  }

  isEmpty() {
    return this.size() === 0;
  }

  peek() {
    return this.heap[0];
  }

  push(tx) {
    this.heap.push(tx);
    this.bubbleUp(this.heap.length - 1);
  }

  pop() {
    if (this.isEmpty()) return undefined;

    const max = this.heap[0];
    const end = this.heap.pop();

    if (!this.isEmpty()) {
      this.heap[0] = end;
      this.bubbleDown(0);
    }

    return max;
  }

  bubbleUp(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);

      if (this.compare(this.heap[index], this.heap[parent]) <= 0) break;

      [this.heap[index], this.heap[parent]] =
        [this.heap[parent], this.heap[index]];

      index = parent;
    }
  }

  bubbleDown(index) {
    const length = this.heap.length;

    while (true) {
      let largest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;

      if (
        left < length &&
        this.compare(this.heap[left], this.heap[largest]) > 0
      ) {
        largest = left;
      }

      if (
        right < length &&
        this.compare(this.heap[right], this.heap[largest]) > 0
      ) {
        largest = right;
      }

      if (largest === index) break;

      [this.heap[index], this.heap[largest]] =
        [this.heap[largest], this.heap[index]];

      index = largest;
    }
  }
};