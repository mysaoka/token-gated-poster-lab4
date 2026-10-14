// SPDX-License-Identifier: MIT
pragma solidity >=0.4.21 <0.9.0;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Context.sol";
contract Poster is Context {
    // Public getters let the UI read the actual on-chain gate configuration.
    address public tokenAddress;
    uint256 public threshold;
    event NewPost(address indexed user, string content, string indexed tag);
    address public owner;
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    constructor(address _tokenAddress, uint256 _threshold) {
        tokenAddress = _tokenAddress;
        threshold = _threshold;
        owner = _msgSender();
        emit OwnershipTransferred(address(0), owner);
    }
    function post(string memory content, string memory tag) public {
        IERC20 token = IERC20(tokenAddress);
        uint256 balance = token.balanceOf(msg.sender);
        if (balance < threshold) revert("Not enough tokens");
        emit NewPost(msg.sender, content, tag);
    }
    modifier onlyOwner() {
        require(owner == _msgSender(), "Ownable: caller is not the owner");
        _;
    }
    function transferOwnership(address _newOwner) public virtual onlyOwner {
        address oldOwner = owner;
        owner = _newOwner;
        emit OwnershipTransferred(oldOwner, _newOwner);
    }
    function setTokenAddress(address _newTokenAddress) public onlyOwner {
        tokenAddress = _newTokenAddress;
    }
    function setThreshold(uint256 _newThreshold) public onlyOwner {
        threshold = _newThreshold;
    }
}
