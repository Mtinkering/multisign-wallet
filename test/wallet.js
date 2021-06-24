// artifacts injected by truffle
const { expectRevert } = require('@openzeppelin/test-helpers');
const Cro = artifacts.require('erc20Tokens/Cro');
const Mco = artifacts.require('erc20Tokens/Mco');
const Wallet = artifacts.require('wallet');

const [CRO, MCO] = ['CRO', 'MCO'];
const QUORUM = 2;
const AMOUNT = web3.utils.toWei('1');

contract('Wallet', (accounts) => {
  let wallet;
  beforeEach(async () => {
    const [cro, mco] = await Promise.all([Cro.new(), Mco.new()]);
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

  it.only('should have correct approvers and quorum and tokens', async () => {
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
    assert(tokens[0].tokenSymbol === 'ETH');
    assert(tokens[1].tokenSymbol === 'CRO');
    assert(tokens[2].tokenSymbol === 'MCO');
  });

  it('should create transfers', async () => {
    await wallet.createTransfer(100, accounts[5], {
      from: accounts[0],
    });
    const transfers = await wallet.getTransfers();
    assert(transfers.length === 1);
    assert(Number.parseInt(transfers[0].id) === 0);
    assert(Number.parseInt(transfers[0].amount) === 100);
    assert(transfers[0].to === accounts[5]);
    assert(Number.parseInt(transfers[0].approvals) === 0);
    assert(transfers[0].sent === false);
  });

  it('should NOT create transfers if sender is not approved', async () => {
    await expectRevert(
      wallet.createTransfer(100, accounts[5], {
        from: accounts[4],
      }),
      'only approver allowed'
    );
  });

  it('should increment approvals', async () => {
    await wallet.createTransfer(100, accounts[5], {
      from: accounts[0],
    });
    await wallet.approveTransfer(0, {
      from: accounts[0],
    });
    const transfers = await wallet.getTransfers();
    const balance = await web3.eth.getBalance(wallet.address);
    assert(Number.parseInt(transfers[0].approvals) === 1);
    assert(transfers[0].sent === false);
    assert(balance === '1000');
  });

  it('should send transfer if quorum reached', async () => {
    const balanceBefore = web3.utils.toBN(
      await web3.eth.getBalance(accounts[6])
    );
    await wallet.createTransfer(100, accounts[6], {
      from: accounts[0],
    });
    await wallet.approveTransfer(0, {
      from: accounts[0],
    });
    await wallet.approveTransfer(0, {
      from: accounts[1],
    });
    const balanceAfter = web3.utils.toBN(
      await web3.eth.getBalance(accounts[6])
    );
    assert(balanceAfter.sub(balanceBefore).toNumber() === 100);
  });

  it('should NOT approve transfers if sender is not approved', async () => {
    await wallet.createTransfer(100, accounts[5], {
      from: accounts[0],
    }),
      await expectRevert(
        wallet.approveTransfer(0, {
          from: accounts[4],
        }),
        'only approver allowed'
      );
  });

  it('should NOT approve transfer is transfer is already sent', async () => {
    await wallet.createTransfer(100, accounts[6], {
      from: accounts[0],
    });
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
    await wallet.createTransfer(100, accounts[6], {
      from: accounts[0],
    });
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

  it('should only allow adding non zero address', async () => {});

  it('should send native token when approvals reache quorum', async () => {});

  it('should send ERC20 when approvals reache quorum', async () => {});
});
