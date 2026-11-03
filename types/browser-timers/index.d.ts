// The app and user code run in the browser, where setTimeout/setInterval return a number (and the runner gives user
// code numbers in Node too). @types/node, there for the scripts, would type them as NodeJS.Timeout; these overloads
// are declared later, so they take precedence and reference solutions can write `let t: number = setTimeout(...)`.
export {};
declare global {
  function setTimeout(handler: TimerHandler, timeout?: number, ...args: any[]): number;
  function setInterval(handler: TimerHandler, timeout?: number, ...args: any[]): number;
}
