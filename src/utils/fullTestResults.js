// Utility for collecting per-section results during a Full Test run.
const KEY = 'fullTestResults_v1';

export function pushSectionResult(item) {
  try {
    const raw = sessionStorage.getItem(KEY) || '[]';
    const arr = JSON.parse(raw);
    arr.push(item);
    sessionStorage.setItem(KEY, JSON.stringify(arr));
  } catch (e) {
    try {
      // best-effort fallback
      sessionStorage.setItem(KEY, JSON.stringify([item]));
    } catch (e2) {}
  }
}

export function getFullTestResults() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || '[]');
  } catch (e) {
    return [];
  }
}

export function clearFullTestResults() {
  try { sessionStorage.removeItem(KEY); } catch (e) {}
}

const fullTestAPI = { pushSectionResult, getFullTestResults, clearFullTestResults };

export default fullTestAPI;
