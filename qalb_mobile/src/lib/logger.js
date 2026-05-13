/**
 * Lightweight structured logs for Expo — mirrors web `logger-client.js` semantics.
 */

export function mobileDebug(scope, msg, extra = {}) {
  if (__DEV__) {
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: "debug",
        scope,
        msg,
        ...extra,
      }),
    );
  }
}

export function mobileWarn(scope, msg, extra = {}) {
  console.warn(JSON.stringify({ ts: new Date().toISOString(), scope, msg, ...extra }));
}

export function mobileError(scope, msg, extra = {}) {
  console.error(JSON.stringify({ ts: new Date().toISOString(), scope, msg, ...extra }));
}
