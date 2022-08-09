'reach 0.1';

const amt = 1;
const [isOutcome, B_LOSES, B_WINS] = makeEnum(2);

const winner = (winningNum, Bs_Num) => {
  return (winningNum == Bs_Num ? 1 : 0);
};

const getDataFromMaybe = m => fromMaybe(m, (() => 0), ((x) => x));

export const main = Reach.App(() => {
  setOptions({ untrustworthyMaps: true });
  const A = Participant('Alice', {
    // Specify Alice's interact interface here
    ...hasRandom,
    seeOutcome: Fun([UInt, Address, UInt], Null),
    startRaffle: Fun([], Object({
      nftId: Token,
      numTickets: UInt,
    })),
    getNum: Fun([UInt], UInt),
    seeHash: Fun([Digest], Null),
    loadAPIs: Fun([], Null),
  });
  const B = API('Player', {
    // Specify Bob's interact interface here
    showNum: Fun([UInt], Null),
    reveal: Fun([], UInt),
  });
  init();
  A.only(() => {
    const { nftId, numTickets } = declassify(interact.startRaffle());
    const _winningNum = interact.getNum(numTickets);
    const [_commitA, _saltA] = makeCommitment(interact, _winningNum);
    const commitA = declassify(_commitA);
  });
  // The first one to publish deploys the contract
  A.publish(nftId, numTickets, commitA);
  const partDraws = new Map(UInt);
  A.interact.seeHash(commitA);
  A.interact.loadAPIs();
  commit();
  A.pay([[amt, nftId]]);
  const end = lastConsensusTime() + 60;

  commit();
  A.only(() => {
    const saltA = declassify(_saltA);
    const winningNum = declassify(_winningNum);
  });
  A.publish(saltA, winningNum);
  checkCommitment(commitA, saltA, winningNum);
  commit();
  A.publish();

  const [
    outcome,
    currentOwner
  ] = parallelReduce([B_LOSES, A])
    .invariant(balance() == 0)
    .invariant(balance(nftId) == amt)
    .while(lastConsensusTime() <= end)
    .api(B.showNum, (num, notify) => {
      notify(null);
      partDraws[this] = num;
      return [outcome, currentOwner];
    })
    .api(B.reveal, (notify) => {
      notify(getDataFromMaybe(partDraws[this]));
      check(typeOf(partDraws[A]) == typeOf(partDraws[this]));
      const result = winner(winningNum, getDataFromMaybe(partDraws[this]));
      const isWinner = this != A ? result : outcome;
      const newOutcome = isWinner ? B_WINS : outcome;
      const who = isWinner ? this : currentOwner;
      return [newOutcome, who];
    })
    .timeout(absoluteTime(end), () => {
      A.publish();
      return [
        outcome,
        currentOwner
      ];
    });
  A.interact.seeOutcome(outcome, currentOwner, winningNum);
  transfer(amt, nftId).to(currentOwner);
  commit();
  exit();
});
