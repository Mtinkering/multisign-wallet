const Cro = artifacts.require("erc20Tokens/Cro");
const Mco = artifacts.require("erc20Tokens/Mco");
const Wallet = artifacts.require("Wallet");

module.exports = async function (deployer, _network, accounts) {
  await Promise.all(
    [Cro, Mco].map((erc20Token) => deployer.deploy(erc20Token))
  );

  // 2 approvers
  const quorum = 2;
  await deployer.deploy(
    Wallet,
    [accounts[0], accounts[1], accounts[2]],
    quorum
  );

  const [cro, mco, wallet] = await Promise.all(
    [Cro, Mco, Wallet].map((instance) => instance.deployed())
  );

  await Promise.all([
    wallet.addToken("CRO", cro.address),
    wallet.addToken("MCO", mco.address),
  ]);

  const amount = web3.utils.toWei("1");
  const seedToWallet = async (token, spender) => {
    await token.faucet(spender, amount);

    // What happens if no approval?
    // await token.approve(spender, amount, { from: spender });
  };

  await Promise.all(
    [cro, mco].map((token) => seedToWallet(token, wallet.address))
  );

  await web3.eth.sendTransaction({
    from: accounts[0],
    to: wallet.address,
    value: 1000000000,
  });
};
