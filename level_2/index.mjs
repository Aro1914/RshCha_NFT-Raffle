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

    await ctc.apis.Player.showNum((() => {
      console.log(`${who} pulled out ${num}`);
      return num;
    })());

    return async () => {
      try {
        const num = await ctc.apis.Player.reveal();
        console.log(`${who} awaits reveal`);
      } catch (e) {
        console.log(`Sorry ${who}, it seems an error occurred with your reveal`);
      }
    };
  };
  const alice = await runAPIs('Alice');
  const bob = await runAPIs('Bob');
  const emmanuel = await runAPIs('Samuel');
  const aro1914 = await runAPIs('Clark');
  const claire = await runAPIs('Claire');
  const ken = await runAPIs('Ken');
  const jenny = await runAPIs('Jenny');
  const kingsley = await runAPIs('Kingsley');
  const nick = await runAPIs('Richard');
  const jp = await runAPIs('George');

  alice();
  bob();
  emmanuel();
  aro1914();
  claire();
  ken();
  jenny();
  kingsley();
  nick();
  jp();

  while (!done) {
    await stdlib.wait(1);
  }
};

console.log('Starting backends...');
await Promise.all([
  backend.Alice(ctcAlice, {
    ...stdlib.hasRandom,
    getNum: num => {
      return (Math.floor(Math.random() * num) + 1);
    },
    seeOutcome: (truthy, address, num) => {
      console.log(`The winning number was ${num}`);
      console.log(!truthy ? `All Bobs lost` : `Someone with the address of ${address} won`);
    },
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

const [amt, amtNFT] = await stdlib.balancesOf(accAlice, [null, theNFT.id]);
console.log(`The real Alice has ${stdlib.formatCurrency(amt)} ${stdlib.standardUnit} and ${amtNFT} of the NFT`);
for (const [who, acc] of APIs) {
  const [amt, amtNFT] = await stdlib.balancesOf(acc, [null, theNFT.id]);
  console.log(`${who} has ${stdlib.formatCurrency(amt)} ${stdlib.standardUnit} and ${amtNFT} of the NFT`);
}

done = true;

console.log('Goodbye, Alice and Bob!');
