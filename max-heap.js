class MaxHeap {
  constructor(compare = (a, b) => a - b) {
    this.heap = [];
    this.compare = compare;
  }

  insert(value) {
    this.heap.push(value);
    this.heapifyUp();
  }

  getMax() {
    if (this.heap.length === 1) return this.heap.pop();
    const max = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.heapifyDown();
    return max;
  }

  peek() {
    return this.heap[0];
  }

  heapifyUp() {
    let i = this.heap.length - 1;
    while (i > 0) {
      let parent = Math.floor((i - 1) / 2);
      if (this.compare(this.heap[parent], this.heap[i]) >= 0) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  heapifyDown() {
    let i = 0;
    const length = this.heap.length;

    while (true) {
      let left = 2 * i + 1;
      let right = 2 * i + 2;
      let largest = i;

      if (left < length && this.compare(this.heap[left], this.heap[largest]) > 0) {
        largest = left;
      }
      if (right < length && this.compare(this.heap[right], this.heap[largest]) > 0) {
        largest = right;
      }
      if (largest === i) break;

      [this.heap[i], this.heap[largest]] = [this.heap[largest], this.heap[i]];
      i = largest;
    }
  }
}