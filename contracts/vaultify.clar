;; Vaultify - Multi-signature Vault Contract

;; Constants
(define-constant ERR_NOT_AUTHORIZED (err u100))
(define-constant ERR_INVALID_THRESHOLD (err u101))
(define-constant ERR_VAULT_NOT_FOUND (err u102))
(define-constant ERR_TX_NOT_FOUND (err u103))
(define-constant ERR_ALREADY_SIGNED (err u104))
(define-constant ERR_INSUFFICIENT_SIGNATURES (err u105))
(define-constant ERR_TX_EXECUTED (err u106))
(define-constant ERR_TX_CANCELLED (err u107))
(define-constant ERR_TIMELOCK_NOT_EXPIRED (err u108))

;; Data Variables
(define-data-var next-vault-id uint u0)
(define-data-var next-tx-id uint u0)

;; Data Maps
(define-map vaults
    uint
    {
        threshold: uint,
        total-signers: uint,
        balance: uint,
        timelock: uint
    }
)

(define-map vault-signers
    { vault-id: uint, signer: principal }
    bool
)

(define-map transactions
    uint
    {
        vault-id: uint,
        amount: uint,
        recipient: principal,
        signatures: uint,
        executed: bool,
        cancelled: bool,
        submit-height: uint
    }
)

(define-map transaction-signatures
    { tx-id: uint, signer: principal }
    bool
)

;; Private Functions
(define-private (is-valid-signer (vault-id uint) (signer principal))
    (default-to false (map-get? vault-signers { vault-id: vault-id, signer: signer }))
)

;; Public Functions
(define-public (create-vault (threshold uint) (signers (list 10 principal)) (timelock uint))
    (let
        (
            (vault-id (var-get next-vault-id))
            (signer-count (len signers))
        )
        (asserts! (> threshold u0) ERR_INVALID_THRESHOLD)
        (asserts! (<= threshold signer-count) ERR_INVALID_THRESHOLD)
        
        (map-set vaults vault-id
            {
                threshold: threshold,
                total-signers: signer-count,
                balance: u0,
                timelock: timelock
            }
        )
        
        (map add-signer-to-vault (map vault-id-tuple signers))
        
        (var-set next-vault-id (+ vault-id u1))
        (ok vault-id)
    )
)

(define-public (submit-transaction (vault-id uint) (amount uint) (recipient principal))
    (let
        (
            (tx-id (var-get next-tx-id))
        )
        (asserts! (is-valid-signer vault-id tx-sender) ERR_NOT_AUTHORIZED)
        
        (map-set transactions tx-id
            {
                vault-id: vault-id,
                amount: amount,
                recipient: recipient,
                signatures: u1,
                executed: false,
                cancelled: false,
                submit-height: block-height
            }
        )
        
        (map-set transaction-signatures { tx-id: tx-id, signer: tx-sender } true)
        
        (var-set next-tx-id (+ tx-id u1))
        (ok tx-id)
    )
)

(define-public (sign-transaction (tx-id uint))
    (let
        (
            (tx (unwrap! (map-get? transactions tx-id) ERR_TX_NOT_FOUND))
            (vault-id (get vault-id tx))
        )
        (asserts! (is-valid-signer vault-id tx-sender) ERR_NOT_AUTHORIZED)
        (asserts! (not (get executed tx)) ERR_TX_EXECUTED)
        (asserts! (not (get cancelled tx)) ERR_TX_CANCELLED)
        (asserts! (not (default-to false (map-get? transaction-signatures { tx-id: tx-id, signer: tx-sender }))) ERR_ALREADY_SIGNED)
        
        (map-set transaction-signatures { tx-id: tx-id, signer: tx-sender } true)
        (map-set transactions tx-id
            (merge tx { signatures: (+ (get signatures tx) u1) })
        )
        (ok true)
    )
)

(define-public (cancel-transaction (tx-id uint))
    (let
        (
            (tx (unwrap! (map-get? transactions tx-id) ERR_TX_NOT_FOUND))
            (vault-id (get vault-id tx))
        )
        (asserts! (is-valid-signer vault-id tx-sender) ERR_NOT_AUTHORIZED)
        (asserts! (not (get executed tx)) ERR_TX_EXECUTED)
        (asserts! (not (get cancelled tx)) ERR_TX_CANCELLED)
        
        (map-set transactions tx-id
            (merge tx { cancelled: true })
        )
        (ok true)
    )
)

(define-public (execute-transaction (tx-id uint))
    (let
        (
            (tx (unwrap! (map-get? transactions tx-id) ERR_TX_NOT_FOUND))
            (vault (unwrap! (map-get? vaults (get vault-id tx)) ERR_VAULT_NOT_FOUND))
            (time-passed (- block-height (get submit-height tx)))
        )
        (asserts! (not (get executed tx)) ERR_TX_EXECUTED)
        (asserts! (not (get cancelled tx)) ERR_TX_CANCELLED)
        (asserts! (>= (get signatures tx) (get threshold vault)) ERR_INSUFFICIENT_SIGNATURES)
        (asserts! (>= time-passed (get timelock vault)) ERR_TIMELOCK_NOT_EXPIRED)
        
        ;; Transfer funds and mark as executed
        (try! (stx-transfer? (get amount tx) (as-contract tx-sender) (get recipient tx)))
        (map-set transactions tx-id
            (merge tx { executed: true })
        )
        (ok true)
    )
)

(define-read-only (get-vault-info (vault-id uint))
    (map-get? vaults vault-id)
)

(define-read-only (get-transaction-info (tx-id uint))
    (map-get? transactions tx-id)
)

(define-read-only (is-transaction-signed (tx-id uint) (signer principal))
    (default-to false (map-get? transaction-signatures { tx-id: tx-id, signer: signer }))
)
