'reach 0.1';

const amt = 1;

const common = {
  ...hasRandom,
  getNum: Fun([UInt], UInt),
  seeOutcome: Fun([Bool], Null),
};

export const main = Reach.App(() => {
  const A = Participant('Alice', {
    // Specify Alice's interact interface here
    ...common,
    startRaffle: Fun([], Object({
      nftId: Token,
      numTickets: UInt,
    })),
    seeHash: Fun([Digest], Null),
  });
  const B = Participant('Bob', {
    // Specify Bob's interact interface here
    ...common,
    showNum: Fun([UInt], Null),
    seeWinner: Fun([UInt], Null),
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
  A.interact.seeHash(commitA);
  commit();
  A.pay([[amt, nftId]]);
  commit();
  // The second one to publish always attaches
  unknowable(B, A(_winningNum, _saltA));
  B.only(() => {
    const bNum = declassify(interact.getNum(numTickets));
    interact.showNum(bNum);
  });
  B.publish(bNum);
  commit();

  A.only(() => {
    const saltA = declassify(_saltA);
    const winningNum = declassify(_winningNum);
  });
  A.publish(saltA, winningNum);
  checkCommitment(commitA, saltA, winningNum);

  B.interact.seeWinner(winningNum);

  const outcome = (bNum == winningNum);

  transfer(amt, nftId).to(outcome ? B : A);
  commit();

  each([A, B], () => {
    interact.seeOutcome(outcome);
  });
  // write your program here
  exit();
});
