import { loadStdlib } from '@reach-sh/stdlib';
import * as backend from './build/index.main.mjs';
const stdlib = loadStdlib(process.env);

const startingBalance = stdlib.parseCurrency(100);

const accAlice = await stdlib.newTestAccount(startingBalance);
console.log('Hello, Alice and Bob!');

console.log('Launching...');
const ctcAlice = accAlice.contract(backend);

const numTickets = 10;

console.log('Creator is creating the testing NFT');
const theNFT = await stdlib.launchToken(accAlice, 'Aro1914', 'A19', { supply: 1 });
const nftParams = {
  nftId: theNFT.id,
  numTickets,
};

// await accBob.tokenAccept(nftParams.nftId);
// const check = ['won', 'lost'];

const common = {
  getNum: num => {
    return (Math.floor(Math.random() * num) + 1);
  },
  seeOutcome: (truthy, address) => {
    truthy ? console.log(`All Bobs lost`) : console.log(`Bob with the address of ${address[1]} won`);
  }
};

const ticketsBucket = (() => {
  const array = [];
  const length = numTickets;
  let i = 0;
  for (i; i < length; i++) {
    array[i] = i + 1;
  }
  return array;
})();
const pickedNums = {};
const pickNum = (array) => {
  let num = 0;
  do {
    const index = Math.floor(Math.random() * numTickets);
    num = array[index];
    console.log(array, index, num);
  }
  while (pickedNums[num]);
  pickedNums[num] = 1;
  return num;
};

let done = false;
const APIs = [];

const startAPIs = async () => {

  const runAPIs = async (who) => {

    const num = pickNum(ticketsBucket);

    const acc = await stdlib.newTestAccount(startingBalance);
    acc.setDebugLabel(who);
    await acc.tokenAccept(nftParams.nftId);
    APIs.push([who, acc]);
    const ctc = acc.contract(backend, ctcAlice.getInfo());
    try {
      await ctc.apis.B.showNum((() => {
        console.log(`${who} pulled out ${num}`);
        return num;
      })());

      await ctc.apis.B.reveal((() => {
        console.log(`${who}'s draw is been revealed`);
        return;
      })());
    } catch (e) {
      console.log(`The raffle is over`);
    }
  };

  await runAPIs('Alice');
  await runAPIs('Bob');
  await runAPIs('Emmanuel');
  await runAPIs('Aro1914');

  while (!done) {
    await stdlib.wait(1);
  }
};

console.log('Starting backends...');
await Promise.all([
  backend.Alice(ctcAlice, {
    ...stdlib.hasRandom,
    ...common,
    startRaffle: () => {
      console.log('The Raffle information is being returned to the frontend');
      return nftParams;
    },
    loadAPIs: () => { startAPIs(); },
    seeHash: value => {
      console.log(`Winning number hash is -> ${value}`);
    }
    // implement Alice's interact object here
  }),
]);

for (const [who, acc] of APIs) {
  const [amt, amtNFT] = await stdlib.balanceOf(acc, [null, nftParams.nftId]);
  console.log(`${who} has ${stdlib.formatCurrency(amt)} ${stdlib.standardUnit} and ${amtNFT}`);
}

done = true;

console.log('Goodbye, Alice and Bob!');
