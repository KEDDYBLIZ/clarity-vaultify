# Vaultify

A secure multi-signature wallet platform built on Stacks blockchain using Clarity.

## Features

- Create multi-signature vaults that require M-of-N signatures to execute transactions
- Add/remove signers from vaults
- Submit, approve and execute transactions
- View vault balances and transaction history
- Change vault threshold

## Security

The contract implements strict security measures:
- Only registered signers can approve transactions
- Transaction execution requires meeting threshold requirements
- Time-locks on critical vault changes
- Comprehensive access controls

## Usage

See the contract documentation for details on creating vaults and managing transactions.