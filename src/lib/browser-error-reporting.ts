export function captureBrowserError(error: Error & {digest?: string}) {
  console.error("Dashboard rendering failed.", {digest: error.digest ?? null});
}
