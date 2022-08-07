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

await accBob.tokenAccept(nftParams.nftId);
// const check = ['won', 'lost'];

const common = {
  getNum: num => {
    return (Math.floor(Math.random() * num) + 1);
  },
  seeOutcome: (truthy, address) => {
    truthy ? console.log(`All Bobs lost`) : console.log(`Bob with the address of ${address[1]} won`);
  }
};

const ticketsBucket = Array(numTickets);
const populateArray = array => {
  const length = numTickets;
  let i = 1;
  for (i; i <= length; i++); {
    array[(i - 1)] = i;
  }
  return array;
};
populateArray(ticketsBucket);
const pickedNums = [];
const pickNum = (array) => {
  let num = 0;
  while (!pickedNums.includes(num)) {
    num = ticketsBucket[Math.floor(Math.random() * numTickets)];
  }
  pickedNums.push(num);
  return num;
};

const startAPIs = async () => {

  const runAPIs = async (who) => {

    const num = pickNum(ticketsBucket);

    const acc = await stdlib.newTestAccount(startingBalance);
    acc.setDebugLabel(who);
    await acc.tokenAccept(nftParams.nftId);
    const ctc = acc.contract(backend, ctcAlice.getInfo());
    try {
      await ctc.apis.B.showNum(num);
      console.log(`${who} pulled out ${num}`);
      await ctc.apis.B.reveal();
    } catch (e) {
      console.log(`The raffle is over`);
    }
  };
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
    seeHash: value => {
      console.log(`Winning number hash is -> ${value}`);
    }
    // implement Alice's interact object here
  }),
]);

console.log('Goodbye, Alice and Bob!');