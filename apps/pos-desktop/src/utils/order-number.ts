let localSequence = 0;
let lastDate = '';

function formatOrderDate(date: Date): string {
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function getBranchCode(branchName: string): string {
  return branchName
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .substring(0, 3);
}

export function generateLocalOrderNumber(branchName: string): string {
  const dateStr = formatOrderDate(new Date());
  const branchCode = getBranchCode(branchName);

  // Reset sequence if date changes
  if (dateStr !== lastDate) {
    lastDate = dateStr;
    localSequence = 0;
  }

  localSequence += 1;
  const seqStr = localSequence.toString().padStart(4, '0');

  return `${dateStr}-${branchCode}-${seqStr}`;
}
