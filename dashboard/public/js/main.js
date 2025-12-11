// Main JavaScript for Anna Bot Dashboard

// Toast notification
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'bg-red-500' : 'bg-green-500'} text-white`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Format numbers
function formatNumber(num) {
  return new Intl.NumberFormat().format(num);
}

// Format date
function formatDate(date) {
  return new Date(date).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Copy to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard!');
  }).catch(() => {
    showToast('Failed to copy', 'error');
  });
}

// Confirm action
function confirmAction(message) {
  return confirm(message);
}

// Export to CSV
function exportToCSV(data, filename) {
  const csv = data.map(row => Object.values(row).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}
