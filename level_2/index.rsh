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
    returnNum: Fun([Array(UInt, 10), UInt], Tuple(UInt, Array(UInt, 10))),
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
  const startingArray = Array.iota(10);
  A.interact.seeHash(commitA);
  commit();
  A.pay([[amt, nftId]]);
  const end = lastConsensusTime() + 10;

  const [
    keepGoing,
    player
  ] = parallelReduce([true, A])
    .invariant(balance() == 0)
    .invariant(balance(nftId) == amt)
    .while(keepGoing)
    .api_(B.showNum, num => {
      return [(notify) => {
        notify(null);
        const who = this;
        partDraws[who] = num;
        return [shouldContinue, who];
      }];
    })
    .timeout(absoluteTime(end), () => {
      A.publish();
      return [
        parallelArray,
        keepGoing,
        len,
        player
      ];
    });
  commit();

  A.only(() => {
    const saltA = declassify(_saltA);
    const winningNum = declassify(_winningNum);
  });
  A.publish(saltA, winningNum);
  checkCommitment(commitA, saltA, winningNum);

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
    .timeout(absoluteTime(end), () => {
      A.publish();
      return [
        outcome,
        keepOn,
        currentOwner,
      ];
    });
  transfer(amt, nftId).to(currentOwner);
  A.interact.seeOutcome(outcome, currentOwner);
  commit();
  exit();
});
