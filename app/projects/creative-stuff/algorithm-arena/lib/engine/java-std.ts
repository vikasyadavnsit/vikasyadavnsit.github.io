/**
 * Java Standard Library Emulation for Algorithm Arena
 * This provides lightweight implementations of common Java collections and utilities
 * designed for competitive programming and algorithm problems.
 */

export const JAVA_STD_LIB = `
// ArrayList Implementation
class ArrayList {
    constructor(collection) {
        this.data = collection ? [...collection] : [];
    }
    add(element) { this.data.push(element); return true; }
    get(index) { return this.data[index]; }
    set(index, element) { this.data[index] = element; }
    size() { return this.data.length; }
    isEmpty() { return this.data.length === 0; }
    remove(index) {
        if (typeof index === 'number') return this.data.splice(index, 1)[0];
        const idx = this.data.indexOf(index);
        if (idx > -1) { this.data.splice(idx, 1); return true; }
        return false;
    }
    clear() { this.data = []; }
    contains(element) { return this.data.includes(element); }
    indexOf(element) { return this.data.indexOf(element); }
    toArray() { return [...this.data]; }
    toJSON() { return this.data; }
    [Symbol.iterator]() { return this.data[Symbol.iterator](); }
}

// HashMap Implementation
class HashMap {
    constructor() { this.map = new Map(); }
    put(key, value) { this.map.set(key, value); return value; }
    get(key) { return this.map.get(key); }
    getOrDefault(key, defaultValue) { return this.map.has(key) ? this.map.get(key) : defaultValue; }
    containsKey(key) { return this.map.has(key); }
    containsValue(value) { return Array.from(this.map.values()).includes(value); }
    remove(key) { const val = this.map.get(key); this.map.delete(key); return val; }
    size() { return this.map.size; }
    isEmpty() { return this.map.size === 0; }
    clear() { this.map.clear(); }
    keySet() { return new Set(this.map.keys()); }
    values() { return Array.from(this.map.values()); }
    toJSON() { return Object.fromEntries(this.map); }
}

// HashSet Implementation
class HashSet {
    constructor() { this.set = new Set(); }
    add(element) { const exists = this.set.has(element); this.set.add(element); return !exists; }
    contains(element) { return this.set.has(element); }
    remove(element) { return this.set.delete(element); }
    size() { return this.set.size; }
    isEmpty() { return this.set.size === 0; }
    clear() { this.set.clear(); }
    toJSON() { return Array.from(this.set); }
    [Symbol.iterator]() { return this.set[Symbol.iterator](); }
}

// Stack Implementation
class Stack {
    constructor() { this.data = []; }
    push(item) { this.data.push(item); return item; }
    pop() { return this.data.pop(); }
    peek() { return this.data[this.data.length - 1]; }
    isEmpty() { return this.data.length === 0; }
    size() { return this.data.length; }
    toJSON() { return this.data; }
}

// Queue Implementation (LinkedList based)
class LinkedList {
    constructor() { this.data = []; }
    add(e) { this.data.push(e); return true; }
    offer(e) { return this.add(e); }
    poll() { return this.data.shift(); }
    peek() { return this.data[0]; }
    isEmpty() { return this.data.length === 0; }
    size() { return this.data.length; }
    toJSON() { return this.data; }
    [Symbol.iterator]() { return this.data[Symbol.iterator](); }
}

// PriorityQueue Implementation (Basic Sorted Array)
class PriorityQueue {
    constructor(comparator) {
        this.data = [];
        this.comparator = comparator || ((a, b) => a - b);
    }
    add(e) {
        this.data.push(e);
        this.data.sort(this.comparator);
        return true;
    }
    offer(e) { return this.add(e); }
    poll() { return this.data.shift(); }
    peek() { return this.data[0]; }
    isEmpty() { return this.data.length === 0; }
    size() { return this.data.length; }
    toJSON() { return this.data; }
}

// Static Utility Classes
const Arrays = {
    sort: (arr, comparator) => {
        if (arr instanceof Array) return arr.sort(comparator);
        if (arr.data instanceof Array) return arr.data.sort(comparator);
    },
    fill: (arr, val) => arr.fill(val),
    toString: (arr) => JSON.stringify(arr),
    equals: (a, b) => JSON.stringify(a) === JSON.stringify(b)
};

const Collections = {
    sort: (list, comparator) => {
        if (list.data instanceof Array) list.data.sort(comparator);
    },
    reverse: (list) => {
        if (list.data instanceof Array) list.data.reverse();
    },
    max: (list) => Math.max(...(list.data || list)),
    min: (list) => Math.min(...(list.data || list))
};
`;
