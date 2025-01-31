import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
  name: "Can create a new vault with timelock",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    const wallet2 = accounts.get('wallet_2')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('vaultify', 'create-vault', [
        types.uint(2),
        types.list([
          types.principal(deployer.address),
          types.principal(wallet1.address),
          types.principal(wallet2.address)
        ]),
        types.uint(10)
      ], deployer.address)
    ]);
    
    block.receipts[0].result.expectOk().expectUint(0);
    
    let getVault = chain.callReadOnlyFn(
      'vaultify',
      'get-vault-info',
      [types.uint(0)],
      deployer.address
    );
    
    const vaultInfo = getVault.result.expectSome().expectTuple();
    assertEquals(vaultInfo['threshold'], types.uint(2));
    assertEquals(vaultInfo['total-signers'], types.uint(3));
    assertEquals(vaultInfo['timelock'], types.uint(10));
  },
});

Clarinet.test({
  name: "Can cancel pending transaction",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    const recipient = accounts.get('wallet_2')!;
    
    // Create vault
    chain.mineBlock([
      Tx.contractCall('vaultify', 'create-vault', [
        types.uint(2),
        types.list([
          types.principal(deployer.address),
          types.principal(wallet1.address)
        ]),
        types.uint(10)
      ], deployer.address)
    ]);
    
    // Submit transaction
    let submitTx = chain.mineBlock([
      Tx.contractCall('vaultify', 'submit-transaction', [
        types.uint(0),
        types.uint(1000),
        types.principal(recipient.address)
      ], deployer.address)
    ]);
    
    // Cancel transaction
    let cancelTx = chain.mineBlock([
      Tx.contractCall('vaultify', 'cancel-transaction', [
        types.uint(0)
      ], deployer.address)
    ]);
    
    cancelTx.receipts[0].result.expectOk().expectBool(true);
    
    // Verify transaction is cancelled
    let getTx = chain.callReadOnlyFn(
      'vaultify',
      'get-transaction-info',
      [types.uint(0)],
      deployer.address
    );
    
    const txInfo = getTx.result.expectSome().expectTuple();
    assertEquals(txInfo['cancelled'], types.bool(true));
  },
});

Clarinet.test({
  name: "Cannot execute transaction before timelock expires",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    const recipient = accounts.get('wallet_2')!;
    
    // Create vault with 10 block timelock
    chain.mineBlock([
      Tx.contractCall('vaultify', 'create-vault', [
        types.uint(2),
        types.list([
          types.principal(deployer.address),
          types.principal(wallet1.address)
        ]),
        types.uint(10)
      ], deployer.address)
    ]);
    
    // Submit and sign transaction
    chain.mineBlock([
      Tx.contractCall('vaultify', 'submit-transaction', [
        types.uint(0),
        types.uint(1000),
        types.principal(recipient.address)
      ], deployer.address)
    ]);
    
    chain.mineBlock([
      Tx.contractCall('vaultify', 'sign-transaction', [
        types.uint(0)
      ], wallet1.address)
    ]);
    
    // Try to execute before timelock expires
    let executeTx = chain.mineBlock([
      Tx.contractCall('vaultify', 'execute-transaction', [
        types.uint(0)
      ], deployer.address)
    ]);
    
    executeTx.receipts[0].result.expectErr().expectUint(108);
  },
});
