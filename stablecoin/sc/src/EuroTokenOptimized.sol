// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title EuroTokenOptimized
 * @dev Optimized EuroToken (EURT) stablecoin implementation pegged 1:1 to the Euro.
 * Features:
 * - 6 Decimal Precision (1 EURT = 1,000,000 micro-units)
 * - ERC-2612 Permit for 1-click gasless approvals via EIP-712 typed signature
 * - Role-Based Access Control (AccessControl) for secure Minter delegation
 * - Emergency Pausable circuit breaker
 */
contract EuroTokenOptimized is ERC20, ERC20Permit, AccessControl, Pausable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    uint8 private constant DECIMALS = 6;

    event TokensMinted(address indexed to, uint256 amount, address indexed minter);
    event TokensBurned(address indexed from, uint256 amount);

    constructor(address defaultAdmin, address minter) 
        ERC20("EuroToken", "EURT") 
        ERC20Permit("EuroToken") 
    {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(MINTER_ROLE, defaultAdmin);
        _grantRole(PAUSER_ROLE, defaultAdmin);

        if (minter != address(0) && minter != defaultAdmin) {
            _grantRole(MINTER_ROLE, minter);
        }
    }

    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /**
     * @dev Mint new EURT tokens on-demand (Stripe top-up fulfillment)
     */
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) whenNotPaused {
        require(to != address(0), "Invalid recipient address");
        require(amount > 0, "Mint amount must be greater than zero");
        _mint(to, amount);
        emit TokensMinted(to, amount, msg.sender);
    }

    /**
     * @dev Burn EURT tokens
     */
    function burn(uint256 amount) public whenNotPaused {
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }

    /**
     * @dev Burn EURT tokens from an account with allowance
     */
    function burnFrom(address account, uint256 amount) public whenNotPaused {
        _spendAllowance(account, msg.sender, amount);
        _burn(account, amount);
        emit TokensBurned(account, amount);
    }

    /**
     * @dev Emergency pause circuit breaker
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Resume normal operations
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Override _update to enforce Pausable status on transfers
     * @notice RIESGO CONOCIDO (auditoría B2): si un admin pausa el token, también se bloquean
     * las liberaciones del escrow de Ecommerce (transfer del contrato al comerciante) y los
     * reembolsos de cancelOrder. El pause debe usarse solo como circuito de emergencia y
     * coordinarse con el owner de Ecommerce; no excluir el escrow del pause sin revisión.
     */
    function _update(address from, address to, uint256 value) internal override whenNotPaused {
        super._update(from, to, value);
    }
}
