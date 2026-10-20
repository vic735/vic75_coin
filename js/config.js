window.CoinGame = {};
CoinGame.config = {
  storageKey: 'coin-duel-v01', initialTokens: 3000, drawCost: 100,
  totalWeights: {6: 1, 7: 1, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1},
  elementWeights: {'金': 1, '木': 1, '水': 1, '火': 1, '土': 1},
  coatingAttackWeights: {0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1},
  counters: {'金': '木', '木': '土', '土': '水', '水': '火', '火': '金'},
  generates: {'金': '水', '水': '木', '木': '火', '火': '土', '土': '金'}
};
