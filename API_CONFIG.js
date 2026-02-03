// API Configuration for GitHub Pages PWA
// This file provides the callGAS() helper function to replace google.script.run

const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbybl4BBVYESkL2vtqGr-AiIz1XDVTBz-Djz6rMc0OIzAU2yc-rtU9xAU5gv94US4A9D1w/exec';

/**
 * Helper function to call GAS Web App API
 * Replaces google.script.run for PWA on GitHub Pages
 * 
 * @param {string} action - The API action name (e.g., 'checkLogin', 'getDashboardData')
 * @param {object} params - Optional parameters to pass to the API
 * @returns {Promise} - Returns the data from API
 */
function callGAS(action, params = {}) {
  const url = API_BASE_URL + '?action=' + action;
  
  // Convert params to URL-encoded string
  const formBody = Object.keys(params)
    .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(typeof params[key] === 'object' ? JSON.stringify(params[key]) : params[key]))
    .join('&');
  
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok: ' + response.status);
    }
    return response.json();
  })
  .then(result => {
    if (result.success) {
      // Return data if available, otherwise return the whole result
      return result.data !== undefined ? result.data : result;
    } else {
      throw new Error(result.message || 'API Error occurred');
    }
  })
  .catch(error => {
    console.error('callGAS Error:', error);
    throw error;
  });
}

/**
 * Example usage of callGAS:
 * 
 * // Simple call
 * callGAS('getDashboardData')
 *   .then(data => console.log(data))
 *   .catch(error => console.error(error));
 * 
 * // With parameters
 * callGAS('checkLogin', { username: 'admin', password: '123' })
 *   .then(result => console.log(result))
 *   .catch(error => console.error(error));
 * 
 * // For handling both success and error
 * callGAS('saveData', { name: 'John', age: 30 })
 *   .then(data => {
 *     console.log('Success:', data);
 *   })
 *   .catch(error => {
 *     console.error('Error:', error.message);
 *   });
 */

// Backward compatibility - prevent "google is not defined" error
if (typeof window.google === 'undefined') {
  window.google = { script: { run: {} } };
}
