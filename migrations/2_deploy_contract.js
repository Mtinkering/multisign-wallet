const Cro = artifacts.require('erc20Tokens/Cro');
const Mco = artifacts.require('erc20Tokens/Mco');
const Wallet = artifacts.require('Wallet');

const [CRO, MCO] = ['CRO', 'MCO'].map((symbol) => web3.utils.utf8ToHex(symbol));

const QUORUM = 2;
const AMOUNT = web3.utils.toWei('1');

module.exports = async function (deployer, _network, accounts) {
  await Promise.all(
    [Cro, Mco].map((erc20Token) => deployer.deploy(erc20Token))
  );

  await deployer.deploy(
    Wallet,
    [accounts[0], accounts[1], accounts[2]],
    QUORUM
  );

  const [cro, mco, wallet] = await Promise.all(
    [Cro, Mco, Wallet].map((instance) => instance.deployed())
  );

  await Promise.all([
    wallet.addToken(CRO, cro.address, { from: accounts[0] }),
    wallet.addToken(MCO, mco.address, { from: accounts[0] }),
  ]);

  const seedToWallet = async (token, walletAddress) => {
    await token.faucet(walletAddress, AMOUNT);
  };

  await Promise.all(
    [cro, mco].map((token) => seedToWallet(token, wallet.address))
  );

  await web3.eth.sendTransaction({
    from: accounts[0],
    to: wallet.address,
    value: AMOUNT,
  });
};
