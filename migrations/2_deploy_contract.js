const Cro = artifacts.require('erc20Tokens/Cro');
const Mco = artifacts.require('erc20Tokens/Mco');
const Wallet = artifacts.require('Wallet');

const [CRO, MCO] = ['CRO', 'MCO'];
const QUORUM = 2;
const AMOUNT = web3.utils.toWei('1');

module.exports = async function (deployer, _network, accounts) {
  await Promise.all(
    [Cro, Mco].map((erc20Token) => deployer.deploy(erc20Token))
  );

  // Two approvers required out of 3
  await deployer.deploy(
    Wallet,
    [accounts[0], accounts[1], accounts[2]],
    QUORUM
  );

  const [cro, mco, wallet] = await Promise.all(
    [Cro, Mco, Wallet].map((instance) => instance.deployed())
  );

  await Promise.all([
    // Need to change string to byte32?
    wallet.addToken(CRO, cro.address),
    wallet.addToken(MCO, mco.address),
  ]);

  const seedToWallet = async (token, wallet) => {
    await token.faucet(wallet, AMOUNT);
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
