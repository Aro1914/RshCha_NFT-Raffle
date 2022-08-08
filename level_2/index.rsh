'reach 0.1';

const amt = 1;
const [isOutcome, B_WINS, B_LOSES] = makeEnum(2);

const winner = (winningNum, Bs_Num) => {
  return (winningNum == Bs_Num ? 0 : 1);
};

export const main = Reach.App(() => {
  setOptions({ untrustworthyMaps: true });
  const A = Participant('Alice', {
    // Specify Alice's interact interface here
    ...hasRandom,
    seeOutcome: Fun([UInt, Address], Null),
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
    reveal: Fun([], Null),
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
  const partDraws = new Map(Address, UInt);
  A.interact.seeHash(commitA);
  A.interact.loadAPIs();
  commit();
  A.pay([[amt, nftId]]);
  const end = 20;

  const [
    player,
    counter,
    shouldStep
  ] = parallelReduce([A, 0, true])
    .invariant(balance() == 0)
    .invariant(balance(nftId) == amt)
    .while(shouldStep)
    .api_(B.showNum, num => {
      return [(notify) => {
        notify(null);
        const who = this;
        partDraws[who] = (num + 1);
        const count = counter + 1;
        const shouldMove = count != 10;
        return [who, count, shouldMove];
      }];
    })
    .timeout(relativeTime(end), () => {
      A.publish();
      return [
        player,
        counter,
        shouldStep
      ];
    });
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
    keepOn,
    currentOwner
  ] = parallelReduce([B_LOSES, true, A])
    .invariant(balance() == 0)
    .invariant(balance(nftId) == amt)
    .while(keepOn)
    .api_(B.reveal, () => {
      return [(notify) => {
        notify(null);
        const isWinner = winner(winningNum, partDraws[this]);
        const who = isWinner ? A : this;
        const shouldContinue = isWinner ? true : false;
        return [isWinner, shouldContinue, who];
      }];
    })
    .timeout(relativeTime(end), () => {
      A.publish();
      return [
        outcome,
        keepOn,
        currentOwner,
      ];
    });
  A.interact.seeOutcome(outcome, currentOwner);
  transfer(amt, nftId).to(currentOwner);
  commit();
  exit();
});
