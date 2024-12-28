import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
  name: "Can create a new vault",
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
        ])
      ], deployer.address)
    ]);
    
    block.receipts[0].result.expectOk().expectUint(0);
    
    // Verify vault info
    let getVault = chain.callReadOnlyFn(
      'vaultify',
      'get-vault-info',
      [types.uint(0)],
      deployer.address
    );
    
    const vaultInfo = getVault.result.expectSome().expectTuple();
    assertEquals(vaultInfo['threshold'], types.uint(2));
    assertEquals(vaultInfo['total-signers'], types.uint(3));
  },
});

Clarinet.test({
  name: "Can submit and execute multi-sig transaction",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    const wallet2 = accounts.get('wallet_2')!;
    const recipient = accounts.get('wallet_3')!;
    
    // Create vault
    let block = chain.mineBlock([
      Tx.contractCall('vaultify', 'create-vault', [
        types.uint(2),
        types.list([
          types.principal(deployer.address),
          types.principal(wallet1.address),
          types.principal(wallet2.address)
        ])
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
    
    const txId = submitTx.receipts[0].result.expectOk().expectUint(0);
    
    // Sign transaction
    let signTx = chain.mineBlock([
      Tx.contractCall('vaultify', 'sign-transaction', [
        types.uint(0)
      ], wallet1.address)
    ]);
    
    signTx.receipts[0].result.expectOk().expectBool(true);
    
    // Execute transaction
    let executeTx = chain.mineBlock([
      Tx.contractCall('vaultify', 'execute-transaction', [
        types.uint(0)
      ], deployer.address)
    ]);
    
    executeTx.receipts[0].result.expectOk().expectBool(true);
  },
});