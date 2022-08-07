import { loadStdlib } from '@reach-sh/stdlib';
import * as backend from './build/index.main.mjs';
const stdlib = loadStdlib(process.env);

const startingBalance = stdlib.parseCurrency(100);

const [accAlice, accBob] =
  await stdlib.newTestAccounts(2, startingBalance);
console.log('Hello, Alice and Bob!');

console.log('Launching...');
const ctcAlice = accAlice.contract(backend);
const ctcBob = accBob.contract(backend, ctcAlice.getInfo());

console.log('Creator is creating the testing NFT');
const theNFT = await stdlib.launchToken(accAlice, 'Aro1914', 'A19', { supply: 1 });
const nftParams = {
  nftId: theNFT.id,
  numTickets: 10,
};

await accBob.tokenAccept(nftParams.nftId);
const check = ['Bob won', 'Bob lost'];

const common = {
  getNum: num => {
    return (Math.floor(Math.random() * num) + 1);
  },
  seeOutcome: truthy => {
    console.log(`The outcome is ${check[truthy ? 0 : 1]} `);
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
    seeHash: value => {
      console.log(`Winning number hash is -> ${value}`);
    }
    // implement Alice's interact object here
  }),
  backend.Bob(ctcBob, {
    ...stdlib.hasRandom,
    ...common,
    showNum: num => {
      console.log(`Your raffle num is ${parseInt(num)}`);
    },
    seeWinner: num => {
      console.log(`The winning number is ${parseInt(num)}`);
    }
    // implement Bob's interact object here
  }),
]);

console.log('Goodbye, Alice and Bob!');
