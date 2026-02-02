export function formatFundingAmount(amount: number) {
  if (amount > 999999) {
    const value = `${(amount / 1000000).toFixed(1)}M`.replace('.0', '');
    return value;
  }

  if (amount > 999) {
    const value = `${(amount / 1000).toFixed(0)}k`;
    return value === '1000k' ? '1.0M' : value;
  }

  return `${amount}`;
}

export function formatLeadInvestor(investors: string) {
  if (!investors || investors === '') return;

  const splitNames = investors.split(',');
  return splitNames[0];
}

export function lowercaseFirst(str: string) {
  if (typeof str !== 'string' || str.length === 0 || !str[0]) return str;
  if (str === 'Pre-Seed') return 'pre-seed'
  return str[0].toLowerCase() + str.slice(1);
};
