// Type-checked with the editor's settings (tsconfig.usercode.json: ES2023 + DOM, no Node types): user code sees
// browser timers, whose handles are numbers. `npm run verify` checks the runtime side.
let t: number = setTimeout(() => {}, 10);
clearTimeout(t);
const i: number = setInterval(() => {}, 10);
clearInterval(i);
t = window.setTimeout(() => {}, 0);
export {};
