// artifacts injected by truffle
const { constants, expectRevert } = require('@openzeppelin/test-helpers');
const Cro = artifacts.require('erc20Tokens/Cro');
const Mco = artifacts.require('erc20Tokens/Mco');
const Wallet = artifacts.require('wallet');
const { ZERO_ADDRESS } = constants;

const [ETH, CRO, MCO] = ['ETH', 'CRO', 'MCO'].map((symbol) =>
  web3.utils.asciiToHex(symbol).padEnd(66, '0')
);

const QUORUM = 2;
const AMOUNT = web3.utils.toWei('1');

const formatToken = (symbol, address) => ({
  0: symbol,
  1: address,
  tokenAddress: address,
  tokenSymbol: symbol,
});

contract('Wallet', (accounts) => {
  let wallet;
  let cro;
  let mco;

  beforeEach(async () => {
    [cro, mco] = await Promise.all([Cro.new(), Mco.new()]);
    wallet = await Wallet.new([accounts[0], accounts[1], accounts[2]], QUORUM);

    await Promise.all([
      wallet.addToken(CRO, cro.address),
      wallet.addToken(MCO, mco.address),
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
  });

  it('should have correct approvers and quorum and tokens', async () => {
    const [approvers, quorum, tokens] = await Promise.all([
      wallet.getApprovers(),
      wallet.quorum(),
      wallet.getTokens(),
    ]);

    assert(approvers.length === 3);
    assert(approvers[0] === accounts[0]);
    assert(approvers[1] === accounts[1]);
    assert(approvers[2] === accounts[2]);
    assert(quorum.toNumber() === 2);
    assert(tokens.length === 3);

    assert(tokens[0].tokenSymbol === ETH);
    assert(tokens[0].tokenAddress === ZERO_ADDRESS);
    assert(tokens[1].tokenSymbol === CRO);
    assert(tokens[1].tokenAddress === cro.address);
    assert(tokens[2].tokenSymbol === MCO);
    assert(tokens[2].tokenAddress === mco.address);
  });

  it('should NOT allow adding zero address', async () => {
    await expectRevert(
      wallet.addToken(MCO, ZERO_ADDRESS, {
        from: accounts[0],
      }),
      'zero adress is forbidden'
    );
  });

  it('should allow if sender is an approver', async () => {
    await wallet.addToken(MCO, mco.address, {
      from: accounts[0],
    });

    const tokens = await wallet.getTokens();
    assert(tokens.length === 4);
    assert(tokens[0].tokenSymbol === ETH);
    assert(tokens[0].tokenAddress === ZERO_ADDRESS);
    assert(tokens[1].tokenSymbol === CRO);
    assert(tokens[1].tokenAddress === cro.address);
    assert(tokens[2].tokenSymbol === MCO);
    assert(tokens[2].tokenAddress === mco.address);
    assert(tokens[3].tokenSymbol === MCO);
    assert(tokens[3].tokenAddress === mco.address);
  });

  it('should NOT allow if sender is not an approver', async () => {
    await expectRevert(
      wallet.addToken(MCO, mco.address, {
        from: accounts[4],
      }),
      'only approver allowed'
    );
  });

  it('should create transfers', async () => {
    await wallet.createTransfer(
      100,
      accounts[5],
      formatToken(MCO, mco.address),
      {
        from: accounts[0],
      }
    );
    const transfers = await wallet.getTransfers();
    assert(transfers.length === 1);
    assert(Number.parseInt(transfers[0].id) === 0);
    assert(Number.parseInt(transfers[0].amount) === 100);
    assert(transfers[0].to === accounts[5]);
    assert(Number.parseInt(transfers[0].approvals) === 0);
    assert(transfers[0].sent === false);
    assert(transfers[0].token.tokenAddress === mco.address);
    assert(transfers[0].token.tokenSymbol === MCO);
  });

  it('should NOT create transfers if sender is not approved', async () => {
    await expectRevert(
      wallet.createTransfer(100, accounts[5], formatToken(MCO, mco.address), {
        from: accounts[4],
      }),
      'only approver allowed'
    );
  });

  it('should NOT create transfers if token is not supported', async () => {
    await expectRevert(
      wallet.createTransfer(100, accounts[5], formatToken(MCO, ZERO_ADDRESS), {
        from: accounts[2],
      }),
      'token not supported'
    );
    await expectRevert(
      wallet.createTransfer(
        100,
        accounts[5],
        formatToken(
          web3.utils.asciiToHex('TOKEN-NOT-EXIST').padEnd(66, '0'),
          mco.address
        ),
        {
          from: accounts[2],
        }
      ),
      'token not supported'
    );
    await expectRevert(
      wallet.createTransfer(
        100,
        accounts[5],
        formatToken(
          web3.utils.asciiToHex('TOKEN-NOT-EXIST').padEnd(66, '0'),
          ZERO_ADDRESS
        ),
        {
          from: accounts[2],
        }
      ),
      'token not supported'
    );
  });

  it('should increment approvals', async () => {
    await wallet.createTransfer(
      100,
      accounts[5],
      formatToken(MCO, mco.address),
      {
        from: accounts[0],
      }
    );
    await wallet.approveTransfer(0, {
      from: accounts[0],
    });
    const transfers = await wallet.getTransfers();
    const ethBalance = await web3.eth.getBalance(wallet.address);
    const croBalance = await cro.balanceOf(wallet.address);
    const mcoBalance = await mco.balanceOf(wallet.address);

    assert(Number.parseInt(transfers[0].approvals) === 1);
    assert(transfers[0].sent === false);
    assert(ethBalance === AMOUNT);
    assert(croBalance.eq(web3.utils.toBN(AMOUNT)));
    assert(mcoBalance.eq(web3.utils.toBN(AMOUNT)));
  });

  it('should send native token if quorum reached', async () => {
    const ethBalanceBefore = web3.utils.toBN(
      await web3.eth.getBalance(accounts[6])
    );
    await wallet.createTransfer(
      100,
      accounts[6],
      formatToken(ETH, ZERO_ADDRESS),
      {
        from: accounts[0],
      }
    );
    await wallet.approveTransfer(0, {
      from: accounts[0],
    });
    await wallet.approveTransfer(0, {
      from: accounts[1],
    });
    const ethBalanceAfter = web3.utils.toBN(
      await web3.eth.getBalance(accounts[6])
    );
    const croBalance = await cro.balanceOf(wallet.address);
    const mcoBalance = await mco.balanceOf(wallet.address);

    assert(ethBalanceAfter.sub(ethBalanceBefore).toNumber() === 100);
    assert(croBalance.eq(web3.utils.toBN(AMOUNT)));
    assert(mcoBalance.eq(web3.utils.toBN(AMOUNT)));
  });

  it('should send erc20 token if quorum reached', async () => {
    const croBalanceBefore = await cro.balanceOf(accounts[6]);
    const ethBalanceBefore = web3.utils.toBN(
      await web3.eth.getBalance(accounts[6])
    );

    await wallet.createTransfer(
      100,
      accounts[6],
      formatToken(CRO, cro.address),
      {
        from: accounts[0],
      }
    );
    await wallet.approveTransfer(0, {
      from: accounts[0],
    });
    await wallet.approveTransfer(0, {
      from: accounts[1],
    });
    const croBalanceAfter = await cro.balanceOf(accounts[6]);
    const mcoBalance = await mco.balanceOf(accounts[6]);
    const ethBalanceAfter = web3.utils.toBN(
      await web3.eth.getBalance(accounts[6])
    );

    assert(croBalanceAfter.sub(croBalanceBefore).eq(web3.utils.toBN(100)));
    assert(ethBalanceBefore.sub(ethBalanceAfter).eq(web3.utils.toBN(0)));
    assert(mcoBalance.eq(web3.utils.toBN(0)));
  });

  it('should NOT approve transfer if sender is not approved', async () => {
    await wallet.createTransfer(
      100,
      accounts[5],
      formatToken(MCO, mco.address),
      {
        from: accounts[0],
      }
    ),
      await expectRevert(
        wallet.approveTransfer(0, {
          from: accounts[4],
        }),
        'only approver allowed'
      );
  });

  it('should NOT approve transfer is transfer is already sent', async () => {
    await wallet.createTransfer(
      100,
      accounts[6],
      formatToken(MCO, mco.address),
      {
        from: accounts[0],
      }
    );
    await wallet.approveTransfer(0, {
      from: accounts[0],
    });
    await wallet.approveTransfer(0, {
      from: accounts[1],
    });

    await expectRevert(
      wallet.approveTransfer(0, {
        from: accounts[2],
      }),
      'transfer has already been sent'
    );
  });

  it('should NOT approve transfer twice', async () => {
    await wallet.createTransfer(
      100,
      accounts[6],
      formatToken(MCO, mco.address),
      {
        from: accounts[0],
      }
    );
    await wallet.approveTransfer(0, {
      from: accounts[0],
    });
    await expectRevert(
      wallet.approveTransfer(0, {
        from: accounts[0],
      }),
      'cannot approve transfer twice'
    );
  });
});
