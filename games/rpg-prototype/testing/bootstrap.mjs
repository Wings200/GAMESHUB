// Load developer-approved balance before the gameplay modules initialize.
import {applyGameBalance} from '../game-balance.mjs';
import {startGameSettingsUI} from './developer-panel.mjs?v=W20.63';

let initial = null;
try {
  const response = await fetch('/api/dev/settings',
    {credentials:'same-origin',cache:'no-store'});
  if (response.ok) {
    const result = await response.json();
    if (result.ok) {
      applyGameBalance(result.changes || {});
      initial = result;
    }
  }
} catch (error) {
  console.warn('Game settings service is temporarily unavailable.', error);
}
// Existing gameplay remains available even if the settings service is offline.
await import('./main.js?v=W20.89');
startGameSettingsUI(initial);


