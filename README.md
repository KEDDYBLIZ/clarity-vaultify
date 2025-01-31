# Vaultify

A secure multi-signature wallet platform built on Stacks blockchain using Clarity.

## Features

- Create multi-signature vaults that require M-of-N signatures to execute transactions
- Add/remove signers from vaults
- Submit, approve and execute transactions
- View vault balances and transaction history
- Change vault threshold
- Transaction cancellation capability
- Configurable timelock periods for enhanced security

## Security

The contract implements strict security measures:
- Only registered signers can approve transactions
- Transaction execution requires meeting threshold requirements
- Timelocks on transaction execution for additional security
- Transaction cancellation to prevent unwanted executions
- Comprehensive access controls

## Usage

### Creating a Vault
Create a new vault by specifying:
- Signature threshold (M of N)
- List of authorized signers
- Timelock period in blocks

### Managing Transactions
- Submit new transactions for approval
- Sign pending transactions as an authorized signer
- Cancel pending transactions if needed
- Execute transactions after timelock period expires

See the contract documentation for detailed usage instructions.
